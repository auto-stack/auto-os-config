//! core — 端点共享核心(T4 起):同一实现供 cdylib 桥(vm merged 直调)与
//! axum bin(vue HTTP)双传输消费,单实现双语义来源(Plan 011 复审记录 §T1
//! 裁决依据 2)。数据面全部落 `~/.config/autoos`(config_root 惯例不变)。

use crate::config_root::config_root;
use crate::registry::{Registry, DEFAULT_REGISTRY_ATOM};

/// baseline(内嵌 DEFAULT_REGISTRY_ATOM)+ modules.d 热注册,每次重算
/// (与旧 daemon 的 per-request merged 同语义:drop-in 运行期加入即生效)。
pub fn merged_registry() -> Registry {
    let baseline = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM)
        .expect("default registry must parse")
        .modules;
    let root = config_root().unwrap_or_else(|e| panic!("config root must resolve: {e}"));
    Registry::merged_with_dropins(&baseline, &root.join("modules.d"))
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
}
