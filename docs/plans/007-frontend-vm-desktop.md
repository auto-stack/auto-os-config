# Plan 007: 前端 Auto 化（第二步）— VM 桌面版

> **状态**：待实施（设计定稿 2026-08-25）
> **前置**：Plan 006 已归档（`.at` 是前端单一真源；D4 描述符驱动 / D5 不可变重建已成规范）。Plan 006 §6 列的三个前置条件现状：① defineModel 深变异 🔴 **已修**（auto-lang Plan 443，当日闭环）；② vm store facade——**已基本解决**（auto-lang Plan 370：store 字段合并根 state、`.store.X` 扁平化、`store.Method` 改写，015-notes 以 `--mode vm` 跑通 13 场景；musk 028 T21 报的 Undefined variable 仅指 vue 合成的 composable 门面，vm 轨改用原生 store 语法即绕开）；③ vm view-builder 禁函数调用——**本仓 D4 已预留**（view 零函数调用、零动态索引，Phase 1 探针复验）。
> **仓库**：auto-os-config（frontend only；`backend/` daemon 零改动）
> **目的**：在 vue web 版之外提供 **VM 桌面版**——`auto run -r vm`（在 `auto/vm/` 工程）拉起 iced 自绘原生窗口，直连 daemon `:17701`，功能与 web 版对等（模块导航 / 通用编辑 / 集合 CRUD / daemon 连接测试 / 主题切换）。逻辑层（推断引擎 / 投影 / 重建 / 传输）升级为**双后端单一真源 `.at`**，vue 轨同步切换消费且零回归。

---

## 0. 背景与现状盘点

### 0.1 本仓现状（Plan 006 交付物）

- `auto/` 嵌入式 Auto 工程（render: "vue"）：7 widget + 3 store `.at`（约 3000 行），regen.sh 部署管线 + e2e 四套 + 12 张截图对拍全绿；
- 特许手写：`index.html`、`src/main.ts`、`src/styles.css`（CSS 变量体系）、`src/lib/api.ts`（655 行：fetch 传输 + 全部投影/重建/枚举缓存/主题持久化）、`src/editor/types.ts`（151 行 inferField/inferColumn）；
- widget 经 7 个 ext 中转文件（约 110 行）消费 api.ts；store 用 `use back.api:` 导入 + `composable: useXxxStore from "*_ext.ts"` reactive 门面；
- D4（描述符驱动，view 零函数调用）与 D5（不可变重建）已成跨后端规范。

### 0.2 vm 后端事实（auto-lang 调研，2026-08-25）

| 维度 | 事实 | 出处 |
|---|---|---|
| 形态 | `auto run -r vm` = auto.exe 进程内解释器 + **iced 自绘原生窗口**；无 gen 产物（解释执行） | `auto-lang crates/auto-man/src/rust_ui.rs:2418-2545` |
| 窗口 | pac.at `window: "WxH"` / `title:`（经 env 注入） | `rust_ui.rs` main.rs:921-933 |
| view 约束 | **绑定零函数调用**（方法白名单仅 `len/starts_with/substr/trim/to_string`）；表达式子集 `== != && || +`、块 if、f-string 插值；for/if 条件支持 `.len()` 特例；事件参数仅字面量/标识符/循环变量 | `aura_view_builder.rs:4558-4835`、Plan 402 §12.2 |
| handler | **真 VM 函数，完整语言能力**（含 `find/filter` 闭包——本仓 store 已在用）；但 VM handler 之间不能互调，共享逻辑放模块级 `.at` fn | Plan 402；`041-auto-edit/app.at:221` |
| TS ext | **完全不可用**，引用即 `Undefined symbol` 显式报错 | musk 028 T21、Plan 402 |
| 样式 | **无 CSS 引擎**（`style_css: None`）；`style {}` 块与 pac `styles:` 均为 vue 专用；样式 = Tailwind 风格 class 串 → StyleClass IR → iced | `ui/dynamic.rs:1411`、`style/class.rs` |
| 主题 | **运行时动态换色可行**：renderer 每帧从 state 读 `accent_color` 写 thread-local，`theme.rs` 按语义 token（`bg-primary` 等）算色；内建 5 色板 **indigo/coral/ocean/sage/amber——与本仓 `ACCENT_OPTIONS` 完全同款**（AutoForge 视觉语言一脉） | `renderer.rs:7792-7807`、`theme.rs:83-128`；本仓 `api.ts:210-216` |
| http | `use auto.http` natives：`http.get/post`、`get_json`(3102)/`post_json`(3103)、超时/头链式 | `stdlib.rs`、native_catalog.rs |
| Storage | `Storage.get/set` = **session 级 HashMap 镜像**（非持久） | `vm/ffi/stdlib.rs:475-502` |
| store | Plan 370 已支持：字段合并根 state、view `.store.X` 扁平化、`store.Method` 改写执行 | `plan370_store_vm_tests.rs`；015-notes 先例 |
| confirm/modal | 无 `confirm()` 内建；状态驱动 `popover(open:, x:, y:, ondismiss:)` 是确认弹层先例 | `041-auto-edit/app.at:125-156` |
| markdown | vm 无实现（vue 侧 markstream/prismjs）；降级 = 纯文本展示 | musk KNOWN-DEBT 023、auto-down plan 008 同款降级 |
| 布局 | iced 0.14 物理约束：无绝对定位、无 flex-wrap、**无 margin**、per-child 对齐有限——降级矩阵见 auto-lang Plan 412 §5 | `412-layout-gallery.md:185-197` |
| e2e | `desktop_mcp.py` 模式：`AUTOUI_MCP_PORT`(9247) 起 JSON-RPC，`autoui_snapshot/action/state/type/keyboard/exists` 驱动与断言（断言 model 标量）；`.autotest` 场景词汇（click_button/type_text/state equals/snapshot_changed） | `041-auto-edit/tests/desktop_mcp.py` |
| 目标门控 | **`X.at` + `X.web.at`**：`.web.at` 仅 vue 目标参与编译，缺 adapter 构建期显式报错（musk Plan 037 ports 模式） | musk 028/037 T22 `resolve_at_adapter` |
| 示例先例 | `examples/ui/041-auto-edit`（vm，486 行单 widget + ui_config 菜单）、`widgets-gallery`（vm，6927 行）、`038-minesweeper`（双后端）、`015-notes`（store×VM 13 场景） | auto-lang examples |

