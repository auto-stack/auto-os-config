//! Collection handlers — a directory of homogeneous entity files.
//! (Plan 011 T6:自 backend/src/collection.rs 移植;axum handler 层改写为
//! core 函数,返回 Result<Value, CollectionError>,由 axum bin 与 cdylib 桥
//! 双传输消费。解析器/校验/测试逐字保留。)
//!
//! Two entity formats:
//!   - `atom`        : `<name>.at` (root node `role { … }`); optional sidecar
//!                     `<name>.soul.md`. The `.at` body is projected via the
//!                     generic AST layer; the sidecar is read/written as text.
//!   - `frontmatter-md`: `<name>/SKILL.md` with `---\nname: …\ndescription: …\n---`
//!                     followed by markdown body. v1 is read-only listing +
//!                     detail (no write) — skills are prompts, not settings.

use std::path::PathBuf;

use serde_json::{json, Value as JsonValue};

use crate::core::{config_root_unwrap, merged_registry};
use crate::project;
use crate::registry::{CollectionModule, EntityFormat, Module};

/// 端点错误:code 供 axum bin 映射 HTTP 状态;桥侧只消费消息(fail-soft)。
#[derive(Debug, thiserror::Error)]
pub enum CollectionError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    Conflict(String),
    #[error("{0}")]
    Internal(String),
}

impl CollectionError {
    pub fn status(&self) -> u16 {
        match self {
            CollectionError::NotFound(_) => 404,
            CollectionError::BadRequest(_) => 400,
            CollectionError::Conflict(_) => 409,
            CollectionError::Internal(_) => 500,
        }
    }
}

/// Resolve a collection module from the registry. Uses the fresh merged view
/// (hot drop-in registration) and returns an owned clone.
fn require_collection(id: &str) -> Result<CollectionModule, CollectionError> {
    match merged_registry().find(id) {
        Some(Module::Collection(c)) => Ok(c.clone()),
        Some(_) => Err(CollectionError::BadRequest(format!(
            "module '{id}' is a single file, not a collection"
        ))),
        None => Err(CollectionError::NotFound(format!(
            "module '{id}' not registered"
        ))),
    }
}

fn collection_dir(c: &CollectionModule) -> PathBuf {
    config_root_unwrap().join(&c.dir)
}

// ---- list -----------------------------------------------------------------

/// `GET /api/collection/:module_id` → `[ { name, description } ]`.
///
/// For atom entities the description comes from the `description` prop (if
/// present). For frontmatter-md it's the frontmatter `description`.
pub fn list_collection_json(module_id: &str) -> Result<JsonValue, CollectionError> {
    let c = require_collection(module_id)?;
    let dir = collection_dir(&c);
    let mut out: Vec<JsonValue> = Vec::new();

    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(json!([])), // missing dir → empty list
    };

    for entry in entries.flatten() {
        let path = entry.path();
        match c.format {
            EntityFormat::Atom => {
                if let Some(name) = file_stem(&path, &c.entity_suffix) {
                    if name.ends_with(".bak") {
                        continue;
                    }
                    let desc = read_atom_description(&path, c.entity_root.as_deref());
                    out.push(json!({ "name": name, "description": desc }));
                }
            }
            EntityFormat::FrontmatterMd => {
                // skills/<name>/SKILL.md
                if path.is_dir() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        let skill_md = path.join("SKILL.md");
                        let desc = read_frontmatter_description(&skill_md);
                        out.push(json!({ "name": name, "description": desc }));
                    }
                }
            }
        }
    }
    // Stable alphabetical order.
    out.sort_by(|a, b| {
        a["name"]
            .as_str()
            .unwrap_or_default()
            .cmp(b["name"].as_str().unwrap_or_default())
    });
    Ok(JsonValue::Array(out))
}

fn file_stem(path: &PathBuf, suffix: &str) -> Option<String> {
    let name = path.file_name()?.to_str()?;
    name.strip_suffix(suffix).map(|s| s.to_string())
}

/// Best-effort: read the `description` prop from an atom entity file.
fn read_atom_description(path: &PathBuf, root: Option<&str>) -> String {
    let Ok(content) = std::fs::read_to_string(path) else {
        return String::new();
    };
    let root = match root {
        Some(r) => r,
        None => return String::new(),
    };
    let node = match project::parse_root(&content, root) {
        Ok(n) => n,
        Err(_) => return String::new(),
    };
    node.get_prop_of("description").as_str().to_string()
}

