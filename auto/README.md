# auto-os-config — Auto sources (Plan 006 + Plan 007)

`src/` 的 Vue 组件层已 100% 由本目录的 Auto 语言源码生成（Plan 006 完成，
2026-08-24）。本目录是嵌入式 Auto 工程（jade-garden plan 011 同款模式）。
Plan 007 在此基础上加出 **VM 桌面版**（`vm/` 子工程，视图分叉、逻辑统一）。

## VM 桌面版（Plan 007 建，008/009/010 演进为双端一致轨）

单工程双后端（widgets-gallery 模式）：同一 `auto/` 工程，CLI `-r vm` 切换。
`use back.api:` 一行导入双后端各自解析——vue codegen → `@/lib/api`（TS），
vm 解释器 → `src/back/api.at`（全文本实现：transport 配方 + inferField 移植 +
投影/编辑 text 手术）。3 个 store 为两轨共享单一真源。

**视图单源（008/009 定稿）**：`src/front/*.at` 是唯一视图源，`*_vm.at` 分叉
已清零——app.at 为双端共享根（regen → src/App.vue 由 main.ts 挂载；vm 直接
解释同一 widget）。集合页/编辑器/主题的 vm 形态（条件展开、D7 降级、中和类
等兼容词汇）见下文「双端一致性」章。

```
auto/src/back/api.at          # vm 侧 back.api 实现（~70 pub fn，纯文本管线；box_class 布局类与 src/lib/api.ts 孪生）
auto/src/front/app.at         # 双端共享根（vue: regen 产出 src/App.vue；vm: 解释执行）
auto/src/front/*.at           # 唯一视图源（10 文件，无 _vm 分叉）
```

运行与测试：

```sh
cd auto && auto run -r vm             # 桌面窗口，back.api 经外部 back 桥进程内直调（零 HTTP）
AUTOOS_DAEMON=http://… auto run -r vm # 远端 daemon 覆盖（仅 T7 前遗留 enum URL 词汇消费）
AUTO_VM_WINDOW=1440x900 auto run -r vm # 显式窗口逻辑尺寸（对拍口径，见「双端一致性」）
node scripts/e2e-vm.mjs               # vm 轨回归门（MCP 驱动，自愈式）
node scripts/track-parity/capture.mjs --track vm   # 双轨对拍捕获
AUTOUI_MCP_PORT=9320 auto run -r vm   # 自定 MCP 通道（调试用，端点 /mcp）
```

### 双模式启动与端口策略（Plan 011 T8 定案）

- **端口沿用 17701**（待澄清#2 裁决）：前端 `src/lib/api.ts` 与 e2e 脚本零改动。
- **vue 模式**：`auto-os-config-back-server.exe`（`cargo run` 于 `auto-os-config-back/`，
  env `AUTOOS_BACK_PORT=17701`）即 HTTP 服务，前端 api.ts 打它，等价旧 daemon。
  `scripts/e2e.sh` 的服务源已切换至此（T8）。
- **vm 模式**：`auto run -r vm`（merged）——pac.at `back: { project }` 链接外部
  back，`back.api` 解析到 `auto-os-config-back/api.at`，cdylib
  (`auto_os_config_back.dll`) 经宿主桥进程内直调，**零 HTTP**。前置：先
  `cargo build` 于 `auto-os-config-back/`（merged 装载强制要求 cdylib 存在）。
- 11 端点实现核心在 `auto-os-config-back/src/core.rs` + `registry.rs`/
  `project.rs`/`collection.rs`（自旧 `backend/` 移植）；桥与 axum bin 双传输
  共享同一实现。

与 vue 轨的禁令不同：**vm 工程内可以 `auto run`**（无 gen 直写风险）；
仓库根的 `auto run` / `auto build` 依旧禁止。
上游锚定：auto-lang master `1487b5c5d`（2026-08-28 观察基线；rebuild 后先
vue regen+e2e 再 vm 冒烟；漂移处置惯例见 plans/010 复审记录）。