### 0.3 差距矩阵（本仓 → vm 的五类缺口）

| 本仓依赖 | vm 等价物 | 处置 |
|---|---|---|
| `api.ts` fetch 传输（~200 行） | `http.get_json/post_json` natives 直连 `http://127.0.0.1:17701` | D3 传输层目标门控 |
| `types.ts` inferField/inferColumn（正则 + 值形状） | handler 内完整 VM 语言（str 方法/闭包可用） | D2 移植 `.at`（probe V3 校准方法覆盖） |
| `api.ts` 投影/重建（configEntries/setCfgEntry/tableInfo/…~300 行） | 同上，纯数据变换 | D2 移植 `.at`，vue 轨同步切换 |
| CSS 变量体系 + scoped style 块 | Tailwind class 串 + semantic token + accent model | D5 vm 视图层重写（视图分叉） |
| `confirm()` / modal / markdown sidecar | popover 确认层 / 状态驱动弹层 / 纯文本降级 | D6 |
| localStorage（主题 + 首存确认） | `Storage`（session 级）或 `File` natives + `env.local_data_dir` | D7 |

---

## 1. 目标 / 非目标

### 目标

1. **VM 桌面版可用**：`auto run -r vm`（cwd = `auto/vm/`）起窗口，直连 daemon，走通"选模块 → 编辑 → 保存 → 重载一致"、集合 CRUD、Test connection、主题切换；
2. **逻辑层单一真源**：infer / 投影 / 重建 / 传输封装 100% `.at` 化，vue 与 vm 两轨消费同一份；vue 轨 `types.ts` 退役、`api.ts` 瘦身为纯 fetch 库；
3. **vue web 轨零回归**：e2e 四套 + 12 张截图对拍全绿（切换 logic 消费前后各跑一轮）；
4. **vm 轨有回归门**：`scripts/e2e-vm.mjs`（MCP 断言）覆盖四套 Playwright 的核心路径。

### 非目标（明确不做）

- **不追求 vm 与 web 像素级一致**：iced 自绘与浏览器渲染天然不同；对等 = 结构、行为、主题色板一致（D5）；
- **不重写 vue 轨样式**为 class 体系（违背 Plan 006"视觉与现状一致"承诺，回归面不可接受）；
- **不动 daemon**、不接 api.at（延续 Plan 006 决策）；
- **不做 `auto build -r vm` 独立 exe 分发**（a2c/ninja 链虽 exit 0，打包/安装/自更新另立计划）；
- **不做 rust render 后端**（第三轨，本计划不涉及）。

---

## 2. 关键架构决策（预先定调）

**D1 双工程组织**：新建 `auto/vm/` 独立 vm 工程，与 vue 工程并立；逻辑与状态共享、视图分叉：

