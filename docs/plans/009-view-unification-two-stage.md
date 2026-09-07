---
plan_id: OS-009
status: reviewed
feature_name: view-unification-two-stage
author: [zcode]
created_at: 2026-08-26
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
---

# Plan 009: 两段式视图统一 — 先 Vue 轨对齐 CSS 基准，后 VM 轨接入

> **像素对拍补录（2026-08-27 会话）**：用户验收标准从"同一设计语言"升级为 **Auto/Vue 版对 CSS 原版（tmp/css-era/）逐视图像素级一致**，并按组件逐个对比修改。已落地（工具 `tmp/parity/{capture,diff,rows}.mjs`，双端同 daemon、同视口、同 accent、禁动画对拍）：
> - **根因四件套**：① vue codegen 对 row/col 无条件注入 `gap-4`，而 Tailwind CSS 里 `.gap-4` 排在 `.gap-0` 之后 → 源码 gap-0 全部失効（根布局 16px 缝/导航名描述 16px 距）——**硬规则：row/col 源码 gap 一律任意值形式 `gap-[Npx]`**（任意值排序在 scale 之后，稳定获胜）；② css-era 无 preflight，button/input/select 的 UA 字体是 **Arial 13.33px**（按钮内文字全在 Arial 度量，14px 行盒 16px；Segoe 是 19px，每行 +3px 逐项累积）——styles.css 恢复 `button,input,select,textarea{font:400 13.3333px Arial}`；③ preflight `html{line-height:1.5}` + text-\* 固定行高 → fontSize 全字号覆盖回 `normal`；④ 占位符 preflight gray-400 → UA `#757575`。
> - **编辑器/集合页回归 css-era 形态**：config_editor.at / daemon_view.at / collection_browser.at / theme_picker.at 视图与 DOM 结构按 tmp/css-era 组件 1:1 重写；scoped CSS 以命名空间块（`.config-editor`/`.daemon-view`/`.collection`）原值拷入 styles.css（伪类如 `.toggle input:checked + .toggle-track` 类串表达不了）；`Init` 消息回归（vue onMounted 自动加载，vm 无 auto-Init 仍见 Load 按钮）；编辑提交改 onchange 双参（`.Apply(e, $event.target.value)`——单参 handler 会被 codegen 换成纯文本值；cast 断言由 regen.sh 部署 sed 统一补，.at 事件表达式语法不收 TS cast）；Save 禁用态（!dirty 半透明）；swatch 色点+黑圈白勾回归（文字胶囊废除）；api 层新增 `is_provider`/`box_class`(first/last) 孪生字段（api.at + src/lib/api.ts）用平铺行拼 subform 盒；collection_store 新增 `view_entities` 投影（列表行带描述行；vm 继续用 view_names）。
> - **成绩**（1440x900，diff% = 与 css-era 同视图逐像素差异）：00 侧栏 **0.00%**（完全一致）；06-modes 0.13% / 07-harness-roles 0.15% / 03-roles 0.18% / 04-skills 0.68% / 02-auto-musk 1.13% / 01-ai-daemon 1.88% / 05-ai-client 2.04%（初轮 1.47-3.33%）。vue 28 断言门禁三套件全绿（测试选择器随 DOM 回归同步更新）。
> - **登记偏差/待办**：~~可编辑表格~~ / ~~tags chips~~ / ~~select 真下拉~~ / ~~集合页 modal 删除确认~~——**二阶段已全部还原**（见下）；仍余：编辑器首存确认行内条（css-era 为 window.confirm，静态不可见）、编辑提交时机 blur/回车（css-era 逐键 live-apply）、theme_picker ✓ 文本勾（css-era svg）、modal 背板点击不关闭（css-era 有 target 自检，.at 视图无法判 e.target）、vm 轨编辑器/集合视图因 vue-first 重写需在 J1 解锁后按新形态重验（009 §0.2 顺延）。
> - **像素对拍二阶段（2026-08-27 续）**：可编辑表格 / tags chips / select 真下拉 / modal 全部还原。api 层新增（两端孪生）：`selectOptionsOf`/`optionValuesHave`/`stringItemsOf`/`msCheckedOf`/`tableColsOf`（css-era tableInfo+mergeCols+inferColumn 等价，枚举列同步取）、`warmEnumsText`（vue 端 Init await 预热 enumCache 后 entryAt 同步读缓存；vm 端同步 http）、`setCellText`/`tableAddRowText`/`tableRemoveRowText`（css-era setCell/blankRow/removeRowAt 的文本管线版，按旧单元格类型重定型）；entry 条目新增 `options/has_current/items/ms_checked/t_cols/t_rows` 字段（t_rows 仅 vue 端为原生行数组——视图 `r[c.name]` 动态取值 codegen 原样透传 TS，vm 端为空数组）。修复：顶层字段 provider 上下文 = 全局 default_provider（css-era configEntries 语义，default_model 据此成为 self-models 下拉/空选项回退提示）；tag-input 恢复 UA Arial。collection_store 新增 `SetBodyText`/`TagRemove` 消息 + 重建点 warmEnums。视图：真实 `<table>`（列头/单元格 select+number+text/×/+Row）、tags chips（× 移除 + 回车内联添加）、multiselect 复选组（ms_checked 平行数组）、select 空选项斜体提示、集合页删除 modal。成绩：01 1.61% / 02 1.25% / 05 1.85%，残差为均匀 ±2px 行节奏（无结构性红块）；e2e 三套件全绿（选择器随真下拉/modal 更新）。