/// Best-effort: read `description` from YAML frontmatter.
fn read_frontmatter_description(path: &PathBuf) -> String {
    let Ok(content) = std::fs::read_to_string(path) else {
        return String::new();
    };
    parse_frontmatter(&content).description
}

// ---- get single entity ----------------------------------------------------

/// `GET /api/collection/:module_id/:name`
/// atom → `{ value, sidecar, meta }`; frontmatter-md → `{ name, description, body }`
pub fn get_entity_json(module_id: &str, name: &str) -> Result<JsonValue, CollectionError> {
    validate_entity_name(name)?;
    let c = require_collection(module_id)?;
    let dir = collection_dir(&c);

    match c.format {
        EntityFormat::Atom => {
            let root = c.entity_root.as_deref().ok_or_else(|| {
                CollectionError::Internal("atom collection missing entity_root".into())
            })?;
            let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));
            let content = std::fs::read_to_string(&entity_path)
                .map_err(|_| CollectionError::NotFound(format!("entity '{name}' not found")))?;
            let value = project::read_file_body(&content, root)
                .map_err(|e| CollectionError::BadRequest(e.to_string()))?;
            // Sidecar (e.g. soul.md) — read if present.
            let sidecar = c
                .sidecar_suffix
                .as_ref()
                .and_then(|suffix| {
                    let p = dir.join(format!("{}{}", name, suffix));
                    std::fs::read_to_string(&p).ok()
                })
                .unwrap_or_default();
            Ok(json!({
                "value": value,
                "sidecar": sidecar,
                "sidecar_suffix": c.sidecar_suffix,
                "meta": { "root": root, "name": name }
            }))
        }
        EntityFormat::FrontmatterMd => {
            let skill_md = dir.join(name).join("SKILL.md");
            let content = std::fs::read_to_string(&skill_md)
                .map_err(|_| CollectionError::NotFound(format!("skill '{name}' not found")))?;
            let fm = parse_frontmatter(&content);
            Ok(json!({
                "name": fm.name,
                "description": fm.description,
                "body": fm.body,
            }))
        }
    }
}

// ---- create ---------------------------------------------------------------

/// `POST /api/collection/:module_id`(body `{ name }`)。
/// atom only: writes a minimal `<name>.at` from a template.
pub fn create_entity_json(module_id: &str, name: &str) -> Result<JsonValue, CollectionError> {
    validate_entity_name(name)?;
    let c = require_collection(module_id)?;
    if c.format != EntityFormat::Atom {
        return Err(CollectionError::BadRequest(
            "creating frontmatter-md entities is not supported in v1".into(),
        ));
    }
    let root = c.entity_root.as_deref().ok_or_else(|| {
        CollectionError::Internal("atom collection missing entity_root".into())
    })?;
    let dir = collection_dir(&c);
    std::fs::create_dir_all(&dir)
        .map_err(|e| CollectionError::Internal(format!("mkdir: {e}")))?;
    let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));
    if entity_path.exists() {
        return Err(CollectionError::Conflict(format!(
            "entity '{}' already exists",
            name
        )));
    }
    // Minimal template mirroring the existing role shape.
    let template = format!(
        "{root} {{\n    name : \"{name}\"\n    description : \"\"\n}}\n",
        root = root,
        name = name,
    );
    std::fs::write(&entity_path, &template)
        .map_err(|e| CollectionError::Internal(format!("write: {e}")))?;
    Ok(json!({ "ok": true, "name": name }))
}

// ---- update ---------------------------------------------------------------

