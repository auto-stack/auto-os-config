//! auto-os-config-daemon — unified config read/write for all AutoOS modules.
//!
//! One axum server serves every module's config via a generic auto-atom AST
//! projection (see `project.rs`). URL → file mapping is driven by the module
//! registry (`registry.rs`). No per-module typed code: any `.at` config file
//! registered in `registry.rs` (built-in) or a `modules.d/*.at` drop-in is
//! editable through the same endpoints.

mod config_root;
mod project;
mod collection;
mod registry;

use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use serde_json::{json, Value as JsonValue};
use tower_http::cors::CorsLayer;

use config_root::config_root;
use project::{read_file_body, write_file_body};
use registry::{Module, Registry};

#[tokio::main]
async fn main() {
    let root = config_root().expect("config root must resolve");
    let mut registry = Registry::from_atom_baseline(registry::DEFAULT_REGISTRY_ATOM)
        .expect("default registry must parse");
    // Merge third-party drop-in declarations from ~/.config/autoos/modules.d/.
    // A missing directory is fine (no third-party modules installed); malformed
    // files are skipped with a warning so one bad drop-in can't break the daemon.
    let dropins_dir = root.join("modules.d");
    match registry.merge_dropins(&dropins_dir) {
        Ok(n) => println!("loaded {n} drop-in module(s) from {}", dropins_dir.display()),
        Err(e) => eprintln!("[registry] drop-in scan failed: {e}"),
    }
    let state = Arc::new(AppState {
        registry,
        config_root: root,
    });

    let app = Router::new()
        // Module discovery — the front-end fetches this to build the sidebar.
        .route("/api/modules", get(list_modules))
        // Single-file config (Shape A).
        .route("/api/config/:module_id", get(get_config).put(put_config))
        // Collection config (Shape B): a directory of homogeneous entities.
        .route(
            "/api/collection/:module_id",
            get(collection::list_collection).post(collection::create_entity),
        )
        .route(
            "/api/collection/:module_id/:name",
            get(collection::get_entity)
                .put(collection::put_entity)
                .delete(collection::delete_entity),
        )
        // Convention enum sources — drive dropdowns/multi-selects.
        .route("/api/enums/tiers", get(enum_tiers))
        .route("/api/enums/dir/:kind", get(enum_dir))
        .route(
            "/api/enums/self/:module_id/providers",
            get(enum_self_providers),
        )
        .route(
            "/api/enums/self/:module_id/models/:provider",
            get(enum_self_models),
        )
        // Custom action: test the daemon connection (proxies to aaid :17654).
        .route("/api/action/test-daemon", axum::routing::post(action_test_daemon))
        // Health.
        .route("/api/health", get(health))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = "127.0.0.1:17701";
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("auto-os-config-daemon listening on http://{addr}");
    println!("config root: {}", config_root().unwrap_or_default().display());
    axum::serve(listener, app).await.unwrap();
}

/// Shared app state.
pub(crate) struct AppState {
    pub(crate) registry: Registry,
    pub(crate) config_root: PathBuf,
}

// ---- helpers --------------------------------------------------------------

/// Resolve a module from the registry, or 404.
fn require_module<'a>(state: &'a AppState, id: &str) -> Result<&'a Module, ApiError> {
    state
        .registry
        .find(id)
        .ok_or_else(|| ApiError::not_found(format!("module '{id}' not registered")))
}

/// Read a registered file module's content + expected root.
fn read_file_module(state: &AppState, id: &str) -> Result<(String, String, String), ApiError> {
    let module = require_module(state, id)?;
    let file_mod = match module {
        Module::File(f) => f,
        _ => {
            return Err(ApiError::bad_request(format!(
                "module '{id}' is a collection, not a single file"
            )))
        }
    };
    let path = state.config_root.join(&file_mod.file);
    let content = std::fs::read_to_string(&path).map_err(|e| {
        ApiError::not_found(format!(
            "could not read {} ({}): {e}",
            file_mod.file,
            path.display()
        ))
    })?;
    Ok((content, file_mod.root.clone(), file_mod.file.clone()))
}

/// Write a registered file module's content, with a `.bak` backup first.
fn write_file_module(
    state: &AppState,
    id: &str,
    new_content: &str,
) -> Result<String, ApiError> {
    let module = require_module(state, id)?;
    let file_mod = match module {
        Module::File(f) => f,
        _ => {
            return Err(ApiError::bad_request(format!(
                "module '{id}' is a collection, not a single file"
            )))
        }
    };
    let path = state.config_root.join(&file_mod.file);

    // .bak backup of the current content (best-effort; ignore if missing).
    if let Ok(old) = std::fs::read_to_string(&path) {
        let _ = std::fs::write(format!("{}.bak", path.display()), old);
    }
    std::fs::write(&path, new_content)
        .map_err(|e| ApiError::internal(format!("write failed: {e}")))?;
    Ok(file_mod.file.clone())
}

// ---- handlers: Shape A (single-file config) -------------------------------

