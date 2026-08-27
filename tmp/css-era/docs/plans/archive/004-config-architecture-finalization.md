# Plan 004: 配置架构收尾 — 热注册 + format 声明 + 审计修复

> **状态**：已实施（2026-08-04）→ 已归档(2026-08-04, 全部项实测通过)
> **前置**：Plan 002（统一 daemon + 通用编辑器）、Plan 003（模块自注册）、auto-lang Plan 381（Value serde Deserialize + lenient 辅助）
> **仓库**：auto-os-config（主）、auto-ai、auto-lang
> **目的**：收掉 Plan 003 §7 的待办首项 + §5.3 已知瑕疵，并处理对整套架构的一次计划级审计发现的两个新问题。

---

## 0. 背景

Plan 003 落地后架构闭环可用，但遗留：

- Plan 003 §7 待办：**运行期热注册**（drop-in 需重启 daemon 才生效）、远程组件沙箱/版本协商、`/api/modules` 不暴露 collection `format`。
- §5.3 已知瑕疵：前端用 `id === 'skills'` 启发式判定只读（`/api/modules` 不暴露 format 所致）。
- 一次跨仓库审计（2026-08-04）新发现两个问题：
  1. **a2r 转译树分叉**：auto-ai 的 `crates/ai-config/rust/`（转译产物）与 `rust-ref/`（主版本）是两套实现；Plan 381 的 serde 迁移只进了 `rust-ref/`，转译树仍是旧 `opt_*` 风格。
  2. **Plan 381 §5 验证清单未勾选**：计划已归档为完成，但 9 个 checkbox 全是 `[ ]`。

---

## 1. 实施内容

### 1.1 运行期热注册（auto-os-config，Plan 003 §7 首项）

`AppState` 改为持有 **baseline 声明**（内置模块，启动时解析一次），注册表通过
`Registry::merged_with_dropins(baseline, modules.d)` **按请求重新合并**。

- `/api/modules`、`/api/config/:id`、`/api/collection/:id` 全部走 `state.merged()`。
- 新增 drop-in 文件**无需重启 daemon** 即被发现（Plan 003 §7：drop-in 重启即生效 → 实时生效）。
- 代价：每次请求扫描一次 `modules.d/`（小目录 + 小文件），本地工具可忽略。

### 1.2 `/api/modules` 暴露 collection `format`（auto-os-config，§5.3）

- `Module::format()` + `EntityFormat::as_str()`：collection 返回 `"atom"` / `"frontmatter-md"`，file/custom 返回 null。
- `ModuleEntry` 增加 `format` 字段。
- 前端 `readOnly = mod.format === 'frontmatter-md'`，**删除 `id === 'skills'` 启发式**及其 `TODO: surface format` 注释。
- 只读语义不变：后端 collection.rs 对 frontmatter-md 的 create/edit 本就拒绝（"not supported in v1"），前端仅隐藏编辑 UI。

### 1.3 auto-ai provider 反序列化错误传播（auto-ai，Plan 381 迁移收尾）

`crates/ai-config/rust-ref/src/loader.rs` 的 `parse_provider_blocks`：

- 原实现 `Err(_) => continue` 把 **含垃圾类型标量的真实 provider 也静默丢弃**（旧行为是保留 provider、对坏字段用默认值）。
- 改为：先按 `kind` prop 判定 provider（缺失 → 跳过非 provider 子块如 `tier_routing`），真正反序列化失败 → `ConfigError::Parse("provider '<name>': …")` 向上传播，**provider 不再无声消失**。

### 1.4 a2r 转译树分叉记账（auto-ai）

- `crates/ai-config/rust/Cargo.toml` 标注 **STALE relative to rust-ref**（原注释误称 rust-ref 为 legacy，已纠正）。
- auto-ai Plan 016 §4.6 记账：翻转 `[lib]` path 前需在 `.at` 源/转译器层面同步 serde 支持或评估取舍。

### 1.5 Plan 381 §5 验证清单勾选（auto-lang）

- 按 worktree 约定在 `docs/plan-381-checklist` 分支勾选 9 个 checkbox，并入 master（merge commit `f288f80d`）。

### 1.6 计划文件统一（本仓库）

- `plans/` → `docs/plans/`（与 auto-ai / auto-lang 的 `docs/plans/` 约定一致），本计划为 `004`，序号接在 `003` 之后。
- README 中 `plans/00x-*.md` 引用同步更新为 `docs/plans/00x-*.md`。

---

## 2. 验证

| 项 | 结果 |
|---|---|
| auto-os-config 后端单测 | 24 全绿（22 既有 + 2 新增：`merged_with_dropins_is_hot`、`module_format_exposed`） |
| `vue-tsc --noEmit` | 通过 |
| `vite build` | 通过 |
| 实机热注册 | daemon 运行中丢入 drop-in → `/api/modules` 立即出现，`/api/collection` 可用，无需重启 |
| 实机 format 字段 | roles→`atom`、skills→`frontmatter-md`、file 模块→null |
| auto-ai ai-config 测试 | 37 全绿（35 既有 + 2 新增：`non_provider_child_blocks_are_skipped`、`provider_with_garbage_scalar_is_a_config_error`） |
| auto-ai workspace check | 通过 |

---

## 3. 跨仓库提交

| 仓库 | 提交 | 内容 |
|---|---|---|
| auto-os-config | `743acc9` | 热注册 + format 暴露 + 消除 skills 启发式 |
| auto-ai | `b92be21` | provider 反序列化错误传播（不再静默跳过） |
| auto-ai | `ecb316b` | a2r 转译树分叉记账 |
| auto-lang | `f288f80d`（merge） | Plan 381 §5 清单勾选（worktree → master） |

---

## 4. 不做什么（记录在案，非遗漏）

- **远程组件沙箱 / 版本协商**：Plan 003 §7 明确延迟（本地 trusted 模型；v1 固定 `createComponent(Vue)` 签名）。
- **modes 空枚举 → 自由文本降级**：Plan 002 §4.5 设计行为（builtin-only 的正确表现）。
- **PUT 整文件重写丢注释**：auto-atom AST 不保留 span/comment 的根本限制，`.bak` 已缓解（Plan 002 §4.1）。
- **a2r 转译树全面同步 serde**：随 auto-ai Plan 016 第四波（§4.6 翻转）一并处理，见 §1.4。

---

## 5. 关联

- Plan 002（统一 daemon + 通用编辑器）、Plan 003（模块自注册）—— 本计划是其收尾。
- auto-lang Plan 381（Value serde Deserialize + lenient 辅助）—— 本计划的 serde 底座。
- auto-ai Plan 016（Auto 化 MVP 路线图）—— a2r 转译树翻转的归属计划。
