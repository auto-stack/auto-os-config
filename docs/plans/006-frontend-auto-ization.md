# Plan 006: 前端 Auto 化（第一步）— Auto/Vue 模式功能对等

> **状态**：已完成（2026-08-24，Phase 0–5 全部交付；组件层 100% 生成，e2e 三套全绿，npm run build 干净）
> **前置**：Plan 001–005 全部归档（架构稳定、无活跃债务）；auto-lang vue 渲染后端成熟（examples/ui 23 个应用示例 + 核心仓 5113 单测）；方法论母本 = auto-down plan 011（jade-garden Auto 化，COMPLETE）与 auto-musk plan 022/028
> **仓库**：auto-os-config（frontend only，backend/ 零改动）
> **目的**：把 `src/` 手写 Vue 3 SPA 改写为 Auto 语言源码（`.at`），经 `auto build` 生成 Vue 工程，行为与视觉和现状完全一致（e2e + 截图对拍全绿）。为第二步 `render: "vm"` 桌面化铺路——本计划结束时 `.at` 是前端单一真源。

---

## 0. 背景与现状盘点

**现状**（2026-08-24）：前端 7 个 `.vue` + 7 个 `.ts` 共 2852 行（近半为 scoped CSS，纯逻辑约 1300–1500 行），运行时依赖仅 `vue` 一个；交互全部是表单/列表/导航/modal（无拖拽、canvas、虚拟列表）；前后端纯 HTTP/JSON（fetch → vite 代理 `/api` → daemon :17701）。

**已具备的迁移条件**：

- 回归门现成：`test-generic-editor / test-collection-editor / test-remote-module / test-theme-switch` 四套 Playwright + `screenshot-ui.mjs`（12 张页面截图）；
- backend 已 path-依赖 auto-lang 的 `auto-atom`/`auto-val`——本项目本就是 Auto 生态的配置编辑器，UI 用 Auto 写是最顺理成章的 dogfood；
- 工具链就绪：`auto-ui-creator` 技能（25 条 gotcha + 完整 Vue→AutoUI 映射）、auto-lang vue codegen、`auto build -d` 本地工程模式。

**规模对比**：jade-garden plan 011 迁移 29 组件 + 9 store（手写约 6600 行）；本项目 7 组件 + 5 状态模块（约 1500 行逻辑），资产规模约其 1/4。**但本项目有一个 jade 没有的新难点：ConfigEditor 是运行时推断的动态表单**（`inferField()` 按值形状+键名约定决定控件），不是静态模板——这是本计划探针阶段的重点。

---

## 1. 目标 / 非目标

### 目标

1. `src/` 组件层与状态层 100% 由 `.at` 生成（特许手写壳除外，见 D7）；
2. 现有 e2e 全绿 + 12 张截图对拍无实质 diff；
3. 开发工作流保留：vite `:17700` + `/api` 代理 `:17701` 不变，`npm run dev` / `npm run build` 照常可用；
4. `.at` 源不为 vue 后端写死：平台强依赖（fetch、localStorage）收敛在 ext 层，业务逻辑（推断引擎、状态机、分发）留在 `.at`。

### 非目标（明确不做）

- **后端不 Auto 化**：`backend/` 手写 Rust 保持原样；**不做 api.at**（`#[api]` 契约 → 生成 server+client 的机制与现有手写 daemon 差距大，jade-garden 同款决策）——fetch 传输层保留手写 TS，store 经 `use { fn }` 调用。api.at 接入留给未来计划。
- **remote custom 模块协议（`createComponent(Vue)` 动态加载 ESM）不做声明式等价，直接砍掉**：当前无真实第三方使用者（仅 `examples/remote-module` 一个演示），声明式框架无直接等价物。`custom` kind 模块渲染"协议已移除"占位提示；`examples/remote-module/` 归档、`test-remote-module.mjs` 退役。登记 KNOWN-DEBT。
- **桌面版（`render: "vm"` / `"rust"`）不在本计划**：第二步另立 plan。本计划只负"不堵死"的责任（见目标 4）。第二步前置条件见 §6。
- 不引入新功能、不重构 UI、不动 `~/.config/autoos` 数据格式。