### vm 编码规范（VG 清单，Phase 1/2/4 实证）

- VG1 fn 模块禁 `use auto.str`（与 http 共编 → `str.status` 链接失败）；字符串用方法调用形态
- VG2 handler 多语句禁同行（吞链）
- VG3 http 三不用：`res.status()`（哨兵）/builder 链（二次调用崩）/`res.body()`；写后 GET 验证
- VG4 map 字段读取仅 fn 模块可用；handler 内对 store/返回值仅单跳链读（`r.data.x` 两跳为空）
- VG5 禁 `concat`/handler 双变量 for/动态 map key——loop+push 重建
- VG6 模块导入用冒号形式 `use x: fn`
- VG7 handler 崩溃回滚整次状态写入
- VG8 `json.parse` 是占位——全走 `json.keys/get/get_at/type_of/len` 文本工具链
- VG9 `File.write_text` 同进程读后写延迟可见（model 权威、文件作下次启动）
- VG11 `json.get_at` 仅接受 JSON 文本（数组用索引计数 for-in）
- VG12/13 数组不跨 fn 边界作实参；fn 返回一律扁平（无嵌套 map/数组字段）
- VG14 `.find(闭包)` 不可用——选择逻辑下沉 api fn（扁平返回）
- VG16 一 widget 一 store + **store 方法名全工程唯一**（消歧按方法名，撞名落到错误 store）
- VG17 `json.keys` 返回裸 key（输出需 quote_json 重包）
- 事件参数只能标量/裸循环变量：store 列表循环上的字段访问/map 实参会打死 MCP——
  store 提供平行 `names`/`entry_keys` 字符串数组，view 用 `for i, e` + 索引参数
- msg 声明必须含全部 handler（vm 消歧表按 msg 声明匹配）
- `popover` 在本构建为解析毒药（确认层用普通 if 块）；`substr(a,b)` 闭区间；
  map 字面量内禁空数组/`.len()` 调用

### vm 轨已知偏差（v1，登记 KNOWN-DEBT）

- 侧栏无分组折叠；集合无过滤框；select 控件为自由文本+提示；markdown sidecar 单行；
  表格/subform 以只读 JSON 文本展示；块增删（Plan 005 特性）未暴露
- `json.keys` 字母序（serde_json 无 preserve_order）——字段顺序与 web 版不同

## 共享样式词汇（Plan 008 Phase 2 定稿，双后端单一真源）

vue（Tailwind 3.4）与 vm（auto-lang `ui/style/class.rs` → iced）消费**同一套类串**。
定稿对照（`styles.css` 令牌 → 共享类串；旧令牌随 Phase 3 各批退役）：

