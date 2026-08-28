//! core — 端点共享核心(T4 起):同一实现供 cdylib 桥(vm merged 直调)与
//! axum bin(vue HTTP)双传输消费,单实现双语义来源(Plan 011 复审记录 §T1
//! 裁决依据 2)。数据面全部落 `~/.config/autoos`(config_root 惯例不变)。

use crate::config_root::config_root;
use crate::project;
use crate::registry::{Module, Registry, DEFAULT_REGISTRY_ATOM};

/// config root 的 unwrap 形态(collection.rs 等模块共用;root 无法解析即 panic
/// ——与旧 daemon 的 `expect("config root must resolve")` 同语义)。
pub fn config_root_unwrap() -> std::path::PathBuf {
    config_root().unwrap_or_else(|e| panic!("config root must resolve: {e}"))
}

/// baseline(内嵌 DEFAULT_REGISTRY_ATOM)+ modules.d 热注册,每次重算
/// (与旧 daemon 的 per-request merged 同语义:drop-in 运行期加入即生效)。
pub fn merged_registry() -> Registry {
    let baseline = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM)
        .expect("default registry must parse")
        .modules;
    let root = config_root_unwrap();
    Registry::merged_with_dropins(&baseline, &root.join("modules.d"))
}

/// Resolve a module from the fresh merged view, or error(移植自旧 daemon
/// require_module;drop-in 运行期注册无需重启)。
fn require_module(id: &str) -> Result<Module, String> {
    merged_registry()
        .find(id)
        .cloned()
        .ok_or_else(|| format!("module '{id}' not registered"))
}

/// Read a registered file module's content + expected root + relative path.
fn read_file_module(id: &str) -> Result<(String, String, String), String> {
    let module = require_module(id)?;
    let file_mod = match module {
        Module::File(f) => f,
        _ => return Err(format!("module '{id}' is a collection, not a single file")),
    };
    let path = config_root().map_err(|e| e.to_string())?.join(&file_mod.file);
    let content = std::fs::read_to_string(&path).map_err(|e| {
        format!(
            "could not read {} ({}): {e}",
            file_mod.file,
            path.display()
        )
    })?;
    Ok((content, file_mod.root.clone(), file_mod.file.clone()))
}

/// Write a registered file module's content, with a `.bak` backup first.
fn write_file_module(id: &str, new_content: &str) -> Result<String, String> {
    let module = require_module(id)?;
    let file_mod = match module {
        Module::File(f) => f,
        _ => return Err(format!("module '{id}' is a collection, not a single file")),
    };
    let path = config_root().map_err(|e| e.to_string())?.join(&file_mod.file);
    if let Ok(old) = std::fs::read_to_string(&path) {
        let _ = std::fs::write(format!("{}.bak", path.display()), old);
    }
    std::fs::write(&path, new_content).map_err(|e| format!("write failed: {e}"))?;
    Ok(file_mod.file.clone())
}

// ── Shape A(single-file config,Plan 005)────────────────────────────────────

/// `GET /api/config/:module_id` → `{ "value": <body>, "meta": {file, root} }`。
pub fn get_config_json(id: &str) -> Result<serde_json::Value, String> {
    let (content, root, file) = read_file_module(id)?;
    let value = project::read_file_body(&content, &root).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "value": value,
        "meta": { "file": file, "root": root }
    }))
}

/// `PUT /api/config/:module_id`(body `{ "value": <body> }`):merge 进当前
/// AST 后序列化写盘(.bak 先行)。响应 `{ok, file, note}`。
pub fn put_config_json(id: &str, value: &serde_json::Value) -> Result<serde_json::Value, String> {
    let (content, root, _file) = read_file_module(id)?;
    let new_source = project::write_file_body(&content, &root, value).map_err(|e| e.to_string())?;
    let written = write_file_module(id, &new_source)?;
    Ok(serde_json::json!({
        "ok": true,
        "file": written,
        "note": "rewritten from AST; comments and original formatting are not preserved — see the .bak file"
    }))
}

/// `DELETE /api/config/:module_id/blocks/:name` — 结构化删块(.bak 先行)。
pub fn delete_block_json(id: &str, name: &str) -> Result<serde_json::Value, String> {
    let (content, root, _file) = read_file_module(id)?;
    let new_source = project::delete_child_node(&content, &root, name).map_err(|e| match e {
        project::ProjectError::NotFound(m) => m,
        other => other.to_string(),
    })?;
    let written = write_file_module(id, &new_source)?;
    Ok(serde_json::json!({
        "ok": true,
        "file": written,
        "note": "block deleted; original preserved in the .bak file"
    }))
}

