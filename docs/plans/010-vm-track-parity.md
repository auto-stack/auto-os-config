---
plan_id: PLAN-010
status: executing
feature_name: VM 轨一致性——Auto/VM 版对齐 Auto/Vue 版
author: [zcode]
created_at: 2026-08-27T12:00:00+08:00
updated_at: 2026-08-27T14:00:00+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 3
total_steps: 13
---

# [PLAN-010] VM 轨一致性——Auto/VM 版 (`auto run -r vm`) 对齐 Auto/Vue 版 (`auto run`)

## 变更摘要

009 阶段一已完成：Auto/Vue 版对 CSS 原版（tmp/css-era/）逐视图像素级一致（00 视图 0.00%，最高残差 2.04%，vue 28 断言门禁三套件全绿）。本计划承接 **009 阶段二（VM 轨）** 的剩余工作：让 Auto/VM 版与 Auto/Vue 版在**同一视图源、同一 daemon** 下保证一致。关键变量已变——上游 auto-lang 已合入 446 批一「J1/J2 收口」（当年阻塞批 4 的渲染器缺陷被证实为 MCP 快照首问竞态假象，实际视图构建一直正常），且上游新立 Plan 455「AutoUI 跨后端一致性跟踪器」并落地 `autoui_screenshot` 截图/diff MCP 工具，使 vm 轨首次具备像素级捕获能力。

## 目标

1. **对拍达标**：12 视图（00 侧栏 ～ 07 harness-roles）双端并排对拍通过——结构级一致（元素族/层级/文本同构）+ 样式级残差全部归因清偿或登记；
2. **顺延项清偿**：批 4 集合页 vm 门禁在 J1 解锁后复验；编辑器/集合页经阶段一 vue-first 重写后的新形态在 vm 轨首验（009 §0.2 顺延项）；
3. **收尾（M4）**：e2e-vm 9→14 断言两连绿；文档三件套重写；probe 去留落定；双端 7 模块实机走查 + 用户验收。

### 非目标（沿用 009 §1）

- 不追跨引擎字符光栅级零像素差（字体光栅差异属登记项，不入门禁）；
- 不做 vm 深色模式；不动 store/api 契约（仅 additive）；
- 不修上游缺陷——发现即按 446/455 渠道回报（含复现载体与验收标准），仓内只做 workaround/登记；
- 不做 `auto build -r vm` 独立分发。

## 架构方案

```
                 同一视图源 auto/src/front/*.at（自 008/009 起单源、*_vm.at 清零）
                              │
              ┌───────────────┴────────────────┐
      auto run（vue codegen）            auto run -r vm（AutoVM/iced 桌面）
      vite :17700 + src/**               MCP JSON-RPC :9321
              │                                │
      Playwright 截图                    autoui_screenshot（Plan 371 工具，
      （tmp/parity/*.mjs 移植入库）        支持 baseline/diff/阈值百分比）
              │                                │
              └──────────┬─────────────────────┘
                  同一 daemon :17701（backend/ 零改动惯例）
                         同一 ~/.config/autoos/*.at 数据
```

**一致性三层定义**（验收口径的核心）：

| 层 | 内容 | 判定方式 | 门槛 |
|---|---|---|---|
| L1 结构层 | 元素族/层级/文本内容 | `autoui_snapshot`（J1 收口后快照可靠）vs vue DOM 树映射核对 | 必须一致（映射表核对） |
| L2 样式层 | 字号/间距节奏/色板/圆角 | 双端 PNG 定量 diff + 分区指标（tmp/parity/metrics 思路） | 可修则修；不可修须在案归因 |
| L3 光栅层 | 字体抗锯齿/亚像素排版/hover 动效缺失 | 人工标注 | 登记，不入门禁 |