/// `PUT /api/collection/:module_id/:name`(body `{ value, sidecar? }`)。
/// atom only: merges value into the entity's AST, writes sidecar if provided.
pub fn put_entity_json(
    module_id: &str,
    name: &str,
    value: &JsonValue,
    sidecar: Option<&str>,
) -> Result<JsonValue, CollectionError> {
    validate_entity_name(name)?;
    let c = require_collection(module_id)?;
    if c.format != EntityFormat::Atom {
        return Err(CollectionError::BadRequest(
            "editing frontmatter-md entities is not supported in v1".into(),
        ));
    }
    let root = c.entity_root.as_deref().ok_or_else(|| {
        CollectionError::Internal("atom collection missing entity_root".into())
    })?;
    let dir = collection_dir(&c);
    let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));

    let content = std::fs::read_to_string(&entity_path)
        .map_err(|_| CollectionError::NotFound(format!("entity '{name}' not found")))?;
    let new_source = project::write_file_body(&content, root, value)
        .map_err(|e| CollectionError::BadRequest(e.to_string()))?;

    // .bak of the entity, then write.
    let _ = std::fs::write(format!("{}.bak", entity_path.display()), &content);
    std::fs::write(&entity_path, &new_source)
        .map_err(|e| CollectionError::Internal(format!("write: {e}")))?;

    // Sidecar (e.g. soul.md) — write or clear.
    if let Some(suffix) = &c.sidecar_suffix {
        let sidecar_path = dir.join(format!("{}{}", name, suffix));
        match sidecar {
            Some(text) if !text.trim().is_empty() => {
                let _ = std::fs::write(&sidecar_path, text);
            }
            _ => {
                // Empty sidecar → remove the file if it exists.
                let _ = std::fs::remove_file(&sidecar_path);
            }
        }
    }

    Ok(json!({
        "ok": true,
        "note": "rewritten from AST; a .bak backup was written"
    }))
}

// ---- delete ---------------------------------------------------------------

/// `DELETE /api/collection/:module_id/:name`.
pub fn delete_entity_json(module_id: &str, name: &str) -> Result<JsonValue, CollectionError> {
    validate_entity_name(name)?;
    let c = require_collection(module_id)?;
    let dir = collection_dir(&c);
    let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));
    if !entity_path.exists() {
        return Err(CollectionError::NotFound(format!(
            "entity '{name}' not found"
        )));
    }
    std::fs::remove_file(&entity_path)
        .map_err(|e| CollectionError::Internal(format!("delete: {e}")))?;
    // Also remove a paired sidecar.
    if let Some(suffix) = &c.sidecar_suffix {
        let _ = std::fs::remove_file(dir.join(format!("{}{}", name, suffix)));
    }
    Ok(json!({ "ok": true }))
}

// ---- frontmatter parser (minimal, hand-rolled) ---------------------------

struct Frontmatter {
    name: String,
    description: String,
    body: String,
}

/// Parse a `---\nname: …\ndescription: …\n---\n<markdown body>` file.
/// Mirrors the minimal parser in auto-ai-agent's skill.rs.
fn parse_frontmatter(content: &str) -> Frontmatter {
    let content = content.strip_prefix('\u{feff}').unwrap_or(content);
    let after_open = match content.strip_prefix("---\n") {
        Some(s) => s,
        None => {
            // No frontmatter → whole thing is body, name unknown.
            return Frontmatter {
                name: String::new(),
                description: String::new(),
                body: content.to_string(),
            };
        }
    };
    // Find the closing `---` line.
    let close = after_open
        .lines()
        .position(|l| l.trim_end() == "---");
    let (fm_block, body) = match close {
        Some(idx) => {
            let (fm, rest) = after_open.split_at(
                after_open
                    .lines()
                    .take(idx)
                    .map(|l| l.len() + 1)
                    .sum::<usize>(),
            );
            // skip the closing `---` line + its newline
            let body = rest.lines().skip(1).collect::<Vec<_>>().join("\n");
            (fm, body)
        }
        None => (after_open, String::new()),
    };
    let mut name = String::new();
    let mut description = String::new();
    for line in fm_block.lines() {
        if let Some(v) = line.strip_prefix("name:") {
            name = clean_value(v);
        } else if let Some(v) = line.strip_prefix("description:") {
            description = clean_value(v);
        }
    }
    Frontmatter {
        name,
        description,
        body,
    }
}

fn clean_value(s: &str) -> String {
    let s = s.trim();
    let s = s.strip_prefix('"').and_then(|x| x.strip_suffix('"')).unwrap_or(s);
    let s = s.strip_prefix('\'').and_then(|x| x.strip_suffix('\'')).unwrap_or(s);
    s.to_string()
}