/// `GET /api/config/:module_id` → `{ "value": <body JSON>, "meta": {file, root} }`
async fn get_config(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
) -> Result<Response, ApiError> {
    let (content, root, file) = read_file_module(&state, &module_id)?;
    let value = read_file_body(&content, &root)?;
    Ok(Json(json!({
        "value": value,
        "meta": { "file": file, "root": root }
    }))
    .into_response())
}

/// `PUT /api/config/:module_id` body `{ "value": <body JSON> }`.
///
/// Merges the body into the CURRENT file's AST (so untouched fields/comments-in-
/// structure survive), serializes, writes a `.bak`, then the new content.
async fn put_config(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
    Json(body): Json<PutBody>,
) -> Result<Response, ApiError> {
    let (content, root, _file) = read_file_module(&state, &module_id)?;
    let new_source = write_file_body(&content, &root, &body.value)?;
    let written = write_file_module(&state, &module_id, &new_source)?;
    Ok(Json(json!({
        "ok": true,
        "file": written,
        "note": "rewritten from AST; comments and original formatting are not preserved — see the .bak file"
    }))
    .into_response())
}

#[derive(serde::Deserialize)]
struct PutBody {
    value: JsonValue,
}

// ---- handlers: convention enums -------------------------------------------

#[derive(Serialize)]
struct EnumOption {
    value: String,
    label: String,
}

/// `GET /api/enums/tiers` → the closed tier set `min/lite/mid/pro/max`.
async fn enum_tiers() -> Json<Vec<EnumOption>> {
    Json(
        ["min", "lite", "mid", "pro", "max"]
            .into_iter()
            .map(|t| EnumOption {
                value: t.into(),
                label: t.into(),
            })
            .collect(),
    )
}

/// `GET /api/enums/dir/:kind` → names from a config directory.
///
/// `kind` ∈ {`roles`, `skills`, `modes`}. Scans the corresponding directory
/// under the config root:
///   - roles/modes → `<name>.at` files (name = stem)
///   - skills → `<name>/SKILL.md` (name = subdirectory)
///
/// Returns `[]` when the directory doesn't exist (e.g. modes is builtin-only
/// on a fresh install) — the front-end falls back to free-text input.
async fn enum_dir(
    State(state): State<Arc<AppState>>,
    Path(kind): Path<String>,
) -> Result<Json<Vec<EnumOption>>, ApiError> {
    let dir = state.config_root.join(&kind);
    let mut out: Vec<EnumOption> = Vec::new();
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Json(out)), // missing dir → empty list
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if kind == "skills" {
            // skills live in <dir>/<name>/SKILL.md
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if path.join("SKILL.md").exists() {
                        out.push(EnumOption {
                            value: name.into(),
                            label: name.into(),
                        });
                    }
                }
            }
        } else {
            // roles/modes → *.at
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if let Some(stem) = name.strip_suffix(".at") {
                    if !stem.ends_with(".bak") {
                        out.push(EnumOption {
                            value: stem.into(),
                            label: stem.into(),
                        });
                    }
                }
            }
        }
    }
    Ok(Json(out))
}

/// `GET /api/enums/self/:module_id/providers` → provider block names defined
/// in a file module. A provider is a child node of the root that has a `kind`
/// prop (matches the convention used by auto-ai's `parse_provider_blocks`).
async fn enum_self_providers(
    State(state): State<Arc<AppState>>,
    Path(module_id): Path<String>,
) -> Result<Json<Vec<EnumOption>>, ApiError> {
    let (content, root, _file) = read_file_module(&state, &module_id)?;
    let node = project::parse_root(&content, &root)?;
    let mut out = Vec::new();
    for (_, kid) in node.kids_iter() {
        if let auto_val::Kid::Node(child) = kid {
            // Heuristic: a child with a non-empty `kind` prop is a provider.
            let kind_val = child.get_prop_of("kind");
            if !matches!(kind_val, auto_val::Value::Nil | auto_val::Value::Null | auto_val::Value::Void) {
                let name = child.name.to_string();
                if !name.is_empty() {
                    out.push(EnumOption {
                        value: name.clone(),
                        label: name,
                    });
                }
            }
        }
    }
    Ok(Json(out))
}

