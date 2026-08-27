# 配置文件驱动的插件配置架构设计

> **状态**：已实施（配套实现见 `docs/plans/archive/002`–`docs/plans/005`）
> **日期**：2026-08-05
> **范围**：auto-os-config（配置中心）+ auto-lang（serde 底座）+ auto-ai（消费方）
> **取代**：`auto-ai/docs/os-config-self-sufficient-design.md`（Plan 001 设计，2026-07-15，已被本架构取代）

---

## 1. 概述

AutoOS 的配置中心（auto-os-config）是一套**配置文件驱动**的插件配置体系：任何 `.at` 配置文件，只要在注册表里声明一次，就能自动获得：
- 侧栏入口（名称/图标/分组）
- 通用表单编辑器（零 schema、零 per-module 代码）
- 与运行时读取**同一份文件**（配置中心编辑的就是各服务实际消费的配置）

核心承诺：**"不同的配置模块虽然分散、独立注册，但实现架构统一，仿佛写在同一个项目里。"**

---

## 2. 背景：三代架构演进

| 代 | 架构 | 问题 |
|---|---|---|
| 1 | 插件宿主：侧栏模块的配置页由 musk 后端提供 ESM bundle + 数据 API | 被配置的服务不在线 → 页面报 "Failed to fetch"（逻辑矛盾）；importmap/vendor-vue hack 脆弱（双 Vue 实例反应性失效） |
| 2 | 自给自足（Plan 001）：页面内置进 os-config | 仍要每模块手写 `.vue` 页面；注册表编译期硬编码在 3 个源文件 |
| **3（本架构）** | **统一 daemon + 通用编辑器 + 运行期发现** | ✅ 见 §3 |

---

## 3. 目标与非目标

### 目标
- **零侵入注册**：第三方模块丢一个声明文件即可出现，不改 auto-os-config 源码。
- **零成本前端**：`file`/`collection` 模块零前端代码；只有特殊 UX 走远程组件协议。
- **单源一致**：配置中心编辑的就是运行时读取的同一份 `~/.config/autoos/*.at`。
- **功能对等**：不亚于任何被替代的专用配置页（含 provider 增删，Plan 005）。

### 非目标
- ❌ 每个模块自建配置服务/API（已废除）。
- ❌ 运行期热注册的复杂文件监听（按请求重扫已够用，见 §8.3）。
- ❌ 远程组件沙箱/安全（本地 trusted 模型）。
- ❌ 通用编辑器对任意嵌套层级的增删（v1 只做顶层块）。

---

## 4. 架构总览

```
┌──────────────────── 前端 (:17700, vite) ────────────────────┐
│ Sidebar ← /api/modules (运行期发现, 7+ 模块)                 │
│   │ kind dispatch                                           │
│   ├── file        → ConfigEditor / BUILTIN_FILE_VIEWS       │
│   ├── collection  → CollectionBrowser (format 驱动只读)      │
│   └── custom      → import(remote) → createComponent(Vue)   │
└──────────────┬───────────────────────────────────────────────┘
               │ /api/* (同源代理)
┌──────────────▼───────────────────────────────────────────────┐
│ auto-os-config-daemon (:17701, axum)                          │
│   registry.rs   内置基线 + modules.d/*.at drop-in 合并(热)     │
│   project.rs    Node AST ↔ JSON 通用投影 + merge 语义          │
│   collection.rs  集合实体 CRUD + sidecar + frontmatter-md 只读 │
│   main.rs        /api/config|collection|modules|enums|action  │
└──────────────┬───────────────────────────────────────────────┘
               │ 读写同一份文件
┌──────────────▼───────────────────────────────────────────────┐
│ ~/.config/autoos/                                            │
│   ai-daemon.at / ai-client.at / apps/musk/config.at          │
│   roles/*.at(+.soul.md) / skills/*/SKILL.md / modes/*.at     │
│   apps/musk/harness/roles/*.at / modules.d/*.at (注册声明)    │
│ 运行时代码直接读同一文件:aaid→parse_daemon_config,            │
│   auto-ai roles.rs→roles/, musk→app_config.rs/mode.rs         │
└───────────────────────────────────────────────────────────────┘
```

三个支柱：
1. **统一 daemon** — 唯一的配置读写服务，URL→文件路径按注册表映射。
2. **通用编辑器** — 从 `.at` 数据形状自动渲染表单（约定枚举 + 结构控件）。
3. **运行期发现** — 注册表 = 内置基线 + 磁盘 drop-in，前端完全由 `/api/modules` 驱动。