/// Reject entity names with path separators or suspicious chars.
fn validate_entity_name(name: &str) -> Result<(), CollectionError> {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
        || name.contains('\0')
    {
        return Err(CollectionError::BadRequest(format!(
            "invalid entity name '{name}'"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frontmatter_parses_name_description_body() {
        let md = "---\nname: brainstorming\ndescription: Explore before code.\n---\n\n# Brainstorming\n\nBody text.";
        let fm = parse_frontmatter(md);
        assert_eq!(fm.name, "brainstorming");
        assert_eq!(fm.description, "Explore before code.");
        assert!(fm.body.contains("# Brainstorming"));
        assert!(fm.body.contains("Body text."));
    }

    #[test]
    fn frontmatter_without_close_marker_treats_rest_as_empty_body() {
        let md = "---\nname: x\ndescription: y\n";
        let fm = parse_frontmatter(md);
        assert_eq!(fm.name, "x");
        assert_eq!(fm.description, "y");
    }

    #[test]
    fn frontmatter_strips_quotes() {
        let md = "---\nname: \"x\"\ndescription: 'a b'\n---\n";
        let fm = parse_frontmatter(md);
        assert_eq!(fm.name, "x");
        assert_eq!(fm.description, "a b");
    }

    #[test]
    fn entity_name_validation_rejects_paths() {
        assert!(validate_entity_name("../etc").is_err());
        assert!(validate_entity_name("a/b").is_err());
        assert!(validate_entity_name("a\\b").is_err());
        assert!(validate_entity_name("").is_err());
        assert!(validate_entity_name("good-name").is_ok());
    }

    /// T6:roles(atom 集合)list → get → put → get 回环(真机 ~/.config/autoos)。
    #[test]
    fn roles_list_get_put_roundtrip() {
        // list:非空,含 assistant,条目形状 {name, description}
        let list = list_collection_json("roles").expect("roles listable");
        let arr = list.as_array().expect("array");
        assert!(!arr.is_empty(), "roles collection has entities");
        assert!(arr.iter().any(|e| e["name"] == "assistant"), "assistant present");
        assert!(arr[0].get("description").is_some());

        // get:atom 形状 {value, sidecar, meta}
        let got = get_entity_json("roles", "assistant").expect("assistant readable");
        assert!(got["value"].is_object());
        assert_eq!(got["meta"]["name"], "assistant");
        assert_eq!(got["meta"]["root"], "role");

        // put:回写同一 value + sidecar(保持原值,幂等回环)
        let put = put_entity_json(
            "roles",
            "assistant",
            &got["value"],
            Some(got["sidecar"].as_str().unwrap_or_default()),
        )
        .expect("put ok");
        assert_eq!(put["ok"], true);

        // get:回环一致
        let got2 = get_entity_json("roles", "assistant").expect("readable after put");
        assert_eq!(got2["value"], got["value"], "roundtrip preserves the body");
    }

    /// T6:frontmatter-md 集合(skills)list + detail 只读面。
    #[test]
    fn skills_frontmatter_listing() {
        let list = list_collection_json("skills").expect("skills listable");
        let arr = list.as_array().expect("array");
        // 本机 skills 目录可能为空——形状断言始终成立
        if let Some(first) = arr.first() {
            assert!(first.get("name").is_some());
        }
        // 不存在的实体 → NotFound
        assert!(get_entity_json("skills", "definitely-not-a-skill-xyz").is_err());
    }

    /// T6:create → list 可见 → delete → list 不可见(poc-t6 实体,无残留)。
    #[test]
    fn create_delete_roundtrip() {
        let name = "poc-t6-entity";
        let created = create_entity_json("roles", name).expect("create ok");
        assert_eq!(created["ok"], true);
        // 幂等冲突
        assert!(create_entity_json("roles", name).is_err());
        assert!(
            list_collection_json("roles")
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .any(|e| e["name"] == name),
            "created entity listed"
        );
        let deleted = delete_entity_json("roles", name).expect("delete ok");
        assert_eq!(deleted["ok"], true);
        assert!(
            !list_collection_json("roles")
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .any(|e| e["name"] == name),
            "deleted entity gone"
        );
    }
}