---

## 2. 关键架构决策（预先定调）

**D1 嵌入式 Auto 工程（jade-garden 模式）**：仓库根新建 `auto/` 目录：

```
auto/
├── pac.at              # scene: "ui", render: "vue", shadcn: off, default_classes: off
├── src/front/*.at      # widget/store 源（一组件一文件）
├── src/front/utils/*_ext.ts   # 手写 TS 扩展（仅 DSL 表达不了的）
├── stubs/              # gen 工程 dual-resolution 镜像 stub
└── gen/                # 生成 Vue 工程（gitignored）
```

生成产物按组件拷贝（+ import 改写）进 `src/`，**脱离 `auto run` 直写**（它会用占位覆盖真实代码，jade-garden 踩过的地雷）；regen 命令与禁令写进 `auto/README.md`。`shadcn/default_classes` 关闭：现有样式是手写 CSS 变量体系（139 行 `styles.css` + 5 色主题），不走 Tailwind token，样式按现状整体平移。

**D2 状态层 → Auto store**；传输层留 ext：

| 现状（手写） | Auto 源 | 说明 |
|---|---|---|
| `composables/useModules.ts`（220 行） | `modules_store.at` | 模块注册表 + 当前选中 + hash 深链 |
| `composables/useCollection.ts`（191 行） | `collection_store.at` | 集合 CRUD |
| `editor/useEnums.ts`（65 行） | `enums_store.at` | 枚举会话缓存 + 去重 |
| `composables/useTheme.ts`（76 行） | `theme_store.at` | 主题色 + localStorage（走 ext） |
| `editor/useConfig.ts`（90 行） | 并入 ConfigEditor 的 `model` | per-module 实例状态（load/dirty/save），非全局单例，不适合 store |

现有散落在 composables 里的 fetch 调用抽成纯传输模块 `src/lib/api.ts`（手写，约 100 行），store handler 经 `use { fn }` 调用（codegen 自动 await，jade-garden 实证模式）。需要 facade 时按 jade 模式做薄层，消费方零改动。

**D3 inferField 推断引擎 → Auto 纯函数**：`editor/types.ts`（151 行 `inferField`/`inferColumn`）目标是移植为 `auto/src/front/infer.at` 的 `pub fn` 集合（纯函数，无 DOM 依赖）。Phase 1 探针核对字符串/数组方法覆盖；DSL 缺口大则降级 ext（`utils/infer_ext.ts`）并登记 gap——两者都不阻塞主流程。

**D4 动态表单的实现范式**：ConfigEditor 不再是"静态模板 + 递归组件"，改为**字段描述符数组驱动**：handler 里用 infer 引擎把 config 投影成 `fields: []FieldDesc`（预计算进 model，view 里不调函数——同时满足 vm 模式"view-builder 绑定不能调用函数"的约束，为第二步铺路）；view 用 `for field in .fields` + `if field.kind == …` 分发到 8 种控件（各自独立 widget 或 view fn，PascalCase）。ScalarFields 拆为控件级文件。

**D5 深层响应性规避约定（硬规则）**：jade-garden 已上报 auto-lang 🔴 未修缺陷——defineModel 深变异（`obj.shapes.push()`）不触发 computed。本项目核心恰是深层嵌套配置的递归表单，**全项目约定：handler 内禁止对 model 深层对象做变异（push/嵌套字段赋值），一律整对象/整数组不可变替换后整体赋回**。Phase 1 专项探针验证此约定下 computed/视图联动正常。

**D6 主题与样式**：`styles.css` 保持 host 手写资产（index.html 引入，现状不变）；生成组件的 scoped CSS 用 `.at` 的 `style { }` 块平移；主题切换 = `theme_store` 写 `document.documentElement` CSS 变量（经 ext 或透传）。

**D7 组件映射清单与特许手写**：

