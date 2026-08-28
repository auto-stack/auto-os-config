//! auto-os-config-back — Plan 061 外部后端 cdylib(Plan 011 T1 POC)。
//!
//! 导出 Plan 061 ABI 两符号(backend_abi.rs):
//!   `auto_backend_abi_version`  ABI 版本(不匹配拒载)
//!   `auto_backend_register`     把端点实现注册进宿主桥(vm::host_bridge)
//!
//! 双形态裁决开关(AUTOOS_BACK_BRIDGE):
//!   `=0`(形态 a):空注册 —— 宿主 has_host_calls() 为 false,#[api] 裸调用
//!      不改写,VM 直接解释 api.at 函数体(纯 .at 实现,零 HTTP);
//!   `≠0/未设`(形态 b,默认):注册 hello / config_probe 的 Rust 实现,
//!      #[api] 裸调用改写 auto.host.call → 本 cdylib(musk 442 同款桥)。

use auto_lang::vm::backend_abi::{BackendHostCallFn, BackendRegistry, BACKEND_ABI_VERSION};
use std::sync::Arc;

pub mod collection;
pub mod config_root;
pub mod core;
pub mod project;
pub mod registry;

#[no_mangle]
pub extern "Rust" fn auto_backend_abi_version() -> u32 {
    BACKEND_ABI_VERSION
}

#[no_mangle]
pub extern "Rust" fn auto_backend_register(reg: Arc<dyn BackendRegistry>) -> Result<(), String> {
    if std::env::var("AUTOOS_BACK_BRIDGE").as_deref() == Ok("0") {
        reg.log("auto-os-config-back: AUTOOS_BACK_BRIDGE=0 — empty registry (form a: #[api] bodies interpret in-VM)");
        return Ok(());
    }
    reg.log("auto-os-config-back: registering api endpoints into host bridge (form b)");

    let hello: BackendHostCallFn = Arc::new(|_args: &str| {
        // 返回 JSON 串(宿主 json.to_value 还原为 VM 值;str → 带引号)。
        Ok("\"poc-hello\"".to_string())
    });
    reg.host_call("hello", hello);

    let probe: BackendHostCallFn = Arc::new(|_args: &str| Ok(json_str(&config_probe_rs())));
    reg.host_call("config_probe", probe);

    // T3:system_info — 对象返回值以 JSON 对象文本过桥(宿主 json.to_value
    // 还原为 VM 对象,前端单跳字段读)。
    let sysinfo: BackendHostCallFn = Arc::new(|_args: &str| Ok(system_info_json().to_string()));
    reg.host_call("system_info", sysinfo);

    // T4:fetchModulesRaw — 前端契约包装 {ok, error, text},text = /api/modules
    // 数组文本;失败 fail-soft(ok:false,VG 传输错误形状),不炸 handler。
    let modules: BackendHostCallFn = Arc::new(|_args: &str| Ok(fetch_modules_raw_payload().to_string()));
    reg.host_call("fetchModulesRaw", modules);

    // T5:config get/put/delete-block(Shape A)。参数以 {"p":...} JSON 入。
    let fetch_cfg: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let id = a["id"].as_str().unwrap_or_default().to_string();
        Ok(fetch_config_safe_payload(&id).to_string())
    });
    reg.host_call("fetchConfigSafe", fetch_cfg);

    let put_cfg: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let id = a["id"].as_str().unwrap_or_default().to_string();
        let body = a["body"].as_str().unwrap_or_default().to_string();
        Ok(put_config_safe_payload(&id, &body).to_string())
    });
    reg.host_call("putConfigSafe", put_cfg);

    let del_block: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let id = a["id"].as_str().unwrap_or_default().to_string();
        let name = a["name"].as_str().unwrap_or_default().to_string();
        Ok(delete_block_safe_payload(&id, &name).to_string())
    });
    reg.host_call("deleteBlockSafe", del_block);

    // T6:collection CRUD(Shape B)。
    let col_raw: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let mid = a["mid"].as_str().unwrap_or_default().to_string();
        Ok(fetch_collection_list_raw_payload(&mid).to_string())
    });
    reg.host_call("fetchCollectionListRaw", col_raw);

    let col_safe: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let mid = a["mid"].as_str().unwrap_or_default().to_string();
        Ok(fetch_collection_list_safe_payload(&mid).to_string())
    });
    reg.host_call("fetchCollectionListSafe", col_safe);

    let ent_safe: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let (mid, name) = (s(&a, "mid"), s(&a, "name"));
        Ok(fetch_entity_safe_payload(&mid, &name).to_string())
    });
    reg.host_call("fetchEntitySafe", ent_safe);

    let ent_flat: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let (mid, name) = (s(&a, "mid"), s(&a, "name"));
        Ok(fetch_entity_flat_payload(&mid, &name).to_string())
    });
    reg.host_call("fetchEntityFlat", ent_flat);

    let ent_create: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let (mid, name) = (s(&a, "mid"), s(&a, "name"));
        Ok(create_entity_safe_payload(&mid, &name).to_string())
    });
    reg.host_call("createEntitySafe", ent_create);

    let ent_put: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let (mid, name) = (s(&a, "mid"), s(&a, "name"));
        let body = a["body"].as_str().unwrap_or_default().to_string();
        let sidecar = a["sidecar"].as_str().unwrap_or_default().to_string();
        Ok(put_entity_safe_payload(&mid, &name, &body, &sidecar).to_string())
    });
    reg.host_call("putEntitySafe", ent_put);

    let ent_delete: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let (mid, name) = (s(&a, "mid"), s(&a, "name"));
        Ok(delete_entity_safe_payload(&mid, &name).to_string())
    });
    reg.host_call("deleteEntitySafe", ent_delete);

    // T7:enums + test-daemon action。
    let load_enum: BackendHostCallFn = Arc::new(|args: &str| {
        let a: serde_json::Value = serde_json::from_str(args).map_err(|e| e.to_string())?;
        let url = a["url"].as_str().unwrap_or_default().to_string();
        Ok(load_enum_payload(&url).to_string())
    });
    reg.host_call("loadEnum", load_enum);

    let test_daemon: BackendHostCallFn = Arc::new(|_args: &str| Ok(test_daemon_payload().to_string()));
    reg.host_call("testDaemon", test_daemon);

    Ok(())
}