```
auto/
├── pac.at                  # vue 工程（现状零改动：render "vue"）
├── src/front/*.at          # 7 个 vue widget（现状）+ 3 个共享 store
├── src/front/logic/        # ★ 新：共享逻辑层（纯 .at fn，双后端单一真源）
│   ├── infer.at            #   inferField/inferColumn/humanize（types.ts 移植）
│   ├── project.at          #   configEntries/bodyEntries/tableInfo/set*/merge/…（api.ts 投影移植）
│   ├── transport.at        #   传输端口本体：http natives 直连 daemon（vm 目标用）
│   └── transport.web.at    #   vue 目标适配：back.api 转发（musk 037 ports 形态）
└── vm/                     # ★ 新：vm 桌面工程（pac render "vm"，无 gen 产物）
    ├── pac.at              #   window: "1280x860"、title: "AutoOS Settings"（ui_config 可选）
    └── src/front/*.at      #   app.at 真根 + 7 个 vm widget（相对 use 引共享 store/logic）
```

vm 工程不产 codegen、不进 regen.sh，vue 工程完全不扫 `auto/vm/`——**两轨互零污染**；`auto/src/front/app.at` 占位（vue 轨部署锚）与 `auto/vm/src/front/app.at` 真根（vm 轨入口）各司其职，互不冲突。跨工程相对 use（`use ../src/front/modules_store: Modules`）的路径解析语义在 probe V2 校准。

**D2 分叉面收敛——视图分叉、逻辑统一**：vm widget（`auto/vm/src/front/*_vm.at` 或独立命名）按 iced 能力重写视图；infer/project/transport/store 是两轨共享的单一真源，**vue 轨同步切换消费 `.at` 版**（Phase 2），不留 TS/AT 双份投影。同源 widget 的父子通信改造遵循"状态上提 store + 值内嵌描述符"（D4/006 已预留），vm 侧子 widget 不依赖 emit 回传。

**D3 传输层目标门控（musk 037 ports 模式）**：`transport.at` 声明稳定端口（fetchModulesViewSafe / fetchConfigSafe / putConfigSafe / deleteBlockSafe / fetchCollectionListSafe / fetchEntitySafe / createEntitySafe / putEntitySafe / deleteEntitySafe / loadEnum / enumUrlOf / testDaemon…，签名与现 api.ts 对齐）：
- `transport.web.at`（vue 目标）：`use back.api:` 转发现有 api.ts fetch 函数；
- `transport.at` 本体（vm 目标）：`use auto.http` + `http.get_json/post_json` 直连 `http://127.0.0.1:17701`，base URL 常量 + `Env.get("AUTOOS_DAEMON")` 覆盖（D9）；错误重建为同形 `{ok, error}` 值；
- 浏览器专属语义在 vm 版自然退化：`getHash()` 返回 `""`（深链分支跳过）；
- store 的 use 行从 `use back.api: …` 改为 `use logic/transport: …`（一行级 ×3 store）。缺 adapter 时构建期显式报错（musk 037 T22 既有行为），静默分叉不可发生。probe V1 验证 `X.web.at` 机制在本仓工程结构（跨 `logic/` 目录、双 pac）下的适用性；若不适配，降级方案 = store 传输调用拆 `transport_call.at` 纯封装 + vue 侧 ext 中转（分叉面最小化并登记 gap）。

**D4 store 双轨访问**：store 本体（`modules/collection/theme` + 补 `enums` 会话缓存进 model）共享；vue widget **保持 composable 门面零改动**（`composable: useModulesStore from ext`），vm widget 用原生语法（`use modules_store: Modules` + view `.store.X` + handler `store.Method(...)` / `store.field = v`，015-notes 同型）。vue 轨唯一改动是 store 的传输 use 行（见 D3）。

**D5 vm 视觉体系**：Tailwind class 串 + semantic token（`bg-background/bg-card/text-foreground/border` 等）+ 裸色值（`bg-[#1C1D24]` 型）；主题切换 = model `accent_color` + `store.SetAccent(name)`，renderer 侧 thread-local 动态算色（015 sidebar 同型先例，T11/T12 VM 全 PASS）——**5 色板两边同源，无映射成本**。验收标准是结构/行为/色板对等，非像素对拍。

**D6 交互降级（先例驱动）**：
- 首存确认 / 删块确认 / 删实体确认 → `popover(open:, x:, y:, ondismiss:)` 确认层（041-auto-edit 先例）；确认状态进 model（`confirm_*` 字段），文案照搬；
- CollectionBrowser modal（新建/编辑）→ 状态驱动弹层（同 popover 或 iced 下 dialog 的 open 绑定形态，probe V4 定）；
- markdown sidecar 只读展示 → `pre` 纯文本降级 + 提示条（auto-down plan 008"VM 降级渲染路径"同款决策）；
- iced 布局约束按 Plan 412 §5 降级矩阵执行（本仓为 flex 纵横布局为主，无绝对定位依赖，风险低）。

