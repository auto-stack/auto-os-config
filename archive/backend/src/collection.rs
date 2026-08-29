//! Collection handlers — a directory of homogeneous entity files.
//!
//! Two entity formats:
//!   - `atom`        : `<name>.at` (root node `role { … }`); optional sidecar
//!                     `<name>.soul.md`. The `.at` body is projected via the
//!                     generic AST layer; the sidecar is read/written as text.
//!   - `frontmatter-md`: `<name>/SKILL.md` with `---\nname: …\ndescription: …\n---`
//!                     followed by markdown body. v1 is read-only listing +
//!                     detail (no write) — skills are prompts, not settings.

use std::path::PathBuf;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use serde_json::{json, Value as JsonValue};
use std::sync::Arc;

use crate::project;
use crate::registry::{CollectionModule, EntityFormat, Module};
use crate::{ApiError, AppState};

/// Resolve a collection module from the registry. Uses the fresh merged view
/// (hot drop-in registration) and returns an owned clone.
fn require_collection(state: &AppState, id: &str) -> Result<CollectionModule, ApiError> {
    match state.merged().find(id) {
        Some(Module::Collection(c)) => Ok(c.clone()),
        Some(_) => Err(ApiError::bad_request(format!(
            "module '{id}' is a single file, not a collection"
        ))),
        None => Err(ApiError::not_found(format!(
            "module '{id}' not registered"
        ))),
    }
}

fn collection_dir(state: &AppState, c: &CollectionModule) -> PathBuf {
    state.config_root.join(&c.dir)
}

// ---- list -----------------------------------------------------------------

#[derive(Serialize)]
pub(crate) struct EntitySummary {
    name: String,
    description: String,
}

/// `GET /api/collection/:module_id` → `[ { name, description } ]`.
///
/// For atom entities the description comes from the `description` prop (if
/// present). For frontmatter-md it's the frontmatter `description`.
pub(crate) async fn list_collection(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
) -> Result<Json<Vec<EntitySummary>>, ApiError> {
    let c = require_collection(&state, &module_id)?;
    let dir = collection_dir(&state, &c);
    let mut out: Vec<EntitySummary> = Vec::new();

    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Json(out)), // missing dir → empty list
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
                    out.push(EntitySummary { name, description: desc });
                }
            }
            EntityFormat::FrontmatterMd => {
                // skills/<name>/SKILL.md
                if path.is_dir() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        let skill_md = path.join("SKILL.md");
                        let desc = read_frontmatter_description(&skill_md);
                        out.push(EntitySummary {
                            name: name.to_string(),
                            description: desc,
                        });
                    }
                }
            }
        }
    }
    // Stable alphabetical order.
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(Json(out))
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
pub(crate) async fn get_entity(
    State(state): State<Arc<AppState>>,
    Path((module_id, name)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    validate_entity_name(&name)?;
    let c = require_collection(&state, &module_id)?;
    let dir = collection_dir(&state, &c);

    match c.format {
        EntityFormat::Atom => {
            let root = c
                .entity_root
                .as_deref()
                .ok_or_else(|| ApiError::internal("atom collection missing entity_root"))?;
            let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));
            let content = std::fs::read_to_string(&entity_path).map_err(|_| {
                ApiError::not_found(format!("entity '{name}' not found"))
            })?;
            let value = project::read_file_body(&content, root)?;
            // Sidecar (e.g. soul.md) — read if present.
            let sidecar = c
                .sidecar_suffix
                .as_ref()
                .and_then(|suffix| {
                    let p = dir.join(format!("{}{}", name, suffix));
                    std::fs::read_to_string(&p).ok()
                })
                .unwrap_or_default();
            Ok(Json(json!({
                "value": value,
                "sidecar": sidecar,
                "sidecar_suffix": c.sidecar_suffix,
                "meta": { "root": root, "name": name }
            }))
            .into_response())
        }
        EntityFormat::FrontmatterMd => {
            let skill_md = dir.join(&name).join("SKILL.md");
            let content = std::fs::read_to_string(&skill_md).map_err(|_| {
                ApiError::not_found(format!("skill '{name}' not found"))
            })?;
            let fm = parse_frontmatter(&content);
            Ok(Json(json!({
                "name": fm.name,
                "description": fm.description,
                "body": fm.body,
            }))
            .into_response())
        }
    }
}

// ---- create ---------------------------------------------------------------

#[derive(serde::Deserialize)]
pub(crate) struct CreateBody {
    name: String,
}