/// config_probe 的 Rust 实现(与 api.at 函数体同语义:可读即 ok)。
fn config_probe_rs() -> String {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    if home.is_empty() {
        return "ai-daemon.at:missing".to_string();
    }
    let path = std::path::Path::new(&home)
        .join(".config")
        .join("autoos")
        .join("ai-daemon.at");
    match std::fs::read_to_string(&path) {
        Ok(s) if !s.is_empty() => "ai-daemon.at:ok".to_string(),
        _ => "ai-daemon.at:missing".to_string(),
    }
}

// ── T3:system_info — 单一 Rust 实现,双传输共享(桥 + axum bin)──────────
// 数据源:hostname/CPU 取 env(COMPUTERNAME / PROCESSOR_IDENTIFIER,与计划
// 指定一致);os 版本/内存/存储取 Windows API(RtlGetVersion /
// GlobalMemoryStatusEx / GetDiskFreeSpaceExW);任一能力缺失该字段登记
// "n/a"(待澄清#3 的方案①,直桥 Windows API,无子进程开销)。

/// system_info 的唯一实现:返回扁平 JSON 对象(VM 侧单跳字段读,VG12/13)。
pub fn system_info_json() -> serde_json::Value {
    let na = serde_json::Value::String("n/a".to_string());
    let (os_version, memory_total_mb, memory_free_mb, storage_total_gb, storage_free_gb) =
        if cfg!(windows) {
            let v = windows_os_version().map(serde_json::Value::from).unwrap_or(na.clone());
            let (mt, mf) = windows_memory_mb();
            let (st, sf) = windows_storage_gb();
            (
                v,
                mt.map(serde_json::Value::from).unwrap_or(na.clone()),
                mf.map(serde_json::Value::from).unwrap_or(na.clone()),
                st.map(serde_json::Value::from).unwrap_or(na.clone()),
                sf.map(serde_json::Value::from).unwrap_or(na),
            )
        } else {
            (na.clone(), na.clone(), na.clone(), na.clone(), na)
        };
    let hostname = env_or_na("COMPUTERNAME")
        .or_else(|| env_or_na("HOSTNAME"))
        .unwrap_or_else(|| "n/a".to_string());
    let cpu = env_or_na("PROCESSOR_IDENTIFIER").unwrap_or_else(|| "n/a".to_string());
    serde_json::json!({
        "os_name": std::env::consts::OS,
        "os_version": os_version,
        "hostname": hostname,
        "cpu": cpu,
        "memory_total_mb": memory_total_mb,
        "memory_free_mb": memory_free_mb,
        "storage_total_gb": storage_total_gb,
        "storage_free_gb": storage_free_gb,
    })
}