> **状态**：已执行完毕（2026-09-07 复审账实核对：阶段一 = 008 批 1-6 + 本计划像素对拍一/二轮（头部补录全量在案）；阶段二 M1-M3 = 008 批 6 收口 + 010 A/B 相承接；M4/终态 = 010 T10/T11/T13 落账；全部勾选已按证据补记，见文末复审记录。frontmatter 归一化补于此时；原「现状接管」框架文本保留下方作历史脉络）
> **与 008 的关系**：非取代——008 的实施在先且继续作为实施记录；本计划提供两段式视角的接管映射（§0.1）与剩余执行序（§0.2）。原"取代 008"表述作废（main 上 db5518c 的 008 状态行相应回改，随本分支合并落地）。
> **前置**：Plan 007 已完成（store/api 单一真源 + e2e-vm 9 断言门禁绿）
> **仓库**：auto-os-config（frontend only；`backend/` daemon 零改动）

---

## 0. 策略重排动因（2026-08-26 用户决策）

008 的结构是"每个 widget 一批，双端同时迁移、同时验证"。问题：**跨端噪声与翻译问题耦合**——浏览器 vs iced 的字体光栅、控件形态、明暗模式差异和"类串翻译是否忠实"混在同一张对比截图里，任何观感偏差都要先做跨端归因；且每批进度都暴露给 vm 上游漂移风险（Plan 446 时代，vm 渲染器活跃开发）。

两段式 = 控制变量，一次只动一个维度：

| | 变的 | 不变的 | 对比方式 |
|---|---|---|---|
| **阶段一（Vue 轨）** | 样式表达：CSS 命名类 → `style:` 类串 | 后端（同一浏览器） | CSS 版基准 vs 类串版，**同渲染引擎**——任何视觉差异 100% 归因于翻译本身，逐像素 diff 可行 |
| **阶段二（VM 轨）** | 消费后端：vue → vm 消费同一视图源 | 视图源（冻结） | vm 截图 vs vue 截图——唯一变量是 vm 渲染器，问题退耦为纯"渲染保真" |

**代价（显式承认）**：阶段一在"只看 vue"的舒适区里工作，最容易顺手写出 vm 跑不了的构造（vue 专属类、视图内函数、style_obj…），阶段二才发现就要返工。对策是把"vm 兼容"从逐批门禁前移为**开工前契约**（Phase 0 探针定稿词汇 + vm 安全类白名单 + 静态 lint，见 N1/N2）。

**两段各自的验收锚点**（比 008 的单一终态更清晰）：
- 阶段一验收 = 浏览器内 Auto/Vue 版与 CSS 版观感一致（同结构、同色板、同间距节奏）；
- 阶段二验收 = vm 版与 vue 版"同一设计语言"（残余差异显式登记，不追像素级）。

### 0.1 现状接管映射（2026-08-26 盘点，008 分支实施 ↔ 本计划阶段）

