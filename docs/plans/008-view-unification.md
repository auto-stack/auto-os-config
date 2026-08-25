# Plan 008: 视图统一——单一 widget 源双后端

> **状态**：待实施（设计定稿 2026-08-25）
> **前置**：Plan 007 已完成（逻辑层单一真源：3 store + `use back.api:` 双解析；vm 桌面版功能可用，9 断言门禁绿）。但 007 的 D2"视图分叉"决策导致 vue/vm 两套视图永久双维护，且 vm 视图层从未做设计移植，观感与 web 版断层（用户验收判定：不可接受）。
> **本计划动因**（2026-08-25 用户质询链）：AutoUI 本身按"一套代码多后端"设计（038-minesweeper 实证单 widget 文件跑 `auto run` + `auto run --render vm`）；本仓两套视图是 Plan 006 手写工程（styles.css + 命名类，无 Tailwind）的历史包袱 + Plan 007 保 vue 零回归的风险决策，**不是框架必然**。本计划回归框架标准姿势。
> **仓库**：auto-os-config（frontend only；`backend/` daemon 零改动）

---

## 0. 背景与框架能力盘点（2026-08-25 实证）

### 0.1 现状资产

| 层 | 现状 | 本计划处置 |
|---|---|---|
| store ×3 + api 双实现 | **已单一真源**（`use back.api:` 双解析：vue→`@/lib/api`、vm→`src/back/api.at`） | 零改动（仅按需增预计算字段） |
| vue 视图 ×7 | `app_shell`(111) `sidebar`(331) `daemon_view`(159) `config_editor`(466) `scalar_fields`(398) `table_field`(227) `collection_browser`(669)，约 2761 行；命名类 + 内嵌 `style {}` 块（vue 专用）+ 少量 vue 专属构造（见 §0.3） | **迁移主体**：改写为共享 `style:` 类串视图，style 块退役 |
| vm 视图 ×5+根 | `app.at`(63) `sidebar_vm`(36) `theme_picker_vm`(24) `vm_daemon`(46) `vm_editor`(221) `vm_collection`(260)；薄层工具类，无设计 | **全部退役删除**（统一视图替代） |
| `src/styles.css`(139) | 设计令牌（HSL `--primary` 家族 + Win11 中性色）+ `.btn/.card/input` 基线 + 滚动条 | 缩为令牌层 + reset；组件样式进 Tailwind 类串 |
| vue 工程 | 自定义 Vite app，**无 Tailwind**；`auto gen` 的标准脚手架自带 Tailwind 3.4 + shadcn 配置 | **接入 Tailwind**（Phase 1） |
| 门禁 | `./scripts/e2e.sh`（vue 28 断言 + 12 截图对拍）+ `node scripts/e2e-vm.mjs`（9 断言） | 全程复用 + vm 侧扩断言 |

### 0.2 框架能力事实（auto-lang `3d45fb10d` 实查）

| 能力 | 事实 | 出处 |
|---|---|---|
| 单源双后端 | 038-minesweeper：单 `app.at` + 单 store 跑 vue/vm；纪律 = 视图零函数调用、样式串在 store 预计算为字段 | examples/ui/038 README |
| `style:` 属性 | vue codegen 映射为 SFC `class="..."`（038 gen 实证）；vm 映射 StyleClass IR。**共享视图统一用 `style:`**（不用 `class:`，vm 端不保证） | 038 `gen/front/vue/src/App.vue` |
| 类词汇 | `ui/style/class.rs`(1745 行)：p/px/py…、m/mx…、w-/h-、gap、text-{xs…9xl}、font-{bold,medium,mono…}、text-{center,left,right}、rounded-{sm…full}、border+色、shadow-{sm…xl}、渐变、语义 token、色板色、hex、任意值 `bg-[#fff]`、`/N` alpha 修饰（`bg-primary/10`）、响应前缀 `sm/md/lg:` 剥离 | class.rs |
| 语义 token | `primary`（**accent 驱动**，随 ACCENT_NAME thread-local 动态算色，深浅模式自适应）、`primary-foreground`、`background`、`card/surface/popover`、`muted`、`muted-foreground`、`secondary`（注意：vm 解析为 indigo 品牌色，**非中性**）、`destructive/danger/error`、`success/warning/info`、`border/input/ring` | style/color.rs:91-120、theme.rs |
| 未知类容错 | **静默跳过**（`filter_map(parse_single().ok())`）——`hover:` 等 vue 增强类可写入共享视图，vm 自动忽略、不报错 | style/parser.rs:26 |
| vm 不支持 | `hover:` 交互态（无伪类）；`svg` 元素；`style_obj` 内联样式对象；`popover`（007 实证解析毒药）；原生 `select` 不渲染；视图内函数调用（白名单仅 `len/starts_with/substr/trim/to_string`） | 007 探针 + V4 |
| computed | vm 仅支持 **root widget** 的 computed 表（dynamic.rs EDGE-16）；vue 支持 widget 级 | dynamic.rs:132 |
| vm 主题模式 | 语义 token 深浅自适应（DARK_MODE thread-local）；当前 vm 窗口实测为**深色**，web 版为**浅色**（Win11）——两端连模式都不一致 | theme.rs、实机截图 |

