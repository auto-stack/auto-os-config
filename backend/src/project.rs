//! Generic projection between an auto-atom AST and JSON.
//!
//! This is the heart of the unified daemon: instead of per-file-type typed
//! loaders (parse_daemon_config, parse_role_config, …), we stop at the generic
//! `Atom`/`Node`/`Value` layer. Any `.at` file round-trips through here.
//!
//! - [`node_body_to_json`]  — read path:  Node body → serde_json::Value
//! - [`merge_node_body`]    — write path: fold a JSON edit back into a Node
//!   (preserving node names, structure, and untouched fields), then the caller
//!   serializes via `AtomSource::to_at_source`.
//!
//! # How children are keyed
//!
//! The auto-atom parser adds child nodes via `Node::add_kid(child)`, which
//! keys them by **integer index** (`kids_len()`), not by the child's name.
//! The child's name lives on `Kid::Node(child).name`. So in `daemon { … }`,
//! the `zhipu { … }` block is kid #N with `.name == "zhipu"` — its map key is
//! just an integer. (Loaders like `parse_tier_routing` confirm this: they walk
//! `kids_iter()` and match on `child.name.as_str()`.)
//!
//! Consequence: to merge an edit we identify children by **node name**, never
//! by map key, and we rebuild the parent's kid list (the `Kids` map field is
//! private, so in-place mutation isn't available).

use auto_atom::{Atom, AtomParser};
use auto_val::{AtomSource, Kid, Node, Value};
use serde_json::{Map, Value as Json};

/// Parse a `.at` document into its root `Node`, asserting the root node name.
///
/// auto-atom parses exactly one root value; our config files are always a
/// single `name { … }` node (e.g. `daemon { … }`, `musk { … }`, `role { … }`).
/// `expected_root` guards against merging edits into the wrong file.
pub fn parse_root(content: &str, expected_root: &str) -> Result<Node, ProjectError> {
    let atom = AtomParser::parse(content).map_err(|e| ProjectError::Parse(e.to_string()))?;
    match atom {
        Atom::Node(n) => {
            if n.name.as_str() != expected_root {
                return Err(ProjectError::RootMismatch {
                    expected: expected_root.into(),
                    found: n.name.to_string(),
                });
            }
            Ok(n)
        }
        _ => Err(ProjectError::UnexpectedTop(
            "expected a root node, found non-node top-level".into(),
        )),
    }
}

/// Project a root `Node` body to JSON for the editor.
///
/// The root node itself is NOT emitted as an object key — we return its body
/// (props + kids) flattened into a JSON object, so the editor edits the
/// *contents* of `daemon { … }` directly. The root name is implicit, fixed by
/// the module registry. Child nodes become keyed by their `.name`.
pub fn node_body_to_json(node: &Node) -> Json {
    let mut obj = Map::new();
    // Props first (preserves source ordering via IndexMap on Obj).
    for (key, val) in node.props_iter() {
        obj.insert(key.to_string(), value_to_json(val));
    }
    // Children: keyed by their node name (e.g. "zhipu", "tier_routing").
    for (_, kid) in node.kids_iter() {
        if let Kid::Node(child) = kid {
            obj.insert(child.name.to_string(), node_body_to_json(child));
        }
    }
    Json::Object(obj)
}

/// Convert an auto-atom `Value` to JSON.
///
/// Maps the static-config subset (Str/Int/Uint/Double/Bool/Nil/Array/Obj) to
/// JSON directly. Bare identifiers parse to `Value::Str`, so both
/// `log_level : info` and `log_level : "info"` become `"info"` — lossless for
/// the editor's purposes.
pub fn value_to_json(val: &Value) -> Json {
    match val {
        Value::Str(s) => Json::String(s.to_string()),
        Value::String(s) => Json::String(s.to_string()),
        Value::StrSlice(s) => Json::String(s.to_string()),
        Value::Int(i) => Json::Number((*i).into()),
        Value::Uint(u) => Json::Number((*u).into()),
        Value::I64(i) => Json::Number((*i).into()),
        Value::U8(b) | Value::Byte(b) => Json::Number((*b).into()),
        Value::Float(f) | Value::Double(f) => serde_json::Number::from_f64(*f)
            .map(Json::Number)
            .unwrap_or(Json::Null),
        Value::Bool(b) => Json::Bool(*b),
        Value::Nil | Value::Null | Value::Void => Json::Null,
        Value::Array(arr) | Value::Block(arr) => {
            Json::Array(arr.values.iter().map(value_to_json).collect())
        }
        Value::Obj(obj) => {
            let mut m = Map::new();
            for (k, v) in obj.iter() {
                m.insert(k.to_string(), value_to_json(v));
            }
            Json::Object(m)
        }
        // VM/runtime variants can't appear in static config; surface as string.
        other => Json::String(format!("{other}")),
    }
}