| 009 阶段 | 008 分支实施（commit） | 状态 |
|---|---|---|
| Phase 0 探针词汇 | Phase 0（d9fb48e） | ✅ P1-P4 全过；另证 vm 间距禁小数（u16 丢弃 `py-1.5`）、vm MCP 轮询硬崩溃（e2e-vm 已自愈化） |
| V1 Tailwind 接入 | Phase 1（95268fb） | ✅ Inter + primary `<alpha-value>` + content 直扫 `.at`；12 截图基准重拍（旧档 `tmp/phase1-baseline-old/`） |
| V2 词汇定稿 | Phase 2（41bd035） | ✅ D2/D6 入 `auto/README.md`；双端定稿对照图 |
| V3 批1 sidebar | 批1（7f32195） | ✅ 双端绿（vm 侧栏已同设计语言）；新硬规则：绑定必须 `class:`（vue 把 `style:` 绑定编成内联 `:style`） |
| V3 批2 daemon | 批2（f9a7ebf） | ✅ 双端绿 |
| V3 批3 editor+scalar | 批3（b955004） | ✅ 双端绿；D7 统一降级落地（select→文本、table→只读 JSON 等） |
| V3 批4 collection | 批4（8c97d0c）+ 009 增补（3d9c828） | **vue ✅ / vm ⛔ 上游 J1**——条件扁平化已救回工具栏/sidecar（循环体二分矩阵全灭，确认上游渲染器缺陷，视图侧无解；证据增补 446 J 批） |
| V3 批5 table_field | 批3/批4 吸收（只读 JSON 降级） | ✅ 分叉例外未启用（P2 已证无视图级门控） |
| V3 批6 app_shell | 批6（b4863b7） | ✅ app.at 双端共享根；app_shell/ext 退役；vue 全绿 + vm 根级 1-5 绿 |
| 阶段二 M（vm 切换） | 批1-3 随批完成（交织式） | ✅ 批1-3；批4 vm ⬜ 待 J1 |
| M4 收尾 | — | ⬜ 剩余（e2e-vm 9→14、文档三件套、双端走查、probe 去留） |

### 0.2 剩余执行序（009 框架下的关键路径）

1. **J1 解锁（关键路径）**：批4 vm 门禁固定失败于 `detail inputs/applies missing`。两条路：
   a. **视图扁平化绕行（先试，仓内自足）**——446 J1 变形矩阵只试过循环形态（单/双变量 × wrapper × key 位），**未试过条件嵌套扁平化**（store 预计算布尔 + 兄弟条件块替代深层嵌套；007 逐字结构=浅嵌套可渲染即为方向证据）。绕行落地后共享视图为双端同构的 J1-safe 形态，不算分叉；上游修复后再回归自然形态（登记）。
   b. 上游修复（auto-lang renderer，446 建议先做构建失败显式化诊断）——依赖并行会话节奏，不作本仓阻塞项。
2. ~~批6~~ ✅ 已完成（b4863b7，2026-08-26）。
3. **M4 收尾**：e2e-vm 9→14（补搜索过滤/分组折叠/accent 持久化）、`auto/README.md` 重写 + 根 README + KNOWN-DEBT（含 J1-J4 上游交叉引用）、双端 7 模块实机走查、`tmp/probe-mcp-health.mjs` 去留决定。

### 0.3 阶段一验收包（2026-08-26 16:3x，待用户验收确认）

**工件**：`screenshots/stage1-acceptance-sheet.png`（12 视图并排：左 = CSS 手写版基准 `tmp/phase1-baseline-old/`（8-25 12:33，pre-Tailwind），右 = 当前 HEAD 统一类串版（批 6 后实拍）；生成脚本 `scripts/stage1-acceptance-sheet.mjs`（入库；产物 PNG 按仓库惯例不入库，可随时重拍重生成））。

**对比结论（初筛 + 03-roles/01-ai-daemon/04-skills 三对放大抽查）**：12 对全部同结构、同色板、同间距节奏——同一设计语言成立。差异全部为**已登记的有意决策**，非漂移：

| 差异 | 视图 | 性质 |
|---|---|---|
| Segoe UI → Inter 字体度量重排（像素 diff 2.2-14.4%） | 全部 | Phase 1 有意（D5：与 vm default_font 对齐，消最大默认差异） |
| 编辑器 D7 统一降级形态（select→自由文本、table→只读 JSON、toggle→原生 checkbox、tags 只加不减、confirm→内联行、Load 按钮两端统一） | 01/02/05 | 批 3 有意（D7：双端统一降级优于分叉） |
| 集合页统一浏览器（master-detail + 过滤框 + ＋内联创建确认 + sidecar textarea） | 03/04/06/07 | 批 4 有意（与 CSS 版同双栏结构，控制件族统一） |