**D7 桌面持久化**：主题与"首存确认 ack"经 `env.local_data_dir()` + `File.write_text/read_text` 落一个小文件（如 `autoos-ui.json`）；`Storage.*` 仅作 session 级缓存用。桌面版重启保持主题是基本体验，成本一个 fn。

**D8 vm e2e = node 版 desktop_mcp**：`scripts/e2e-vm.mjs`——起 daemon（复用 e2e.sh 的起停/复用逻辑）+ `auto run -r vm`（env `AUTOUI_MCP_PORT`）+ JSON-RPC `autoui_*` 断言。断言对象以 model 标量为主（`autoui_state` 正则解析 `field: "value"`），元素定位以 `autoui_snapshot` 文本正则为主（借鉴 `desktop_mcp.py` 的 `find_button_by_text` 模式与已知坑注记：事件绑定快照不显实参、`autoui_type` 会置换 loop-index 实参）。不自建 `.autotest` 线（`run_autotest.py` 属 auto-lang 仓；如后续语言级机制开放给外部工程再迁移）。

**D9 后端直连与配置**：vm 版不经 vite 代理，直连 `http://127.0.0.1:17701`；daemon 地址常量化 + `Env.get("AUTOOS_DAEMON")` 覆盖（远端 daemon 场景留口）。daemon 本体、API 形状、`~/.config/autoos` 数据格式零改动。

**D10 上游锚定**：Phase 0 记录所用 auto-lang commit 进 `auto/README.md`；上游 rebuild 后先 vue regen + e2e 再 vm 冒烟（沿用 006 规程）。发现 vm 后端缺陷按 006 惯例：workaround + gap 编号登记，P0 级回报 auto-lang。

---

## 3. 分阶段实施

### Phase 0：准备与基线

- vue 基线重跑两遍全绿（e2e 四套 + 12 截图）确认起点干净；
- `auto/vm/` 空壳工程（pac.at + 最小 app.at"hello"窗口）`auto run -r vm` 冒烟：窗口起得来、`AUTOUI_MCP_PORT` 可连、`tools/list` 就绪——校准工具链；
- 记录 auto-lang commit；`auto/README.md` 增设 vm 章节骨架（运行命令 + 禁令：vm 工程内可以 `auto run`，仓库根依旧禁止）。

### Phase 1：探针（`tmp/vm-probes/`，最小 vm 工程直跑）

- **probe V1 传输门控**：`X.at`/`X.web.at` 双文件在 vue 工程（gen + vue-tsc）与 vm 工程各自解析正确的验证；跨工程相对 use 路径；vm 侧 `http.get_json` 直连本机 daemon 拿到 `/api/modules` 真数据、错误路径（daemon 停）重建 `{ok:false,error}`；
- **probe V2 store 原生双轨**：015-notes 形态 store（含 handler 内调 transport fn + 闭包 find/filter）vue/vm 双端跑通；musk 028 T21 报的门面 Undefined variable 告警不在原生语法下复现；
- **probe V3 逻辑移植**：inferField 依赖的字符串运算（正则 `_key$|api_key|secret|token|password` → `contains/ends_with/to_lower` 链）、值形状判断（typeof/Array/isPlainObject 等价）、`Object.entries` 型 map 迭代、动态 key 对象构造（blankRow）逐一在 VM 验证覆盖；缺口定改写方案（循环重写）或登记；
- **probe V4 控件与布局**：8 种控件（toggle/number/password 显隐/select/multiselect/tags/表格加删行）+ popover 确认层 + 状态驱动弹层 + scroll 布局在 vm 的可用性与形态；子 widget props 下行 + 经 store 回写（替代 emit）链路；
- **probe V5 主题与持久化**：accent model 动态换色实机验证（5 色）；`File` natives + `local_data_dir` 读写小文件。

探针结论记录进本文件；未过项走降级并登记 gap。**探针全过（或降级方案明确）才进 Phase 2**。

### Phase 2：共享逻辑层 `.at` 化 + vue 轨切换