/// Fold a JSON edit into a root `Node` in place.
///
/// `json` is the editor's full view of the node body (same shape
/// [`node_body_to_json`] produced). For each top-level key in `json`:
///   - matches an existing child node (by node name) → recurse into it
///   - matches an existing prop, or is brand-new → set as a prop
///
/// Children present in the AST but absent from `json` are preserved untouched
/// (the editor sent a partial view — e.g. only changed scalars). Returns the
/// count of keys applied, for logging.
///
/// # Rebuild, not mutate
/// The `Kids` map is private upstream, so to recurse-and-keep a child we
/// rebuild the parent: clone each existing child, fold `json`'s matching key
/// into it, and re-add all children (originals for untouched keys, folded for
/// edited keys) to a fresh root.
pub fn merge_node_body(root: &mut Node, json: &Json) -> usize {
    let obj = match json {
        Json::Object(o) => o,
        _ => return 0,
    };

    // 1. Collect existing children keyed by name (clone them — we own them now).
    //    Names may repeat (rare); we fold into the first match per name.
    let mut children: Vec<(String, Node)> = Vec::new();
    for (_, kid) in root.kids_iter() {
        if let Kid::Node(child) = kid {
            // kid is &Kid; child binds to &Box<Node> via match ergonomics.
            let node: &Node = child.as_ref();
            children.push((node.name.to_string(), node.clone()));
        }
    }
    // Owned names so the set doesn't borrow `children` (we mutate it below).
    let child_names: std::collections::HashSet<String> =
        children.iter().map(|(n, _)| n.clone()).collect();

    // 2. Snapshot existing props so we can rebuild the prop set with updates.
    //    (We keep insertion order by walking props_iter; updated keys keep
    //    their position, new keys land at the end.)
    let mut props: Vec<(String, Value)> = root
        .props_iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect();
    let prop_names: std::collections::HashSet<String> =
        props.iter().map(|(k, _)| k.clone()).collect();

    let mut applied = 0usize;
    let mut new_children: Vec<(String, Node)> = Vec::new();

    for (key, jval) in obj {
        if child_names.contains(key.as_str()) {
            // Fold into the matching child (first one if duplicate names).
            if let Some(pos) = children.iter().position(|(n, _)| n == key) {
                let (_, mut child) = children.remove(pos);
                applied += merge_node_body(&mut child, jval);
                new_children.push((key.clone(), child));
            } else {
                // Was consumed by an earlier duplicate name — re-attach as-is.
            }
        } else if let Some(v) = json_to_value(jval) {
            // Scalar / array / obj prop.
            if prop_names.contains(key) {
                if let Some(slot) = props.iter_mut().find(|(k, _)| k == key) {
                    slot.1 = v;
                }
            } else {
                props.push((key.clone(), v));
            }
            applied += 1;
        }
    }

    // 3. Rebuild the root node: fresh props + (folded children first, then any
    //    untouched children that weren't in json, in original order).
    //    Order: folded (edited) children interleave with untouched ones
    //    according to their original positions. Simplest faithful approach:
    //    walk the original kid order, replacing children we folded; then any
    //    child we didn't touch is appended from `children` in original order.

    // Reconstruct original kid order by re-walking; we already moved folded
    // children out of `children`, so `children` now holds ONLY untouched ones.
    let folded_by_name: std::collections::HashMap<String, Node> =
        new_children.into_iter().collect();

    // Re-emit kids in original order: iterate root.kids_iter() once more.
    let ordered_kids: Vec<Node> = root
        .kids_iter()
        .filter_map(|(_, kid)| match kid {
            Kid::Node(c) => {
                let node: &Node = c.as_ref();
                let name = node.name.to_string();
                // If we folded this name, use the folded copy; else keep original.
                if let Some(folded) = folded_by_name.get(&name) {
                    Some(folded.clone())
                } else {
                    Some(node.clone())
                }
            }
            Kid::Lazy(_) => None, // never in static config
        })
        .collect();

    // 4. Apply to `root`: clear and repopulate props + kids.
    //    `set_prop` preserves order for existing keys, appends for new; we
    //    walk our ordered `props` vec. For kids, we use `add_kid` (integer
    //    key) which mirrors what the parser does — name lives on the node.
    *root = Node::new(root.name.as_str());
    for (k, v) in props {
        root.set_prop(k.as_str(), v);
    }
    for child in ordered_kids {
        root.add_kid(child);
    }

    applied
}

