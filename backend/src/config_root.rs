//! Config root resolution.
//!
//! All AutoOS config lives under `~/.config/autoos/` (resolved via
//! `dirs::home_dir()`), matching the convention already used by auto-ai and
//! auto-musk. We deliberately do NOT use `dirs::config_dir()` (which on
//! Windows returns %APPDATA%) — keeping one path across the whole stack avoids
//! splitting config between two locations.

use std::path::PathBuf;

/// Resolve the config root: `~/.config/autoos`.
pub fn config_root() -> Result<PathBuf, ConfigRootError> {
    let home = dirs::home_dir().ok_or(ConfigRootError::NoHome)?;
    Ok(home.join(".config").join("autoos"))
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigRootError {
    #[error("could not determine home directory")]
    NoHome,
}