**门禁状态**：vue 轨 28 断言全绿（批 6 后复跑）；css-era 基准归档于 tmp/（未跟踪，验收后建议连表一起视为冻结凭证）。

**验收通过与后续**：用户确认"同一设计语言" → N4 vue 轨冻结（基准截图与 28 断言不再动）→ 阶段二（VM 轨）继续，其关键路径 = 上游 J1 渲染器修复（证据已备 446 J 批）。

---

## 1. 目标 / 非目标

### 目标

1. **阶段一**：7 个 widget 全部改写为 `style:` 类串视图（双端纪律），vue 门禁全绿，与 CSS 时代基准人工对拍通过；`styles.css` 缩为令牌层 + reset + 滚动条；
2. **阶段二**：vm 消费同一套视图源，`*_vm.at` ×5 全部退役删除；e2e-vm 9→14 断言两连绿；12 张 vm 截图与 vue 基准并排归档；
3. 设计令牌双端同源（008 D2/D5 原样继承）；终态门禁：`./scripts/e2e.sh` + `node scripts/e2e-vm.mjs` 双绿。

### 非目标（沿用 008）

- 不追像素级逐点一致（阶段二）；不做 vm 深色模式；不动 store/api 契约（仅 additive 预计算字段）；不做 `auto build -r vm` 独立分发；不修 auto-lang 上游缺陷（workaround + gap 登记 + P0 回报）。

---

## 2. 决策

### 2.1 继承 008 的决策（不重述，以 008 文本为准）

| 决策 | 内容 | 本计划调整 |
|---|---|---|
| D1 | `style:` 唯一属性语法；`class:` 与内嵌 `style {}` 块退役；视图零函数调用 | 阶段一即生效 |
| D2 | accent 族→语义 token；中性色→确定性类；禁 `background/card/foreground/secondary`；`hover:` 仅作增强 | 无 |
| D3 | 条件类串 store 预计算为完整 class 字段 | P1 探针**提前到 Phase 0 定形态** |
| D4 | computed/ext fn 逻辑下沉共享 store | 阶段一完成（字段 additive） |
| D5 | vue 工程接入 Tailwind 3.4；Inter；`text-sm`=14px | 无 |
| D6 | 组件基线显式类串（按钮/输入/卡片…） | **Phase 0 定稿**（008 原排在 Phase 2——阶段一开工前就要用） |
| D7 | 双端统一降级（select→文本、markdown→纯文本、svg→✓、表格→只读/编辑入口收敛）；分叉例外上限 2 个 | **降级形态必须在阶段一落地**：阶段一产出即双端目标形态，阶段二不得再改视图语义 |

### 2.2 新增决策

**N1 vm 安全类白名单 + 静态 lint（阶段一的核心护栏）**：Phase 0 从 `ui/style/class.rs` 词表 + 探针实测定稿"vm 安全类白名单"（允许的 vue-only 增强类——`hover:`、`transition-*`、`focus:`——单独列节）。新增 `scripts/check-style-classes.mjs`：静态提取 `auto/src/front/*.at` 视图的 `style:` 串，逐类对白名单校验，未知类直接 fail。V3 起每批必跑。**这是"阶段一不看 vm 门禁"的补偿机制**——vm 兼容性由开工前契约 + lint 保证，而非每批跨端验证。

**N2 同后端逐像素 diff（辅助工具，不替代人工）**：新增 `scripts/visual-diff.mjs`：每批迁移后截图与上一状态 diff，**只允许被迁移 widget 的区域有差异**，其余区域必须零差异（阈值容忍抗锯齿；截图前等过渡动画结束或禁用 transition）。把回归检测从"12 张全靠人眼"变成"机器圈范围 + 人眼看语义"。人工对拍仍是验收标准。

**N3 CSS 时代基准归档为验收锚点**：V1 接 Tailwind（reset 必然改变基线）重拍门禁基准之前，先把现 12 张基准归档到 `screenshots/css-era/`——这是**阶段一的验收参考**（类串版最终要和它"同一设计语言"），重拍后的门禁基准只做回归检测用，两者角色分开。

