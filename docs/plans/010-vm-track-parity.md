---
plan_id: PLAN-010
status: executing
feature_name: VM 轨一致性——Auto/VM 版对齐 Auto/Vue 版
author: [zcode]
created_at: 2026-08-27T12:00:00+08:00
updated_at: 2026-08-28T17:30:00+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 13
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

- [x] T5 (C1) 对拍工具入库 ✅ 已完成 [2026-08-27] `scripts/track-parity/{capture,diff}.mjs` 落库（commit c9eb9f1）；vue 8/8、vm 7/8 捕获成功（roles 详情视图见 U3）。
- [x] T6 (C2) vm 窗口定标探针 ✅ 已完成 [2026-08-27] 上游支持 `AUTO_VM_WINDOW=WxH`（默认 1280x800）；本机 2x DPI 致 PNG 物理像素翻倍——capture 设 `720x450` + 截图后重采样归一到 1440x900，两轨尺寸全对齐（T6 头注已录）。
- [x] T7 (C3) 12 视图 diff 台账初稿 ✅ 已完成 [2026-08-28] 真实基线建立。三项关键修正：①上游锚定 b0992306d→1487b5c5d（446 批二 codegen 类串清理，regen 漂移采认，vue 门禁绿 ffce0cb）；②窗口定标口径修正 1440x900 逻辑（T6 的 720x450 逻辑半幅致布局比例全失配，diff% 虚高）；③capture 导航移植 e2e-vm 精确匹配 + active_id 全验证（旧 walk-back 版 6 视图假阳性拍成裸侧栏）(4c8c8a9)。真实基线：00=10.10 / 01=20.23 / 02=11.92 / 04=12.45 / 05=14.07 / 06=12.86 / 07=12.29（03 见 U3）；分区 sidebar 28-32%（R4）/ content-head 84-93%（R8）/ content-body 0.1-14.2%（R4 系统性+L3）。人工抽查 00/01/04/07 四视图互证一致。台账 12 行见 §残差台账。

### D 相 · 差异清偿迭代

- [x] T8 (D1) 逐视图清偿循环（可多轮提交） ✅ 已完成 [2026-08-28] 三轮清偿（R3 一轮 + T8 主轮 1610c21 + R11 轮 8074c87）。root cause 定格：vm button 的 `class: <loop字段表达式>` 求值失败→convert_button 兜底 primary preset（紫块/白字/h-10 裁 3 行折叠 label）；label 元素 children 折叠链 Dot 求值失败致 label 整列缺位（text: prop 直取链可解）；field-row/subform-cont grid 布局 vm 无对应。清偿：侧栏 nav 条件展开双态静态串、header w-full、btn 族/reveal/输入框/表头显式色中和、label text-prop 化、box_class 孪生补 flex。终值 diff%：00=0.97 / 01=6.72 / 02=2.99 / 04=3.64 / 05=4.16 / 06=2.25 / 07=1.69（03 见 U3）。双门禁两连绿 + css-era 00=0.00% 零回归（N4）。剩余残差全部登记（U4/U5/L3）。
- [x] T9 (D2) 残差终稿与 README 章 ✅ 已完成 [2026-08-28] ①auto/README.md 新章「双端一致性」（三层口径/对拍工具/窗口定标纪律/门禁/终值/vm 兼容词汇 5 条——条件展开、text-prop、显式色、等值类、w-full）；②台账终态：全部行带归因（U1-U7 上游缺陷号化、R 系列全 ✅ 或登记），无「未归因」行；③L3 光栅层清单定稿（字体光栅/hover 缺失/select 形态/滚动条/thead 暗色/emoji fallback）；④上游缺口按 446 格式拟回报稿（本文件附录，U1-U7 含复现载体与修复建议），T11 正式写入 446。

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
- [x] T13 (E4) 终验与验收包 ✅ 已完成 [2026-08-28] ①走查清单 W：vue 轨=e2e 28 断言全覆盖（ALL PASS）；vm 轨=e2e-vm 14 断言（搜索/折叠/accent 切换+持久化重启/Test connection/集合列表/实体选择/detail 常驻）+ 专项 MCP 走查（auto-musk 增块 ✓[删块按钮快照定位失败,vue e2e 已覆盖同链路]、roles 详情字段 ✓、harness-roles 详情/子表单 ✓ inputs=4、skills 只读 ✓[T4+04 视图]、ai-client 双 select=U4 已登记）；**实机新发现 U8**（modal 删除确认:AskDelete 不执行,U1 冻结面扩展）。②双端并排 sheet：tmp/track-parity/sheet.png（2916x7308,8 视图,不入库）。③G1-G6：G1 ✓（vue 门禁 ALL PASS + css-era 00=0.00% 零回归,多轮）/ G2 ✓（14 断言连续多遍全绿）/ G3 ✓（台账全归因无未归因行;03-roles L1 实机走查由 U3 约定覆盖——列表/选择链路 e2e-vm 断言在案,详情态肉眼核对留用户验收）/ G4 ✓ / G5 ✓ / G6 ▶ **走查完成,用户验收确认待办**（确认后在计划头追加验收记录行）。