/// `GET /api/modules` 的响应体:merged registry 摊平为侧栏条目数组。
/// 字段与旧 daemon 的 ModuleEntry 逐一同名同语义(id/kind/name/icon/
/// description/group/remote/format;name 缺省回退 id)。
pub fn modules_json() -> serde_json::Value {
    let entries: Vec<serde_json::Value> = merged_registry()
        .modules
        .iter()
        .map(|m| {
            let d = m.display();
            serde_json::json!({
                "id": m.id(),
                "kind": m.kind(),
                "name": d.name.clone().unwrap_or_else(|| m.id().to_string()),
                "icon": d.icon.clone().unwrap_or_default(),
                "description": d.description.clone().unwrap_or_default(),
                "group": d.group.clone().unwrap_or_default(),
                "remote": m.remote().map(|s| s.to_string()),
                "format": m.format().map(|s| s.to_string()),
            })
        })
        .collect();
    serde_json::Value::Array(entries)
}

// ── T7:enums + action + health ──────────────────────────────────────────────

/// `GET /api/enums/tiers` → 封闭 tier 集 min/lite/mid/pro/max。
pub fn enum_tiers_json() -> serde_json::Value {
    serde_json::Value::Array(
        ["min", "lite", "mid", "pro", "max"]
            .iter()
            .map(|t| serde_json::json!({ "value": t, "label": t }))
            .collect(),
    )
}

/// `GET /api/enums/dir/:kind` → 配置目录名清单(roles/modes 取 *.at 名;
/// skills 取 <name>/SKILL.md 子目录)。目录缺失 → [](前端回退自由文本)。
pub fn enum_dir_json(kind: &str) -> serde_json::Value {
    let dir = match config_root() {
        Ok(r) => r.join(kind),
        Err(_) => return serde_json::json!([]),
    };
    let mut out: Vec<serde_json::Value> = Vec::new();
    let entries = match std::fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return serde_json::json!([]),
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if kind == "skills" {
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if path.join("SKILL.md").exists() {
                        out.push(serde_json::json!({ "value": name, "label": name }));
                    }
                }
            }
        } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if let Some(stem) = name.strip_suffix(".at") {
                if !stem.ends_with(".bak") {
                    out.push(serde_json::json!({ "value": stem, "label": stem }));
                }
            }
        }
    }
    serde_json::Value::Array(out)
}

/// `GET /api/enums/self/:module_id/providers` → 文件模块里带 `kind` prop 的
/// 子节点名(provider 约定,同 auto-ai parse_provider_blocks)。
pub fn enum_self_providers_json(module_id: &str) -> Result<serde_json::Value, String> {
    let (content, root, _file) = read_file_module(module_id)?;
    let node = project::parse_root(&content, &root).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for (_, kid) in node.kids_iter() {
        if let auto_val::Kid::Node(child) = kid {
            let kind_val = child.get_prop_of("kind");
            if !matches!(kind_val, auto_val::Value::Nil | auto_val::Value::Null | auto_val::Value::Void) {
                let name = child.name.to_string();
                if !name.is_empty() {
                    out.push(serde_json::json!({ "value": name, "label": name }));
                }
            }
        }
    }
    Ok(serde_json::Value::Array(out))
}

/// `GET /api/enums/self/:module_id/models/:provider` → 指定 provider 块内
/// `models[].id` 清单。
pub fn enum_self_models_json(module_id: &str, provider: &str) -> Result<serde_json::Value, String> {
    let (content, root, _file) = read_file_module(module_id)?;
    let node = project::parse_root(&content, &root).map_err(|e| e.to_string())?;
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
                                out.push(serde_json::json!({ "value": id, "label": id }));
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(serde_json::Value::Array(out))
}

/// `GET /api/health`。
pub fn health_json() -> serde_json::Value {
    serde_json::json!({ "ok": true })
}

/// `POST /api/action/test-daemon`:解析 ai-daemon.at 的默认 provider,向 aaid
/// `:17654/v1/config/test` 发真实 10-token 测试。返回 (HTTP 状态, 响应体)
/// ——与旧 daemon 的代理语义一致(aaid 离线 → (503, {error})。
/// 传输用 std TcpStream 裸 HTTP(localhost 小 JSON,无 chunked;同步可用性
/// 使桥闭包与 axum handler 共用同一实现,免 tokio 运行时嵌套)。
pub fn test_daemon_proxy() -> Result<(u16, serde_json::Value), String> {
    let (content, root, _file) = read_file_module("ai-daemon")?;
    let node = project::parse_root(&content, &root).map_err(|e| e.to_string())?;
    let aaid_addr = aaid_listen_addr(&node);
    let provider_name = node.get_prop_of("default_provider").as_str().to_string();
    let model = node.get_prop_of("default_model").as_str().to_string();

    let provider_node = node
        .kids_iter()
        .find_map(|(_, k)| match k {
            auto_val::Kid::Node(c) if c.name.as_str() == provider_name => Some(c.as_ref()),
            _ => None,
        })
        .ok_or_else(|| format!("provider '{provider_name}' not found in config"))?;
    let kind = provider_node.get_prop_of("kind").as_str().to_string();
    let base_url = provider_node.get_prop_of("base_url").as_str().to_string();
    let api_key = provider_node.get_prop_of("api_key").as_str().to_string();
    if base_url.is_empty() {
        return Err("provider has no base_url".to_string());
    }

    let body = serde_json::json!({
        "kind": kind,
        "base_url": base_url,
        "api_key": api_key,
        "model": model,
    })
    .to_string();

    match local_http_post_json(&aaid_addr, "/v1/config/test", &body) {
        Ok((status, text)) => {
            let parsed: serde_json::Value =
                serde_json::from_str(&text).unwrap_or(serde_json::json!(null));
            Ok((status, parsed))
        }
        Err(_) => Ok((
            503,
            serde_json::json!({ "error": format!("AI Daemon (aaid) offline on {aaid_addr}") }),
        )),
    }
}