/// env 读取,空值归 None。
fn env_or_na(key: &str) -> Option<String> {
    match std::env::var(key) {
        Ok(v) if !v.trim().is_empty() => Some(v),
        _ => None,
    }
}

#[cfg(windows)]
fn windows_os_version() -> Option<String> {
    use windows_sys::Wdk::System::SystemServices::RtlGetVersion;
    type OsVersionInfo = windows_sys::Win32::System::SystemInformation::OSVERSIONINFOW;
    unsafe {
        let mut v: OsVersionInfo = std::mem::zeroed();
        v.dwOSVersionInfoSize = std::mem::size_of::<OsVersionInfo>() as u32;
        if RtlGetVersion(&mut v) == 0 {
            Some(format!("{}.{}.{}", v.dwMajorVersion, v.dwMinorVersion, v.dwBuildNumber))
        } else {
            None
        }
    }
}

#[cfg(not(windows))]
fn windows_os_version() -> Option<String> {
    None
}

#[cfg(windows)]
fn windows_memory_mb() -> (Option<f64>, Option<f64>) {
    use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    unsafe {
        let mut m: MEMORYSTATUSEX = std::mem::zeroed();
        m.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
        if GlobalMemoryStatusEx(&mut m) != 0 {
            (
                Some(m.ullTotalPhys as f64 / 1024.0 / 1024.0),
                Some(m.ullAvailPhys as f64 / 1024.0 / 1024.0),
            )
        } else {
            (None, None)
        }
    }
}

#[cfg(not(windows))]
fn windows_memory_mb() -> (Option<f64>, Option<f64>) {
    (None, None)
}

/// 存储取 ~/.config/autoos 所在盘的容量/余量(GB)——配置数据就在那块盘上。
#[cfg(windows)]
fn windows_storage_gb() -> (Option<f64>, Option<f64>) {
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    if home.is_empty() {
        return (None, None);
    }
    let root = std::path::Path::new(&home)
        .join(".config")
        .join("autoos");
    let wide: Vec<u16> = root
        .to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut free: u64 = 0;
    let mut total: u64 = 0;
    let mut total_free: u64 = 0;
    unsafe {
        if GetDiskFreeSpaceExW(wide.as_ptr(), &mut free, &mut total, &mut total_free) != 0 {
            (
                Some(total as f64 / 1024.0 / 1024.0 / 1024.0),
                Some(total_free as f64 / 1024.0 / 1024.0 / 1024.0),
            )
        } else {
            (None, None)
        }
    }
}

#[cfg(not(windows))]
fn windows_storage_gb() -> (Option<f64>, Option<f64>) {
    (None, None)
}

/// JSON 字符串编码(str 返回值过桥形态)。
fn json_str(s: &str) -> String {
    serde_json::to_string(s).unwrap_or_else(|_| "\"\"".to_string())
}

/// config_probe 公开面(axum bin 与桥同源,单实现双传输)。
pub fn config_probe_public() -> String {
    config_probe_rs()
}

