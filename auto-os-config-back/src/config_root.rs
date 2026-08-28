//! Config root resolution(自 backend/src/config_root.rs 移植,Plan 011 T4;
//! home 解析改 env,免 dirs 依赖——与 lib.rs 的 config_probe 同源)。
//!
//! All AutoOS config lives under `~/.config/autoos/`, matching the convention
//! already used by auto-ai and auto-musk. We deliberately do NOT use
//! `dirs::config_dir()` (which on Windows returns %APPDATA%) — keeping one
//! path across the whole stack avoids splitting config between two locations.

use std::path::PathBuf;

/// Resolve the config root: `~/.config/autoos`.
pub fn config_root() -> Result<PathBuf, ConfigRootError> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()
        .filter(|h| !h.trim().is_empty())
        .ok_or(ConfigRootError::NoHome)?;
    Ok(PathBuf::from(home).join(".config").join("autoos"))
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigRootError {
    #[error("could not determine home directory")]
    NoHome,
}