| styles.css 令牌 | 共享类串 | 备注 |
|---|---|---|
| `--accent` | `bg-primary` / `border-primary` | vm 端 primary 由 accent thread-local 动态算色，与 web `hsl(var(--primary))` 同源 |
| `--accent-light`（10% tint） | `bg-primary/10` | alpha 修饰双端可用（P1 实证）；选中态底色 |
| `--bg-active` | `bg-primary/10` | 同上（合并为一条） |
| `--accent-hover` / `--bg-hover` | `hover:bg-primary/90` / `hover:bg-[#ededed]` | **hover: 仅 web 增强层**，vm 静默跳过；核心状态禁依赖 hover |
| `--bg-app #f3f3f3` | `bg-[#f3f3f3]` | 中性色一律确定性 hex/色板（P4：不受 vm DARK_MODE 漂移） |
| `--bg-sidebar #f9f9f9` | `bg-[#f9f9f9]` | 同上 |
| `--bg-card #ffffff` | `bg-white` | |
| `--bg-search #f0f0f0` | `bg-[#f0f0f0]` | |
| `--border #e0e0e0` | `border-[#e0e0e0]` | |
| `--text-primary #1a1a1a` | `text-[#1a1a1a]` | |
| `--text-secondary #616161` | `text-[#616161]` | 注意：`text-gray-500`(#6b7280) ≠ 原值，勿用色板近似关键中性色 |
| `--text-muted #8a8a8a` | `text-[#8a8a8a]` | 同上 |
| `--danger #c42b1c` | `bg-[#c42b1c]` / `text-[#c42b1c]` | Win11 danger 精确值 |
| `--success #107c10` | `text-[#107c10]` | |
| `--radius 8px` / `--radius-sm 4px` | `rounded-lg` / `rounded` | 双端同值（P3 实证 vm rounded-lg≈8px） |
| 字号 base/sm/lg/xl = 14/12/16/20px | `text-sm`/`text-xs`/`text-base`/`text-xl` | 基准 14px = text-sm |
| 字重 500/600 | `font-medium` / `font-bold` | vm 三级递进 ✓（P3） |
| `--ring` 焦点环 | （web-only 增强） | vm 无焦点环，登记残余差异 |

**词汇硬规则（Phase 2 探针实证，违反即 vm 静默降级）**：

1. **间距禁小数**：`py-1.5`/`px-2.5`/`gap-1.5`/`gap-0.5` 在 vm **被静默丢弃**
   （class.rs 按 u16 解析尺寸）——需要 6/10px 等值用任意值 `py-[6px]`/`px-[10px]`，
   或整数档 `py-1/2`、`gap-1/2`。web 端两者皆支持。
2. **中性色禁模式自适应 token**：`background`/`card`/`foreground`/`secondary`
   （vm 解析 secondary 为 indigo 品牌色）全部不进共享词汇；唯一语义 token = `primary` 族。
3. **hover:/焦点类**只作 web 增强，写法合法（vm 容错跳过），核心状态必须有静态等价。
4. 条件样式 = store/handler **预计算完整类串**存字段（`row_class` 型）或视图
   `if` 双分支静态串（仅限无子元素的简单控件——见规则 6）。
5. **类串绑定必须用 `class:` 属性**：vue codegen 对 `style:` 只有字面量才映射
   class，绑定形态（`style: m.nav_class`）会编译成 `:style` 内联样式；
   `class: m.nav_class` 两端皆正确（038 minesweeper 官方姿势，批 1 实证）。
6. **if 表达式 style 禁用于带子元素/事件的按钮**：vm 会把 style/onclick 提升
   到包装容器（按钮本体裸奔）——静态串按钮不受影响；条件类一律下沉 store。

**D6 组件基线串（Phase 2 定稿，Phase 3 迁移即用）**：

| 组件 | 基线类串 |
|---|---|
| 按钮 | `px-5 py-2 rounded text-sm border border-[#e0e0e0] bg-white text-[#1a1a1a] hover:bg-[#ededed]` |
| 主按钮 | `px-5 py-2 rounded text-sm bg-primary border-primary text-white` |
| 危险按钮 | `px-5 py-2 rounded text-sm bg-[#c42b1c] border-[#c42b1c] text-white` |
| 小按钮 | `px-3 py-[6px] rounded text-xs border border-[#e0e0e0] bg-white` |
| 输入框 | `w-full px-[10px] py-[6px] text-sm bg-white border border-[#e0e0e0] rounded` |
| 卡片 | `bg-white border border-[#e0e0e0] rounded-lg p-4` |
| 选中态行 | `bg-primary/10 text-primary font-medium` |
| muted 文字 | `text-xs text-[#8a8a8a]` |

双端定稿对照图：`tmp/phase2-dual-baseline.png`（左 web / 右 vm，Phase 2 归档）。

**store 迁移配方（D3/008，Phase 3 各批执行）**：

- 条件类串在 store handler 内拼**完整字符串**入 model（如
  `nav_class = if active { "bg-primary/10 text-primary font-medium px-3 py-2 rounded" } else { ... }`），
  视图 `style: x.nav_class` 字段直读（P1 实证三种形态全可用）；
- 搜索过滤/分组展开投影从 widget `computed`（ext fn）下沉 store（`.includes()`
  等视图不可用调用一并消除）；
- 列表数据维持 007 的"文本 + 计数 fn + 逐项扁平 getter"形状，行类串进扁平 getter 字段。

## 特许手写清单（src/ 下唯一的手写前端文件）

- `index.html`、`src/main.ts`（7 行壳：挂 AppShell + styles.css）
- `src/styles.css`（CSS 变量设计系统，139 行，原样保留）
- `src/lib/api.ts`（传输层：fetch/超时/枚举缓存/主题持久化/entries 投影）
- `src/editor/types.ts`（inferField/inferColumn 推断引擎——值形状字符串
  数学，按 ext 政策留 TS）

## 重新生成

```sh
bash auto/gen/regen.sh
# = auto build -d . --gen-only（Parse error / 编译告警都会中止部署）
#   + 组件 sed 改写 @/ext/... → ../../auto/src/front/utils/...，落 src/components/
#   + store composable sed 改写 @/lib/api → ../../lib/api，落 src/stores/auto/
```

改完跑：`npm run build`（vue-tsc + vite）+ `./scripts/e2e.sh`。

**禁止**在仓库根跑 `auto run` / `auto build`——会以占位覆盖真实代码
（jade-garden 踩过的地雷）。

## 架构约定（Plan 006）

- **D4 描述符驱动动态表单**：handler 把 config/entity body 投影为值内嵌的
  描述符数组（ext：configEntries/bodyEntries/tableInfo），view 纯
  `for`+`if/else` 渲染——零函数调用、零动态索引（vm 模式约束）。
- **D5 整体替换（跨后端规范，2026-08-24 起不再是被 vue bug 强制）**：
  auto-lang Plan 443（`38adb1ef`）已修复未绑定 model 变量的深变异响应性
  （回归 `ref<>`，深写/深 push 视图就地更新——本仓库已运行时实证）。
  但**不可变重建继续作为规范保留**：vm/rust 桌面目标的安全基线 +
  TableField 单元格 v-model 深写等残留形态的一致性。ext 的
  setCfgEntry/setCell/setEntry 承担重建，`.at` 侧不直写深变异。
- **store facade**：生成的 composable 返回裸 ref 对象——模板嵌套访问不解
  包，ext 里 `reactive()` 包一层。
- ext 政策：只装 DSL 真表达不了的（fetch/localStorage/document/confirm/
  推断引擎/不可变重建辅助）。
- 深变异回归钉子：auto-lang `examples/capability-tests/041-model-deep-
  reactivity/`（`ab34fa9f`，自本仓库 Phase 6 提案归档）。

## Gotcha 清单（21 条，编号供回填 auto-lang）

- **G1** 元素的属性与子元素必须换行分隔：`label { class: "x"  text y }`
  会把 `text` 解析进 class 表达式（"Expected infix operator"）。
- **G2** 事件内联参数只能是：model 引用 / 循环变量 / 字面量 / map 字面量
  / `$event`。`!x`、`a + b` 等表达式被拒（strict 报错）——计算进 handler。
- **G3** `for x in <path>` 头部只接受裸路径，`.map[key]` 动态索引是解析
  错误——把值预投影进描述符（mergeCols/bodyEntries 即为此）。
- **G4** `col`/`row` 即使 `default_classes: off` 也注入 `flex flex-col
  gap-4` 布局类——移植手写 CSS 时一律用原生标签 + 显式 `class:`。
- **G5** handler 局部变量的类型标注（`Array<str>`/`Array<any>`/`[]any`）
  被 codegen 丢弃，strict 模式下 `var out = []` 报 TS7034。惯用法：
  表达式初始化累加器 `var out = .xs.filter(x => false)`。
- **G6** `[]str` 发射 `string[]`（按内容选）；model 层 `Array<str>` →
  `any[]`。
- **G7** 解析错误打印 `Parse error in ...`，与 `Warning: Failed to compile`
  格式不同且 `--gen-only` 仍 exit 0——regen.sh 两种都 grep（已加固）。
- **G8** strict 模式对 `th`/`td` 级 v-for 也强制 `:key`（R006）；混合
  if-分支子节点的 for 会被包进无 key 的 div——加带 key 的 wrapper div。
- **G9** 手写入口（main.ts）只挂生成组件，不需要 h()——但任何
  `createApp({ template })` 需要 runtime 编译器（vite 默认没有）。
- **G10** store 不支持 `use { }` 块（只认 model/msg/computed/on/watch）；
  store 导入只能用文件级 `use back.api:`（映射到 `@/lib/api`）。
- **G11** `view` 是保留属性名：局部变量 `r.view.x` 被静默改写成 `.x`——
  字段名避开（我们用 `data`）。
- **G12** store 文件里的模块级 `fn` 参数被当 ref 发射（`expanded.value`）
  ——纯函数放 ext。
- **G13** ext 导入（use 块）不自动 await（只有 back.api 会）——异步用
  `p.then((r) => { ... })` 惯用法（jade StatusBar 先例）。
- **G14** computed 里读另一个 computed 不要手写 `.value`（codegen 自动加，
  手写变双 `.value.value`）；handler 里读 model 也由 codegen 处理。
- **G15** `ul`/`li`/`list`/`list-item`/`pre`/`code`/`strong`/`b` 全部静默
  降级 div/span（registry 的 vue 映射未生效；仅语义白名单 header/footer/
  nav/main/aside/article/section 透传）——用 div/span + class + CSS 适配，
  e2e 选择器同步。
- **G16** input 上 `value:` + 任意 `on*` 事件必转 v-model——绑 prop 值
  （`value: .modelValue`）时生成 `v-model="modelValue"` → Vue 编译错
  （prop 不可写）。绕法：本地镜像 var + `watch { .prop.immediate -> }` 同步。
- **G17** 普通名空 handler 是 no-op **不 emit**（`function Value(v) { // TODO }`）；
  自动 emit 仅对引号名（`."update:modelValue"(v) -> {}`）。
- **G18** handler 里 `.Msg(x)` 调用紧跟 `let y = ...` 语句会被吞成链式
  （`[].Value(kept)`）——emit 调用放在块首（if 块内首语句）。
- **G19** view 的 if 条件里不能有箭头闭包（`find(x => ...)`）或复杂索引
  （`.row[c.name]` 于条件位）——挪进 computed 或改写。
- **G20** `type: "number"` 里 `number` 与类型名碰撞（解析器以为是 type 块）
  ——引号键 `"type": "number"`。
- **G21** use 清单必须含 computed/handler 引用的全部 ext fn——漏了不在
  编译期报错，运行时 `ReferenceError`（e2e 抓）。

## 双端一致性（Plan 010 定稿）

vue 轨与 vm 轨消费同一视图源（`src/front/*.at`）+ 同一 daemon（:17701），
一致性按三层口径验收（Plan 010 §架构方案）：

| 层 | 内容 | 判定 | 门槛 |
|---|---|---|---|
| L1 结构 | 元素族/层级/文本 | `autoui_snapshot` vs vue DOM 映射核对 | 必须一致 |
| L2 样式 | 类串/色板/间距/布局 | 双轨 PNG 像素 diff + 分区 metrics | 可修则修，否则台账归因 |
| L3 光栅 | 字体抗锯齿/亚像素/hover | 人工标注 | 登记，不入门禁 |

**对拍工具**：`scripts/track-parity/`——`capture.mjs --track vue|vm`（vue=
Playwright 1440x900@1x 同 accent 禁动画；vm=每视图独立 `auto run -r vm` 实例 +
MCP autoui_screenshot）、`diff.mjs`（pixelmatch + 差异 bbox）。PNG 落
`tmp/track-parity/`（不入库）；数值台账在 `docs/plans/010-*` §残差台账。

**窗口定标纪律**（T7 教训）：vm 用 `AUTO_VM_WINDOW=1440x900`（逻辑几何必须
等于 vue 视口），2x DPI 下 PNG 物理 2880x1800 由 capture 重采样归一
1440x900。**不要**用"PNG 物理尺寸对齐"口径定窗（720x450 会让逻辑几何变半幅，
布局比例全失配且 diff% 虚高）。

**门禁**：`./scripts/e2e.sh`（vue 28 断言 + 对 css-era 基准像素 diff 零回归）
+ `node scripts/e2e-vm.mjs`（MCP 驱动自愈式）。凡触视图源的改动必回 vue 门禁
（N4 冻结纪律：vm 侧修正不得倒灌污染 vue 已验收形态）。

**终值**（2026-08-28，css-era 基准 00 视图 0.00% 零回归前提）：
00=0.97 / 01=6.72 / 02=2.99 / 04=3.64 / 05=4.16 / 06=2.25 / 07=1.69
（03-roles 见台账 U3：vm 详情态截图通道冻结）。残差主项均为登记在案的上游
缺口（select 渲染缺位 / table thead 内置暗色）与 L3 光栅层。

### vm 兼容词汇（Plan 010 实证，写 `.at` 前先读）

vm（iced）端与 vue 端类串消费差异，按以下纪律写可双端一致的视图源：

1. **button 禁动态 `class:` 表达式**——loop 字段 Dot 求值失败会静默兜底
   primary preset（紫块/白字/h-10 裁多行 label）。双态样式用**条件展开**
   （`if .store.x == y { button (class: "静态串") } else { … }`，
   theme_picker swatch 同款）。store 预计算类串仅 vue 端可靠。
2. **label 必须用 `text:` prop 直取**（`label (text: e.label, …) {}`）——
   children 折叠链对 loop 字段表达式求值失败，整个 label 缺位。
3. **文字色/尺寸必须显式**——vm 默认前景是暗色主题白，白底上"看不见"。
   等值类串尾缀（`text-[#1a1a1a] h-auto` 等）在 vue 端为同值叠加，像素零变。
4. **未知类名（btn/field-row 等命名类）vm 端无效果**——布局/配色凡 vm 需要
   的，以 Tailwind 等值类写进类串；命名类仅作 vue 端 CSS/测试钩子。
   grid 布局 vm 无对应：双列字段行用 `flex flex-row items-start gap-[12px]`
   （box_class 孪生：`src/lib/api.ts` 与 `src/back/api.at` 双端同改，
   vue 端 styles.css 后加载、grid 压制 display，像素零变化）。
5. **row 不自伸铺满**——需要全宽的行显式 `w-full`。

## 已知残留差异

- 01-ai-daemon 1.88% / 02-auto-musk 1.59%（css-era 基准像素 diff，L3 光栅
  量级；视觉检查无异常，e2e 全绿）——双轨终值全集见「双端一致性」章。
- TableField 单元格 input 生成了 `v-model="row[c.name]"`（对 prop 数组的
  深写）——与 `$event` 重建路径并存，行为正确但违反 D5 字面约定（登记）。
- 表格空行的 colspan 丢省（原 `columns.length + 1`）；表格 select 列的
  "(current)" 回退 option 恒渲染（原为条件）——均无视觉差异。
- vm 轨上游缺口（select 渲染缺位 / table thead 内置暗色 / 事件冻结 U1 /
  截图通道 U3 / 快照空壳竞态）全部登记于 `docs/plans/010-*` §残差台账
  （auto-lang 446 §P 已回报），不在本仓修复范围。