/// 从 daemon 配置解析 aaid 监听地址(listen_addr 的端口段;缺省 17654;
/// 恒拨 127.0.0.1——移植自旧 daemon aaid_listen_addr)。
fn aaid_listen_addr(node: &auto_val::Node) -> String {
    let listen = node.get_prop_of("listen_addr");
    let port = listen
        .as_str()
        .rsplit(':')
        .next()
        .filter(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
        .unwrap_or("17654");
    format!("127.0.0.1:{port}")
}

/// 极简同步 HTTP/1.1 POST JSON(localhost 面向 aaid/axum:小响应带
/// Content-Length)。返回 (状态码, 响应体文本)。
fn local_http_post_json(addr: &str, path: &str, body: &str) -> Result<(u16, String), String> {
    use std::io::{Read, Write};
    let mut stream = std::net::TcpStream::connect(addr).map_err(|e| e.to_string())?;
    stream
        .set_read_timeout(Some(std::time::Duration::from_secs(20)))
        .map_err(|e| e.to_string())?;
    let req = format!(
        "POST {path} HTTP/1.1\r\nHost: {addr}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream.write_all(req.as_bytes()).map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    stream.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&buf).to_string();
    let status: u16 = text
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| "bad HTTP status line".to_string())?;
    let body_text = match text.split("\r\n\r\n").nth(1) {
        Some(b) => b.to_string(),
        None => String::new(),
    };
    Ok((status, body_text))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T4:/api/modules 形状——7 个内置模块,字段与旧 daemon 同名。
    #[test]
    fn modules_json_shape_matches_legacy_daemon() {
        let v = modules_json();
        let arr = v.as_array().expect("modules endpoint returns an array");
        assert_eq!(arr.len(), 7, "baseline registry has 7 built-in modules");
        let first = &arr[0];
        for key in ["id", "kind", "name", "icon", "description", "group", "format"] {
            assert!(first.get(key).is_some(), "missing field: {key}");
        }
        let ids: Vec<&str> = arr
            .iter()
            .filter_map(|e| e.get("id").and_then(|v| v.as_str()))
            .collect();
        for expected in ["ai-daemon", "auto-musk", "roles", "skills", "ai-client", "modes", "musk-harness-roles"] {
            assert!(ids.contains(&expected), "missing module id: {expected}");
        }
        // skills 声明 frontmatter-md(驱动前端 read_only 判定)
        let skills = arr.iter().find(|e| e["id"] == "skills").unwrap();
        assert_eq!(skills["format"], "frontmatter-md");
    }

    /// T5:config get → put → get 回环,值与 meta 同旧 daemon 契约
    /// (读写真机 ~/.config/autoos/ai-daemon.at,.bak 备份先行)。
    #[test]
    fn config_get_put_roundtrip() {
        // GET:形如 {value:{...}, meta:{file,root}}
        let got = get_config_json("ai-daemon").expect("ai-daemon readable");
        assert!(got["value"].is_object(), "value is the body object");
        assert_eq!(got["meta"]["file"], "ai-daemon.at");
        assert_eq!(got["meta"]["root"], "daemon");

        // PUT:回写同一 value(全量 merge 语义)——成功返回 ok+file
        let put = put_config_json("ai-daemon", &got["value"]).expect("put ok");
        assert_eq!(put["ok"], true);
        assert_eq!(put["file"], "ai-daemon.at");

        // GET:回环一致
        let got2 = get_config_json("ai-daemon").expect("readable after put");
        assert_eq!(got2["value"], got["value"], "roundtrip preserves the body");
    }

    /// T5:put 的 .bak 备份确实产生且非空。
    #[test]
    fn put_creates_bak() {
        let bak = config_root().unwrap().join("ai-daemon.at.bak");
        let before = std::fs::read_to_string(&bak).ok();
        let got = get_config_json("ai-daemon").unwrap();
        let _ = put_config_json("ai-daemon", &got["value"]).unwrap();
        let after = std::fs::read_to_string(&bak).expect(".bak written");
        assert!(!after.is_empty());
        if let Some(b) = before {
            // 内容未变时 .bak 应与之前内容一致(幂等)
            assert_eq!(after, b);
        }
    }
}
