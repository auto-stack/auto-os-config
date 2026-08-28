//! auto-os-config-back-server — 形态 b 的 vue 模式 HTTP 服务面(Plan 011 T1 POC)。
//!
//! auto-ai-daemon / 旧 backend/ daemon 同款形态:axum main 起服务,端点在
//! Rust 侧实现(vue 模式 = 前端 api.ts → HTTP;POC 端点族 /api/hello、
//! /api/config-probe,T3 加 /api/system-info)。CORS 全开(与旧 daemon 一致,
//! 本机开发面)。
//!
//! 端口:POC 用 AUTOOS_BACK_PORT(默认 17901,scratch 段,不撞旧 daemon
//! :17701);端口策略沿用/定案在 T8。

use auto_os_config_back::{collection, core, system_info_json};
use axum::extract::{Path, Json as ExtractJson};
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use tower_http::cors::CorsLayer;

async fn hello() -> Json<serde_json::Value> {
    Json(serde_json::json!("poc-hello"))
}

async fn config_probe() -> Json<serde_json::Value> {
    Json(serde_json::json!(auto_os_config_back::config_probe_public()))
}

/// T3:GET /api/system-info — 与 cdylib 桥共享同一实现(单实现双传输)。
async fn system_info() -> Json<serde_json::Value> {
    Json(system_info_json())
}

/// T4:GET /api/modules — merged registry(core::modules_json,与旧 daemon
/// ModuleEntry 同字段)。
async fn modules() -> Json<serde_json::Value> {
    Json(core::modules_json())
}

/// T5:GET /api/config/:module_id → {value, meta:{file, root}}。
async fn get_config(
    Path(module_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    core::get_config_json(&module_id)
        .map(Json)
        .map_err(|e| config_error(&e))
}

/// T5:PUT /api/config/:module_id(body {value})→ {ok, file, note}。
async fn put_config(
    Path(module_id): Path<String>,
    ExtractJson(body): ExtractJson<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let value = body.get("value").cloned().unwrap_or(serde_json::Value::Null);
    core::put_config_json(&module_id, &value)
        .map(Json)
        .map_err(|e| config_error(&e))
}

/// T5:DELETE /api/config/:module_id/blocks/:name → {ok, file, note}。
async fn delete_block(
    Path((module_id, name)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    core::delete_block_json(&module_id, &name)
        .map(Json)
        .map_err(|e| config_error(&e))
}

// ── T7:enums + action + health ──────────────────────────────────────────────

/// GET /api/enums/tiers。
async fn enum_tiers() -> Json<serde_json::Value> {
    Json(core::enum_tiers_json())
}

/// GET /api/enums/dir/:kind。
async fn enum_dir(
    Path(kind): Path<String>,
) -> Json<serde_json::Value> {
    Json(core::enum_dir_json(&kind))
}

/// GET /api/enums/self/:module_id/providers。
async fn enum_self_providers(
    Path(module_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    core::enum_self_providers_json(&module_id)
        .map(Json)
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))))
}

/// GET /api/enums/self/:module_id/models/:provider。
async fn enum_self_models(
    Path((module_id, provider)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    core::enum_self_models_json(&module_id, &provider)
        .map(Json)
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": e }))))
}

/// POST /api/action/test-daemon(aaid 代理;离线 → 503)。
async fn action_test_daemon() -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match core::test_daemon_proxy() {
        Ok((status, body)) => (
            axum::http::StatusCode::from_u16(status).unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR),
            Json(body),
        ),
        Err(e) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// GET /api/health。
async fn health() -> Json<serde_json::Value> {
    Json(core::health_json())
}

// ── T6:collection CRUD(Shape B)─────────────────────────────────────────────

/// CollectionError → 旧 daemon 同款 HTTP 映射(体 {error})。
fn collection_error(e: &collection::CollectionError) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (
        axum::http::StatusCode::from_u16(e.status()).unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR),
        Json(serde_json::json!({ "error": e.to_string() })),
    )
}

/// GET /api/collection/:module_id → [{name, description}]。
async fn list_collection(
    Path(module_id): Path<String>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    collection::list_collection_json(&module_id)
        .map(Json)
        .map_err(|e| collection_error(&e))
}

/// GET /api/collection/:module_id/:name。
async fn get_entity(
    Path((module_id, name)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    collection::get_entity_json(&module_id, &name)
        .map(Json)
        .map_err(|e| collection_error(&e))
}

/// POST /api/collection/:module_id(body {name})。
async fn create_entity(
    Path(module_id): Path<String>,
    ExtractJson(body): ExtractJson<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let name = body["name"].as_str().unwrap_or_default().to_string();
    collection::create_entity_json(&module_id, &name)
        .map(Json)
        .map_err(|e| collection_error(&e))
}

/// PUT /api/collection/:module_id/:name(body {value, sidecar?})。
async fn put_entity(
    Path((module_id, name)): Path<(String, String)>,
    ExtractJson(body): ExtractJson<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let value = body.get("value").cloned().unwrap_or(serde_json::Value::Null);
    let sidecar = body["sidecar"].as_str().map(|s| s.to_string());
    collection::put_entity_json(&module_id, &name, &value, sidecar.as_deref())
        .map(Json)
        .map_err(|e| collection_error(&e))
}

/// DELETE /api/collection/:module_id/:name。
async fn delete_entity(
    Path((module_id, name)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    collection::delete_entity_json(&module_id, &name)
        .map(Json)
        .map_err(|e| collection_error(&e))
}

/// 旧 daemon 错误映射:not found → 404,其余 → 400(响应体 {error})。
fn config_error(msg: &str) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let status = if msg.contains("not registered")
        || msg.contains("could not read")
        || msg.contains("not found")
    {
        axum::http::StatusCode::NOT_FOUND
    } else {
        axum::http::StatusCode::BAD_REQUEST
    };
    (status, Json(serde_json::json!({ "error": msg })))
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("AUTOOS_BACK_PORT")
        .ok()
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(17901);
    let addr = format!("127.0.0.1:{port}");

    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/api/hello", get(hello))
        .route("/api/config-probe", get(config_probe))
        .route("/api/system-info", get(system_info))
        .route("/api/modules", get(modules))
        .route("/api/config/:module_id", get(get_config).put(put_config))
        .route(
            "/api/config/:module_id/blocks/:name",
            delete(delete_block),
        )
        .route(
            "/api/collection/:module_id",
            get(list_collection).post(create_entity),
        )
        .route(
            "/api/collection/:module_id/:name",
            get(get_entity).put(put_entity).delete(delete_entity),
        )
        .route("/api/enums/tiers", get(enum_tiers))
        .route("/api/enums/dir/:kind", get(enum_dir))
        .route("/api/enums/self/:module_id/providers", get(enum_self_providers))
        .route("/api/enums/self/:module_id/models/:provider", get(enum_self_models))
        .route("/api/action/test-daemon", post(action_test_daemon))
        .route("/api/health", get(health))
        .layer(cors);

    println!("auto-os-config-back-server on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
