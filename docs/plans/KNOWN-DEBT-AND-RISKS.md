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

## 🟡 一致性遗漏

（无未修复项）

## 🟢 已知限制

| Plan | Category | Description | Reference |
|---|---|---|---|
| 002 | 已知限制 | 通用编辑器 PUT 整文件重写，丢注释/重排格式（auto-atom AST 不保留 span/comment）；`.bak` 缓解 + 首次保存确认。 | `useConfig.ts` SAVED_ACK_KEY |
| 002 | 已知限制 | modes 是 builtin（无磁盘目录），`/api/enums/dir/modes` 返回空 → 控件降级为自由文本（设计行为）。 | `ScalarFields.vue` fallback |
| 003 | 已知限制 | 远程 custom 组件无沙箱，以宿主全权限运行——本地 trusted 模型，Plan 003 §7 明确延后。 | `useModules.ts` custom 分支 |
| 003 | 已知限制 | 远程协议 v1 固定 `createComponent(Vue)` 签名，无版本协商；协议变更会破坏已部署远程。 | `useModules.ts:179` |
| 003 | 已知限制 | `/api/enums/self/:id/providers` 用"子节点有 `kind` prop 即 provider"启发式；非 provider 子块若带 kind 会被误判（仅影响下拉选项）。 | `backend/src/main.rs` enum_self_providers |

## 📋 未来增强

| Plan | Category | Description | Reference |
|---|---|---|---|
| 004 | 未来增强 | a2r 转译树（`auto-ai/crates/ai-config/rust/`）不反映 Plan 381 serde 迁移；auto-ai Plan 016 §4.6 翻转 `[lib]` path 前需在 .at 源/转译器层面同步。 | `auto-ai/crates/ai-config/rust/Cargo.toml` |
| 002 | 未来增强 | `backend/src/config_root.rs` 硬编码 `~/.config/autoos`，无环境变量覆盖（本地单用户工具可接受）。 | `backend/src/config_root.rs` |
| 001 | 未来增强 | `index.html` 的 `window.process` 浏览器 polyfill 是历史残留（Vue dev 模式需要），可随依赖升级评估移除。 | `index.html` |

## 🔴 高风险

（无——当前架构无 UB/数据损坏级风险。）