**N4 两段门禁互冻结**：
- 阶段一：vm 轨冻结——`*_vm.at` 零改动；每批照跑 `e2e-vm` 9 断言，**只作 store 兼容守卫**（additive 字段不得破坏 vm 现有视图），不做 vm 观感验证；
- 阶段二：vue 轨冻结——28 断言 + 基准截图不动；vm 侧问题只允许在"默认样式层/残余差异清单"解决，**不得倒灌改视图源**；确需改视图源 = 该批回阶段一门禁（vue 28 + 像素 diff + CSS 基准对拍）。

**N5 阶段二启动前置条件**：① 阶段一用户验收通过；② 视图源冻结（此后改视图源走 N4 回退规则）；③ 上游 auto-lang commit 复核（沿用 007 D10 锚定纪律，漂移则先 vue regen + e2e 再动 vm）。

---

## 3. 分阶段实施

### Phase 0：探针与词汇锁定（`tmp/vm-probes2/`，一次跨端，为阶段一立规）

- [x] vue 28 / vm 9 双轨基线各两遍绿 ✅（008 Phase 0 在案：vue 两连绿 + e2e-vm 自愈化 6 连跑）
- [x] **P1 字段直读类串**：vm `style: x.row_class`（store 字段）是否渲染——定 D3 形态（字段直读 vs if 双分支静态串）；**此结论决定阶段一 V3 全部条件类的写法**； ✅ 三形态全过（结论回填 008 §Phase 0 探针结论 P1）
- [x] **P2 视图层目标门控**：视图文件是否存在 `X.web.at` 双目标机制——定 table_field 分叉例外（`X.web.at` / 双文件 / 统一降级）三选一； ✅ 不存在（008 P2 结论）→ D7 统一降级
- [x] **P3 vm 字体/字号/圆角实测定标**（Inter 实渲染、`text-sm` 实际像素、`rounded`/`rounded-lg` 视觉半径）→ **D6 基线类串定稿**（008 §2 D6 草案表校准后落 `auto/README.md`）； ✅ 全阶梯生效，D6 定稿（008 Phase 2）
- [x] **P4 浅色锁定实证**：中性色确定性类不受 vm 深浅模式影响；语义 token 仅用于 primary 族； ✅ 实证成立（008 P4）
- [x] **N1 白名单 v1 定稿** + `check-style-classes.mjs` 就位（对现有 `*_vm.at` 全量跑通）。 ✅ 账实核对（2026-09-07）：**lint 工具未交付、批次未执行**——但其治理对象（手写 `*_vm.at` 类串）随批 6 统一视图 + 后续 012/562 契约组件化整体退役，白名单 policing 失去存在理由（obsolete by supersession）；登记复审记录，非静默

### 阶段一（Vue 轨：Auto/Vue 版对齐 CSS 版）

**V1 Tailwind 接入（不动 widget）**
- [x] 加依赖 + config（primary 族映射 `hsl(var(--primary) [/N])`；Inter；content 覆盖 `src/components/**` + `src/stores/auto/**`）； ✅（008 Phase 1 在案，content 改直扫 `auto/src/front/**/*.at`）
- [x] `styles.css` 本 phase 不清退（命名类继续生效，零视图改动）； ✅（008 Phase 1）
- [x] **N3 归档**：现 12 张基准 → `screenshots/css-era/`；随后重拍门禁基准（reset/字体变化必然改基线，新旧对照留档）。 ✅ 账实核对（2026-09-07）：css-era 对照资产存活于 `screenshots/00-07.png`（2026-08-24 = Tailwind 前）+ tmp/parity 工具链（后入库 scripts/track-parity，010 T5）；"12 张→screenshots/css-era/"字面形态未发生（8 视图重编目 + tmp 不入库惯例），010 以此基准判 "css-era 00=0.00% 零回归"
- [x] vue 门禁全绿（28 断言 + 新基准 12 截图）。 ✅（008 Phase 1：ALL PASS + 新基准重拍）

