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
