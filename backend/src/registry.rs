//! Module registry — declarative mapping from module id → config file/dir.
//!
//! Registry declarations use the **auto-atom** format (the same `.at` format as
//! every other config under `~/.config/autoos/`), so the whole config tree is
//! consistent and drop-in files are themselves editable by the generic editor.
//!
//! Two sources, merged at startup:
//!   - [`DEFAULT_REGISTRY_ATOM`]: the built-in modules (system-level baseline).
//!   - drop-in files under `~/.config/autoos/modules.d/*.at`: third-party
//!     modules self-register here, **zero edits to auto-os-config's source**.
//!     A drop-in whose id already exists in the baseline *overrides* it.
//!
//! Each module is one of three kinds:
//!   - `file`       → a single config file holding one root node (`daemon { … }`)
//!   - `collection` → a directory of homogeneous entity files (`roles/*.at`)
//!   - `custom`     → a remote component providing bespoke UX, loaded via the
//!     `createComponent(Vue)` factory protocol (Plan 003 §2). The daemon still
//!     serves that module's config data via `/api/config/:id` etc.; only the
//!     *view* is custom.
//!
//! ## Format
//!
//! A drop-in file holds exactly ONE `module { … }` block (auto-atom parses a
//! single root value, matching "one module = one file"):
//!
//! ```text
//! module {
//!     kind : file            # file | collection | custom
//!     id : "auto-musk"
//!     file : "apps/musk/config.at"
//!     root : "musk"
//!     name : "Auto Musk"     # optional display fields
//!     icon : "🦌"
//!     description : "…"
//!     group : ""             # optional; non-empty clusters into a section
//! }
//! ```

use auto_atom::{Atom, AtomParser};
use auto_val::{Kid, Node, Value};
use std::path::Path;

/// A registered config module.
#[derive(Debug, Clone)]
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
/// the `id` for the name when absent). Centralized here so a drop-in `.at`
/// can declare how a third-party module appears without touching frontend code.
#[derive(Debug, Clone, Default)]
pub struct DisplayMeta {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub description: Option<String>,
    /// Sidebar group label; empty/None = top-level standalone item.
    pub group: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FileModule {
    pub id: String,
    /// Path relative to the config root (`~/.config/autoos/`).
    pub file: String,
    /// Expected root node name (e.g. "daemon", "musk"). Guards merges.
    pub root: String,
    pub display: DisplayMeta,
}

#[derive(Debug, Clone)]
pub struct CollectionModule {
    pub id: String,
    /// Directory relative to the config root (e.g. "roles", "skills").
    pub dir: String,
    /// Per-entity file suffix (default `.at`).
    pub entity_suffix: String,
    /// Expected root node name for atom-format entities (e.g. "role").
    /// Required for `format = atom`; ignored for `frontmatter-md`.
    pub entity_root: Option<String>,
    /// Optional paired sidecar suffix (e.g. `.soul.md` for roles).
    pub sidecar_suffix: Option<String>,
    /// Entity format: `atom` (default) or `frontmatter-md` (SKILL.md + YAML).
    pub format: EntityFormat,
    pub display: DisplayMeta,
}

#[derive(Debug, Clone)]
pub struct CustomModule {
    pub id: String,
    /// URL of the remote ESM bundle exporting `createComponent(Vue)`.
    pub remote: String,
    pub display: DisplayMeta,
}

#[derive(Debug, Clone, Default, PartialEq)]
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
    /// Parse a single auto-atom `module { … }` declaration into one Module.
    /// (One module per file — matches the drop-in convention.)
    pub fn from_atom(src: &str) -> Result<Self, RegistryError> {
        let atom = AtomParser::parse(src).map_err(|e| RegistryError::Parse(e.to_string()))?;
        let node = expect_module_node(&atom)?;
        let module = parse_module_node(node)?;
        Ok(Registry { modules: vec![module] })
    }

    /// Parse the built-in baseline, which may hold several `module { … }`
    /// blocks under one wrapping `modules { … }` root.
    pub fn from_atom_baseline(src: &str) -> Result<Self, RegistryError> {
        let atom = AtomParser::parse(src).map_err(|e| RegistryError::Parse(e.to_string()))?;
        let root = match atom {
            Atom::Node(n) => n,
            other => {
                return Err(RegistryError::Parse(format!(
                    "expected a root node, found {other:?}"
                )))
            }
        };
        // Children named "module" are the entries; parse each.
        let mut modules = Vec::new();
        for (_key, kid) in root.kids_iter() {
            if let Kid::Node(child) = kid {
                if child.name.as_str() == "module" {
                    modules.push(parse_module_node(child)?);
                }
            }
        }
        Ok(Registry { modules })
    }