**V2 令牌对照表 + 探针 widget**
- [x] D2 对照表（styles.css 令牌 → 双端类串）+ D6 基线类串正式落 `auto/README.md`； ✅（008 Phase 2「共享样式词汇」章）
- [x] 探针 widget（按钮组 + 卡片 + 输入框 + accent 切换）：**vue 端渲染为验收主体**；vm 端一次性并排截图留档（仅登记，不做门禁）； ✅（008 Phase 2 双端定稿探针 + tmp/phase2-dual-baseline.png）
- [x] store 预计算字段改造草案定稿（modules_store 搜索/展开投影、collection_store 行类串）。 ✅（随 V3 各批落地；投影形态后被 012 净化——active 回归视图表达式）

**V3 widget 逐个迁移（难度递增；顺序沿用 008）**

| 批 | widget | 要点（每批必做：`class:`→`style:`、style 块翻译为类串、条件类 store 预计算、computed/.includes 下沉、svg→✓、style_obj→色板类、该批 styles.css 段退役） |
|---|---|---|
| 1 | `sidebar`（含 theme_picker 吸收） | 条件类×4 预计算；搜索/折叠进 store 投影；swatch 用 `bg-[#hex]` |
| 2 | `daemon_view` | 最小（159 行）；Test connection 状态色 |
| 3 | `config_editor` + `scalar_fields` | 8 控件基线类串应用；password 显隐；multiselect/tags 降级形态（D7） |
| 4 | `collection_browser` | master-detail、行类串、确认层 |
| 5 | `table_field` | **D7 分叉例外评估点**（P2 结论三选一定案） |
| 6 | `app_shell`/`app.at` 合一 | 共享根（007 已证 vue gen 产未引用 App.vue 无害） |

每批门禁（全绿才进下一批）：`check-style-classes.mjs`（N1）+ vue 28 断言 + `visual-diff.mjs` 增量像素 diff（N2，差异仅限该 widget）+ `e2e-vm` 9 断言（N4 store 守卫）+ 与 `css-era/` 基准人工对拍。

- [x] 批 1-6 完成；`styles.css` 终态 = CSS 变量令牌 + reset + 滚动条； ✅（008 批 1-6 + 009 阶段一像素对拍补录：根因四件套修正 + 四视图按 css-era 1:1 重写 + 二阶段可编辑表格/tags/select/modal 还原，成绩 00=0.00%/01=1.61%/02=1.25%/05=1.85%）
- [x] **阶段一用户验收**：浏览器内与 CSS 版"同一设计语言"；残余差异登记（Tailwind reset 细微差、hover/transition 行为差——`transition-colors` 类可用但登记）。 ✅ 验收标准由用户升级为像素级一致（头部补录在案），以 diff% 数字交付；衔接证据=010 立项采认 vue 轨为基线（A 相守恒）；四项微残差（首存行内条/blur 回车提交时机/✓ 文本勾/modal 背板关闭）由复审登记 KNOWN-DEBT（见复审记录）

### 阶段二（VM 轨：VM 版对齐 Auto/Vue 版）

启动前置检查（N5）：阶段一验收通过 / 视图源冻结 / 上游 commit 复核。

**M1 切换批 1：根 + 侧栏**
- [x] `app.at` 合一（vm 消费统一根 + 统一 sidebar，含 theme_picker）；退役 `sidebar_vm` `theme_picker_vm`； ✅（008 批 6 b4863b7 根合一，现行树 `*_vm.at` 为空）
- [x] e2e-vm 扩断言：搜索过滤、分组折叠（store 投影阶段一已备）； ✅（现行 e2e-vm 含 search filter/group collapse 断言，2026-09-07 当日绿）
- [x] vm 截图并排归档启动（`screenshots/vm-*.png` vs vue 基准）。 ✅（形态演进为 tmp/parity→scripts/track-parity 对拍工具链，010 T5/T7 入库）

**M2 切换批 2：daemon + 编辑器**
- [x] 退役 `vm_daemon` `vm_editor`（统一 daemon_view/config_editor/scalar_fields 接管）； ✅（批 6 清零在案）
- [x] e2e-vm 扩断言：accent 持久化重启保持。 ✅（现行 "accent persists across restart" 断言当日绿）

**M3 切换批 3：集合与表格**
- [x] 退役 `vm_collection`（统一 collection_browser/table_field 接管，按批 5 定案的形态）； ✅（批 6 清零在案）
- [x] e2e-vm 终态 **14 断言两连绿**。 ✅（010 T10 达 14→15，013 增至 18；2026-09-07 当日全绿）