---

## 5. 核心概念

- **模块（Module）**：一个可配置单元，三种 kind：
  - `file` — 单文件配置（如 `ai-daemon.at`，根节点 `daemon`）。
  - `collection` — 同构实体目录（如 `roles/*.at`、`skills/*/SKILL.md`）。
  - `custom` — 需要特殊 UX 的模块，远程组件提供视图（数据仍走统一 daemon）。
- **配置根**：`~/.config/autoos/`（Windows 同构）。**不用** `%APPDATA%`——全栈保持单一路径约定。
- **drop-in 注册**：`modules.d/<id>.at` 声明文件，按 id 合并/覆盖内置项。
- **AST 投影**：daemon 停留在通用 `Atom/Node/Value` 层，不写 per-file 类型加载器。

---

## 6. 数据模型

### 6.1 注册表声明（auto-atom，与所有配置同格式）

```text
# ~/.config/autoos/modules.d/auto-musk.at
module {
    kind : file            # file | collection | custom
    id : "auto-musk"
    file : "apps/musk/config.at"
    root : "musk"          # 预期根节点名（防 merge 进错文件）
    name : "Auto Musk"     # 展示字段(可选,缺省回退 id)
    icon : "🦌"
    description : "…"
    group : "Harness"      # 可选,非空聚成可折叠分组
}
```

collection 额外字段：`dir`、`entity_suffix`、`entity_root`、`sidecar_suffix`、`format`（`atom`/`frontmatter-md`）。
custom 额外字段：`remote`（远程 ESM bundle URL）。

### 6.2 配置格式（`.at`）

- 单根节点：`daemon { … }`、`role { … }`、`mode { … }`。
- 子节点 = 命名块（provider、tier_routing、harness）；prop = 标量/数组。
- 后端用 `node.deserialize::<Module>()`（auto-val serde）解析注册表；消费方（aaid、musk、auto-ai）用各自的 serde loader 读同一文件。

### 6.3 AST ↔ JSON 投影

- **读**（`node_body_to_json`）：Node 体（props + kids）展平为 JSON 对象；子节点按 `.name` 为键。根节点名隐含（由注册表 `root` 字段固定），不进 JSON。
- **写**（`merge_node_body`）：把 JSON 编辑**折叠进现有 AST**（非重建），按节点名递归匹配。规则：标量/数组→prop；对象→子节点块（**含新增块**，Plan 005）。

---

## 7. 组件设计

### 7.1 后端（backend/）

| 组件 | 职责 |
|---|---|
| `registry.rs` | 注册表：内置基线 `DEFAULT_REGISTRY_ATOM` + `merge_dropins`（按 id 覆盖、坏文件跳过）+ `merged_with_dropins`（热注册）。用 `node.deserialize::<Module>()`（serde tagged enum）。 |
| `project.rs` | 通用投影核心：parse_root / node_body_to_json / value_to_json / merge_node_body / delete_child_node / write_file_body。 |
| `collection.rs` | 集合 CRUD + soul sidecar + frontmatter-md 只读强制（create/edit 拒绝）。 |
| `main.rs` | 端点 + 模块解析（require_module 走 `state.merged()` 热视图）。 |

### 7.2 前端（src/）

| 组件 | 职责 |
|---|---|
| `useModules.ts` | `loadModules()` fetch `/api/modules` + kind 分派 + group 派生 + `createComponent(Vue)` 远程协议。 |
| `ConfigEditor.vue` | 通用表单：walk body → `inferField()` 分派控件；子表单/表格递归；**增删块**（Plan 005）。 |
| `CollectionBrowser.vue` | 集合 master-detail + 实体 CRUD + 只读态。 |
| `DaemonView.vue` | 唯一第一方定制视图：ConfigEditor + 测试连接按钮（`BUILTIN_FILE_VIEWS` 路由）。 |
| `editor/` | `inferField` 约定规则、ScalarFields（toggle/number/text/password/select/multiselect/tags）、TableField、useConfig/useEnums/useCollection。 |

---

## 8. 关键机制

### 8.1 注册发现与合并
启动解析内置基线 → 合并 `modules.d/*.at`。同名 drop-in **覆盖**内置项（第三方可重定义/重命名）。坏文件跳过不拖垮 daemon。

### 8.2 热注册（Plan 004）
`AppState` 持 baseline，每次请求经 `merged_with_dropins` **重扫 modules.d**（小目录小文件，代价可忽略）。新增 drop-in **无需重启 daemon** 即在 `/api/modules` 与 config/collection 端点生效。