/// `POST /api/collection/:module_id` body `{ name }`.
/// atom only: writes a minimal `<name>.at` from a template.
pub(crate) async fn create_entity(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
    Json(body): Json<CreateBody>,
) -> Result<Response, ApiError> {
    validate_entity_name(&body.name)?;
    let c = require_collection(&state, &module_id)?;
    if c.format != EntityFormat::Atom {
        return Err(ApiError::bad_request(
            "creating frontmatter-md entities is not supported in v1",
        ));
    }
    let root = c
        .entity_root
        .as_deref()
        .ok_or_else(|| ApiError::internal("atom collection missing entity_root"))?;
    let dir = collection_dir(&state, &c);
    std::fs::create_dir_all(&dir).map_err(|e| ApiError::internal(format!("mkdir: {e}")))?;
    let entity_path = dir.join(format!("{}{}", body.name, c.entity_suffix));
    if entity_path.exists() {
        return Err(ApiError::Status(
            StatusCode::CONFLICT,
            format!("entity '{}' already exists", body.name),
        ));
    }
    // Minimal template mirroring the existing role shape.
    let template = format!(
        "{root} {{\n    name : \"{name}\"\n    description : \"\"\n}}\n",
        root = root,
        name = body.name,
    );
    std::fs::write(&entity_path, &template)
        .map_err(|e| ApiError::internal(format!("write: {e}")))?;
    Ok(Json(json!({ "ok": true, "name": body.name })).into_response())
}

// ---- update ---------------------------------------------------------------

#[derive(serde::Deserialize)]
pub(crate) struct PutEntityBody {
    value: JsonValue,
    #[serde(default)]
    sidecar: Option<String>,
}

/// `PUT /api/collection/:module_id/:name` body `{ value, sidecar? }`.
/// atom only: merges value into the entity's AST, writes sidecar if provided.
pub(crate) async fn put_entity(
    State(state): State<Arc<AppState>>,
    Path((module_id, name)): Path<(String, String)>,
    Json(body): Json<PutEntityBody>,
) -> Result<Response, ApiError> {
    validate_entity_name(&name)?;
    let c = require_collection(&state, &module_id)?;
    if c.format != EntityFormat::Atom {
        return Err(ApiError::bad_request(
            "editing frontmatter-md entities is not supported in v1",
        ));
    }
    let root = c
        .entity_root
        .as_deref()
        .ok_or_else(|| ApiError::internal("atom collection missing entity_root"))?;
    let dir = collection_dir(&state, &c);
    let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));

    let content = std::fs::read_to_string(&entity_path)
        .map_err(|_| ApiError::not_found(format!("entity '{name}' not found")))?;
    let new_source = project::write_file_body(&content, root, &body.value)?;

    // .bak of the entity, then write.
    let _ = std::fs::write(format!("{}.bak", entity_path.display()), &content);
    std::fs::write(&entity_path, &new_source)
        .map_err(|e| ApiError::internal(format!("write: {e}")))?;

    // Sidecar (e.g. soul.md) — write or clear.
    if let Some(suffix) = &c.sidecar_suffix {
        let sidecar_path = dir.join(format!("{}{}", name, suffix));
        match &body.sidecar {
            Some(text) if !text.trim().is_empty() => {
                let _ = std::fs::write(&sidecar_path, text);
            }
            _ => {
                // Empty sidecar → remove the file if it exists.
                let _ = std::fs::remove_file(&sidecar_path);
            }
        }
    }

    Ok(Json(json!({
        "ok": true,
        "note": "rewritten from AST; a .bak backup was written"
    }))
    .into_response())
}

// ---- delete ---------------------------------------------------------------

/// `DELETE /api/collection/:module_id/:name`.
pub(crate) async fn delete_entity(
    State(state): State<Arc<AppState>>,
    Path((module_id, name)): Path<(String, String)>,
) -> Result<Response, ApiError> {
    validate_entity_name(&name)?;
    let c = require_collection(&state, &module_id)?;
    let dir = collection_dir(&state, &c);
    let entity_path = dir.join(format!("{}{}", name, c.entity_suffix));
    if !entity_path.exists() {
        return Err(ApiError::not_found(format!("entity '{name}' not found")));
    }
    std::fs::remove_file(&entity_path)
        .map_err(|e| ApiError::internal(format!("delete: {e}")))?;
    // Also remove a paired sidecar.
    if let Some(suffix) = &c.sidecar_suffix {
        let _ = std::fs::remove_file(dir.join(format!("{}{}", name, suffix)));
    }
    Ok(Json(json!({ "ok": true })).into_response())
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
fn validate_entity_name(name: &str) -> Result<(), ApiError> {
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
        || name.contains('\0')
    {
        return Err(ApiError::bad_request(format!("invalid entity name '{name}'")));
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
}