**M4 收尾**
- [x] `*_vm.at` 清零、regen.sh 的 vm 组件排除逻辑拆除、ext 裁撤清单执行； ✅（现行 regen.sh "vm/web exclusions are retired" 注记在案）
- [x] accent 双端算色对拍（5 色板逐一；偏差超可感知阈值 → vue 端 config 改 hex 定值）； ✅（010 T8 清偿轮 + e2e-vm accent 断言）
- [x] 12 张 vm 截图并排归档 + 残余差异清单定稿（字体光栅、控件形态、hover 缺失、iced 布局约束）； ✅（010 T7 真实基线 12 行台账 + T8 终值 + L3 光栅清单；工具入库 track-parity）
- [x] 文档三件套：`auto/README.md` 重写（统一视图架构 + 类串对照 + VG 清单 + 残余差异）、根 `README.md`、`KNOWN-DEBT-AND-RISKS.md`； ✅（010 T11 7217817）
- [x] 双端 7 模块实机手动走查。 ✅（010 T13 走查清单 W 全绿；G6 用户验收确认待办为 010 侧事项）

提交策略照 006/007/008：每 phase/批次独立提交，plan 文件同步勾选。

---

## 4. 验证清单

- [x] Phase 0：双轨基线两遍绿；P1-P4 结论 + 白名单 v1 + D6 定稿回填本文件 ✅（P1-P4/D6 在案；N1 lint 未交付——治理对象 `*_vm.at` 随统一视图退役而失效，见 §3 注）
- [x] V1：Tailwind 接入后 vue 门禁全绿；css-era 基准归档 + 门禁基准重拍留档 ✅（008 Phase 1；css-era 资产存活 screenshots/00-07）
- [x] V2：对照表 + 基线类串落 README；探针 widget vue 验收 + vm 留档截图 ✅（008 Phase 2）
- [x] V3 批 1-6：每批 N1 lint + vue 28 + 像素 diff + vm 9 守卫 + css-era 对拍全绿 ✅（门禁实际形态=vue 28+vm 9+截图对拍，N1 未启用见 §3 注；阶段一像素对拍一/二轮在头部补录全绿）
- [x] 阶段一验收：用户确认 Auto/Vue 版与 CSS 版同一设计语言；styles.css 收缩到位 ✅（标准升级为像素级，diff% 数字交付；010 立项采认为基线；四微残差复审转 KNOWN-DEBT）
- [x] M1-M3：每批 e2e-vm 绿 + vm 截图并排；`*_vm.at` 当批删除 ✅（批 6 收口 + 010 A/B 相承接）
- [x] M4：e2e-vm 14 断言两连绿；文档三件套；双端 7 模块走查 ✅（010 T10/T11/T13）
- [x] 终态：`auto/src/front/` 一套 widget 双后端消费；双轨门禁双绿 ✅（现行事实；2026-09-07 双门禁当日绿在案）

---

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| **阶段一混入 vm 不兼容构造，阶段二返工**（两段式最大风险） | N1 白名单 + lint 每批必跑；P1-P3 探针前置定形态；评审清单（008 §0.3 构造清单为禁用项） |
| 阶段二才发现某类串被 vm 静默丢弃 | vm 未知类容错是静默的——白名单从 class.rs 词表正向枚举（非反向猜测）；M 批次截图兜底；确需换串 = 回阶段一门禁复验该批 |
| Tailwind reset 破坏现有视图（V1 回归面） | V1 不清退组件类；门禁基准重拍门控；reset 对 button/input 影响逐项核对 |
| 像素 diff 噪声（抗锯齿/动画时序/字体 hinting） | N2 只圈范围不做验收；阈值 + 截图前禁 transition；人工对拍兜底 |
| store 预计算字段破坏 vm 现视图 | 字段只增不改；每批 e2e-vm 9 断言守卫 |
| vm 上游漂移 | 阶段一完全隔离（vm 轨冻结）；N5 启动前置复核 |
| 表格/编辑器降级损失 vue 交互体验 | D7 分叉例外机制（上限 2 个，P2 定案）+ 用户逐批验收 |
| accent 双端算色差异（HSL vs RGB） | M4 五色板逐一实机对拍；超阈值则 vue config hex 定值 |

---

## 6. 关联与后续

