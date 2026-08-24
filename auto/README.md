# auto-os-config — Auto sources (Plan 006)

`src/` 的 Vue 组件层正在改写为 Auto 语言（Plan 006）。本目录是嵌入式
Auto 工程（jade-garden plan 011 同款模式）。

## 布局

- `pac.at` — 工程清单（`scene: "ui"`, `render: "vue"`, `shadcn: off`,
  `default_classes: off`——本项目是手写 CSS 变量体系，不走 Tailwind token）
- `src/front/app.at` — 占位根 widget（**永不部署**；使真 widget 发射为
  `components/<Name>.vue`）。部署根是 `src/components/AppShell.vue`，
  由手写 `src/main.ts` 挂载
- `src/front/*.at` — widget / store 源（一组件一文件）
- `src/front/utils/*_ext.ts` — 手写 TS 扩展（DSL 表达不了的：fetch 传输、
  localStorage、document API、值形状推断）
- `gen/` — 生成工程（gitignored；`gen/regen.sh` 保留）

## 重新生成

```sh
bash auto/gen/regen.sh
# = auto build -d . --gen-only（Parse error / 编译告警都会中止部署）
#   + 组件 sed 改写 @/ext/... → ../../auto/src/front/utils/...，落 src/components/
#   + store composable sed 改写 @/lib/api → ../../lib/api，落 src/stores/auto/
```

**禁止**在仓库根跑 `auto run` / `auto build`——会以占位覆盖真实代码
（jade-garden 踩过的地雷）。

## 架构约定（Plan 006）

- **D4 描述符驱动动态表单**：handler 把 config 投影为值内嵌的字段描述符
  数组，view 纯 `for`+`if/else` 渲染——零函数调用、零动态索引（vm 模式
  约束）。
- **D5 禁止深变异**：`.a.b.c = v` / 嵌套 `.push()` **视图不更新且数据静默
  漂移**（probe B 实证，auto-lang 🔴 未修）。一律整对象/整数组替换。
- ext 政策：只装 DSL 真表达不了的（fetch/localStorage/document/推断引擎）。

## Gotcha 清单（Phase 1 探针沉淀，编号回填用）

- **G1** 元素的属性与子元素必须换行分隔：`label { class: "x"  text y }`
  会把 `text` 解析进 class 表达式（"Expected infix operator"）。
- **G2** 事件内联参数只能是：model 引用 / 循环变量 / 字面量 / map 字面量
  / `$event`。`!x`、`a + b` 等表达式被拒（strict 报错）——计算进 handler。
- **G3** `for x in <path>` 头部只接受裸路径，`.map[key]` 动态索引是解析
  错误——把值预投影进描述符。
- **G4** `col`/`row` 即使 `default_classes: off` 也注入 `flex flex-col
  gap-4` 布局类——移植手写 CSS 时一律用原生标签（div/aside/main/header/
  nav/section/footer/table…）+ 显式 `class:`。
- **G5** handler 局部变量的类型标注（`Array<str>`/`Array<any>`/`[]any`）
  被 codegen 丢弃，strict 模式下 `var out = []` 报 TS7034。惯用法：
  表达式初始化累加器 `var out = .xs.filter(x => false)`（推断 any[]）。
- **G6** `[]str` 会发射 `string[]`（按内容选）；model 层 `Array<str>` →
  `any[]`。
- **G7** 解析错误打印 `Parse error in ...`，与 `Warning: Failed to compile`
  格式不同且 `--gen-only` 仍 exit 0——regen.sh 两种都 grep（已加固）。
- **G8** strict 模式（auto-lang Plan 015 起默认）对 `th`/`td` 级 v-for 也
  强制 `:key`（R006）。
- **G9** 手写入口（main.ts/probe-main.ts）用 `h()` 渲染函数，不用
  `createApp({ template })`——vite 的 vue 是 runtime-only。

## 探针

Phase 1 探针（probe_a/probe_b）保留至 Phase 4 结束后删除；驱动脚本
`tmp/dsl-probes/drive.mjs`（15 项运行时检查）。挂载入口 `/probe.html`。