### 0.3 vue 视图的 vue 专属构造清单（迁移改造点）

| 构造 | 出现处 | 统一方案 |
|---|---|---|
| `class:` 属性 | 全部 7 widget | 改 `style:` |
| 内嵌 `style {}` 块（scoped CSS） | 全部 7 widget（sidebar 约 130 行） | 翻译为类串进视图/描述符 |
| `class: if cond { "a" } else { "b" }` 条件类 | sidebar（active 态 ×4 处）、collection_browser 等 | **预计算完整 class 串进 store 字段**（038 `cell_class` 模式） |
| `.includes()` 视图调用 | sidebar（`expanded.includes(g.id)` ×3） | store 预计算布尔/预展开投影 |
| `computed` 块调 ext fn（`filterStandalone/filterGroups`） | sidebar | 逻辑下沉 `modules_store`（共享 .at，双端全语言） |
| `svg` 勾（主题选中态） | sidebar theme-picker | 文本 `✓` / 描边态类 |
| `style_obj: { background: o.swatch }` | sidebar swatches | 5 色板硬编码类（`bg-[#hex]`）或 store 预计算类串（探针 P1 定） |
| `title:` tooltip | sidebar swatches | 弃用（vm 无 tooltip） |
| `oncontextmenu.prevent` 等 DOM 修饰 | （现无；防回归登记） | 禁用清单 |

---

## 1. 目标 / 非目标

### 目标

1. **单一视图源**：7 个 widget 一套 `.at` 视图，vue（`auto gen` + regen 部署）与 vm（`auto run -r vm`）消费同一份；`*_vm.at` ×5 全部退役删除；
2. **观感对齐**：以旧版 vue（Win11 浅色 + indigo accent 家族）为基准——同结构、同色板、同间距节奏；类串相同处两端渲染"接近一致"，残余差异收敛到"默认样式层"（字体渲染、控件形态）并显式登记；
3. **设计令牌双端同源**：accent 族经 `primary` 语义 token 单源驱动（vue=Tailwind config CSS 变量、vm=ACCENT_NAME thread-local，5 色板两端同款——007 已实证 vm 侧链路）；中性色用确定性色值（两端零模式漂移）；
4. **门禁全绿且扩面**：vue 28 断言 + 截图对拍、vm 9→14 断言（补：分组折叠、搜索过滤、主题持久化），双绿为完成标准。

### 非目标（明确不做）

- **不追像素级逐点一致**：浏览器与 iced 的字体光栅、控件内距、抗锯齿天然不同；验收 = 侧栏/卡片/按钮/表单的类串一致 + 实机截图人工对拍"同一设计语言"，不做逐像素 diff 工具；
- **不动 store/api 契约**（007 已定型，仅增量加预计算字段）；
- **不做 vm 深色模式**（两端统一浅色为基准；深色作为后续候选登记）；
- **不做 `auto build -r vm` 独立分发**（延续 007 非目标）；
- **不修 auto-lang 上游缺陷**（发现新缺口按 007 惯例：workaround + gap 登记 + P0 回报，不阻塞本仓）。

---

## 2. 关键架构决策（预先定调）

**D1 单一视图源 + `style:` 唯一属性语法**：共享 widget 视图只用 `style:`（两端已证映射：vue→`class="..."`、vm→StyleClass IR）；`class:` 与内嵌 `style {}` 块全面退役。视图纪律沿用 038：零函数调用（白名单除外）、零动态索引、样式串静态或字段直读。

