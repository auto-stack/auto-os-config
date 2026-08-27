# Plan 002: 统一配置架构 — auto-os-config-daemon + schema 驱动通用编辑器

> **状态**：已实施(Phase 1–5) → 已归档(2026-08-04, E2E 复审全过)
> **取代**：Plan 001 的 Phase 2–4(搬手写页面);Plan 001 Phase 1(Rust 后端)被本计划的通用后端取代
> **日期**：2026-08-04
> **核心洞察**：*"不同的配置组件虽然是分散的、注册的,但它们的实现架构可以统一起来,仿佛写在同一个项目里。"*

---

## 0. 三根支柱

| 支柱 | 角色 | 文件 |
|---|---|---|
| **① 统一 daemon** | 唯一的配置读写服务,URL→文件路径按 convention 映射到 `~/.config/autoos/` | `backend/` |
| **② 通用编辑器** | 从 .at 数据形态**自动**渲染表单(Tier 0 结构渲染 + 约定枚举);新模块零前端成本 | `src/components/ConfigEditor.vue`, `src/editor/` |
| **③ 模块注册表** | 分散身份、统一实现:每个模块只声明 id + 文件路径 | `backend/src/registry.rs` (后端),`src/composables/useModules.ts` (前端侧栏) |

---

## 1. 统一 daemon(`backend/`)

axum server on `:17701`。读写**任何** `.at` 配置文件,通过 generic auto-atom AST 投影,**无 per-file-type 代码**。

### 1.1 核心投影层(`project.rs`)
- **读**(`node_body_to_json`):`AtomParser::parse` → `Node` → JSON。Node 体(props + kids)展平为 object;子节点按 **node name** 索引(注意:auto-atom parser 用整数 key 加 child,身份在 `Kid::Node(child).name`)。
- **写**(`merge_node_body`):把 JSON 编辑**折叠进现有 AST**(而非重建)。按 node name 匹配子节点递归;props 原地更新或追加。保留所有节点名、结构、未编辑字段。
- 序列化:`auto_val::AtomSource::to_at_source()`(escape-correct,round-trip 测试覆盖)。**不用** `fmt::Display`(它不转义引号/反斜杠)。

### 1.2 端点
```
GET/PUT  /api/config/:moduleId              单文件配置(Shape A)
GET      /api/collection/:moduleId          集合列表(Shape B)
GET/PUT/POST/DELETE /api/collection/:moduleId/:name
GET      /api/enums/tiers                   闭合枚举 min/lite/mid/pro/max
GET      /api/enums/dir/:kind               roles/skills/modes 目录扫描
GET      /api/enums/self/:moduleId/providers     同文件 AST 里带 kind 的子节点
GET      /api/enums/self/:moduleId/models/:provider
POST     /api/action/test-daemon            代理 aaid :17654/v1/config/test(唯一需 aaid 在线)
GET      /api/health
```

### 1.3 模块注册表(`registry.toml`,默认嵌入 `DEFAULT_REGISTRY_TOML`)
```toml
[[module]]
kind = "file"
id = "ai-daemon"
file = "ai-daemon.at"
root = "daemon"

[[module]]
kind = "collection"
id = "roles"
dir = "roles"
entity_suffix = ".at"
entity_root = "role"
sidecar_suffix = ".soul.md"     # 配对 sidecar:读写时打包/解包

[[module]]
kind = "collection"
id = "skills"
dir = "skills"
format = "frontmatter-md"       # SKILL.md + YAML frontmatter(v1 只读)
```

### 1.4 集合格式
- **atom**:`<name>.at`(root node `role {}`)+ 可选 `<name>.soul.md` sidecar。CRUD 全支持。
- **frontmatter-md**:`<name>/SKILL.md`(`---\nname:\ndescription:\n---` + markdown)。v1 只读 listing + detail。

---

## 2. 通用编辑器(`src/editor/` + `src/components/`)

### 2.1 Tier 0 + 约定枚举(无 per-file schema)
渲染完全由 JSON 形状 + 一套约定规则(`inferField`)驱动:

| auto-atom 形态 | 判定 | 控件 |
|---|---|---|
| `bool` | value type | toggle |
| 数字 | value type | number input |
| 字符串 + key 匹配 `/_key$\|api_key\|secret\|token\|password/i` | 约定 | **password**(遮挡 + 显示切换) |
| `[roles\|skills\|modes]` | key 白名单 | **multiselect**(选项来自 `/api/enums/dir/<key>`) |
| 标量数组(其他) | 默认 | tag 输入(自由增删) |
| `tier` / `model_tier` | key 约定 | **select** `/api/enums/tiers` |
| `default_provider` | key 约定 | select `/api/enums/self/:mod/providers` |
| `[{obj,obj}]` | 结构 | **table**(增删行,列按对象 key;tier 列自动单选) |
| 嵌套 object | 结构 | subform(折叠,递归) |

label = key humanized(`listen_addr`→"Listen Addr")。