- `logic/infer.at`（types.ts 移植）+ `logic/project.at`（api.ts 投影族移植：configEntries/subEntries/setCfgEntry/cfgProvider/bodyEntries/setEntry/entriesBody/fmFields/filterEntities/tableInfo/setCell/blankRow/removeRowAt/mergeCols/loadColumnOptions/enumUrl/enumUrlOf/addBlockBody/bodyHas/expandGroupFor）；
- vue 轨切换消费：store/widget 的 use 改指 `logic/*`；`src/editor/types.ts` **退役删除**；`api.ts` 瘦身为纯 fetch 库 + 浏览器副作用（localStorage/confirm 留守，D7 后 vm 侧不用它）；ext 中转文件相应裁撤（composable 门面保留）；
- 跑 vue 基线（e2e 四套 + 12 截图对拍）——**这是本计划最大的一次 vue 轨回归面，e2e 门控兜底**（006 实证有效）。

### Phase 3：传输与 store 双轨

- `logic/transport.at`（http natives 版）+ `logic/transport.web.at`（back.api 转发版）；3 个 store 的 use 行切换 + `enums` 会话缓存入 store model（对齐 vue 侧枚举去重语义）；
- vue e2e 全绿；vm 工程拉起：store 经 MCP 断言真实数据加载（`autoui_state` 读 modules/active_id 等字段）——vm 轨第一个可运行里程碑（数据层完整、视图仍是占位）。

### Phase 4：vm 视图层（三批，难度递增，每批 MCP 冒烟）

- **批 1（易）**：`app.at` 真根（shell + kind 分发）+ `sidebar_vm`（分组折叠/搜索/主题选择器）+ `daemon_view_vm`（Test connection + 内嵌通用编辑器）；
- **批 2（中）**：`collection_browser_vm`（master-detail、过滤、新建/删除 popover 确认、sidecar 纯文本降级）；
- **批 3（难）**：`config_editor_vm` + `scalar_fields_vm`（8 控件）+ `table_field_vm`（表格加删行/单元格编辑）——落实 D2"状态上提 + 描述符值内嵌"，编辑回写 = handler 调 `logic/project.at` 重建 + 整体赋回（D5/006 规范）；
- 可选加分：`ui_config`（menubar File→Save/Quit + 快捷键，041-auto-edit 形态）。

### Phase 5：e2e-vm 与收尾

- `scripts/e2e-vm.mjs` 全场景：模块加载/导航（含分组折叠/搜索）、通用编辑 dirty→save→重载一致、首存确认 popover、集合 CRUD（create/edit/delete/sidecar）、Test connection（✓ online）、主题切换（state 断言 accent_color + 快照变化）；与 `scripts/e2e.sh` 并列提供 `scripts/e2e-vm.sh` 一键起停；
- 文档三件套：`auto/README.md` vm 章节（架构图/运行/测试/已知差异/gap 清单）、根 `README.md`（双轨开发工作流）、`KNOWN-DEBT-AND-RISKS.md` 登记（vm 视觉降级清单、markdown 降级、Storage session 级、build 分发待立项、probe 沉淀的 gotcha）；
- 实机手动走查全部 7 模块收尾。

提交策略照 006：每 phase/批次独立提交，plan 文件同步勾选。

---

## 4. 验证清单

- [x] Phase 0：vue 基线两遍全绿；vm 空壳窗口 + MCP 通道冒烟；auto-lang commit 记录（2026-08-25：`auto/vm/` 空壳起窗口，MCP 端点 `/mcp`，`autoui_action` press → handler `.App.Bump` → state `count: 10 → 11` 闭环；快照元素 id 为 `vnode_N` 形态。基线在主仓同 commit 跑（服务复用），e2e 四套两遍 ALL PASS）
- [ ] Phase 1：五项探针结论（V1-V5）记录进本文件，降级项登记
- [x] Phase 2（按 D1/D3 修订执行）：`auto/src/back/api.at`（vm 全文本实现，63 pub fn）+ 3 store vm-safe 重写（model 形状不变、vue widget 零改动）+ api.ts 增补同名扁平面（vue 实现）；vue regen + build 0 错 + e2e 三套全绿；vm 侧 MCP 实证：modules 加载/分组/选择 ✓、collection list/select/edit/save/create/remove ✓（editField 文本手术落盘 `tier : "pro"` 实证）。types.ts/api.ts 保留（双实现架构，不再"退役"）。追加 gotcha：**VG16** 一 widget 一 store（Init/Select 等方法名跨 store 撞名，多 store 消歧按方法名匹配）；**VG17** `json.keys` 返回**裸 key**（不带引号；输出时需 quote_json 重包）；**VG18** `.Select` 依赖 `.module_id` 由 `Init` 先置（漏 Init 时静默空 URL）。截断级 gotcha：map 字面量内空数组崩溃（二次构建规避）、map 字面量内 `.len()` 求值为 0、`json.get_at` 仅文本、substr 闭区间
- [x] Phase 3（并入 Phase 2 完成）：`use back.api:` 单导入行双后端解析（vue→@/lib/api、vm→src/back/api.at）实证生效——store 源零改动双轨共享；vm store 数据加载/编辑/保存 MCP 断言全过
- [ ] Phase 4：三批 vm widget 各自 MCP 冒烟通过；8 控件 + 表格加删行 + popover 确认实机可用
- [ ] Phase 5：e2e-vm.mjs 全绿（覆盖四套 Playwright 核心路径）；文档三件套更新；KNOWN-DEBT 登记；7 模块手动走查
- [ ] 终态：vue web 版与 vm 桌面版并存，`./scripts/e2e.sh` 与 `./scripts/e2e-vm.sh` 双绿为仓库门禁