**D2 双词汇样式体系（关键决策）**：
- **accent 族 → 语义 token**：`bg-primary`（实心）、`bg-primary/10`（soft tint，即 `--accent-light`）、`text-primary`、`border-primary`——两端 accent 同源（vue 端 Tailwind config 把 primary 映到 `hsl(var(--primary))`，运行时换 accent = 主题 store 写 CSS 变量，沿用现机制；vm 端 renderer thread-local，007 T11/T12 已实证）；
- **中性色 → 确定性类**：`bg-[#f3f3f3]`（app 底）、`bg-[#f9f9f9]`（sidebar 底）、`bg-white`（卡片）、`text-[#1a1a1a]`、`text-gray-500`（`--text-muted #8a8a8a`≈）、`border-[#e0e0e0]`、`text-red-600`/`text-green-600`（状态色）——**禁用** `background/card/foreground` 等模式自适应 token（vm 深浅漂移不可控，两端连模式都不一致），也禁 `secondary`（vm 解析为 indigo 品牌色）；
- **hover 增强**：`hover:bg-gray-100` 等允许写入共享视图（vue 生效、vm 静默跳过——已实证容错），但**核心状态（active/dirty/error）不得依赖 hover**；
- 对照表（styles.css 令牌 → 类串）落 `auto/README.md`，Phase 2 交付。

**D3 条件样式进描述符（038 模式）**：凡随状态变化的类串（`nav-item active`、`swatch active`、`btn dirty`…）由 store 预计算**完整 class 串**存字段（`row_class`/`btn_class` 型），视图 `style: x.row_class` 字段直读。**探针 P1 先验证** vm 视图 `style:` 是否接受字段路径（现 vm 视图全是静态串）；若不支持，降级方案 = 视图内 `if` 双分支写两份静态串（sidebar 已有此形态，可行但冗长）。

**D4 computed 逻辑下沉 store**：widget 级 `computed`（含 ext fn 调用）全部下沉对应共享 store（modules_store 补搜索过滤投影、展开态投影）。视图只读 store 字段。ext 中转文件相应裁撤（composable 门面保留——vue codegen 需要）。

**D5 vue 工程接入 Tailwind**：`tailwindcss@3.4` + `postcss` + config（`content: src/components/**` + `src/stores/auto/**`；primary 族映射 `hsl(var(--primary) [/N])`；**默认字体改 Inter** 与 vm `default_font` 对齐，消最大默认差异；基准字号 14px = `text-sm`）。`src/styles.css` 缩为：CSS 变量令牌（`--primary` 家族运行时主题入口）+ reset + 滚动条。`.btn/.card/input` 基线退役 → D6 类串。

**D6 组件基线显式化（系统性缓解"默认样式不统一"）**：两端控件默认形态（浏览器 button/input vs iced）不指望上游统一——**公共基线全部显式声明**，规范类串（写入 README 对照表）：

| 组件 | 基线类串（草案，Phase 2 校准） |
|---|---|
| 按钮 | `px-3 py-1.5 rounded text-sm border border-[#e0e0e0] bg-white` |
| 主按钮 | 基线 + `bg-primary text-white border-primary` |
| 危险按钮 | 基线 + `bg-red-600 text-white border-red-600` |
| 输入框 | `px-2.5 py-1.5 rounded text-sm border border-[#e0e0e0] bg-white w-full` |
| 卡片 | `bg-white border border-[#e0e0e0] rounded-lg p-4` |
| muted 文字 | `text-sm text-gray-500` |

**D7 统一降级优于后端分叉**：vue 专属能力（原生 select、表格单元格输入、markdown 富渲染、svg）**不做视图层目标门控**——探针 P2 若发现 `X.web.at` 型机制适用于视图文件可重开此决策，v1 一律两端统一降级形态：select→自由文本+提示（007 已定型）、表格→v1 保持 vm 只读 JSON **但 vue 侧同步改只读展示 + 单元格编辑入口收敛**（若 vue 交互体验损失不可接受，该组件保留双文件并登记——**唯一允许的分叉例外，上限 2 个组件**）、markdown→纯文本、svg→文本符号。块增删（Plan 005 特性）v1 不暴露（延续 007）。