**视图源冻结纪律（N4 回退规则沿用）**：阶段一验收后视图源冻结。任何为 vm 一致性触发的视图源改动，必须回阶段一门禁（vue 28 断言 + 对 css-era 基准像素 diff + check 清单），防止 vm 侧修正倒灌污染 vue 轨已验收形态。

## 技术栈

- **视图源**：AutoLang `.at`（`style:` 类串视图 + store 预计算，008/009 词汇纪律）
- **Web 轨**：Vue 3 + Tailwind 3.4 + Inter（vite :17700）
- **桌面轨**：AutoVM `-r vm`（iced 渲染，MCP 通道 `autoui_snapshot` / `autoui_state` / `autoui_action` / `autoui_type` / `autoui_screenshot`）
- **门禁**：`./scripts/e2e.sh`（vue 28 断言三套件）、`node scripts/e2e-vm.mjs`（9 断言自愈式）、`auto/gen/regen.sh`
- **对拍工具**：Playwright + Node mjs（tmp/parity/{capture,diff,metrics}.mjs 移植入库）

## 需求分析与背景调查

> spec ledger 概览本轮不可用（backend daemon 未运行、无 `.autoos/specs.json`），以下以仓库实际模块为准。

**本仓模块盘点（触及面）**：

| 模块/文件 | 角色 | 本计划动作 |
|---|---|---|
| `auto/src/front/*.at`（10 文件） | 单一视图源（app/sidebar/theme_*/collection_*/config_editor/daemon_view/modules_store/utils） | 仅在 L2 清偿必要时触碰；collection_browser.at 现存 J1-safe 条件扁平化绕行（`&&` 组合形态），处置见 B1 |
| `auto/gen/regen.sh` | vue codegen 再生 | 每次上游/视图变动后必跑 |
| `scripts/e2e.sh` | vue 门禁（28 断言三套件） | 全程回归守卫 |
| `scripts/e2e-vm.mjs` | vm 门禁（9 断言，MCP 驱动，自愈重启） | 盘点基线 → 扩容到 14 |
| `scripts/vm-probes/`（probe-mcp-health 等 3 件） | J4/MCP 崩溃健康探针 | E3 去留裁决 |
| `tmp/parity/*.mjs` | 阶段一对拍工具（capture/diff/metrics/rows，未跟踪） | 移植入库为双轨通用 |
| `backend/` | 统一配置 daemon :17701 | **零改动**（贯穿 002-009 惯例） |

**上游状态（2026-08-27 盘点，auto-lang master）**：

| 事项 | 结论 | 影响 |
|---|---|---|
| 446 批一合入（f74a3ba0d） | 「J1/J2 收口」——所谓子树静默失败根因是 styled_vtree 的 **MCP 快照首问竞态假象**：styled_vtree 仅在 bounds 收集回路后落盘，boot 后无重建则快照回退源树（观感空壳）；dynamic_view 每帧直推 `view_to_vtree_with_paths` 快照修复。「os-config 双探针全绿」 | 当年二分矩阵结论（各循环形态全灭）系基于失真快照，可能错杀自然嵌套形态 → B1 需重判 |
| `autoui_screenshot`（Plan 371 Task 20） | PNG 截屏 + named baseline + 内建 diff 百分比模式 | vm 轨像素捕获闭环成立 |
| Plan 455 跨后端一致性跟踪器 + autoui-verifier 黄金法则 | 上游主动对齐 web/桌面观感（input focus 边框主色已落，455 Phase 1） | L2 层部分差异可能由上游直接清偿，节奏需对表 |
| J4 / MCP 轮询硬崩溃 | 批一含诊断加强（panic hook 落盘方向）；是否绝迹未在本仓实证 | A2 盘点项、E3 裁决输入 |

**时代背景链**：007 建 vm 轨（9 断言）→ 008 视图统一（批 1-6，`*_vm.at` 清零，批 4 vm 卡 J1）→ 009 两段式接管（阶段一像素对拍完成验收；阶段二顺延至今）。本计划即阶段二的正式开工令。