/// Rebuild an auto-atom `Value` from JSON (the inverse of [`value_to_json`]
/// for the static subset). Returns `None` for values we can't represent.
pub fn json_to_value(json: &Json) -> Option<Value> {
    Some(match json {
        Json::Null => Value::Nil,
        Json::Bool(b) => Value::Bool(*b),
        Json::Number(n) => {
            if let Some(i) = n.as_i64() {
                if let Ok(small) = i32::try_from(i) {
                    Value::Int(small)
                } else {
                    Value::I64(i)
                }
            } else if let Some(f) = n.as_f64() {
                Value::Double(f)
            } else {
                return None;
            }
        }
        Json::String(s) => Value::str(s.as_str()),
        Json::Array(arr) => {
            let values: Vec<Value> = arr.iter().filter_map(json_to_value).collect();
            Value::Array(auto_val::Array { values })
        }
        Json::Object(_) => {
            // An object at prop position becomes an inline Obj literal.
            // (Child nodes are handled at the node level, not here.)
            let mut obj = auto_val::Obj::new();
            if let Json::Object(o) = json {
                for (k, v) in o {
                    if let Some(val) = json_to_value(v) {
                        obj.set(k.as_str(), val);
                    }
                }
            }
            Value::Obj(obj)
        }
    })
}

/// Convenience: parse + project a whole file's body to JSON.
pub fn read_file_body(content: &str, expected_root: &str) -> Result<Json, ProjectError> {
    let node = parse_root(content, expected_root)?;
    Ok(node_body_to_json(&node))
}

/// Convenience: parse, fold an edit, serialize back to `.at` source.
///
/// The caller is responsible for the `.bak` backup and the actual file write;
/// this only does the in-memory transform so it stays easy to unit-test.
pub fn write_file_body(
    current_content: &str,
    expected_root: &str,
    edit: &Json,
) -> Result<String, ProjectError> {
    let mut node = parse_root(current_content, expected_root)?;
    merge_node_body(&mut node, edit);
    Ok(node.to_at_source())
}

/// Error type for projection failures.
#[derive(Debug, thiserror::Error)]
pub enum ProjectError {
    #[error("auto-atom parse error: {0}")]
    Parse(String),
    #[error("root node mismatch: expected `{expected}`, found `{found}`")]
    RootMismatch { expected: String, found: String },
    #[error("{0}")]
    UnexpectedTop(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAEMON_AT: &str = r#"daemon {
    listen_addr : "127.0.0.1:17654"
    idle_timeout_min : 10
    log_level : info
    default_provider : zhipu
    default_model : "glm-5.2"

    tier_routing {
        max : [{ provider : "zhipu", model : "glm-5.2" }]
        min : [{ provider : "local", model : "ornith" }]
    }

    zhipu {
        kind : anthropic
        api_key : "secret-123"
        models : [{ id : "glm-5.2", tier : max }]
    }
}
"#;

    #[test]
    fn read_projects_scalars_and_nested_nodes() {
        let body = read_file_body(DAEMON_AT, "daemon").unwrap();
        let obj = body.as_object().unwrap();
        assert_eq!(obj["listen_addr"], "127.0.0.1:17654");
        assert_eq!(obj["idle_timeout_min"], 10);
        assert_eq!(obj["log_level"], "info"); // bare ident → string
        assert_eq!(obj["default_provider"], "zhipu");
        let zhipu = obj["zhipu"].as_object().unwrap();
        assert_eq!(zhipu["kind"], "anthropic");
        assert_eq!(zhipu["api_key"], "secret-123");
    }

