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
    reg.log("auto-os-config-back: registering hello / config_probe into host bridge (form b)");

    let hello: BackendHostCallFn = Arc::new(|_args: &str| {
        // 返回 JSON 串(宿主 json.to_value 还原为 VM 值;str → 带引号)。
        Ok("\"poc-hello\"".to_string())
    });
    reg.host_call("hello", hello);

    let probe: BackendHostCallFn = Arc::new(|_args: &str| Ok(json_str(&config_probe_rs())));
    reg.host_call("config_probe", probe);

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

/// JSON 字符串编码(str 返回值过桥形态)。
fn json_str(s: &str) -> String {
    serde_json::to_string(s).unwrap_or_else(|_| "\"\"".to_string())
}