## 详细设计

### A 相 · 上游锚定与基线重建

沿用 007 D10 锚定纪律：先记哈希、再 regen、再双轨基线。上游漂移（git log 变动）时以当下 master 为准重建，杜绝半成品二进制（090 会话教训：存量旧 exe 曾伪装 J1 症状）。

### B 相 · 视图源接管复验

**B1 扁平化绕行重判**：既有 `collection_browser.at` 条件扁平化是建立在失真快照诊断上的绕行。但 J1 收口只证明"渲染一直正常"，未证明组合条件循环在新快照通道下回归自然形态无恙。决策树：
- 试自然嵌套形态（最小 diff 实验，分支上进行）：e2e-vm 绿 且 走查详情区全渲染 → **采认自然形态**，付一次阶段一门禁回跑成本（vue 28 + css-era diff），换来更简单共享源；
- 否则 → 扁平化形态**升格为定型终态**（不再算债，README 显式登记为该版本词汇约束），不做实验性回退。

**B2 新形态首验**：阶段一重写的 config_editor/daemon_view/collection_browser（真实 `<table>`、tags chips、select 真下拉 → vm 端 D7 降级形态、modal 等）从未在 vm 实机过目。逐模块走查清单（见测试设计 W）驱动，差异全部入残差台账再分诊。

### C 相 · 对拍底座与量化档案

- 工具移植为 `scripts/track-parity/`（tracked）：`capture.mjs --track vue|vm`（vue=Playwright 1440x900 同 accent 同禁动画参数；vm=MCP autoui_screenshot）、`diff.mjs`（像素 diff + 差异区域聚类）、`metrics.mjs`(分区 diff%)。产物 PNG 落 `tmp/track-parity/`（不入库，沿 0146dcf 用户决定）；数值表并入本计划 §残差台账（md 入库）。
- **窗口定标风险**：vm 窗口尺寸可控性未知（AUTOUI_* env/手动 resize 待探）。不可控则采用「vm 实拍为基准、vue 截图等比裁剪对齐」策略并登记，此时 L2 只比对交集区域 + 以内容坐标聚类代替全局像素坐标系。

### D 相 · 差异清偿迭代

每轮固定节拍：选视图 → 修（类串调参/D7 形态观感/采认上游 455 新样式）→ `./scripts/e2e.sh && node scripts/e2e-vm.mjs` 双绿 → 回填台账行。凡涉视图源改动即刻触发 N4 回退规则重验 vue 轨。

### E 相 · 门禁扩容与收尾

e2e-vm 断言扩容目标（+5）：搜索过滤生效、分组折叠切换、accent 持久化（改 accent → 杀进程重启 → autoui_state 复读）、集合页 detail inputs/applies 存在（原批 4 卡点固化为常驻断言）、theme_picker swatch 导航冒烟。probe 与文档见执行步骤。

## 测试设计

- **双门禁**：`./scripts/e2e.sh`（vue 28 不动基线）、`node scripts/e2e-vm.mjs`（9→14，末态要求连续两遍全绿）；
- **对拍档案**：12 视图 × 双轨 PNG + diff% 台账表（入库 md，PNG 留 tmp/）；至少 3 视图人工抽查与 metrics 数值互证；
- **走查清单 W**（7 模块 × 双端，各跑一遍）：侧栏搜索过滤/分组折叠/accent 切换、ai-daemon Test connection、auto-musk 增删块、roles/skills 集合页增删改查 + modal 删除确认、harness-roles 子表单、ai-client select/tags/多选/只读 JSON 表格降级、主题持久化重启保持；
- **vm 走查通道**：MCP（autoui_state/snapshot/action/type/screenshot）+ 实机肉眼双通道。

## 验收标准