### Phase 1 探针结论（2026-08-25，tmp/vm-probes/ 全程实机 MCP 驱动）

**V1 传输：✅ 打通，配方收敛为"全文本 + 非 builder"**：
- GET 用 `http.get_json(url)`（返回原始 JSON 文本，live daemon 实测 7 模块）；判错按 `json.type_of(t) != 期望形态`（死端口返回 `{"error":"error sending request..."}` 文本，形态判别可靠）；
- PUT/POST/DELETE 用 `http.put/post/delete(url, payload)`——**完整编辑保存闭环实证**（get→投影→put→reget→比对 same=true；POST 创建 roles 实体 + DELETE 删除 + 事后 GET 验证均过）；
- **三不用**：`res.status()` 恒返回哨兵 -2147483647；builder 链（`.header().body().send()`）一旦用过，handler 内第二次 http 调用必崩（状态污染）；`res.body()` 结果不可靠（错误响应返回垃圾）。写操作成功与否一律事后 GET 验证。

**V2 store：✅ 加载链通，访问范式受限**：原生 store 语法（`use XStore: Store` + `.store.X` + `store.Init()`）工作正常，store 字段合并进 App state（7 模块 `<vmref>` 可见）；store 内调 transport fn + 循环构建 map 列表正常。**但 handler 内读 map 字段（`m.id`，含 `let mid = m.id` 中转、store 作用域与 App 作用域均试）静默失效**——不报错、不匹配。闭包 `find(x => x.id == id)` 同样不匹配。

**V3 逻辑：✅ 文本工具链完美，动态 map 操作全灭**：
- `json.keys/get/get_at/type_of/len`（作用于原始 JSON 文本）**完美**——configEntries 骨架逐字段判型全对（scalar/table/subform/tags + secret 掩码）；
- **key 顺序为字母序**（serde_json 无 preserve_order），与 vue 轨 Object.entries 插入序不同——登记为 vm 轨已知偏差；
- `json.parse` 是**占位 shim**（原样返回文本）——点访问（`body.provider.kind`）在任何模式都不可用，book-reader 模式在本版本失效；
- 动态 `body[k]` 读返回 0、动态 `row[c] = ""` 写崩溃、`for k, v in map` 解析层被拒——**动态 key 操作全灭**；
- 字符串方法（`to_lower/ends_with/contains/split/substr/to_upper/len`）、`push`、字面量 key map 构造全部可用。正则等价物（secret 键名匹配链）工作正常。

**V4 控件**：checkbox（action=toggle）✓、input 单参绑定（`oninput: .T4Num`，autoui_type 文本直达参数）✓、密码显隐（状态按钮）✓、popover 确认层（open/ondismiss/Confirm/Cancel 全流程）✓、表格行循环渲染（view 端 `r.name` 点访问正常）✓、push 重建加行 ✓；**`select` 组件在 vm 快照中完全不渲染**（降级方案：popover 菜单或按钮组，041 同款）；**`.arr.concat([x])` 返回 0（禁用，一律 loop+push 重建）**；双变量 `for i, r in .arr` 在 handler codegen 不支持（view 端可用）；`autoui_type` 会置换显式 `$event` 实参（e2e 规则：input handler 一律单参无 `$event`）；全局 keyboard Enter 不路由到具体 input（tag 回车用真实键盘或改驱动方式）。

**V5 主题/持久化：✅✅**：accent model 切换（indigo→coral，`text-primary` class 动态换色链路依赖 renderer thread-local，Phase 4 实机视觉复验）；`Env.local_data_dir()` + `File.write_text/read_text` 往返持久化实证（back 内容逐字一致）。

