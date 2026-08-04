# Known Debt & Risks

审计/归档时登记的本仓库已知债务与风险。见 `../skills/plan-archiver` 的 Step 2.5。

## 🟡 一致性遗漏

| Plan | Category | Description | Reference |
|---|---|---|---|
| 002 | 一致性遗漏 | `collection_dir` 重解析 `config_root()` 而非直接用 `state.config_root`（语义等价，冗余且易错）。 | `backend/src/collection.rs:40` |
| 003 | 一致性遗漏 | `test-remote-module.mjs` 头注释与 `examples/remote-module/config-page.js` 注释仍写 drop-in 为 `.toml`；Plan 003 Step 6 已统一为 `.at`，机制正确但文档陈旧。 | `test-remote-module.mjs:8` |

## 🟢 已知限制

| Plan | Category | Description | Reference |
|---|---|---|---|
| 002 | 已知限制 | 通用编辑器 PUT 整文件重写，丢注释/重排格式（auto-atom AST 不保留 span/comment）；`.bak` 缓解 + 首次保存确认。 | `useConfig.ts` SAVED_ACK_KEY |
| 002 | 已知限制 | modes 是 builtin（无磁盘目录），`/api/enums/dir/modes` 返回空 → 控件降级为自由文本（设计行为）。 | `ScalarFields.vue` fallback |
| 003 | 已知限制 | 远程 custom 组件无沙箱，以宿主全权限运行——本地 trusted 模型，Plan 003 §7 明确延后。 | `useModules.ts` custom 分支 |
| 003 | 已知限制 | 远程协议 v1 固定 `createComponent(Vue)` 签名，无版本协商；协议变更会破坏已部署远程。 | `useModules.ts:179` |
| 003 | 已知限制 | `/api/enums/self/:id/providers` 用"子节点有 `kind` prop 即 provider"启发式；非 provider 子块若带 kind 会被误判。 | `backend/src/main.rs` enum_self_providers |
| 002 | 已知限制 | `POST /api/action/test-daemon` 仅支持 `use_default:true` 且硬编码代理 `:17654`（aaid 离线 → 503）。 | `backend/src/main.rs:378` |

## 📋 未来增强

| Plan | Category | Description | Reference |
|---|---|---|---|
| 004 | 未来增强 | a2r 转译树（`auto-ai/crates/ai-config/rust/`）不反映 Plan 381 serde 迁移；auto-ai Plan 016 §4.6 翻转 `[lib]` path 前需在 .at 源/转译器层面同步。 | `auto-ai/crates/ai-config/rust/Cargo.toml` |
| 003 | 未来增强 | E2E 脚本（test-generic/collection/remote-module.mjs）需手动起 daemon+vite，未接入一键脚本/CI。 | `test-*.mjs` |
| 002 | 未来增强 | `backend/src/config_root.rs` 硬编码 `~/.config/autoos`，无环境变量覆盖（本地单用户工具可接受）。 | `backend/src/config_root.rs` |
| 001 | 未来增强 | `index.html` 的 `window.process` 浏览器 polyfill 是历史残留（Vue dev 模式需要），可随依赖升级评估移除。 | `index.html` |

## 🔴 高风险

（无——当前架构无 UB/数据损坏级风险。）