| 手写 `src/`（行数） | Auto 源 `auto/src/front/` | 批次 | 难度 |
|---|---|---|---|
| `DaemonView.vue`（164） | `daemon_view.at` | P2 | 易 |
| `Sidebar.vue`（314） | `sidebar.at` | P2 | 易 |
| `App.vue`（106） | `app_shell.at`（分发：file→ConfigEditor / collection→CollectionBrowser / custom→弃用占位） | P2 | 易 |
| `CollectionBrowser.vue`（463） | `collection_browser.at` | P3 | 中 |
| `ConfigEditor.vue`（330） | `config_editor.at` | P4 | 难 |
| `ScalarFields.vue`（331） | `scalar_fields.at`（或按控件拆 `controls_*.at`） | P4 | 难 |
| `TableField.vue`（207） | `table_field.at` | P4 | 难 |
| `index.html` + `main.ts` | **特许手写**（jade 同款 7 行壳：挂载 AppShell + 引 styles.css） | P2 | — |

`<component :is>` 动态分发 → `for/if-else` 按 module kind 分发（仅 3 种 kind，无需 `dyn`）。

**D8 基线先行**：动手翻译前 e2e 四套（把 `test-theme-switch.mjs` 补进 `scripts/e2e.sh`——它现在没被跑）+ 截图两遍全绿才开工；之后每批必跑。顺带清理根目录 4 个外来遗留脚本 `verify_content2/3.mjs`、`verify_content_headers.mjs`、`verify_wiki2.mjs`（指向 5173 端口，属其他项目误放入本仓，未跟踪）。

---

## 3. 分阶段实施

### Phase 0：准备

- **0a 基线固化**：`test-theme-switch.mjs` 纳入 `e2e.sh`；删除外来 verify 脚本；e2e 四套 + `screenshot-ui.mjs`（12 张）连跑两遍全绿，截图存为对拍基线。
- **0b 工程骨架**：建 `auto/`（pac.at、占位 `app.at`、`stubs/`、README 记录 regen 命令 `auto build -d .` 与"禁止在仓库根跑 auto run"）；用 auto-lang 的 `auto.exe` 试生成空壳，拷入 `src/` 接入 vite，确认 `npm run dev` 起得来、`vue-tsc` 过——校准工具链。

### Phase 1：探针（`tmp/dsl-probes/`，最小管线 vue-tsc + vite 验证）

- **probe A 动态表单**：字段描述符数组 + `for`/`if-else` 分发 8 种控件 + 密码显隐 + tag 输入（回车加 / 点 × 删）+ select/枚举联动；
- **probe B 深变异规避**：嵌套 config 对象整替换更新 + computed 联动（验证 D5 约定绕开 defineModel 🔴）；
- **probe C infer 移植**：`inferField` 用到的字符串/数组方法逐一核对 DSL 覆盖，定 D3 走 `.at` 还是 ext；
- **probe D 主题**：CSS 变量切换 + localStorage 持久化经 ext 的接线。

探针结论记录进本文件；未过的项走 ext 降级并登记 gap。**探针全过（或降级方案明确）才进 Phase 2**。

### Phase 2：易批（试点）

- `theme_store` / `enums_store` / `modules_store` + `sidebar.at` + `daemon_view.at` + `app_shell.at`；
- App 分发落地时 `custom` kind 即改为弃用占位 → 同步把 `test-remote-module.mjs` 移出 `e2e.sh`（协议退役在 Phase 5 正式归档）；
- 手写 `main.ts` 改为挂载生成的 AppShell。跑基线。

### Phase 3：中批

- `collection_store` + `collection_browser.at`（master-detail、过滤、新建/编辑/删除确认 modal、markdown sidecar 只读展示）。跑基线。

### Phase 4：难批

- `infer.at`（或 ext）+ `config_editor.at` + `scalar_fields.at`（8 控件）+ `table_field.at`（对象数组表格加删行）；
- 落实 D4 字段描述符范式与 D5 替换约定。跑基线。

### Phase 5：收尾与切换