- G1：vue 门禁全绿且 css-era 基准像素 diff 零回归（凡本轮有视图源改动则必验）；
- G2：e2e-vm 14 断言连续两遍全绿；
- G3：12 视图 L1 结构层核对全过；L2 台账行清零或逐行带归因（上游缺陷号/词汇约束/光栅边界）；
- G4：残差台账终稿 + 「双端一致性」章落入 `auto/README.md`；
- G5：文档三件套更新（`auto/README.md`、根 `README.md`、`KNOWN-DEBT-AND-RISKS.md`：J1-J4/MCP 崩溃条目按实证终态改写）+ probe 去留执行完毕；
- G6：双端 7 模块实机走查完成 + 用户验收确认。

## 执行步骤

> 载体：worktree `.worktrees/plan-010-dev`（`/auto-plan:work` 创建）；backend/ 全程零改动；每任务独立提交并同步勾选本文件。

### A 相 · 上游锚定与基线重建

- [x] T1 (A1) 上游锚定与 vue 轨守恒验证 ✅ 已完成 [2026-08-27] 上游锚定 `b0992306d`；debug CLI 重建后 `bash auto/gen/regen.sh` 于 worktree 零 diff（守恒）；`./scripts/e2e.sh` 三套件全绿（ALL E2E PASS）。注：门禁复用主检出 vite :17700 / daemon :17701（内容与本 worktree 完全一致，双方 git 干净）。
- [x] T2 (A2) vm 轨实况盘点 ✅ 已完成 [2026-08-27] 两遍门禁 + 健康探针均跑毕并回填盘点表。核心结论：MCP 崩溃未再现（J4 可结案方向）；vm 应用可启动但 8 断言稳定失败（B 相清单）；顺带修复 api.at vm 编译阻塞与两个探针路径 bug。

### B 相 · 视图源接管复验

- [x] T3 (B1) 集合页条件形态重判 ✅ 已完成 [2026-08-27] 重判结论：**当年"批4 全灭"是失真快照+模块未加载的复合假象**——修正后自然嵌套条件+循环正常构建。真正的两个上游缺陷实测确诊并登记：U1 集合列表循环构建后全局侧栏 press 冻结 state（P0，门禁以段序重排绕行）、U2 autoui_type 与内联 onchange 不兼容（P1，KNOWN-GAP 登记）。视图改动：e-row div→button + Theme.Init 根链触发；vue 28 断言全绿 + vm 门禁两连绿（commit 03a9fd9）。
- [x] T4 (B2) 编辑器/集合页 vm 新形态走查 ✅ 已完成 [2026-08-27] 7 模块结构快照归档 tmp/walk-*.snap：ai-daemon（Test 行+密钥行+子表单）、ai-client（12 输入/22 按钮/双 select）、auto-musk（4 输入/块增删）、roles（soul textarea ✓ 选择链路 gate 验证）、skills（只读 markdown body ✓）、harness-roles（分组展开过 gate，详情页留 T13 实机）。零 ⚠ 级结构性缺失；残差登记见台账 U1/U2/R1/R2。

### C 相 · 对拍底座与量化档案

- [ ] T5 (C1) 对拍工具入库：
  文件：新增 `scripts/track-parity/{capture.mjs,diff.mjs,metrics.mjs}`；参考源 `tmp/parity/*.mjs`。
  操作：移植为 `--track vue|vm` 双通道（vue=Playwright 1440x900/同 accent/禁动画；vm=MCP autoui_screenshot）；PNG 出参目录 `tmp/track-parity/`。
  验证：`node scripts/track-parity/capture.mjs --track vue` 与 `--track vm` 各产出 12 视图 PNG 且非空。
- [ ] T6 (C2) vm 窗口定标探针：
  文件：`scripts/track-parity/capture.mjs` 头注。
  操作：探测 vm 窗口尺寸控制途径（env/config/resize；可试 AUTOUI_* 环境变量与 README 检索）；不可控则实现「vm 基准 + vue 裁剪对齐」。
  验证：两轨至少 06-modes 视图产出同尺寸可比 PNG，取舍结论写入头注与本文件。
