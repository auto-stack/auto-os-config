//! Module registry — the small, declarative mapping that drives everything.
//!
//! Each module is either a single config **file** (`daemon { … }` in
//! `ai-daemon.at`) or a **collection** of homogeneous entities (one per file
//! in a directory, e.g. `roles/*.at`). The front-end sidebar carries the
//! display metadata (name/icon/description/group) keyed by the same `id`.

use serde::Deserialize;

/// A registered config module.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Module {
    /// A single config file holding one root node (e.g. `daemon { … }`).
    File(FileModule),
    /// A directory of homogeneous entity files (e.g. `roles/*.at`).
    Collection(CollectionModule),
}

#[derive(Debug, Clone, Deserialize)]
pub struct FileModule {
    pub id: String,
    /// Path relative to the config root (`~/.config/autoos/`).
    pub file: String,
    /// Expected root node name (e.g. "daemon", "musk"). Guards merges.
    pub root: String,
}

#[derive(Debug, Clone, Deserialize)]
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
}

fn default_entity_suffix() -> String {
    ".at".into()
}

#[derive(Debug, Clone, Deserialize, Default, PartialEq)]
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
        }
    }
}

/// The loaded registry.
#[derive(Debug, Clone, Default)]
pub struct Registry {
    pub modules: Vec<Module>,
}

impl Registry {
    /// Load from a TOML string.
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
}

#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("registry parse error: {0}")]
    Parse(String),
}

/// The default registry, embedded so the daemon works with zero config.
/// Front-end sidebar metadata mirrors these ids (see `src/modules.registry.ts`).
pub const DEFAULT_REGISTRY_TOML: &str = r#"
[[module]]
kind = "file"
id = "ai-daemon"
file = "ai-daemon.at"
root = "daemon"

[[module]]
kind = "file"
id = "auto-musk"
file = "apps/musk/config.at"
root = "musk"

[[module]]
kind = "collection"
id = "roles"
dir = "roles"
entity_suffix = ".at"
entity_root = "role"
sidecar_suffix = ".soul.md"

[[module]]
kind = "collection"
id = "skills"
dir = "skills"
format = "frontmatter-md"
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
}