- **盘点**：`src/` 下全部 `.vue` 含生成标记、与 `auto/src/front/*.at` 一一对应；特许手写仅剩 `index.html`、`main.ts`（壳）、`src/lib/api.ts`、`styles.css`；
- `npm run build`（vue-tsc + vite）干净通过；e2e 四套全绿 + 12 张截图对拍；
- remote 协议正式退役：`examples/remote-module/` 移入 `archive/`，`e2e.sh` 删去 :17720 相关段落；
- gap 清单沉淀进 `auto/README.md`（编号分级，P0=静默出错优先回填 auto-lang，修复后删 workaround 并记上游 commit）；
- `KNOWN-DEBT-AND-RISKS.md` 登记：remote 协议移除、api.at 未接、桌面版待立项；
- 根 `README.md` 更新开发工作流（改 `.at` → `auto build -d .` → 拷贝脚本 → vite）。

提交策略照 jade：每 phase/批次独立提交，plan 文件同步勾选。

---

## 4. 验证清单

- [x] Phase 0：e2e 四套（含 theme-switch，重写适配当前 UI + 加固两处计时 flake）两遍全绿（RUN3/RUN4，39+35 断言）；截图基线两遍；外来 verify 脚本已删
- [x] Phase 0：`auto/` 空壳工程生成 → 接入 vite → `npm run dev` / `vue-tsc` 通过（regen.sh 部署管线 + Parse-error 守卫）
- [x] Phase 1：四项探针结论（2026-08-24，见下）
- [x] Phase 2–4：每批翻译后 e2e 全绿（Phase 2/3 各 8 张截图逐字节一致；Phase 4 6/8 一致、2 张 ConfigEditor 页非布局性像素差，视觉检查无异常）
- [x] Phase 5：组件层 100% 生成来源盘点（7 widget + 3 store ↔ `src/components/*.vue` + `src/stores/auto/*.ts` 一一对应，均含生成标记）；`npm run build`（vue-tsc + vite）干净通过（0 错）
- [x] Phase 5：remote 协议退役（`archive/remote-module/` 归档、`test-remote-module.mjs` 删除、e2e.sh 清理 :17720 与 drop-in）；KNOWN-DEBT 与根 README 更新；21 条 gotcha（G1-G21）入 `auto/README.md`
- [x] 实机冒烟：daemon + vite 起服，走通"选模块 → 编辑 → 保存 → 重载一致"（generic-editor 套件：dirty → save → 文件持久化 → .bak），Test connection（✓ online）、roles/skills 集合 CRUD（create/edit/delete/sidecar/只读）、主题切换、hash 深链（modules_store Init）全部经 e2e 验证

### Phase 1 探针结论（2026-08-24）

- **A 动态表单：11/11 全过**。Phase 4 架构就此钉死：handler 把 config 投影为**值内嵌的字段描述符数组**（每次编辑整体重建该数组），view 纯 `for`+`if/else` 分发渲染（零函数调用、零动态索引）。toggle/number/password(显隐)/select/multiselect/tags(回车加/点删)/表格(加删行/单元格编辑) 全部可用（`tmp/dsl-probes/drive.mjs`）。
- **B 深变异：🔴 确认，D5 必要且充分**。`.config.provider.api_key = v`（嵌套写）与 `.config.provider.models.push()`（嵌套 push）**视图均不更新**（底层数据已变——静默数据漂移，比报错更险）；整对象/整数组替换全部正常，嵌套路径 computed 联动正常。全项目执行 D5，无例外。
- **C infer：维持 ext**（jade 同款决策：值形状判断/正则类字符串数学留 TS，经 `use { fn }` 消费；推断结果作为描述符投影的输入）。
- **D 主题：并入 Phase 2**（jade theme_store.at 同款：store 状态 + ext 做 localStorage/DOM）。
- 过程沉淀 **21 条 gotcha**（G1-G21：解析陷阱/静默降级/emit 语义/保留字碰撞/use 清单完整性等），全部登记 `auto/README.md` 供回填 auto-lang。探针与 /probe.html 已随 Phase 5 退役。