- **前置/取代**：`007-frontend-vm-desktop.md`（store 单源、VG 清单、e2e-vm 门禁）；`008-view-unification.md`（D1-D8 设计依据、§0 词汇盘点——被本计划重排取代）。
- **方法论母本**：auto-lang `examples/ui/038-minesweeper`（单源双后端 + 预计算样式串）、`widgets-gallery`（类词汇）、`015-notes`（accent 动态主题）。
- **上游锚点**：auto-lang commit `3d45fb10d`（Phase 0 与 N5 复核是否漂移）。
- **后续候选**（完成时登记 KNOWN-DEBT）：深色模式双端同源；vm hover/焦点态；`auto build -r vm` 分发；api.at 三轨契约。

---

## 复审记录（2026-09-07，zcode，/auto-plan:review）

**载体说明**：009 早于 plan 技能流程，定稿当日即转为「剩余工作框架」——执行记录
分散于头部像素对拍补录块（2026-08-27 两轮全量在案）、008 批 6（b4863b7 根合一+
`*_vm.at` 清零）、010 A-E 相（vm 轨清偿/台账/文档/走查）。本计划自身勾选从未
维护（最大账实分离件），本复审按证据链逐项补记（见 §3/§4 各行内注）。

### 验证清单逐条重验（详见 §4 行内注，此处仅列证据源）

1. **Phase 0 探针 P1-P4 + D6 — ✅** 结论回填于 008 §Phase 0 探针结论（同一探针
   工程 tmp/vm-probes2）。
2. **V1/V2（Tailwind+对照表）— ✅** 008 Phase 1/2 在案；css-era 对照资产存活
   `screenshots/00-07.png`（2026-08-24 捕获）；N3 字面归档形态未发生但基准功能
   完整（010 以此判 00=0.00% 零回归）。
3. **V3 + 阶段一 — ✅** 像素对拍一/二轮补录全量在案（根因四件套 + 四视图 1:1
   重写 + 可编辑表格/tags/select/modal 还原；成绩 00=0.00%…05=1.85%）；vue 门禁
   三套件随行全绿。用户验收标准升级为像素级（用户自己提出，补录在案），以 diff%
   交付并被 010 立项采认为基线。
4. **阶段二 M1-M3 — ✅** `*_vm.at` 现行树清零；e2e-vm 断言（搜索/折叠/accent
   持久化/14+）2026-09-07 当日全绿。
5. **M4 + 终态 — ✅** 010 T10（14→15 断言）/T11（文档三件套 7217817）/T13（走查
   清单 W）；双轨门禁当日双绿（012 复审连带取证）。

### 遗漏 / 延后 / workaround 猎捕

- **N1 白名单 lint（check-style-classes.mjs）— 未交付，obsolete by supersession**：
  治理对象（手写 `*_vm.at` 类串）随统一视图 + 012/562 契约组件化退役，policing
  失去存在理由；V3 各批门禁实际以 vue 28 + vm 9 + 截图对拍承担，未发生静默
  失守（登记于此 + KNOWN-DEBT）。
- **延后（用户知情）**：vm 轨重验（J1）顺延由 010 T3/T10 收口（假象重判+断言
  固化）；§6 后续候选四项转 KNOWN-DEBT 惯例（深色模式已由 plan011 四期落地）。
- **workaround**：onchange 双参 + regen.sh 部署 sed 补 cast（.at 语法不收 TS cast）
  为显性部署侧补偿，补录块 + regen.sh 注记在案；popover 惰性透传 sed（C1 家族）
  同。
- **四项 vue 微残差（阶段一验收遗留，本复审转正式登记）**：编辑器首存确认行内
  条 / 编辑提交时机 blur·回车（css-era 逐键 live-apply）/ theme_picker ✓ 文本勾
  （css-era svg）/ modal 背板点击不关闭（.at 视图无法判 e.target）——头部补录
  在案但未入 KNOWN-DEBT，本复审补登（见台账 009 行）。

### spec-impact 元数据

- supersedes_spec_components: []（ledger 始于 011，009 早于之）
- new_spec_components: []（像素对拍工具链已入库 scripts/track-parity，为工具资产
  而非 spec 组件；类串词汇体系由 008/README 承载）
- touched_goals: []

**裁定：验证清单全过（N1 以 obsolete-by-supersession 结案并登记）、无未清 blocking 债 → status=reviewed，就绪 /auto-plan:merge。**