**D8 门禁与截图归档**：每统一一个 widget 跑双轨门禁；vm 侧实机截图存 `screenshots/vm-*.png` 与 vue 版并排人工对拍（12 张 vue 基准照常）；e2e-vm.mjs 断言 9→14（补：分组折叠展开、搜索过滤空态、accent 持久化重启保持）。**流程教训沿用 007：regen 显式检查退出码，勿经管道**。

---

## 3. 分阶段实施

### Phase 0：基线 + 探针（`tmp/vm-probes2/`）

- vue/vm 双轨基线各跑两遍全绿；
- **P1 字段直读类串**：vm 视图 `style: x.row_class`（store 字段）是否渲染；不行则验证 if 双分支形态；
- **P2 视图层目标门控**：视图文件是否存在 `X.web.at` 型双目标机制（musk 037 ports 仅证 use 层）；结论回填 D7；
- **P3 vm 字体/字号/圆角实测定标**：Inter 在 vm 的实际渲染（默认字体已配 Inter）、`text-sm` 实际像素、`rounded`/`rounded-lg` 视觉半径——产出 D6 基线类串校准值；
- **P4 浅色锁定**：vm 窗口当前深色（语义 token DARK_MODE 默认）——中性色走 D2 确定性类后是否完全不受模式影响（预期是；语义 token 只用于 primary 族则无模式问题，实证留档）。

### Phase 1：vue 轨接入 Tailwind（不动 widget）

- 加依赖 + config + styles.css 收缩 + 字体统一 Inter；
- 现有 7 widget 的命名类**暂时依赖 styles.css 残留**（本 phase 组件类不清退，零视图改动）；
- vue 门禁全绿；12 张截图基准**重拍**（reset/字体变化必然改变基线——重拍流程照 006 惯例，新旧对照留档）。

### Phase 2：设计令牌映射 + 基线类串定稿

- D2 对照表（styles.css 令牌 → 双端类串）+ D6 组件基线类串写进 `auto/README.md`；
- 一个探针 widget（按钮组 + 卡片 + 输入框 + accent 切换）双端实机渲染，截图并排定稿；
- store 侧预计算字段改造草案（modules_store 过滤/展开投影、collection_store 行类串）——先 store 后视图，每步 vue 门禁绿。

### Phase 3：widget 逐个统一（难度递增，每步双轨门禁 + 截图对拍）

| 批 | widget | 要点 | 同步退役 |
|---|---|---|---|
| 1 | `sidebar`（含 theme_picker 吸收） | 条件类×4 预计算、`.includes` 下沉、svg→✓、搜索/折叠进 store | `sidebar_vm` `theme_picker_vm` |
| 2 | `daemon_view` | 最小（159 行），Test connection 状态色 | `vm_daemon` |
| 3 | `config_editor` + `scalar_fields` | 8 控件基线类串应用；password 显隐；multiselect/tags 的 vm 形态复验 | `vm_editor` |
| 4 | `collection_browser` | master-detail、行类串、确认层（007 if 块形态保留） | `vm_collection` |
| 5 | `table_field` | D7 分叉例外评估点：若必须保 vue 编辑则登记例外 | — |
| 6 | `app_shell`/`app.at` 合一 | 共享根（007 已证 vue gen 产未引用 App.vue 无害） | — |

### Phase 4：收尾

- `*_vm.at` 清零、regen.sh 的 vm 组件排除逻辑拆除；ext 裁撤清单执行；
- e2e-vm.mjs 扩到 14 断言并两连绿；vue 28 断言 + 新基准 12 截图全绿；
- 文档三件套：`auto/README.md` 重写（统一视图架构 + 类串对照 + VG 清单保留 + 残余差异清单）、根 `README.md`、`KNOWN-DEBT-AND-RISKS.md`（分叉例外、深色模式候选、hover 缺失、字体光栅差、上游 gap）；
- 实机手动走查全部 7 模块（双端）。

提交策略照 006/007：每 phase/批次独立提交，plan 文件同步勾选。

---

## 4. 验证清单