/// `GET /api/enums/self/:module_id/models/:provider` → `models[].id` values
/// inside the named provider block.
async fn enum_self_models(
    State(state): State<Arc<AppState>>,
    Path((module_id, provider)): Path<(String, String)>,
) -> Result<Json<Vec<EnumOption>>, ApiError> {
    let (content, root, _file) = read_file_module(&state, &module_id)?;
    let node = project::parse_root(&content, &root)?;
    let mut out = Vec::new();
    for (_, kid) in node.kids_iter() {
        if let auto_val::Kid::Node(child) = kid {
            if child.name.as_str() == provider {
                let models = child.get_prop_of("models");
                if let auto_val::Value::Array(arr) = models {
                    for item in &arr.values {
                        if let auto_val::Value::Obj(o) = item {
                            let id = o.get_str_of("id").to_string();
                            if !id.is_empty() {
                                out.push(EnumOption {
                                    value: id.clone(),
                                    label: id,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(Json(out))
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "ok": true }))
}

// ---- handler: module discovery --------------------------------------------

/// A sidebar-ready module entry (the shape the frontend consumes).
#[derive(Serialize)]
struct ModuleEntry {
    id: String,
    kind: String,
    name: String,
    icon: String,
    description: String,
    group: String,
    /// Present only for `custom` modules (the remote bundle URL).
    remote: Option<String>,
}

/// `GET /api/modules` → the merged registry, flattened for the sidebar.
///
/// This is the single source of truth the frontend fetches (Plan 003): it
/// replaces the hardcoded sidebar list. Drop-in modules appear here
/// automatically. `name` falls back to `id` when a module didn't declare one.
async fn list_modules(State(state): State<Arc<AppState>>) -> Json<Vec<ModuleEntry>> {
    let entries = state
        .registry
        .modules
        .iter()
        .map(|m| {
            let d = m.display();
            ModuleEntry {
                id: m.id().to_string(),
                kind: m.kind().to_string(),
                name: d.name.clone().unwrap_or_else(|| m.id().to_string()),
                icon: d.icon.clone().unwrap_or_default(),
                description: d.description.clone().unwrap_or_default(),
                group: d.group.clone().unwrap_or_default(),
                remote: m.remote().map(|s| s.to_string()),
            }
        })
        .collect();
    Json(entries)
}

// ---- handler: test daemon connection (proxies to aaid) --------------------

/// `POST /api/action/test-daemon` body `{ use_default: true }`.
///
/// Reads `ai-daemon.at`, resolves the default provider's `kind`, `base_url`,
/// `api_key`, and the default model id, then POSTs to aaid's
/// `:17654/v1/config/test` which issues a real 10-token completion. If aaid is
/// offline → 503 so the front-end can show an "offline" state.
async fn action_test_daemon(
    State(state): State<Arc<AppState>>,
    Json(body): Json<TestDaemonBody>,
) -> Result<Response, ApiError> {
    use serde_json::Value as J;

    if !body.use_default {
        return Err(ApiError::bad_request("only use_default:true is supported"));
    }

    // Resolve defaults + provider details from the file (no network yet).
    let (content, _root, _file) = read_file_module(&state, "ai-daemon")?;
    let node = project::parse_root(&content, "daemon")?;
    let default_provider = node.get_prop_of("default_provider");
    let provider_name = default_provider.as_str().to_string();
    let default_model = node.get_prop_of("default_model");
    let model = default_model.as_str().to_string();

    let provider_node = node
        .kids_iter()
        .find_map(|(_, k)| match k {
            auto_val::Kid::Node(c) if c.name.as_str() == provider_name => Some(c.as_ref()),
            _ => None,
        })
        .ok_or_else(|| {
            ApiError::bad_request(format!("provider '{provider_name}' not found in config"))
        })?;
    let kind = provider_node.get_prop_of("kind").as_str().to_string();
    let base_url = provider_node.get_prop_of("base_url").as_str().to_string();
    let api_key = provider_node.get_prop_of("api_key").as_str().to_string();

    if base_url.is_empty() {
        return Err(ApiError::bad_request("provider has no base_url"));
    }

    // Proxy to aaid. We let aaid do the actual LLM call (it has the HTTP
    // client + provider-specific request shaping).
    let client = reqwest::Client::new();
    let req_body = json!({
        "kind": kind,
        "base_url": base_url,
        "api_key": api_key,
        "model": model,
    });
    let resp = client
        .post("http://127.0.0.1:17654/v1/config/test")
        .json(&req_body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await;

    match resp {
        Err(_) => Err(ApiError::Status(
            StatusCode::SERVICE_UNAVAILABLE,
            "AI Daemon (aaid) offline on :17654".into(),
        )),
        Ok(r) => {
            let status = r.status();
            let j: J = r.json().await.unwrap_or(J::Null);
            Ok((status, Json(j)).into_response())
        }
    }
}

#[derive(serde::Deserialize)]
struct TestDaemonBody {
    #[serde(default)]
    use_default: bool,
}

// ---- error handling -------------------------------------------------------

/// App-level error that maps to proper HTTP status codes.
pub(crate) enum ApiError {
    Status(StatusCode, String),
}

impl ApiError {
    pub(crate) fn not_found(msg: impl Into<String>) -> Self {
        ApiError::Status(StatusCode::NOT_FOUND, msg.into())
    }
    pub(crate) fn bad_request(msg: impl Into<String>) -> Self {
        ApiError::Status(StatusCode::BAD_REQUEST, msg.into())
    }
    pub(crate) fn internal(msg: impl Into<String>) -> Self {
        ApiError::Status(StatusCode::INTERNAL_SERVER_ERROR, msg.into())
    }
}

impl From<project::ProjectError> for ApiError {
    fn from(e: project::ProjectError) -> Self {
        use project::ProjectError as E;
        match e {
            E::RootMismatch { .. } => ApiError::bad_request(e.to_string()),
            _ => ApiError::bad_request(e.to_string()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (code, msg) = match self {
            ApiError::Status(c, m) => (c, m),
        };
        (code, Json(json!({ "error": msg }))).into_response()
    }
}
