//! Module registry — declarative mapping from module id → config file/dir.
//!
//! Two sources, merged at startup:
//!   - [`DEFAULT_REGISTRY_TOML`]: the built-in modules (system-level baseline).
//!   - drop-in files under `~/.config/autoos/modules.d/*.toml`: third-party
//!     modules self-register here, **zero edits to auto-os-config's source**.
//!     A drop-in with an id that already exists in the baseline *overrides*
//!     it (so a module can customize its declaration).
//!
//! Each module is one of three kinds:
//!   - `file`       → a single config file holding one root node (`daemon { … }`)
//!   - `collection` → a directory of homogeneous entity files (`roles/*.at`)
//!   - `custom`     → a remote component providing bespoke UX, loaded via the
//!     `createComponent(Vue)` factory protocol (Plan 003 §2). The daemon still
//!     serves that module's config data via `/api/config/:id` etc.; only the
//!     *view* is custom.

use serde::{Deserialize, Serialize};
use std::path::Path;

/// A registered config module.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Module {
    /// A single config file holding one root node (e.g. `daemon { … }`).
    File(FileModule),
    /// A directory of homogeneous entity files (e.g. `roles/*.at`).
    Collection(CollectionModule),
    /// A remote component providing custom UX (loaded by the host via the
    /// `createComponent(Vue)` factory). Config data still flows through the
    /// daemon's `/api/config/:id` endpoints.
    Custom(CustomModule),
}

/// Display metadata shared by all kinds (optional; the sidebar falls back to
/// the `id` for the name when absent). Centralized here so a drop-in TOML can
/// declare how a third-party module appears without touching frontend code.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct DisplayMeta {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    /// Sidebar group label; empty/None = top-level standalone item.
    #[serde(default)]
    pub group: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FileModule {
    pub id: String,
    /// Path relative to the config root (`~/.config/autoos/`).
    pub file: String,
    /// Expected root node name (e.g. "daemon", "musk"). Guards merges.
    pub root: String,
    #[serde(flatten)]
    pub display: DisplayMeta,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CollectionModule {
    pub id: String,
    /// Directory relative to the config root (e.g. "roles", "skills").
    pub dir: String,
    /// Per-entity file suffix (default `.at`).
    #[serde(default = "default_entity_suffix")]
    pub entity_suffix: String,
    /// Expected root node name for atom-format entities (e.g. "role").
    /// Required for `format = atom`; ignored for `frontmatter-md`.
    #[serde(default)]
    pub entity_root: Option<String>,
    /// Optional paired sidecar suffix (e.g. `.soul.md` for roles).
    #[serde(default)]
    pub sidecar_suffix: Option<String>,
    /// Entity format: `atom` (default) or `frontmatter-md` (SKILL.md + YAML).
    #[serde(default)]
    pub format: EntityFormat,
    #[serde(flatten)]
    pub display: DisplayMeta,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CustomModule {
    pub id: String,
    /// URL of the remote ESM bundle exporting `createComponent(Vue)`.
    pub remote: String,
    #[serde(flatten)]
    pub display: DisplayMeta,
}

fn default_entity_suffix() -> String {
    ".at".into()
}

#[derive(Debug, Clone, Deserialize, Serialize, Default, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum EntityFormat {
    /// auto-atom `.at` file (default).
    #[default]
    Atom,
    /// Markdown with YAML frontmatter (e.g. SKILL.md).
    FrontmatterMd,
}

impl Module {
    pub fn id(&self) -> &str {
        match self {
            Module::File(f) => &f.id,
            Module::Collection(c) => &c.id,
            Module::Custom(c) => &c.id,
        }
    }

    /// The kind tag serialized to the frontend (`"file"`/`"collection"`/`"custom"`).
    pub fn kind(&self) -> &'static str {
        match self {
            Module::File(_) => "file",
            Module::Collection(_) => "collection",
            Module::Custom(_) => "custom",
        }
    }

    pub fn display(&self) -> &DisplayMeta {
        match self {
            Module::File(f) => &f.display,
            Module::Collection(c) => &c.display,
            Module::Custom(c) => &c.display,
        }
    }

    /// For `custom` modules, the remote bundle URL; otherwise `None`.
    pub fn remote(&self) -> Option<&str> {
        match self {
            Module::Custom(c) => Some(&c.remote),
            _ => None,
        }
    }
}