- [x] Phase 0（2026-08-25，worktree `plan-008-view-unification`）：vue 基线两连绿（ALL E2E PASS ×2；首轮失败为 worktree 冷启动竞态 + 环境僵尸 vite/daemon 混占端口，清场后两绿——**教训：服务必须确认来路再复用**）；vm 基线暴露**上游崩溃缺陷**（见下）——`scripts/e2e-vm.mjs` 自愈化改造后 6 连跑全绿（含 1 次崩溃自愈重跑，正是设计行为）；P1-P4 结论回填（见 §Phase 0 探针结论）
- [x] Phase 1（2026-08-25）：Tailwind 3.4 + postcss + autoprefixer + @fontsource/inter（400/500/600/700）落地；`tailwind.config.cjs`——primary token 用 `hsl(var(--primary) / <alpha-value>)` 形态（`bg-primary/10` alpha 修饰可用，实测 rgb(100,103,242)=靛蓝）、content 直扫 `auto/src/front/**/*.at`（类串第一现场，免疫 regen 滞后）、safelist 仅 primary 族骨干 5 类；`main.ts` 引入链 = fontsource → tailwind.css → styles.css（令牌层最后加载压 preflight）；styles.css `--font-family` 改 Inter-first；Inter 加载/工具类/preflight/命名类优先级四项 playwright 实证 ✓。vue 门禁 ALL PASS（Tailwind 激活态）。12 张截图基准重拍（旧基准归档 `tmp/phase1-baseline-old/`；像素 diff 侧栏 2.2%/集合页 4.1-4.4%/daemon 页 14.3-14.4%——daemon 为密文本表单对字体度量敏感，目检确认差异全为字体级重排、零结构破坏/控件丢失，可安全作新基准）。顺手修正 `screenshot-ui.mjs` OUT 为脚本相对路径（原硬编码主仓路径，worktree 下会写错位置）
- [x] Phase 2（2026-08-25）：D2 对照表 + D6 基线串定稿入 `auto/README.md`（含 store 迁移配方）；双端定稿探针实证——**新词汇硬规则：间距禁小数**（`py-1.5`/`gap-1.5` 在 vm 被 u16 解析静默丢弃，`gap-0.5` 在 007 vm 代码已实际漏入——Phase 3 批 1 顺带清理；6/10px 用 `py-[6px]` 任意值）；定稿对照图 `tmp/phase2-dual-baseline.png`（web=Tailwind 参考实现 vs vm=iced，按钮/输入框/卡片/三级文字/active 态同一设计语言，唯一系统差异即小数间距规则本身）
- [ ] Phase 3 批 1-6：每批双轨门禁绿 + vm 截图对拍；对应 `*_vm.at` 当批删除
- [ ] Phase 4：`*_vm.at` 清零；e2e-vm 14 断言两连绿；文档三件套；双端 7 模块实机走查
- [ ] 终态：`auto/src/front/` 一套 widget 双后端消费；`./scripts/e2e.sh` + `node scripts/e2e-vm.mjs` 双绿为仓库门禁

### Phase 0 探针结论（2026-08-25，tmp/vm-probes2/ 实机 MCP + 视觉验证）

- **P1 字段直读类串：✅ 三形态全过**——根模型标量（`style: .row_class`）✓、循环变量 map 字段（`style: m.klass`）✓（实机视觉确认红/绿/灰三色均生效）、if 表达式字面量（`style: if .on { … } else { … }`）✓。任意值 hex（`bg-[#f3f3f3]`/`border-[#e0e0e0]`/`text-[#1a1a1a]`）与 `bg-primary/10` alpha 修饰均生效。**D3 主方案（预计算类串进 store/描述符）成立，无需降级**。快照口径注意：`autoui_snapshot` 的 `style:` 行对循环项**不上报**（静态/根模型位置正常上报）——vm 侧样式断言以根模型字段位置为准，循环项靠视觉对拍。
- **P2 视图层目标门控：❌ 不存在**——`X.at → X.vm.at → X.web.at` adapter 链仅作用于 `use` 模块导入解析（lib.rs `load_ext_imports_for_vm`），vm 加载器（rust_ui.rs）枚举 widget 文件不经过任何目标过滤。D7 维持"统一降级优于后端分叉"。
- **P3 排版定标：✅ 全阶梯生效**——text-xs→xl 逐级、font-medium/bold 三级递进清晰、rounded→xl 逐级（rounded-lg ≈8px 对应 `--radius`）、Inter 无衬线渲染清晰无锯齿；D6 基线类串（按钮/主按钮/危险按钮/输入框占位/卡片/muted）vm 端全部渲染正常，primary 实心=靛蓝、danger=红底白字、白底灰边卡片成立。D6 草案类串直接定稿进 Phase 2 对照表。
- **P4 中性色模式无关性：✅**——确定性类（`bg-white`/`bg-[#f3f3f3]`/`text-[#1a1a1a]`）在 vm 默认深色模式下渲染为浅色（P1/P3 探针窗口实证）；对照主应用深色窗口（语义 token 呈深色）证实：**中性色走确定性类可完全绕开 DARK_MODE 漂移，语义 token 仅用于 primary 族**——D2 决策实证成立。
- **上游缺陷登记（P0 回报 auto-lang）**：vm 进程在 MCP 轮询下**硬崩溃**——exit code 0xFFFFFFFF（-1）、无 stderr/panic 输出（日志止于 "AutoUI MCP: first state sync"）、监听随进程消失。触发条件：**零交互空闲 app + ≥500ms 或 2s 周期的 autoui_snapshot/state 轮询，约 30s 内 40-60% 概率**；无轮询流量时可存活 30min+（本日实机对照）。与本仓代码无关（探针最小工程复现，tmp/probe-mcp-health.mjs 为复现脚本，Phase 4 收尾决定去留）。**缓解**：e2e-vm.mjs 自愈化——mid-run 通道死亡判定为基础设施崩溃，重启 app 重跑（最多 3 次）；真实断言失败/boot 失败不重试照常 FAIL；6 连跑验证全绿。另修 Test connection 断言为 30s 轮询（/api/action/test-daemon 是真实 LLM provider 往返，实测 1.3-5.4s 波动，固定 7s sleep 会假阴性）。
- **流程教训**：多实例调试后必须核验端口占用者身份再复用（本轮双 vite 双 daemon 混战消耗大量定位时间）；`netstat -ano` + `wmic` 核对 PID/命令行是标准动作。

