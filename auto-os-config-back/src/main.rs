//! auto-os-config-back-server — 形态 b 的 vue 模式 HTTP 服务面(Plan 011 T1 POC)。
//!
//! auto-ai-daemon / 旧 backend/ daemon 同款形态:axum main 起服务,端点在
//! Rust 侧实现(vue 模式 = 前端 api.ts → HTTP;POC 端点族 /api/hello、
//! /api/config-probe,T3 加 /api/system-info)。CORS 全开(与旧 daemon 一致,
//! 本机开发面)。
//!
//! 端口:POC 用 AUTOOS_BACK_PORT(默认 17901,scratch 段,不撞旧 daemon
//! :17701);端口策略沿用/定案在 T8。

use auto_os_config_back::{system_info_json, core};
use axum::routing::get;
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
        .layer(cors);

    println!("auto-os-config-back-server on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