### 8.3 kind 分派
前端按 `kind` 选择视图；`format` 字段声明集合只读性（`frontmatter-md` → 只读，消除 id 启发式）。

### 8.4 merge 语义（写路径）
- 编辑 = 折叠进现有 AST：未编辑字段保留（含未触及的子节点）。
- **对象值 + 非现有子节点 → 新子节点块**（Plan 005 修复，此前写成 prop 假阳性）。
- 删除走结构化端点 `DELETE /api/config/:id/blocks/:name`（merge 无法表达删除）。
- 每次写前生成 `.bak`；首次保存弹确认（AST 重写会规范格式、丢注释——见 §11）。

### 8.5 远程组件协议 `createComponent(Vue)`
远程 ESM bundle 导出 `createComponent(Vue)` 工厂；宿主把自己的 Vue 实例注入。远程**不 import vue**，从源头消灭双 Vue 实例反应性失效；无需 importmap/vendored vue。硬约束：必须预编译（宿主 Vue runtime-only）+ externalize vue。

### 8.6 serde 底座（auto-lang Plan 381）
`auto-val` 的 `ValueDeserializer`/`Node::deserialize` + lenient 辅助（`lenient_bool`/`string_or_list`/`nonempty_string`/`lenient_f64` + `_opt` 变体）——注册表与各消费方（aaid loader、musk app_config、auto-ai role_config）共用，`#[derive(Deserialize)]` 替代手写 `opt_*`，接受行为不变。

---

## 9. API 端点

```
GET  /api/modules                                 发现(热,含 format/remote)
GET  PUT /api/config/:module_id                   单文件读写(merge)
DELETE /api/config/:module_id/blocks/:name        删除子节点块(Plan 005)
GET  /api/collection/:module_id                   集合列表
GET  PUT POST DELETE /api/collection/:module_id/:name   实体 CRUD + sidecar
GET  /api/enums/tiers | /dir/:kind | /self/:id/providers | /self/:id/models/:prov
POST /api/action/test-daemon                      代理 aaid /v1/config/test(唯一需 aaid 在线)
GET  /api/health
```

---

## 10. 注册一个新模块（三路径）

1. **file / collection（最常见，零前端代码）**：丢 `modules.d/<id>.at` → 重启无需（热注册）→ 侧栏出现 → 通用编辑器自动渲染。改 auto-os-config 一行代码都不需要。
2. **需要定制 UX**：`kind : custom` + `remote : <url>`，远程按 §8.5 协议构建。
3. **第一方定制视图**：宿主自己的组件，静态 import + `BUILTIN_FILE_VIEWS` 映射（如 ai-daemon → DaemonView），数据流不变。

---

## 11. 设计取舍与已知限制

| 取舍 | 说明 |
|---|---|
| PUT 重写格式/丢注释 | auto-atom AST 不保留 span/comment；`.bak` + 首次确认缓解。 |
| 热注册 = 按请求重扫 | 非文件监听；本地工具代价可忽略，换取零依赖。 |
| 远程组件无沙箱 | 本地 trusted 模型，Plan 003 §7 明确延后。 |
| 协议 v1 固定 | `createComponent(Vue)` 签名无版本协商。 |
| provider 判定 = kind prop | 与全栈一致（enum_self_providers / parse_provider_blocks）；非 provider 块带 kind 会误列（仅影响下拉选项）。 |
| a2r 转译树分叉 | `crates/ai-config/rust/` 为 a2r 产物，不反映 Plan 381 serde 迁移；翻转前需同步（auto-ai Plan 016 §4.6）。 |

---

## 12. 跨仓库关系

| 仓库 | 角色 |
|---|---|
| auto-os-config | 配置中心主体（daemon + 前端 + 注册表）。 |
| auto-lang | 底座：auto-atom（解析）+ auto-val serde Deserialize（Plan 381）。 |
| auto-ai | 消费方：aaid 读 `ai-daemon.at`、roles.rs 读 `roles/`、validate 读 `ai-client.at`；配置服务已迁出 aaid（Plan 005 清理）。 |
| auto-musk | 消费方：`app_config.rs` 读 `apps/musk/config.at`（含 harness 块）、`mode.rs` 读 `modes/`。 |

---

## 13. 演进方向

- 运行期热注册的主动文件监听（如需更低延迟）。
- 远程组件协议版本协商 + 沙箱。
- `Node` kids 反序列化（auto-val v2）——消费方手写子块解析的通用化。
- 集合 `format` 之外的更多声明性元数据。