---

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| vm `style:` 不支持字段直读（D3 主方案落空） | ~~P1 先行~~ **P1 已实证三形态全过（根模型/循环项/if 表达式），风险消除**；if 双分支保留为风格备选 |
| vm 进程 MCP 轮询下硬崩溃（上游缺陷，40-60%/30s） | e2e-vm 自愈门禁（崩溃重启重跑 ≤3 次，真回归不重试）；P0 回报 auto-lang；复现脚本 tmp/probe-mcp-health.mjs |
| Tailwind reset 破坏现有 vue 视图（Phase 1 回归面） | 组件类本 phase 不清退；12 截图基准重拍门控；reset 范围排查（preflight 对 button/input 的影响逐项核对） |
| 12 截图基准重拍掩盖真实回归 | 重拍仅限 Phase 1 一次；Phase 3 各批沿用新基准不再重拍 |
| vm 对某类串静默跳过导致观感缺失不显性 | Phase 2 探针 widget 把 D6 全部基线类串双端渲染实证；类串清单即断言面 |
| 表格/编辑器降级损失 vue 交互体验 | D7 分叉例外机制（上限 2 组件）+ 用户逐批验收 |
| iced 布局约束（无 flex-wrap/绝对定位）导致类串翻译失真 | 现版式为 flex 纵横为主（007 §5 已评低风险）；失真项登记残余差异清单 |
| accent 双端算色差异（HSL vs RGB 换算） | 5 色板逐一实机对拍；偏差 > 可感知阈值则 vue 端 config 直接用 hex 定值 |
| 上游漂移（vm 后端活跃开发） | 沿用 007 D10：commit 锚定 + 上游 rebuild 后先 vue regen+e2e 再 vm 冒烟 |

---

## 6. 关联与后续

- **前置**：`docs/plans/007-frontend-vm-desktop.md`（store/api 单一真源、VG1-18 清单、e2e-vm 门禁）；`archive/006-frontend-auto-ization.md`（D4/D5 规范、e2e 方法论）。
- **方法论母本**：auto-lang `examples/ui/038-minesweeper`（单源双后端 + 预计算样式串纪律）、`widgets-gallery`（类词汇参考）、`015-notes`（accent 动态主题）。
- **上游锚点**：auto-lang commit `3d45fb10d`（沿用 007，Phase 0 复核是否漂移）；语义 token 体系（style/color.rs、theme.rs、Plan 370/409/411/413）。
- **后续候选**（完成时登记 KNOWN-DEBT）：深色模式双端同源（语义 token 已备，缺模式切换入口）；vm `hover:`/焦点态交互反馈（上游能力）；`auto build -r vm` 独立分发；api.at 接入（三轨契约，延续 006/007 遗留）。