- [ ] T7 (C3) 12 视图 diff 台账初稿：
  操作：跑全套 capture+diff+metrics；逐视图归因分层（L1 结构不符单列 / L2 / L3）；人工抽查 ≥3 视图互证。
  验证：台账表（本文件 §残差台账）填满 12 行且每行带初判层级标签。

### D 相 · 差异清偿迭代

- [ ] T8 (D1) 逐视图清偿循环（可多轮提交）：
  文件：`auto/src/front/*.at`（必要时）、`src/lib/api.ts`+`api 层孪生`（仅当 L2 修复要求 additve 字段）。
  操作：每轮取台账一条 L2 行 → 修复 → 双门禁 → 台账行改绿或转登记；触及视图源必过 N4 回退门禁（vue 28 + css-era diff）。
  验证：每轮 `./scripts/e2e.sh && node scripts/e2e-vm.mjs` 双绿。
- [ ] T9 (D2) 残差终稿与 README 章：
  文件：`auto/README.md`（新章「双端一致性」）、本文件台账终态。
  操作：L3 光栅层清单定稿（字体光栅/hover 缺失/控件形态/滚动条样式差）；上游缺口按 446/455 格式拟回报稿（入本文件附录）。
  验证：台账无「未归因」行。

### E 相 · 门禁扩容与收尾

- [ ] T10 (E1) e2e-vm 9→14：
  文件：`scripts/e2e-vm.mjs`。
  操作：新增断言——搜索过滤、分组折叠、accent 持久化重启保持、collection detail inputs/applies 常驻存在、swatch 导航冒烟（详见详细设计 E 相）。
  验证：`node scripts/e2e-vm.mjs` 连续两遍 14/14 全绿。
- [ ] T11 (E2) 文档三件套：
  文件：`auto/README.md`、`README.md`、`docs/plans/KNOWN-DEBT-AND-RISKS.md`。
  操作：vm 章节改写为双端一致架构叙述（含窗口/门禁/残差指引）；KNOWN-DEBT 中 J1-J4、MCP 轮询崩溃、007 vm v1 偏差等条目按 T2/T9 实证终态改写或移除。
  验证：三文件交叉引用一致（446/455 号、断言数、残差数）。
- [ ] T12 (E3) probe 去留裁决：
  文件：`scripts/vm-probes/probe-mcp-health.mjs`（及其余两件按用途复核）。
  操作：崩溃在 A2/全程未见再现 → 删除 + KNOWN-DEBT 撤条；仍偶发 → 保留并头注标注观测频率与定位价值。
  验证：`ls scripts/vm-probes/` 与 KNOWN-DEBT 相关行一一对应。
- [ ] T13 (E4) 终验与验收包：
  操作：双端按走查清单 W 全量实机一遍；生成双端并排对比 sheet（tmp/，不入库）；本文件验证清单全勾。
  验证：G1-G6 逐条满足；用户验收确认后在计划头追加验收记录行。

## 残差台账（T7 初填 / T9 终稿）

| # | 视图 | 层级 | 现象 | 归因 | 处置 | 状态 |
|---|---|---|---|---|---|---|
| U1 | 全局/集合页 | 上游P0 | 实体列表循环构建后，侧栏任意 press 被接受但 active_id 冻结不变——用户逛完集合页即全局死导航 | auto-lang dynamic_view 事件路由（复现序列已存 tmp/seq.mjs） | 门禁段序绕行（集合段排最后）；缺陷回报渠道待办 | 登记待回报 |
| U2 | 编辑器字段 | 上游P1 | autoui_type 合成输入把内联 onchange 表达式粘连成 handler 名（.ApplyEntryi0s$event.t…），文本不落盘、dirty 不置位；真键盘 live-apply 待实机走查 | action_mapper 仅找 "type" handler 名 | e2e-vm KNOWN-GAP 机制显式登记 | 登记待回报 |
| R1 | vm 无 auto-Init | 设计差异 | accent 桌面轨重启丢失 / 文件模块需手动 Load | 007 已登记偏差的余项 | app.at 根 Init 链补 Theme.Init()（已修）；Load-first 形态保留为双端定型 | ✅ 已修 |
| R2 | 集合页列表行 | 结构差异 | div+onclick 在 vm 不可交互 | css-era HTML 语义无 vm 对应 widget | e-row 定型为 button（styles.css 中和 UA 态保像素） | ✅ 已修 |