**探针期 gotcha 清单（vm 轨编码规范，编号 VG1+）**：
- **VG1** fn 模块内**禁 `use auto.str`**——与 http 模块共编时 stdlib `Response.status(self…)` 解析成 `str.status` 链接失败；字符串一律用方法调用形态（`k.to_lower()`）；
- **VG2** handler 内多语句禁同行（`let q = f()  .r = q.x` 吞链）——一律分行；
- **VG3** `.status()`/builder 链/`res.body()` 禁用（见 V1 三不用）；
- **VG4**（已收窄）map 字段读取：**fn 模块内完全可用**（循环变量/入参/重建全过，L1/L2/L3 实证）；仅 **handler 内对 model 数组循环变量的 map 读取失效**（vmref 未物化，静默不匹配）。规范：handler 保持薄（调 api fn + 赋值），数据加工全在 fn 模块。链式直读 fn 返回值（`r.data.modules`）在 handler 内可用，但经局部变量中转（`let d = r.data` 再 `d.x`）失效——handler 内一律链式直读；
- **VG5** `concat`/双变量 for（handler）/动态 map key——禁用，loop+push 重建；
- **VG6** 模块导入用冒号形式（`use probe_logic: fn1, fn2`）；花括号 use 块与文件级 `use x from "path"` 在 vm UI 均不可用；
- **VG7** handler 崩溃会回滚整次状态写入（原子性）——分步调试需逐步设值；
- **VG8** json.parse 占位、JsonValue 方法链不可用——全部走 json.keys/get/get_at/type_of 文本工具链。

**架构修正（对 Phase 2-4 的直接影响）**：vm 轨逻辑层 = **纯文本进出**（body text → 投影 fn → 值内嵌描述符 map 列表给 view；编辑 = handler 收标量新值 → text 手术替换 → 重投影）。D4 描述符范式不受影响反而强化（view 端 map 点访问可用，恰是描述符的消费端）。store 中跨 handler 数据一律存标量/文本/描述符列表，不依赖 handler 读 map。

### Phase 2 补充：vm 数据管线终版规则（2026-08-25 实证，VG9-VG14）

Phase 2 实施中以 vm harness（临时 app.at + 真实共享 store）逐层实证，追加 gotcha：
- **VG9** `File.write_text` 同进程内读后写延迟可见（跨进程正常）——model 为权威、文件仅作下次启动持久化。
- **VG11** `json.get_at` 只接受 JSON **文本**，用于 VM 数组返回空——数组按下标取值用索引计数 for-in。
- **VG12** handler（含 store handler）内**两跳链读 map 的数组字段为空**（`r.data.modules` → []；两跳标量 `r.data.firstGroup` 在 App handler 可用但 store handler 为空；单跳 `r.ok/r.error/r.text` 全语境可用）。
- **VG13** 数组**不跨 fn 边界作实参**（`arr_len(flat)` 得 0）；fn 内自建数组直接返回、调用方 bind 后 `.len()`/for-in 可用。
- **VG14** `.model_array.find(闭包)` 在 vm 不可用；选择逻辑下沉 api fn（扁平返回 + 单跳读）。
- 其余修正：`substr(a,b)` 是**闭区间**；map 字面量内的 `.len()` 调用求值为 0（取值后拼）；`{members: []}` 空数组字面量在 map 内崩溃（先收集 label 再二次构建）；`unquote` 已修。

**终版 API 形状规则（双实现共同接口，vm 侧约束定型）**：
1. fn 返回一律**扁平 map（全标量/字符串）**或裸字符串——禁嵌套 map、禁数组字段；
2. 列表数据 = 文本 + 计数 fn + 逐项扁平 getter（`fetchXxxRaw → {ok,error,text}`、`xxxCount(text)`、`xxxAt(text,i)`），**handler 内 loop+push 构建 model 数组**（字面量 map 从 getter 单跳读拼装）；
3. 选择/查找逻辑下沉 api fn（`selectInfo(text,id) → {found,...}`）；
4. 编辑操作 text-in/text-out（`setBodyField(body,path,frag)` 等），store 持权威文本 + 重投影显示数组；
5. store MODEL 形状不变（vue widget 零改动），只改 handler 体与 api 面。

**已实证的完整链路**：`fetchConfigSafe → entry_at(逐项) → handler 单跳读 → e0=deepseek/subform ✓`；`fetchModulesView` 构件（module_entry/分组/去重）fn 内全部可用（probeMods6：7 模块 + Harness×4）。

### Phase 1 补充：架构修订 D1/D3（探针后定稿，2026-08-25）