    /// Look up a module by id.
    pub fn find(&self, id: &str) -> Option<&Module> {
        self.modules.iter().find(|m| m.id() == id)
    }

    /// Merge drop-in auto-atom files from a directory. Each `*.at` is parsed as
    /// a single `module { … }` declaration and folded in, **replacing** any
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
            // Only *.at files; skip backups and non-atom files.
            if path.extension().and_then(|e| e.to_str()) != Some("at") {
                continue;
            }
            let src = match std::fs::read_to_string(&path) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[registry] skip unreadable {}: {e}", path.display());
                    continue;
                }
            };
            match Self::from_atom(&src) {
                Ok(dropin) => {
                    for m in dropin.modules {
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

// ---- auto-atom field extraction (mirrors role_config.rs / loader.rs) ------

/// Expect the parsed atom to be a single `module { … }` node.
fn expect_module_node(atom: &Atom) -> Result<&Node, RegistryError> {
    match atom {
        Atom::Node(n) if n.name.as_str() == "module" => Ok(n),
        Atom::Node(n) => Err(RegistryError::Parse(format!(
            "expected a 'module' block, found '{}'",
            n.name
        ))),
        other => Err(RegistryError::Parse(format!(
            "expected a 'module' node, found {other:?}"
        ))),
    }
}

/// Parse one `module { kind : …, id : …, … }` node into a [`Module`].
fn parse_module_node(node: &Node) -> Result<Module, RegistryError> {
    let kind = opt_string(node, "kind").unwrap_or_default();
    let id = opt_string(node, "id").ok_or_else(|| {
        RegistryError::Parse("module is missing its `id` field".into())
    })?;
    let display = parse_display(node);

    match kind.as_str() {
        "file" => {
            let file = required_string(node, "file", &id)?;
            let root = required_string(node, "root", &id)?;
            Ok(Module::File(FileModule { id, file, root, display }))
        }
        "collection" => {
            let dir = required_string(node, "dir", &id)?;
            let entity_suffix = opt_string(node, "entity_suffix").unwrap_or_else(|| ".at".into());
            let entity_root = opt_string(node, "entity_root");
            let sidecar_suffix = opt_string(node, "sidecar_suffix");
            let format = match opt_string(node, "format").as_deref() {
                Some("frontmatter-md") => EntityFormat::FrontmatterMd,
                _ => EntityFormat::Atom,
            };
            Ok(Module::Collection(CollectionModule {
                id,
                dir,
                entity_suffix,
                entity_root,
                sidecar_suffix,
                format,
                display,
            }))
        }
        "custom" => {
            let remote = required_string(node, "remote", &id)?;
            Ok(Module::Custom(CustomModule { id, remote, display }))
        }
        other => Err(RegistryError::Parse(format!(
            "module '{id}' has unknown kind '{other}' (expected file|collection|custom)"
        ))),
    }
}

/// Extract the optional display fields (name/icon/description/group).
fn parse_display(node: &Node) -> DisplayMeta {
    DisplayMeta {
        name: opt_string(node, "name"),
        icon: opt_string(node, "icon"),
        description: opt_string(node, "description"),
        group: opt_string(node, "group"),
    }
}

/// Read a string-valued prop, returning None if absent or non-string.
/// Bare idents and quoted strings both parse to `Value::Str`.
fn opt_string(node: &Node, key: &str) -> Option<String> {
    match node.get_prop_of(key) {
        Value::Str(s) => {
            let s = s.to_string();
            if s.is_empty() {
                None
            } else {
                Some(s)
            }
        }
        Value::Nil | Value::Null | Value::Void => None,
        _ => None,
    }
}

/// A required string prop with a helpful error naming the offending module.
fn required_string(node: &Node, key: &str, id: &str) -> Result<String, RegistryError> {
    opt_string(node, key).ok_or_else(|| {
        RegistryError::Parse(format!("module '{id}' is missing required field `{key}`"))
    })
}

/// The default registry, embedded so the daemon works with zero config.
/// Third-party modules add themselves via drop-in `.at` files in
/// `~/.config/autoos/modules.d/` (see [`Registry::merge_dropins`]) instead of
/// editing this.
pub const DEFAULT_REGISTRY_ATOM: &str = r#"
modules {
    module {
        kind : file
        id : "ai-daemon"
        file : "ai-daemon.at"
        root : "daemon"
        name : "AI Daemon"
        icon : "🔌"
        description : "LLM providers, API keys, model tiers"
    }

    module {
        kind : file
        id : "auto-musk"
        file : "apps/musk/config.at"
        root : "musk"
        name : "Auto Musk"
        icon : "🦌"
        description : "Musk app: daemon, defaults, harness"
    }

    module {
        kind : collection
        id : "roles"
        dir : "roles"
        entity_suffix : ".at"
        entity_root : "role"
        sidecar_suffix : ".soul.md"
        name : "Roles"
        icon : "🎭"
        description : "Agent roles: soul, skills, tiers"
        group : "Harness"
    }

    module {
        kind : collection
        id : "skills"
        dir : "skills"
        format : "frontmatter-md"
        name : "Skills"
        icon : "🧩"
        description : "Skill registry and prompts"
        group : "Harness"
    }
}
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_registry_loads() {
        let r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
        assert_eq!(r.modules.len(), 4);
        assert!(matches!(r.find("ai-daemon"), Some(Module::File(_))));
        assert!(matches!(r.find("auto-musk"), Some(Module::File(_))));
        assert!(matches!(r.find("roles"), Some(Module::Collection(_))));
        assert!(matches!(r.find("skills"), Some(Module::Collection(_))));
    }

    #[test]
    fn collection_defaults_applied() {
        let r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
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
        let r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
        match r.find("skills") {
            Some(Module::Collection(c)) => {
                assert_eq!(c.format, EntityFormat::FrontmatterMd);
            }
            _ => panic!("expected collection"),
        }
    }

    #[test]
    fn display_fields_parsed() {
        let r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
        let daemon = r.find("ai-daemon").unwrap();
        assert_eq!(daemon.display().name.as_deref(), Some("AI Daemon"));
        assert_eq!(daemon.display().icon.as_deref(), Some("🔌"));
    }

    #[test]
    fn custom_module_kind() {
        let src = r#"module {
    kind : "custom"
    id : "my-mod"
    remote : "http://127.0.0.1:9000/cp.js"
    name : "My Mod"
}"#;
        let r = Registry::from_atom(src).unwrap();
        match r.find("my-mod") {
            Some(Module::Custom(c)) => {
                assert_eq!(c.remote, "http://127.0.0.1:9000/cp.js");
                assert_eq!(c.display.name.as_deref(), Some("My Mod"));
            }
            _ => panic!("expected custom"),
        }
    }

    #[test]
    fn bare_ident_kind_is_accepted() {
        // kind may be a bare ident (file) or quoted ("file"); both parse to Str.
        let src = "module { kind : file\nid : \"x\"\nfile : \"x.at\"\nroot : \"x\" }";
        let r = Registry::from_atom(src).unwrap();
        assert!(matches!(r.find("x"), Some(Module::File(_))));
    }

    #[test]
    fn missing_id_is_an_error() {
        let src = "module { kind : file\nfile : \"x.at\" }";
        let err = Registry::from_atom(src).unwrap_err();
        assert!(err.to_string().contains("missing its `id`"));
    }

    #[test]
    fn unknown_kind_is_an_error() {
        let src = "module { kind : wat\nid : \"x\" }";
        let err = Registry::from_atom(src).unwrap_err();
        assert!(err.to_string().contains("unknown kind 'wat'"));
    }

    #[test]
    fn merge_dropins_missing_dir_is_ok() {
        let mut r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
        let n = r.merge_dropins(std::path::Path::new("/nonexistent/path/xyz")).unwrap();
        assert_eq!(n, 0);
        assert_eq!(r.modules.len(), 4); // unchanged
    }

    #[test]
    fn merge_dropins_adds_and_overrides() {
        let tmp = tempfile_dir();
        // A new third-party module (.at drop-in).
        std::fs::write(
            tmp.join("newmod.at"),
            "module {\n    kind : file\n    id : \"newmod\"\n    file : \"newmod.at\"\n    root : \"newmod\"\n    name : \"New Mod\"\n}",
        )
        .unwrap();
        // An override of an existing built-in (re-skin ai-daemon's display).
        std::fs::write(
            tmp.join("override.at"),
            "module {\n    kind : file\n    id : \"ai-daemon\"\n    file : \"ai-daemon.at\"\n    root : \"daemon\"\n    name : \"My Custom Daemon\"\n}",
        )
        .unwrap();
        // A malformed file (should be skipped, not abort the merge).
        std::fs::write(tmp.join("broken.at"), "this is not atom {{{").unwrap();
        // A non-.at file (should be ignored).
        std::fs::write(tmp.join("README.md"), "# hi").unwrap();

        let mut r = Registry::from_atom_baseline(DEFAULT_REGISTRY_ATOM).unwrap();
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

    /// Create a unique temp directory for a test.
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