/// The loaded registry.
#[derive(Debug, Clone, Default)]
pub struct Registry {
    pub modules: Vec<Module>,
}

impl Registry {
    /// Load from a TOML string (the built-in baseline or a single drop-in).
    pub fn from_toml(src: &str) -> Result<Self, RegistryError> {
        #[derive(Deserialize)]
        struct Raw {
            #[serde(default, rename = "module")]
            modules: Vec<Module>,
        }
        let raw: Raw = toml::from_str(src).map_err(|e| RegistryError::Parse(e.to_string()))?;
        Ok(Registry { modules: raw.modules })
    }

    /// Look up a module by id.
    pub fn find(&self, id: &str) -> Option<&Module> {
        self.modules.iter().find(|m| m.id() == id)
    }

    /// Merge drop-in TOML files from a directory. Each `*.toml` is parsed as a
    /// standalone registry and its modules are folded in, **replacing** any
    /// same-id baseline entry (drop-ins override built-ins). Missing directory
    /// is not an error — it just means no third-party modules installed.
    ///
    /// Parse errors in individual files are collected but do NOT abort the
    /// whole merge: a malformed drop-in is skipped with a warning logged, so
    /// one bad file can't take down the daemon. Returns the count added.
    pub fn merge_dropins(&mut self, dir: &Path) -> Result<usize, RegistryError> {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return Ok(0), // no modules.d/ → nothing to merge
        };
        let mut added = 0usize;
        for entry in entries.flatten() {
            let path = entry.path();
            // Only *.toml files; skip backups and hidden files.
            if path.extension().and_then(|e| e.to_str()) != Some("toml") {
                continue;
            }
            let src = match std::fs::read_to_string(&path) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[registry] skip unreadable {}: {e}", path.display());
                    continue;
                }
            };
            match Self::from_toml(&src) {
                Ok(dropin) => {
                    for m in dropin.modules {
                        // Override any same-id entry (baseline or earlier drop-in).
                        if let Some(pos) = self.modules.iter().position(|x| x.id() == m.id()) {
                            self.modules[pos] = m;
                        } else {
                            self.modules.push(m);
                            added += 1;
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[registry] skip malformed {}: {e}", path.display());
                }
            }
        }
        Ok(added)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("registry parse error: {0}")]
    Parse(String),
}

/// The default registry, embedded so the daemon works with zero config.
/// Third-party modules add themselves via drop-in files in
/// `~/.config/autoos/modules.d/` (see [`Registry::merge_dropins`]) instead of
/// editing this.
pub const DEFAULT_REGISTRY_TOML: &str = r#"
[[module]]
kind = "file"
id = "ai-daemon"
file = "ai-daemon.at"
root = "daemon"
name = "AI Daemon"
icon = "🔌"
description = "LLM providers, API keys, model tiers"

[[module]]
kind = "file"
id = "auto-musk"
file = "apps/musk/config.at"
root = "musk"
name = "Auto Musk"
icon = "🦌"
description = "Musk app: daemon, defaults, harness"

[[module]]
kind = "collection"
id = "roles"
dir = "roles"
entity_suffix = ".at"
entity_root = "role"
sidecar_suffix = ".soul.md"
name = "Roles"
icon = "🎭"
description = "Agent roles: soul, skills, tiers"
group = "Harness"

