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
| 007 | 已知限制 | **vm 轨 v1 偏差**：侧栏无分组折叠、集合无过滤、select=自由文本+提示、markdown sidecar 单行、表格/subform 只读 JSON、块增删未暴露；字段顺序字母序（serde_json 无 preserve_order）。 | `auto/README.md` vm 章节 |
| 007 | 已知限制 | **vm 后端薄弱区 → 已上报 auto-lang Plan 446**（`auto-lang/docs/plans/446-vm-backend-os-config-field-report.md`，commit `ec961f1b2`）：多 store 消歧错位、store 列表循环事件参数致死 MCP、popover 解析毒药、json.parse 占位、handler 嵌套读取语义分裂、数组跨界丢失、http status/builder 缺陷、崩溃静默回滚、模块 parse 静默丢弃、vue store 直连路径错误等 17 项（含复现载体与验收标准、四批实施切分）。 | auto-lang Plan 446 |
| 007 | 已知限制 | vue codegen 对 widget 内 `use XStore: Store` 直连导入生成错误路径（`@/stores/useXStore` 应为 `src/stores/auto/`）——vm 专属组件已从 web 部署排除（regen.sh VM_ONLY 清单）规避；vue widget 若需直连 store 仍会踩（006 惯例 ext facade 即为此）。 | `auto/gen/regen.sh` |
| 007 | 已知限制 | e2e-vm 依赖 MCP 通道时序（快速连发偶发丢响应），等待阈值已加固；vm 实例偶发闲置死亡（疑似环境/GPU，非代码路径）。 | `scripts/e2e-vm.mjs` |

## 📋 未来增强

| Plan | Category | Description | Reference |
|---|---|---|---|
| 004 | 未来增强 | a2r 转译树（`auto-ai/crates/ai-config/rust/`）不反映 Plan 381 serde 迁移；auto-ai Plan 016 §4.6 翻转 `[lib]` path 前需在 .at 源/转译器层面同步。 | `auto-ai/crates/ai-config/rust/Cargo.toml` |
| 002 | 未来增强 | `backend/src/config_root.rs` 硬编码 `~/.config/autoos`，无环境变量覆盖（本地单用户工具可接受）。 | `backend/src/config_root.rs` |
| 001 | 未来增强 | `index.html` 的 `window.process` 浏览器 polyfill 是历史残留（Vue dev 模式需要），可随依赖升级评估移除。 | `index.html` |
| 006 | 未来增强 | api.at（`#[api]` 契约 → 生成 client/server）未接入——fetch 传输层保留手写 `src/lib/api.ts`；接入后可删大半 ext 中转。 | `src/lib/api.ts` |
| 006 | 未来增强 | ~~defineModel 深变异 🔴 上游修复提案~~ → **已闭环（2026-08-24）**：auto-lang Plan 443（`38adb1ef`）当日落地（与本仓 Phase 6 提案殊途同归），新 exe regen 后全部 model 变量回归 `ref<>`，深变异运行时实证修复；运行时 canary 并入 auto-lang `041-model-deep-reactivity`（`ab34fa9f`）。本仓 D5/不可变重建**升格为跨后端规范继续保留**（ext 投影与 val 镜像不删）。 | `docs/plans/006-frontend-auto-ization.md` §3 Phase 6 |
| 006 | 未来增强 | ~~桌面版（render: "vm"/"rust"）待立项~~ → **已落地（Plan 007，2026-08-25）**：vm 桌面版与 vue web 版并存（单工程 `-r vm` 切换 + back.api 双解析），`node scripts/e2e-vm.mjs` 为 vm 轨门禁。 | `docs/plans/007-frontend-vm-desktop.md` |
| 007 | 未来增强 | vm 轨功能补齐候选：集合过滤、分组折叠、真 select/popover（待上游修复）、markdown 渲染（待平台协议 comrak 实现）、表格编辑器、块增删、exe 分发（auto build -r vm a2c 链）。 | `auto/README.md` vm 章节 |

## 🔴 高风险

（无——当前架构无 UB/数据损坏级风险。）