## 残差台账（T9 终稿 [2026-08-28]；全行带归因，无未归因项）

| # | 视图 | 层级 | 现象 | 归因 | 处置 | 状态 |
|---|---|---|---|---|---|---|
| U1 | 全局/集合页 | 上游P0 | 实体列表循环构建后，侧栏任意 press 被接受但 active_id 冻结不变——用户逛完集合页即全局死导航 | auto-lang dynamic_view 事件路由（复现序列已存 tmp/seq.mjs） | 门禁段序绕行（集合段排最后）；缺陷回报渠道待办 | 登记待回报 |
| U2 | 编辑器字段 | 上游P1 | autoui_type 合成输入把内联 onchange 表达式粘连成 handler 名（.ApplyEntryi0s$event.t…），文本不落盘、dirty 不置位；真键盘 live-apply 待实机走查 | action_mapper 仅找 "type" handler 名 | e2e-vm KNOWN-GAP 机制显式登记 | 登记待回报 |
| U3 | roles 详情视图 | 上游P1 | 选中实体后的详情态 autoui_screenshot 必超时（复测 3/3：MCP 服务端内部 ~10s 上限放弃，非客户端超时；详情态 state/snapshot 通道 0.0s 存活 → iced 主线程活、仅截图通道死）；其余 7 视图截图正常 | 疑 autoui_screenshot 与 detail 富子树的 redraw 管线协作阻塞 | capture 跳过该视图；T13 实机核对 | 登记待回报 |
| R4 | 全部（按钮族） | L2 | **动态 `style:`/`class:` 绑定在 vm button 路径不解析**——全页按钮（nav item/Test/Reload/Save/+Row/Delete）落默认主色紫块，关联文字大量不可见；静态类串控件（search/input/swatch）正常 | root cause（T8 定格）：loop 字段 Dot 表达式在 button prop 求值失败 → convert_button 兜底 primary preset（bg-primary/text-primary-foreground/h-10）+ 子树折叠为多行 label 被 h-10 裁剪 | 条件展开双态静态串（theme_picker 同款词汇）+ vm 中和类（text-[#1a1a1a] h-auto 等值尾缀）；上游 455/446 渠道回报 | ✅ 大部清偿（1610c21）|
| R8 | 全部（content-header） | L2 | 头部 row 仅包裹内容宽度，右段露出近黑底（vue 块级铺满）——content-head 区 diff 84-93% 的主导项 | vm row 主轴不自伸；header style 无 w-full/flex-1 | header 加 w-full（vue 块级本全宽，css-era 零变化） | ✅ 已修（1610c21，content-head 84-93%→2.4-3.2%）|
| U4 | 编辑器/集合页 | 上游P1 | **select 控件 vm 端整体缺位**——Default Model/Default Provider 行只有 label，下拉控件不渲染（T4 快照计数有 select=结构在、渲染丢） | vm select 组件渲染转换缺口（D7 降级形态未落） | 446/455 渠道回报；L1 结构残差 | 登记待回报 |
| U5 | 编辑器表格 | 上游P2 | vm table thead 内置暗色底白字（css-era 是 #ededed 灰底深字）；th 的 style 属性被忽略（表格特化节点非 text 元素，style 不可达） | vm table 组件内置样式 | 446/455 渠道回报 | 登记待回报 |
| U8 | 集合页 modal | 上游P1（U1家族） | **T13 实机新增**：详情区 Delete press 被接受但 AskDelete handler 不执行（confirm_open 恒 false，modal 不弹、实体不删不报错）——集合页列表构建后 widget 局部 msg 也被冻结，U1 冻结面从侧栏扩展到页面内按钮 | U1 同域：dynamic_view 事件路由在列表循环构建后冻结 handler 分发 | 与 U1 同一回报；modal 渲染本身未验（前置 handler 死） | 登记待回报 |
| R11 | 编辑器字段 | L2 | field 双列布局（label 左/input 右）在 vm 纵向堆叠（label 上/input 下占全宽）——单字段行高约 2 倍，页面纵向溢出 | .field-row/.subform-cont 是 grid 布局，vm 无 grid；box_class 孪生数据（api.at + src/lib/api.ts）只有类名无布局类 | box_class 双端补 flex 等值类（styles.css 后加载，vue 端 grid 压制 display 像素零变）+ field-label 定宽 w-[160px] | ✅ 已修（8074c87，01 content-body 9.0→7.7%）|
| R9 | 工具链 | 上游P2 | autoui_snapshot 偶发空壳树（105B，实测空壳期可 >8s）——446 批一 J1 竞态家族余震 | styled_vtree 落盘时机竞态 | capture/pressNav 已加非空重试 ✅；上游同渠道知悉 | 工具已缓冲 |
| R10 | 04-skills vm | **功能缺口(P1)** | **review 实锤：read_only 集合在 vm 端实体列表永远空**（skills `names: []`,vue 端 7 实体自动加载+自动选中）——`if read_only == false` 才渲染 Load 按钮,vm 无 auto-Init → 只读集合无任何加载入口;用户在 vm 桌面版无法浏览 skills | R1"Load-first 双端定型"裁定的盲区:read_only 集合没有 Load 入口可"first" | 修复决策待 work:①store.Select 预载集合数据(视图源零改动)②视图源 read_only 分支加载入口(触 N4)③上游 auto-Init;修前 skills vm 不可用 | **review 退回项** |
| R1 | vm 无 auto-Init | 设计差异 | accent 桌面轨重启丢失 / 文件模块需手动 Load | 007 已登记偏差的余项 | app.at 根 Init 链补 Theme.Init()（已修）；Load-first 形态保留为双端定型 | ✅ 已修 |
| R2 | 集合页列表行 | 结构差异 | div+onclick 在 vm 不可交互 | css-era HTML 语义无 vm 对应 widget | e-row 定型为 button（styles.css 中和 UA 态保像素） | ✅ 已修 |
| R3 | app 内容面板 | L2 | content-body 无背景类，iced 默认暗色主题下透明底露出近黑 → 全视图 diff% 79 的主导项（已清偿） | css-era html 白底隐式依赖 | app.at content-body 显式 bg-white（cc3094b，vue 门禁零回归） | ✅ 已修 |
| R5 | accent 基线 | 工具纪律 | vm 读 autoos-ui.json 而 vue 用 localStorage，历史状态互串 | 双端存储不同源 | capture 已预置双端 indigo ✅ | ✅ 已修 |
| R6 | 进程卫生 | 工具纪律 | node 崩溃遗留僵尸 auto.exe 占 MCP 端口——后续所有 boot 截图拍到旧画面 | libuv 断言退出不留清场 | capture 已加逐次 taskkill 清场 ✅ | ✅ 已修 |
| R7 | 窗口定标 | 工具纪律（已修） | T6 定标 720x450 只对齐 PNG 物理尺寸（1440x900），**逻辑几何是 vue 半幅**——侧栏占宽 40% vs vue 20%，布局比例全失配，diff% 系统性虚高（26 vs 真实 10-20） | DPR 语义混用：vm 720 逻辑 @2x = vue 1440 逻辑 @1x | capture 改 AUTO_VM_WINDOW=1440x900 + normalizeSize 重采样归一（4c8c8a9） | ✅ 已修 |

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
| 2026-08-28 | `1487b5c5d`（446 批二 A1/E1/E2：多store消歧显式报错、codegen arity 分流、类串清理） | 锚定更新：regen 类串清理漂移采认（ffce0cb）；A1 歧义报错适配——app.at 裸 store.Init()→Modules.Init() + regen.sh sed 回写（b870260，vm 恢复启动） |

（/auto-plan:review 回填）

### 复审（2026-08-28，reviewer: zcode）——**判定：退回 /auto-plan:work**

**验收标准重验**（全部在 worktree 实测，不采信勾选）：

| 项 | 判定 | 证据 |
|---|---|---|
| G1 vue 门禁 + css-era 零回归 | ✅ PASS | 重跑 `./scripts/e2e.sh` ALL E2E PASS;重拍 vue 轨对 css-era：00=0.00%（零回归），最高 05=2.13%（L3 量级） |
| G2 e2e-vm 14 断言两连绿 | ✅ PASS | `node scripts/e2e-vm.mjs` 连续两遍 PASSED（14/14;含自愈加固 68ec374） |
| G3 台账归因 | ✅ PASS | 台账全行带归因,无「未归因」字样;L1 核对=快照/走查证据在案 |
| G4 README 章 + 台账终稿 | ✅ PASS | auto/README.md:224「双端一致性」章;台账终稿在案 |
| G5 三件套 + probe 去留 | ✅ PASS | 三件交叉引用一致（446 §P e06fb31e0/断言数 14/残差指引）;`scripts/vm-probes/` 已空 |
| G6 走查 + 用户验收 | ⚠️ PARTIAL | 走查完成（T13 记录+U8 新发现）;**用户验收签字未发生**;且走查复查发现 R10 实质缺口（见下） |

**遗漏/延后/workaround 猎查**（Step 3）：

- **猎出实质遗漏（退回主因）**：R10 复核实锤 **read_only 集合在 vm 端实体列表
  永远空**（skills `names: []` vs vue 7 实体）——`if read_only == false` 才有
  Load 按钮 + vm 无 auto-Init = 只读集合无任何加载入口。这是功能缺口（L1）,
  非像素残差;R1「Load-first 双端定型」裁定存在盲区。用户从未签核此项延后
  → 按 skill 规则 plan 不算实际完成。
- 延后一项：U8 未写入 446 附录表（T9 附录为 U1-U7;U8 为 T13 新发现）——
  work 阶段补。
- workaround 全部显式在案（条件展开/text-prop/中和类/U1 段序/regen sed×2,
  446 §P 有案），无静默。
- 债务候选（不阻塞，work 顺手）：tmp/metrics.mjs 未入库（C 相设计含它）;
  modules_store.at 的 nav_class 死代码（条件展开后无引用）。

**修复清单（hand back to /auto-plan:work）**：

1. **[P1] read_only 集合 vm 端实体加载**——方案候选：①store.Select handler
   预载集合数据（视图源零改动,优先评估）②视图源 read_only 加载入口（触
   N4 全门禁）③上游 auto-Init 支持。修复后：skills vm 列表有数据 + 双门禁
   + css-era 零回归。
2. [小] U8 补进本文件附录 §P 表格。
3. [小] `scripts/track-parity/metrics.mjs` 入库（tmp 版固化）。
4. [小] modules_store.at nav_class 死代码清理。
5. [流程] 完成后重验 G1/G2/G6（用户验收）,再行复审。

## 待澄清事项

1. **「一致」口径**（已按 009 沿用口径执行）：L1 结构 + L2 清偿/归因 + L3 登记，未设全局像素阈值；终值 00=0.97 / 最高 6.72，若需硬阈值请在 review 批注。
2. ~~T2 盘点为 B 相前置~~（已被 T3 消解）。
3. ~~vm 窗口尺寸可控性未知~~（T6/T7 定案：AUTO_VM_WINDOW 可控；T7 修正口径为 1440x900 逻辑几何）。
4. ~~上游缺陷回报~~（T11 已执行：auto-lang 446 §P 增补 commit e06fb31e0，U1-U7；T13 新增 U8 待下次增补一并写入）。
5. **用户验收（G6）待确认**：走查与 sheet 已就绪（tmp/track-parity/sheet.png），验收记录行待用户确认后追加。

## 附录：auto-lang 上游缺口回报稿（T9 拟定，T11 正式写入 446 现场报告增补）

> 基线：auto-lang master `1487b5c5d`。复现载体：auto-os-config `plan-010-dev`
> （main 同步至 8074c87）——`auto run -r vm`（cwd=auto/）+ MCP + 
> `node scripts/track-parity/capture.mjs --track vm`；vue 侧对照
> `./scripts/e2e.sh`。全部条目已在本仓 workaround/登记，不阻塞消费。

| # | 类别 | 严重度 | 一句话 |
|---|---|---|---|
| U1 | 事件路由 | P0 | 集合页实体列表循环构建后，侧栏任意 press 被接受但 active_id 冻结（全局死导航） |
| U2 | action_mapper | P1 | autoui_type 合成输入把内联 onchange 表达式粘连成 handler 名，文本不落盘 |
| U3 | 截图通道 | P1 | 集合页详情态 autoui_screenshot 必超时（服务端 ~10s 上限放弃；state/snapshot 通道 0.0s 存活——仅截图路径与 detail 富子树协作死） |
| U4 | select 渲染 | P1 | select 控件 vm 端整体缺位（快照结构在、渲染丢）——编辑器标量 select 字段无输入形态 |
| U5 | table 样式 | P2 | thead 内置暗色底白字；th 的 style 属性被忽略（表格特化节点非 text 元素） |
| U6 | 快照通道 | P2 | autoui_snapshot 偶发空壳树（105B），实测空壳期可 >8s；boot 后轮询窗口内概率出现 |
| U7 | 表达式求值 | P1 | **loop 字段 Dot 表达式在元素 prop 求值失败**（`class: m.nav_class` 静默落 preset、`label` children 折叠链整列缺位）——同表达子在**条件位**（`if g.open`）与 **text prop 直取链**（`input value: e.value`）均可求值，仅「children 折叠」与「button class: prop」两链失败。vue 端（运行时 JS）全部正常 |

**U7 细节**（本计划最大清偿项的根因，修复后可删仓内全部条件展开 workaround）：
- 复现 A（button）：`for m in .store.view_standalone { button (class: m.nav_class) … }`
  ——class 求值失败 → `convert_button` 的 preset 兜底 `bg-primary text-primary-foreground … h-10`
  （且子树折叠成多行 label 被 h-10 裁剪，仅首行 icon 可见）。
- 复现 B（label）：`label (style: "…") { text (text: e.label) {} }`——children
  折叠（AuraNode::Text Interpolated）对 e.label 求值失败 → content 空 → label
  整列缺位。改 `label (text: e.label, …) {}`（props 直取链）即恢复正常。
- 修复建议：把 children 折叠链与 button class: 链的字段求值统一走
  input value 同款 `extract_string_with` 直取链（或为 loop 绑定补 Obj 字段
  物化），并对「求值失败→静默 preset 兜底」改为显式告警（BuildProbe 已有
  通道）。
- 本仓 workaround：侧栏 nav 条件展开双态静态串 + label 全量 text-prop 化
  （commit 1610c21）。

**L3 光栅层清单（定稿，不入门禁）**：字体光栅与字重渲染差（2x 重采样 vs 1x
直渲）、hover 态缺失（vm 静默跳过 hover: 类）、select 形态差（原生下拉 vs 缺位
U4）、滚动条样式差、表格 thead 暗色（U5）、emoji 字体 fallback 差。

**Feature Request F1：导航/列表语义化（建议随 Plan 457 shadcn-vue 内置立项）**

现状：侧栏导航项与集合列表行以 `<button>` 模拟。成因三重——① CSS 原版基线
（tmp/css-era/Sidebar.vue:66）自身即 `<button :class="nav-item" @click>`，
本仓像素对拍忠实复刻；② vm（iced）无 nav/menu/list widget，且 div+onclick
不可交互（U1 关联域），Button 是双端唯一交集；③ `.at` DSL 无
nav/aria/router 语义表达通道。

标准形态（Web 侧共识）：语义 `<nav>` + 列表结构 + `aria-current="page"`
标激活项（WAI-ARIA APG）；组件层 shadcn-vue Sidebar 全家桶（Provider/
Menu/Group/Collapsible）、Element Plus el-menu、Vuetify v-navigation-drawer。

演进建议（两步，均不破坏 vm 轨）：
1. **codegen 语义包装（低成本，可先行）**：vue codegen 对携带约定标记类
   （如 `nav-item`、`e-row`）的元素按注册表映射输出语义标签与 ARIA 属性
   （`button.nav-item` → `<a aria-current="page">` 包裹于 `<nav>`）；
   vm 渲染路径不受影响。
2. **内置 Sidebar 组件（随 457）**：Sidebar（含分组折叠/过滤插槽）作为
   AutoUI 内置复合组件——`.at` 一行声明，web 端产出 shadcn-vue Sidebar
   等价 DOM，vm 端产出原生 widget；本仓 sidebar.at 约 200 行手写结构可
   整体退役。

验收锚点：双轨对拍 diff% 不回升；web 端 axe/读屏可识别 navigation 地标
与当前项；vm 端 MCP press 语义不变。（已登记 KNOWN-DEBT 未来增强 010 行）