### 2.2 组件
- `ConfigEditor.vue` — Shape A 递归渲染器,walk body → 分派控件。
- `controls/ScalarFields.vue` — 所有叶子控件(toggle/number/text/password/select/multiselect/tags)。
- `controls/TableField.vue` — 对象数组表格。
- `CollectionBrowser.vue` — Shape B master-detail:list + filter + New + 单实体编辑(atom 复用 ScalarFields/TableField + sidecar textarea;frontmatter-md 只读)。
- `DaemonView.vue` — **唯一**定制视图:ConfigEditor + 测试连接按钮。
- `useConfig.ts` / `useCollection.ts` — load/save/dirty composables。
- `useEnums.ts` — 约定枚举获取(带缓存)。

### 2.3 定制逃生口
`useModules.ts` 的 `LOCAL_VIEWS` 把 sidebar id 映射到 `{ load, configId, readOnly? }`。新模块默认用 ConfigEditor/CollectionBrowser;只有特殊 UX(如连接测试)才写定制组件。

---

## 3. 已实施阶段(全部完成)

| Phase | 内容 | 验证 |
|---|---|---|
| **1** | Backend 骨架 + AST 投影 + registry + vite proxy | 15 单元测试 + curl GET/PUT/enums 全通过 |
| **2** | 通用编辑器 Shape A + 迁移 ai-daemon/auto-musk + DaemonView | `test-generic-editor.mjs` 14/14 |
| **3** | 集合编辑器 Shape B + 迁移 roles/skills + sidecar | `test-collection-editor.mjs` 14/14 |
| **4** | 移除插件机制(importmap/vendor vue/remote import)+ 注册表驱动 + 删 Agents 模块 | build 通过,两套 E2E 无回归,nav 4 模块 |
| **5** | README 重写 + 本文档 + modes 降级提示 + 注释丢失提示 | modes 降级 E2E 验证(空枚举→自由文本+提示);typecheck + build 通过 |

---

## 4. 关键决策与权衡

### 4.1 写回重排格式、丢注释(已知限制)
auto-atom AST 不保留 comment/span。merge 后 `to_at_source()` 重排为规范 4 空格缩进、bare ident 重新加引号(`zhipu`→`"zhipu"`,语义等价)、丢注释。
**缓解**:每次写前生成 `.bak`;首次保存弹确认(`useConfig.ts` 的 `SAVED_ACK_KEY`)。字段顺序稳定(IndexMap 保 insertion order)。

### 4.2 v1 不支持"在 ai-daemon.at 新增整个 provider 块"
merge 按 node name 匹配现有子节点;JSON 里全新 top-level 结构被忽略。罕见操作 → 直接手编文件或后期加结构化端点。**编辑现有 provider 字段不受影响**。

### 4.3 子节点按 node name(非 map key)索引
auto-atom parser 用 `Node::add_kid(child)` → 整数 key;child 身份在 `.name`。这是 `merge_node_body` 重建父节点的依据(详见 `project.rs` 注释)。

### 4.4 Agents 模块被移除
原 Agents 页面列出 agent modes,但 modes 是 **builtin**(编译进 musk,非文件配置)。统一架构下它不属于配置中心;app 的 default_mode 在该 app 自己的 config(Auto Musk)里选。

### 4.5 modes 约定枚举返回空 → 优雅降级
`default_mode` 被约定为 `select`,选项来自 `/api/enums/dir/modes`。但 modes 是 **builtin**(编译进 musk,无磁盘目录),所以该端点返回 `[]`。控件层(ScalarFields.vue)检测到空选项时**自动回退**为自由文本输入 + 提示"no options available (e.g. builtin-only) — type freely"。用户仍可手动输入 mode 名(如 `superpowers`)。这是 graceful degradation,已 E2E 验证。

### 4.6 sidebar id ≠ backend config id(历史遗留)
前端侧栏 id:`ai-daemon`/`ai-musk`/`ai-roles`/`ai-skills`。后端 registry id:`ai-daemon`/`auto-musk`/`roles`/`skills`。`LOCAL_VIEWS` 的 `configId` 字段做映射。Phase 4 未统一(改动面大,可后续收敛)。

---

## 5. 不在范围
- ⏸ musk 运行时读配置(仍 `RoleRegistry::load()` 读文件)
- ⏸ auto-forge
- ⏸ L2 app 作用域目录分层(等第二个 app,见 unified-harness-scoping.md §7.1)
- ⏸ 显式 per-file schema 文件(Tier 1,未来需求驱动)
- ⏸ 跨层字段合并(永不,见 unified-harness-scoping.md §3.3)
- ⏸ frontmatter-md 实体编辑(skills 是 prompt,非设置)

---

## 6. 如何新增一个配置模块

1. **后端**:在 `backend/src/registry.rs` 的 `DEFAULT_REGISTRY_TOML` 加一段 `[[module]]`(file 或 collection)。
2. **前端**:在 `src/composables/useModules.ts` 的 `loadModules()` 加侧栏条目(name/icon/description),并在 `LOCAL_VIEWS` 加 `{ load, configId }` 映射指向 `ConfigEditor.vue`(单文件)或 `CollectionBrowser.vue`(集合)。
3. **完成**。新模块自动得到可编辑表单(单选/多选/密码/表格等按约定规则渲染)。只有需要特殊 UX 时才写定制 `.vue` 组件并指向它。
