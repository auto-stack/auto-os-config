# Known Debt & Risks

审计/归档时登记的本仓库已知债务与风险。见 `../skills/plan-archiver` 的 Step 2.5。

## ✅ 已修复

| Plan | Category | Description | Reference |
|---|---|---|---|
| 002 | 一致性遗漏 | `collection_dir` 重解析 `config_root()` 而非直接用 `state.config_root` → **已改为 `state.config_root.join(&c.dir)`**。 | `backend/src/collection.rs:40` |
| 003 | 一致性遗漏 | `test-remote-module.mjs` 头注释与 `examples/remote-module/config-page.js` 注释仍写 `.toml` → **已更正为 `.at`**。 | `test-remote-module.mjs:8` |
| 002 | 已知限制 | `POST /api/action/test-daemon` 硬编码 `:17654` → **已改为读配置 `listen_addr` 的端口**（`aaid_listen_addr`，含 3 单测）。 | `backend/src/main.rs` |
| 003 | 未来增强 | E2E 脚本需手动起 daemon+vite → **新增 `scripts/e2e.sh` 一键运行**（自动起服务/复用既有/清理，三套全绿）。 | `scripts/e2e.sh` |
| 004 | 一致性遗漏 | 配置覆盖审计：modes/、ai-client.at、apps/musk/harness/roles/ 三个真实配置未注册 → **已注册**（modes + musk-harness-roles 为 collection，ai-client 为 file + 创建默认文件），`/api/modules` 现暴露 7 模块。顺带修复 E2E 点击选择器为精确匹配（"Roles" vs "Harness Roles" 子串歧义）。 | `registry.rs` DEFAULT_REGISTRY_ATOM |
| 002 | 已知限制 | **§4.2 "v1 不支持新增整个 provider 块" → 已闭合（Plan 005）**：merge 对对象值+非现有子节点创建子节点块；新增 `DELETE /api/config/:id/blocks/:name`；ConfigEditor 增删按钮。实机 ADD→enum 可见→DELETE→消失闭环验证。 | `project.rs` merge_node_body / `main.rs` delete_block |

## 🟡 一致性遗漏

（无未修复项）

## 🟢 已知限制

| Plan | Category | Description | Reference |
|---|---|---|---|
| 002 | 已知限制 | 通用编辑器 PUT 整文件重写，丢注释/重排格式（auto-atom AST 不保留 span/comment）；`.bak` 缓解 + 首次保存确认。 | `src/lib/api.ts` confirmSaveOnce |
| 002 | 已知限制 | modes 是 builtin（无磁盘目录），`/api/enums/dir/modes` 返回空 → 控件降级为自由文本（设计行为）。 | `scalar_fields.at` fallback 分支 |
| 003 | 已知限制 | **remote custom 协议已移除（Plan 006 §1）**：`createComponent(Vue)` 动态加载无声明式等价物且无真实使用者；custom kind 模块现渲染移除提示，`examples/remote-module` 归档至 `archive/`。原"无沙箱/无版本协商"两项随之失效。 | `app_shell.at` custom 分支 |
| 003 | 已知限制 | `/api/enums/self/:id/providers` 用"子节点有 `kind` prop 即 provider"启发式；非 provider 子块若带 kind 会被误判（仅影响下拉选项）。 | `backend/src/main.rs` enum_self_providers |
| 006 | 已知限制 | 前端 Auto 化后 2 张截图（01-ai-daemon/02-auto-musk）与手写版有非布局性像素差（视觉检查无异常，e2e 全绿）；TableField 单元格生成 `v-model` 深写与 `$event` 重建并存（行为正确）。 | `auto/README.md` 已知残留差异 |
| 006 | 已知限制 | 21 条 DSL gotcha（G1-G21）以 workaround 形态存在（静默降级/吞链/编译陷阱），见 `auto/README.md`——待 auto-lang 回填后逐条删除。 | `auto/README.md` |

## 📋 未来增强

| Plan | Category | Description | Reference |
|---|---|---|---|
| 004 | 未来增强 | a2r 转译树（`auto-ai/crates/ai-config/rust/`）不反映 Plan 381 serde 迁移；auto-ai Plan 016 §4.6 翻转 `[lib]` path 前需在 .at 源/转译器层面同步。 | `auto-ai/crates/ai-config/rust/Cargo.toml` |
| 002 | 未来增强 | `backend/src/config_root.rs` 硬编码 `~/.config/autoos`，无环境变量覆盖（本地单用户工具可接受）。 | `backend/src/config_root.rs` |
| 001 | 未来增强 | `index.html` 的 `window.process` 浏览器 polyfill 是历史残留（Vue dev 模式需要），可随依赖升级评估移除。 | `index.html` |
| 006 | 未来增强 | api.at（`#[api]` 契约 → 生成 client/server）未接入——fetch 传输层保留手写 `src/lib/api.ts`；接入后可删大半 ext 中转。 | `src/lib/api.ts` |
| 006 | 未来增强 | **桌面版（render: "vm"/"rust"）待立项**（Plan 006 第二步）：前置条件 = auto-lang 修复 defineModel 深变异 🔴、vm store facade、vm view-builder 禁函数调用与 D4 预计算范式实测兼容。 | `docs/plans/006-frontend-auto-ization.md` §6 |

## 🔴 高风险

（无——当前架构无 UB/数据损坏级风险。）