---

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| defineModel 深变异响应性断裂（auto-lang 🔴 未修，2026-08-24 上报） | D5 整对象替换约定 + probe B 专项验证；若约定不够用，该部分状态留 ext composable 并登记 |
| 动态表单 DSL 表达力不足（if/else 链、控件分发、受控 input） | probe A 先行；控件拆独立 widget 降低单文件复杂度；`value:`+`oninput:`+`onkeyup:` 双接线（U5/U22） |
| inferField 依赖的字符串/数组方法 DSL 缺失 | 降级 ext（D3），gap 登记，不阻塞 |
| `auto build` parse 失败不 fail、静默保留 stale SFC（jade 已证实） | regen 后必须 grep `Warning: Failed to compile`；写进 `auto/README.md` 操作规程 |
| 静默丢弃类 P0 坑（jade 沉淀 56 条 gap，9 条 P0） | e2e + 截图兜底；gap 编号回填 auto-lang；用到可疑语法先查 auto-ui-creator gotcha 清单 |
| hash 深链 / localStorage / confirm() 等浏览器 API | probe D + ext 透传（jade 的 `use { fn }` 逃生舱已实证） |
| auto-lang 上游漂移（本月 1100+ commits） | `auto/README.md` 记录所用 auto-lang commit；主仓 rebuild 后再 regen |

---

## 6. 关联与后续

- 方法论母本：`auto-down/plans/archive/011-jade-garden-auto-ization.md`（facade 零 diff / ext 政策 / 探针先行 / gap 回填）；`auto-musk` plan 022/028/041（双轨并存与退役）。
- 工具：`../skills/auto-ui-creator`（写 `.at` 时必读 gotcha 清单）。
- **第二步（vm/rust 桌面版）前置条件**，届时另立 plan：① auto-lang 修复 defineModel 深变异 🔴；② vm 渲染目标补 store facade 概念（musk Plan 028 已登记）；③ vm view-builder"绑定不能调用函数"限制与本计划 D4 的预计算范式实测兼容。本计划 D4/D5 的约定即为此预留。

## 7. 交付总结（2026-08-24）

**数字**：5 个 phase、4 个提交（Phase 0+1 / 2 / 3 / 4+5）；`auto/src/front/` 7 个 widget `.at` + 3 个 store `.at`（约 3100 行含 style 块与注释），生成 `src/components/` 7 个 SFC + `src/stores/auto/` 3 个 composable；特许手写仅剩 index.html / main.ts(7 行) / styles.css / lib/api.ts / editor/types.ts。

**什么有效**：
- **e2e 门控**：基线先行（两遍全绿才动手）+ 每批必跑，运行时类缺陷（ref 不解包、缺导出、emit no-op、keyup 与 fill 不触发）全部被当场抓出；
- **探针先行**：probe A/B 把 Phase 4 的架构与 D5 约定在动手前钉死，难批翻译没有架构级返工；
- **ext 政策**：DSL 表达不了的（fetch/localStorage/confirm/推断引擎/不可变重建）全部收敛在 api.ts + 少量 ext 中转，`.at` 保持纯声明；
- **渐进替换**：AppShell 先行、内容组件经 ext 中转逐批换血，任一时刻应用都可跑全量 e2e。

**真实代价**：
- 21 条 gotcha 中约 1/3 是"静默出错"级（标签降级 div、语句吞链、no-op emit），全靠 strict 模式 + e2e + 人工排查兜底；
- U21 回调 prop（on_value: msg + 同名 PascalCase msg 配对）是父子通信唯一可靠通道——引号名/普通名/空 handler 的 emit 语义差异是最大隐性坑；
- defineModel 深变异 🔴 未修，D5 不可变重建贯穿全部编辑路径（ext 投影函数承担了大部分复杂度）。

**后续**：第二步桌面版（render: "vm"/"rust"）前置条件与 api.at 接入见 KNOWN-DEBT-AND-RISKS「未来增强」。
