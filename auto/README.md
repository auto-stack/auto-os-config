# auto-os-config — Auto sources (Plan 006)

`src/` 的 Vue 组件层已 100% 由本目录的 Auto 语言源码生成（Plan 006 完成，
2026-08-24）。本目录是嵌入式 Auto 工程（jade-garden plan 011 同款模式）。

## 布局

- `pac.at` — 工程清单（`scene: "ui"`, `render: "vue"`, `shadcn: off`,
  `default_classes: off`——本项目是手写 CSS 变量体系，不走 Tailwind token）
- `src/front/app.at` — 占位根 widget（**永不部署**；使真 widget 发射为
  `components/<Name>.vue`）。部署根是 `src/components/AppShell.vue`，
  由手写 `src/main.ts` 挂载
- `src/front/*.at` — 6 个 widget + 3 个 store：

  | .at | 生成物 | 说明 |
  |---|---|---|
  | app_shell.at | AppShell.vue | 布局 + kind 分发（custom → 弃用占位） |
  | sidebar.at | Sidebar.vue | 搜索/分组折叠/主题选择器 |
  | daemon_view.at | DaemonView.vue | Test connection + 内嵌 ConfigEditor |
  | collection_browser.at | CollectionBrowser.vue | master-detail + modal + sidecar |
  | config_editor.at | ConfigEditor.vue | 通用表单 + 增删 provider 块 |
  | scalar_fields.at | ScalarFields.vue | 8 种叶子控件 |
  | table_field.at | TableField.vue | 对象数组表格编辑器 |
  | modules/theme/collection_store.at | src/stores/auto/*.ts | 状态层 |

- `src/front/utils/*_ext.ts` — 手写 TS 扩展：store 的 reactive() facade、
  组件/传输层中转、搜索过滤（DSL 表达不了的都在这）
- `gen/` — 生成工程（gitignored；`gen/regen.sh` 保留）

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
- **D5 禁止深变异**：`.a.b.c = v` / 嵌套 `.push()` **视图不更新且数据静默
  漂移**（probe B 实证，auto-lang 🔴 未修）。一律整对象/整数组替换（ext
  setCfgEntry/setCell/setEntry 均不可变重建）。
- **store facade**：生成的 composable 返回裸 ref 对象——模板嵌套访问不解
  包，ext 里 `reactive()` 包一层。
- ext 政策：只装 DSL 真表达不了的（fetch/localStorage/document/confirm/
  推断引擎/不可变重建辅助）。

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

## 已知残留差异

- TableField 单元格 input 生成了 `v-model="row[c.name]"`（对 prop 数组的
  深写）——与 `$event` 重建路径并存，行为正确但违反 D5 字面约定（登记）。
- 表格空行的 colspan 丢省（原 `columns.length + 1`）；表格 select 列的
  "(current)" 回退 option 恒渲染（原为条件）——均无视觉差异。
- 01-ai-daemon / 02-auto-musk 两张截图与手写版有非布局性像素差（视觉
  检查无异常，e2e 全绿）。