## 已知 GAP 汇总（e2e-vm 运行时输出，共 2 项常驻）

见台账 U1/U2——均属上游能力缺口而非本仓回归；vm 门禁判定不受影响，实机键盘路径在 T13 走查验证。

## 盘点表（T2 回填）

| 轮次 | e2e-vm 结果 | 自愈触发 | MCP 崩溃再现 | 备注 |
|---|---|---|---|---|
| 修复前 | FATAL boot ×3 | 否 | 否（非崩溃——见下） | 新 CLI 下 `auto/src/back/api.at` entryAt 的 `let prov` 分支重赋值被 handler-codegen 拒绝 → `api.entryAt` 毒药丢弃 → App 链接失败（阶段一后加代码从未过 vm 轨，N4 冻结盲区）。修复：`var prov`（与同 fn 循环内 `var ku` 同惯用法）。 |
| pass1 / pass2（修复后） | FAIL（两遍失败集完全一致，共 8 断言败） | 否 | **否**——健康探针 500ms×60s SURVIVED（J4/MCP 轮询硬崩溃未再现） | 稳定失败面（即 B 相工作清单）：① sidebar search input 找不到 ② collection assistant button / entity select（entries=[]）③ detail inputs/applies missing(0/0)（原批 4 签名）④ test connection "fail" ⑤ Coral swatch 找不到→accent 三断言连锁败 |

另登记：`probe-mcp-health.mjs`/`vm-detail-dump.mjs` 迁移遗留 cwd 路径 bug（`../auto/` 应为 `../../auto/`）已修复。

## 复审记录

### 上游锚定表（T1）

| 日期 | auto-lang master | 动作 |
|---|---|---|
| 2026-08-27 | `b0992306d`（含 446 批一 J1/J2 收口、455 Phase 1 input focus 样式） | debug CLI 重建 + regen + 双轨基线 |

（/auto-plan:review 回填）

## 待澄清事项

1. **「一致」口径**：本计划按 009 §非目标沿用「同一设计语言 + L1 结构级一致 + L2 清偿/归因 + L3 光栅登记」，未设全局像素阈值。如需升级为硬阈值（例：每视图 L2 分区 diff% ≤ 3%），请在草案确认时批注，验收标准 G3 将随之收紧。
2. **T2 盘点为 B 相前置**：若批 4 区断言仍失败且非自愈可救，需先行归因登记（上溯 446/455 渠道），B 相整体顺延——届时回到本计划修订，不擅自扩大范围。
3. **vm 窗口尺寸可控性未知**（T6 定案）：若完全不可控，L2 量化口径退化为「内容坐标聚类 + 交集区 diff」，需用户知悉该口径调整。
4. **上游缺陷回报（新增，2026-08-27）**：T3 实测确诊两项 auto-lang 缺陷（U1 侧栏事件冻结 P0 / U2 autoui_type×onchange P1），已按本仓纪律 workaround + 登记。按 007 D10 惯例应写入 auto-lang `docs/plans/446-*` 现场报告增补——该项跨仓操作拟在 T11 文档阶段一并执行。
5. **T2 盘点为 B 相前置**（已被 T3 消解：批4 卡点证实为失真快照假象 + U1/U2 两个真实缺陷，见残差台账）。