/// 桥参数取串的小助手(缺省空串)。
fn s(a: &serde_json::Value, key: &str) -> String {
    a[key].as_str().unwrap_or_default().to_string()
}

/// fetchModulesRaw 的前端契约载荷:{ok, error, text}(text = /api/modules
/// 数组 JSON 文本)。core 恐慌(如 config root 缺失)fail-soft 为传输错误形状
/// ——桥 Err 会让 VM handler 崩(VG7 回滚),这里必须 Ok 包装。
pub fn fetch_modules_raw_payload() -> serde_json::Value {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(core::modules_json)) {
        Ok(text) => serde_json::json!({ "ok": true, "error": "", "text": text.to_string() }),
        Err(_) => serde_json::json!({ "ok": false, "error": "registry unavailable", "text": "" }),
    }
}

/// fetchConfigSafe 的前端契约载荷:{ok, value, meta} | {ok:false, error}。
pub fn fetch_config_safe_payload(id: &str) -> serde_json::Value {
    match core::get_config_json(id) {
        Ok(v) => serde_json::json!({ "ok": true, "value": v["value"], "meta": v["meta"] }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Failed to load config" }),
    }
}

/// putConfigSafe 的前端契约载荷(旧配方写后 GET 验证;直写等价,{ok} 契约)。
pub fn put_config_safe_payload(id: &str, body_text: &str) -> serde_json::Value {
    let parsed: serde_json::Result<serde_json::Value> =
        serde_json::from_str(body_text);
    match parsed
        .map_err(|e| e.to_string())
        .and_then(|value| core::put_config_json(id, &value))
    {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Save failed (config unreadable after PUT)" }),
    }
}

/// deleteBlockSafe 的前端契约载荷:{ok} | {ok:false, error}。
pub fn delete_block_safe_payload(id: &str, name: &str) -> serde_json::Value {
    match core::delete_block_json(id, name) {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Delete request failed" }),
    }
}

// ── T6:collection CRUD 的前端契约载荷(形状循旧 http 配方,fail-soft)────────

/// fetchCollectionListRaw:{ok, error, text}(text = 实体数组 JSON 文本)。
pub fn fetch_collection_list_raw_payload(mid: &str) -> serde_json::Value {
    match collection::list_collection_json(mid) {
        Ok(arr) => serde_json::json!({ "ok": true, "error": "", "text": arr.to_string() }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Failed to load collection", "text": "" }),
    }
}

/// fetchCollectionListSafe:{ok, list} | {ok:false, error}(list 逐项扁平)。
pub fn fetch_collection_list_safe_payload(mid: &str) -> serde_json::Value {
    match collection::list_collection_json(mid) {
        Ok(arr) => {
            let list: Vec<serde_json::Value> = arr
                .as_array()
                .map(|a| {
                    a.iter()
                        .map(|e| {
                            serde_json::json!({
                                "name": e["name"].as_str().unwrap_or_default(),
                                "description": e["description"].as_str().unwrap_or_default(),
                            })
                        })
                        .collect()
                })
                .unwrap_or_default();
            serde_json::json!({ "ok": true, "list": list })
        }
        Err(_) => serde_json::json!({ "ok": false, "error": "Failed to load collection" }),
    }
}

/// fetchEntitySafe:atom → {ok, atom:{value, sidecar}, fm:null};
/// frontmatter-md → {ok, atom:null, fm:{name, description, body}}。
pub fn fetch_entity_safe_payload(mid: &str, name: &str) -> serde_json::Value {
    match collection::get_entity_json(mid, name) {
        Ok(ent) => {
            if ent.get("value").is_some() {
                serde_json::json!({
                    "ok": true,
                    "atom": { "value": ent["value"].to_string(), "sidecar": ent["sidecar"] },
                    "fm": null,
                })
            } else {
                serde_json::json!({
                    "ok": true,
                    "atom": null,
                    "fm": {
                        "name": ent["name"],
                        "description": ent["description"],
                        "body": ent["body"],
                    },
                })
            }
        }
        Err(_) => serde_json::json!({ "ok": false, "error": "Failed to load entity" }),
    }
}

/// fetchEntityFlat:VG12/13 扁平形状(is_atom/value/sidecar/fm_*)。
pub fn fetch_entity_flat_payload(mid: &str, name: &str) -> serde_json::Value {
    match collection::get_entity_json(mid, name) {
        Ok(ent) => {
            if ent.get("value").is_some() {
                serde_json::json!({
                    "ok": true, "error": "", "is_atom": true,
                    "value": ent["value"].to_string(),
                    "sidecar": ent["sidecar"],
                    "fm_name": "", "fm_description": "", "fm_body": "",
                })
            } else {
                serde_json::json!({
                    "ok": true, "error": "", "is_atom": false,
                    "value": "", "sidecar": "",
                    "fm_name": ent["name"],
                    "fm_description": ent["description"],
                    "fm_body": ent["body"],
                })
            }
        }
        Err(_) => serde_json::json!({
            "ok": false, "error": "Failed to load entity", "is_atom": false,
            "value": "", "sidecar": "", "fm_name": "", "fm_description": "", "fm_body": "",
        }),
    }
}

/// createEntitySafe:{ok} | {ok:false, error:"Create failed"}。
pub fn create_entity_safe_payload(mid: &str, name: &str) -> serde_json::Value {
    match collection::create_entity_json(mid, name) {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Create failed" }),
    }
}

/// putEntitySafe:{ok} | {ok:false, error:"Save failed"}(body 为对象 JSON 文本)。
pub fn put_entity_safe_payload(mid: &str, name: &str, body: &str, sidecar: &str) -> serde_json::Value {
    let parsed: serde_json::Result<serde_json::Value> = serde_json::from_str(body);
    let sidecar_opt = if sidecar.is_empty() { None } else { Some(sidecar) };
    match serde_json::from_str::<serde_json::Value>(body)
        .map_err(|e| e.to_string())
        .and_then(|value| {
            collection::put_entity_json(mid, name, &value, sidecar_opt)
                .map_err(|e| e.to_string())
        })
    {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Save failed" }),
    }
}

/// deleteEntitySafe:{ok} | {ok:false, error:"Delete failed"}。
pub fn delete_entity_safe_payload(mid: &str, name: &str) -> serde_json::Value {
    match collection::delete_entity_json(mid, name) {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(_) => serde_json::json!({ "ok": false, "error": "Delete failed" }),
    }
}

// ── T7:enums + testDaemon 的前端契约载荷 ────────────────────────────────────

/// loadEnum 的桥载荷:url 按路径语义分派(/api/enums/tiers | /api/enums/dir/:kind
/// | /api/enums/self/:mid/providers | /api/enums/self/:mid/models/:provider);
/// 返回选项数组 JSON 文本(旧配方返回原始响应文本;数组即数组)。
pub fn load_enum_payload(url: &str) -> serde_json::Value {
    let path = url
        .split("://")
        .nth(1)
        .and_then(|rest| rest.split_once('/'))
        .map(|(_, p)| format!("/{}", p))
        .unwrap_or_else(|| url.to_string());
    let segs: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    // segs 形如 ["api","enums",...] 或未知(→ 空数组,fail-soft)
    let value = if segs.len() >= 3 && segs[0] == "api" && segs[1] == "enums" {
        match (segs[2], segs.len()) {
            ("tiers", 3) => core::enum_tiers_json(),
            ("dir", 4) => core::enum_dir_json(segs[3]),
            ("self", 5) if segs[4] == "providers" => core::enum_self_providers_json(segs[3])
                .unwrap_or_else(|_| serde_json::json!([])),
            ("self", 7) if segs[4] == "models" => {
                core::enum_self_models_json(segs[3], segs[5]).unwrap_or_else(|_| serde_json::json!([]))
            }
            _ => serde_json::json!([]),
        }
    } else {
        serde_json::json!([])
    };
    value
}

/// testDaemon 的前端契约载荷:{status, latency, error}(unreachable/ok/fail,
/// 形状与语义同旧 http 配方)。
pub fn test_daemon_payload() -> serde_json::Value {
    match core::test_daemon_proxy() {
        Err(_) => serde_json::json!({ "status": "unreachable", "latency": 0, "error": "" }),
        Ok((status, body)) => {
            if status == 503 {
                // aaid 离线(旧配方:单键 error 对象 = 传输错误 → unreachable)
                return serde_json::json!({ "status": "unreachable", "latency": 0, "error": "" });
            }
            let success = body["success"].as_bool().unwrap_or(false);
            if success {
                serde_json::json!({ "status": "ok", "latency": 0, "error": "" })
            } else {
                let err = body["error"].as_str().unwrap_or("bad response").to_string();
                serde_json::json!({ "status": "fail", "latency": 0, "error": err })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// T3:system_info 字段齐全且类型成立(实机值;CI/无显存环境不假设具体值)。
    #[test]
    fn system_info_fields_present_and_typed() {
        let v = system_info_json();
        let obj = v.as_object().expect("system_info must be a JSON object");
        for key in [
            "os_name",
            "os_version",
            "hostname",
            "cpu",
            "memory_total_mb",
            "memory_free_mb",
            "storage_total_gb",
            "storage_free_gb",
        ] {
            assert!(obj.contains_key(key), "missing field: {key}");
        }
        // env 来源字段在本机必有值
        assert!(obj["hostname"].as_str().map(|s| !s.is_empty()).unwrap_or(false));
        assert!(obj["cpu"].as_str().map(|s| !s.is_empty()).unwrap_or(false));
        // 数值字段:windows 上 RtlGetVersion/GlobalMemoryStatusEx 不应失败
        assert!(obj["memory_total_mb"].as_f64().unwrap_or(0.0) > 0.0);
        assert!(obj["memory_free_mb"].as_f64().unwrap_or(0.0) >= 0.0);
        assert!(obj["storage_total_gb"].as_f64().unwrap_or(0.0) > 0.0);
        // os_version 形如 major.minor.build
        let ver = obj["os_version"].as_str().unwrap_or("");
        let parts: Vec<_> = ver.split('.').collect();
        assert_eq!(parts.len(), 3, "os_version must be major.minor.build, got {ver}");
    }

    /// 过桥形态:system_info 的桥返回必须是可解析 JSON(to_value 还原为对象)。
    #[test]
    fn system_info_bridge_payload_is_json() {
        let s = system_info_json().to_string();
        let parsed: serde_json::Value = serde_json::from_str(&s).expect("bridge payload must be JSON");
        assert!(parsed.is_object());
    }

    /// T4 桥返回形状:fetchModulesRaw 的前端契约包装 {ok, error, text}。
    #[test]
    fn fetch_modules_raw_bridge_shape() {
        let payload = fetch_modules_raw_payload();
        assert_eq!(payload["ok"], true);
        assert_eq!(payload["error"], "");
        let text = payload["text"].as_str().expect("text carries the array");
        let arr: serde_json::Value = serde_json::from_str(text).expect("text is JSON array");
        assert_eq!(arr.as_array().unwrap().len(), 7);
    }

    /// T7:loadEnum 桥载荷按 url 路径语义分派。
    #[test]
    fn load_enum_routes_by_url() {
        let tiers = load_enum_payload("http://127.0.0.1:17701/api/enums/tiers");
        let arr = tiers.as_array().unwrap();
        assert_eq!(arr.len(), 5);
        assert_eq!(arr[0]["value"], "min");
        let modes = load_enum_payload("http://127.0.0.1:17701/api/enums/dir/modes");
        assert!(modes.is_array(), "dir enum returns array (possibly empty)");
        let unknown = load_enum_payload("http://127.0.0.1:17701/api/enums/bogus/x");
        assert_eq!(unknown.as_array().unwrap().len(), 0, "unknown → fail-soft []");
    }
}