1. **D1 修订——单工程双后端**：放弃独立 `auto/vm/` 子工程，回到 widgets-gallery 模式：**同一 `auto/` 工程，CLI `-r vm` 切换**。理由：vm widget 与共享 store 的跨工程相对导入无解析机制，单工程天然共享；vm 专属文件（`*_vm.at`）与 vue 文件同住 `src/front/`。
2. **D3 修订——`back.api` 天然双解析，vue 轨零改动**：vm 解释器把 `use back.api: fn` 解析到 `<root>/src/back/api.at`（lib.rs resolve_module_path），vue codegen 映射 `@/lib/api`——**同一导入行双后端各自解析**。因此：新建 `auto/src/back/api.at`（vm 侧全文本实现：transport 配方 + inferField 移植 + 投影/重建），**3 个 store 源零改动即双轨共享**；vue 轨 api.ts/types.ts 保留（作为 vue 端实现，不再"切换消费"——Phase 2 原目标的"单一真源 .at 化"修正为"单一接口 + 双实现"，musk 037 ports 精神）。chain 前提已实证：store handler 的读取模式（`r.data.modules`、`e.atom.value` 链式直读）在 vm 全部可用。
3. **入口冲突**（待 Phase 4 落定）：vue 轨 app.at 占位 vs vm 入口固定 app.at——方案：app.at 升格为真 vm shell（vue gen 多生成一个未引用的 App.vue，vue-tsc 应通过；regen 验证，不行则 regen.sh 过滤）。
4. **vue TS adapter 只映射 `json.parse/stringify`**（ts_adapter.rs:1731）——文本工具链不可跨轨，证实双实现必要性。

---

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| `X.web.at` 门控机制不适配本仓双工程结构（跨目录/双 pac） | probe V1 先行；降级 = transport 纯封装 + vue ext 中转（分叉面最小化）并登记 gap |
| VM stdlib 字符串/map 能力缺口（inferField 正则、Object.entries、动态 key 构造） | probe V3 逐项核对；缺口用循环/链式 contains 重写；真缺口登记并回报 auto-lang |
| 子 widget props/emit 在 vm 的语义与 vue 不同（vm 是同名 state 同步，非 v-model 通道） | D2 状态上提 store + 描述符值内嵌，从范式上不依赖 emit；probe V4 实测链路 |
| modal/确认层在 iced 下形态不明 | 041 popover 先例兜底；probe V4 同时验证 dialog open 绑定形态 |
| vue 轨切换 logic 消费引入回归（Phase 2 最大回归面） | e2e 四套 + 12 截图对拍门控（006 实证）；切换前后各跑一轮；分 store/分 widget 小步提交 |
| MCP 断言脆弱（快照正则、autoui_type 实参置换坑） | 断言以 model 标量为主、快照文本为辅；desktop_mcp.py 已知坑注记照搬；flake 用 wait/poll |
| Storage session 级导致主题/ack"丢失" | D7 File natives 持久化；probe V5 验证 local_data_dir 在 Windows 的实际路径 |
| iced 布局降级（无 wrap/绝对定位/margin）影响观感 | Plan 412 降级矩阵照办；本仓 flex 布局为主风险低；观感问题登记已知差异不阻塞 |
| auto-lang 上游漂移（vm 后端活跃开发中） | D10 commit 锚定 + 变更规程；vm 缺陷 workaround + gap 编号回报 |

---

## 6. 关联与后续

- **前置**：`docs/plans/archive/006-frontend-auto-ization.md`（D4/D5 规范、ext 政策、e2e 门控方法论、21 条 gotcha）。
- **方法论母本**：auto-lang `examples/ui/041-auto-edit`（vm 单widget + ui_config + desktop_mcp）、`015-notes`（store×VM + accent 动态主题）、`038-minesweeper`（双后端硬规则）、`widgets-gallery`（vm 全控件参考）；auto-musk plan 037（ports/X.web.at 目标门控）、plan 028 T21（vm 显式报错哲学）；auto-down plan 008（markdown VM 降级路径）。
- **上游锚点**：auto-lang Plan 370（store vm 支持）、Plan 412（布局降级矩阵）、Plan 443（model 深变异修复，本仓 D5 已升格规范）、Plan 402 §12.2（view-builder 四约束）。
- **后续候选**（本计划不做，完成时登记 KNOWN-DEBT）：
  - `auto build -r vm` 独立 exe 分发（a2c/ninja 链 + 安装器/自更新）；
  - `ui_config` 桌面菜单/快捷键全量接入（本计划仅可选加分项）；
  - markdown sidecar 的 vm 渲染后端（等 auto-lang 平台协议 `platform:markdown` 的 comrak 实现后回填）；
  - api.at 接入（三轨共用契约，延续 006 遗留）；
  - rust render 第三轨（vm 轨稳定后再评估）。