    #[test]
    fn read_projects_child_nodes_by_name() {
        let body = read_file_body(DAEMON_AT, "daemon").unwrap();
        let obj = body.as_object().unwrap();
        // Children are keyed by node name, despite integer map keys in the AST.
        assert!(obj.contains_key("tier_routing"));
        assert!(obj.contains_key("zhipu"));
        let tr = obj["tier_routing"].as_object().unwrap();
        let max = tr["max"].as_array().unwrap();
        assert_eq!(max[0]["provider"], "zhipu");
        assert_eq!(max[0]["model"], "glm-5.2");
    }

    #[test]
    fn merge_updates_scalar_and_preserves_structure() {
        // Change idle_timeout_min and the api_key; leave everything else.
        let edit = serde_json::json!({
            "idle_timeout_min": 20,
            "zhipu": { "api_key": "new-key-456" }
        });
        let out = write_file_body(DAEMON_AT, "daemon", &edit).unwrap();
        assert!(out.contains("idle_timeout_min : 20"), "out = {out}");
        assert!(out.contains("api_key : \"new-key-456\""));
        // Untouched values preserved. (Bare idents re-serialize as quoted
        // strings — semantically identical Value::Str, just canonical form.)
        assert!(out.contains("listen_addr : \"127.0.0.1:17654\""));
        assert!(out.contains("default_provider : \"zhipu\""));
        // Structure preserved: named blocks survive.
        assert!(out.contains("zhipu {"));
        assert!(out.contains("tier_routing {"));
        // Untouched child (tier_routing) fully intact.
        assert!(out.contains("provider : \"local\""));
    }

    #[test]
    fn merge_preserves_untouched_child_nodes() {
        // Edit only zhipu; tier_routing must survive (re-canonicalized, but
        // its data intact).
        let edit = serde_json::json!({ "zhipu": { "api_key": "x" } });
        let out = write_file_body(DAEMON_AT, "daemon", &edit).unwrap();
        assert!(out.contains("tier_routing {"), "out = {out}");
        // min tier row's provider survives (canonical multi-line form).
        assert!(out.contains("provider : \"local\""));
        assert!(out.contains("model : \"ornith\""));
    }

    #[test]
    fn merge_round_trips_through_parser() {
        let edit1 = serde_json::json!({ "idle_timeout_min": 33 });
        let out1 = write_file_body(DAEMON_AT, "daemon", &edit1).unwrap();
        let edit2 = serde_json::json!({ "idle_timeout_min": 5 });
        let out2 = write_file_body(&out1, "daemon", &edit2).unwrap();
        let body = read_file_body(&out2, "daemon").unwrap();
        assert_eq!(body["idle_timeout_min"], 5);
    }

    #[test]
    fn special_chars_in_strings_round_trip() {
        let tricky = "She said \"hi\", path C:\\win, then\nnew line";
        let edit = serde_json::json!({ "zhipu": { "api_key": tricky } });
        let out = write_file_body(DAEMON_AT, "daemon", &edit).unwrap();
        let body = read_file_body(&out, "daemon").unwrap();
        assert_eq!(body["zhipu"]["api_key"], tricky);
    }

    #[test]
    fn root_mismatch_is_rejected() {
        let err = read_file_body(DAEMON_AT, "musk").unwrap_err();
        assert!(matches!(err, ProjectError::RootMismatch { .. }));
    }

    #[test]
    fn merge_updates_nested_array_of_objects() {
        // Edit a tier_routing table row.
        let edit = serde_json::json!({
            "tier_routing": { "max": [{ "provider": "deepseek", "model": "v4-pro" }] }
        });
        let out = write_file_body(DAEMON_AT, "daemon", &edit).unwrap();
        assert!(out.contains("provider : \"deepseek\""), "out = {out}");
        assert!(out.contains("model : \"v4-pro\""));
    }
}