[[module]]
kind = "collection"
id = "skills"
dir = "skills"
format = "frontmatter-md"
name = "Skills"
icon = "🧩"
description = "Skill registry and prompts"
group = "Harness"
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_registry_loads() {
        let r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        assert_eq!(r.modules.len(), 4);
        assert!(matches!(r.find("ai-daemon"), Some(Module::File(_))));
        assert!(matches!(r.find("auto-musk"), Some(Module::File(_))));
        assert!(matches!(r.find("roles"), Some(Module::Collection(_))));
        assert!(matches!(r.find("skills"), Some(Module::Collection(_))));
    }

    #[test]
    fn collection_defaults_applied() {
        let r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        match r.find("roles") {
            Some(Module::Collection(c)) => {
                assert_eq!(c.entity_suffix, ".at");
                assert_eq!(c.entity_root.as_deref(), Some("role"));
                assert_eq!(c.sidecar_suffix.as_deref(), Some(".soul.md"));
                assert_eq!(c.format, EntityFormat::Atom);
            }
            _ => panic!("expected collection"),
        }
    }

    #[test]
    fn skills_uses_frontmatter_format() {
        let r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        match r.find("skills") {
            Some(Module::Collection(c)) => {
                assert_eq!(c.format, EntityFormat::FrontmatterMd);
            }
            _ => panic!("expected collection"),
        }
    }

    #[test]
    fn display_fields_parsed() {
        let r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        let daemon = r.find("ai-daemon").unwrap();
        assert_eq!(daemon.display().name.as_deref(), Some("AI Daemon"));
        assert_eq!(daemon.display().icon.as_deref(), Some("🔌"));
    }

    #[test]
    fn custom_module_kind() {
        let src = r#"
[[module]]
kind = "custom"
id = "my-mod"
remote = "http://127.0.0.1:9000/cp.js"
name = "My Mod"
"#;
        let r = Registry::from_toml(src).unwrap();
        match r.find("my-mod") {
            Some(Module::Custom(c)) => {
                assert_eq!(c.remote, "http://127.0.0.1:9000/cp.js");
                assert_eq!(c.display.name.as_deref(), Some("My Mod"));
            }
            _ => panic!("expected custom"),
        }
    }

    #[test]
    fn merge_dropins_missing_dir_is_ok() {
        let mut r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        let n = r.merge_dropins(std::path::Path::new("/nonexistent/path/xyz")).unwrap();
        assert_eq!(n, 0);
        assert_eq!(r.modules.len(), 4); // unchanged
    }

    #[test]
    fn merge_dropins_adds_and_overrides() {
        let tmp = tempfile_dir();
        // A new third-party module.
        std::fs::write(
            tmp.join("newmod.toml"),
            r#"
[[module]]
kind = "file"
id = "newmod"
file = "newmod.at"
root = "newmod"
name = "New Mod"
"#,
        )
        .unwrap();
        // An override of an existing built-in (re-skin ai-daemon's display).
        std::fs::write(
            tmp.join("override.toml"),
            r#"
[[module]]
kind = "file"
id = "ai-daemon"
file = "ai-daemon.at"
root = "daemon"
name = "My Custom Daemon"
"#,
        )
        .unwrap();
        // A malformed file (should be skipped, not abort the merge).
        std::fs::write(tmp.join("broken.toml"), "this is not toml {{{").unwrap();
        // A non-toml file (should be ignored).
        std::fs::write(tmp.join("README.md"), "# hi").unwrap();

        let mut r = Registry::from_toml(DEFAULT_REGISTRY_TOML).unwrap();
        let base_len = r.modules.len();
        let added = r.merge_dropins(&tmp).unwrap();
        assert_eq!(added, 1, "only the genuinely new module counts as added");
        assert_eq!(r.modules.len(), base_len + 1);
        // new module present
        assert!(matches!(r.find("newmod"), Some(Module::File(_))));
        // override took effect
        match r.find("ai-daemon") {
            Some(Module::File(f)) => assert_eq!(f.display.name.as_deref(), Some("My Custom Daemon")),
            _ => panic!("ai-daemon should still be a file module"),
        }
        // exactly one ai-daemon (override replaced, not duplicated)
        assert_eq!(r.modules.iter().filter(|m| m.id() == "ai-daemon").count(), 1);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// Create a unique temp directory for a test (avoids pulling in the
    /// `tempfile` crate for one call).
    fn tempfile_dir() -> std::path::PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!(
            "autoos-regtest-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(&p).unwrap();
        p
    }
}
