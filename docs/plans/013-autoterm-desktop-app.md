---
plan_id: OS-013
status: execution_done
feature_name: 虚拟桌面加载 AutoTerm 复刻应用
author: [zcode]
created_at: 2026-09-07
updated_at: 2026-09-07

current_step: 7
total_steps: 7
---

# [OS-013] 虚拟桌面加载 AutoTerm 复刻应用

## 变更摘要

AutoTerm Auto 化(PLAN-009/010,auto-term 仓)已交付复刻应用真身:
`at/autoterm.at`(App 状态机)+ auto-lang `terminal` 原生组件
(View::Terminal,VM 轨 view-builder 已接线)+ `autoterm_engine` cdylib
(12 符号 FFI 面)+ 003 §5 部署契约(含 cdylib 随包分发条)。

本计划把 AutoTerm 接入 `auto run -r vm` 虚拟桌面:桌面新增 **AutoTerm
应用入口**,进程内经 VM 轨装载 `.at` 应用、原生渲染 `<terminal/>`,
引擎经 cdylib(003 §5 部署契约)驱动。**验收 = 桌面窗口里真实开关
AutoTerm 终端会话**(echo/interrupt 冒烟 + 截图),既有桌面套件零回归。

前置事实(2026-09-07 核实):

- 桌面轨本体已在跑:Plan 007 设计定稿、008/009 view-unification 推进、
  Plan 010-vm-track-parity `executing`(e2e-vm 15/15、MCP 通道在案)——
  本计划与其**并行协调**(见待澄清①);
- `<terminal/>` 组件分发已在上游接线:auto-term PLAN-009 T2 为
  aura_view_builder 加 `"terminal"` 标签派发 + `convert_terminal`
  (auto-lang master);VM 轨渲染无需新组件工作;
- 引擎 FFI 面就绪:`crates/autoterm-core/src/ffi.rs` 12 符号
  (spawn/write_input/feed_ready/take_dirty_rows/row_text/row_style/
  cursor/resize/interrupt/is_exited/kill/free);
- **核心缺口 = 引擎的 VM 桥**:桌面 .at 应用跑在 VM 轨,VM 代码调不到
  cdylib FFI——需在 auto-lang VM ffi 面(`vm/ffi/stdlib.rs` shim 机制)
  注册 `engine_*` 绑定,这是本计划的技术主体;
- 部署件:`autoterm_core.dll` + `autoterm-ctrlc.exe` 同目录契约
  (003 §5,auto-term PLAN-010 T5 已补 cdylib 分发条)。

## 任务

- [x] T1 [调查/裁定] 宿主加载形态定稿:VM 轨进程内装载(桌面 iced
  运行时直渲染 `<terminal/>`,应用逻辑跑 VM)为缺省方向;at-gen 独立
  exe 形态定位为 dev harness(不进桌面)。调查 `auto run -r vm` 应用
  发现/装载管线(auto/ 工程 widget/store 模式),落执行记录。
  [✅ 已完成] 执行记录见文末「T1 执行记录」;三待澄清全裁定。
- [x] T2 [auto-lang] 引擎 VM 绑定面:VM ffi shim 注册最小集
  `engine_spawn/engine_write_line/engine_rows/engine_resize/
  engine_interrupt/engine_is_exited/engine_free`(内联 feed+快照,对齐
  auto-term at-gen `src/engine.rs` 语义;真彩/逐格样式面后续按需)。
  验证:auto-lang 侧 shim 单测(注册→VM 内调用→echo 往返)。
  [✅ 已完成] 依赖 worktree `.wt/auto-os-013/auto-lang`(分支
  auto-os-config-dev,commit 55c81826e):stdlib/auto/term{,.vm}.at +
  vm/ffi/term_engine.rs + native_catalog 三表 ID 2943-2949;单测
  term_engine_shims_echo_roundtrip 绿(spawn/echo 往返/resize/interrupt/
  is_exited/free)。注意:~/.auto/libs stdlib 安装副本已同步 term 双文件
  (运行期模块解析走该副本,T5 部署脚本收编)。附带发现两处上游 fn-main
  语境 VM 缺陷(嵌套 if 赋值外层变量+break 挂死;join 临时 list RC 墓碑),
  测试已绕开,登记待澄清。
- [x] T3 [auto-os-config] AutoTerm 应用源进桌面工程:`at/autoterm.at`
  布进 `auto/`(装载形态按 T1 裁定:拷贝或路径引用;view = `<terminal/>`
  + 模块入口,model/逻辑对齐桌面 store 惯例)。
  验证:`auto run -r vm` 装载不炸,terminal 占位渲染。
  [✅ 已完成] 拷贝形态(T1 裁定)落地:autoterm_store.at(TermApp 状态机
  移植;字段 term_ 前缀防裸名撞根 state——lines/status 撞 console 面实测)
  + autoterm_page.at + app.at(.Tick 200ms 根转发 + 分发臂)。上游配套
  (auto-lang 731fa57a3):convert_view_messages Terminal 显式臂(此前 VM
  动态轨落 `_ => Empty` 兜底,视口整件消失——496 MouseArea 同坑)+
  convert_terminal 堆 ListData 物化。截图实证:tmp/autoterm-smoke/
  02-echo-roundtrip.png 视口完整渲染 banner+提示符+echo 回显。
- [x] T4 [auto-os-config] 桌面入口注册:模块导航/应用清单加 AutoTerm
  项(与 007 模块导航形态对齐)。
  验证:桌面导航见入口并可进入。
  [✅ 已完成] back registry DEFAULT_REGISTRY_ATOM 加 autoterm 模块
  (view : "autoterm_page",icon ⌨️,cdylib 已重建)+ 占位
  ~/.config/autoos/apps/autoterm/config.at。smoke 断言:nav entry 可见
  + nav 进入(截图 01 侧栏选中态在案)。
- [x] T5 部署脚本:构建/布置 `autoterm_core.dll` + `autoterm-ctrlc.exe`
  至桌面运行目录(003 §5 契约;来源 = auto-term workspace target)。
  验证:脚本幂等,桌面进程能加载 DLL。
  [✅ 已完成] scripts/deploy-autoterm.sh:003 §5 同目录契约 + term 门面
  同步 ~/.auto/libs/stdlib/auto(运行期模块解析真根,find_std_lib 落点);
  来源解析 env→组兄弟→主检出;连跑两次幂等验证 ✓;桌面进程加载 DLL
  实证(handle=1 会话,smoke)。
- [x] T6 验收冒烟:桌面窗口开 AutoTerm 会话——echo 往返、timeout+中断
  (008 双投递)、resize;截图入 evidence;e2e-vm 既有套件零回归。
  验证:e2e-vm 全绿 + 新增 AutoTerm 冒烟断言 + 截图在案。
  [✅ 已完成] scripts/autoterm-vm-smoke.mjs ALL PASS(16 断言:导航/占位/
  spawn/视口流/terminal 节点/echo 往返/resize 100x30/interrupt(Control-
  Break+中文统计证据,带陈旧 vnode id press 重试)/close);截图×5 入
  tmp/autoterm-smoke/;e2e-vm 18 断言零回归(modules 14 含 AutoTerm)。
  均跑在 worktree auto(含 T2/T3 上游臂)上。
- [x] T7 收账:KNOWN-DEBT-AND-RISKS 与 auto-term DEBTS 交叉更新
  (集成面遗留/新债记录);003 §5 契约执行核对。
  [✅ 已完成] 本仓 KNOWN-DEBT +5 项(013 段:vue 轨未适配/stdlib 安装
  副本同步/陈旧 id press 竞态/宿主关闭清理观察/interrupt 击穿);auto-term
  DEBTS #9 集成面回执(其自身 worktree `.wt/auto-os-013/auto-term`
  分支 auto-os-config-dev,ec62357)。003 §5 逐条核对:①拉起=进程内
  cdylib(不适用 exe 显式路径形态)②TERM 自报(引擎内)③退出 Close=free
  ✓+直关观察项 ④中断 ✓(Control-Break+中文统计)⑤ctrlc 同目录 ✓
  ⑥cdylib 同目录 ✓+标题条款限 at-gen 独立窗(内嵌页不适用)⑦ash 门禁
  auto-term 侧不动。registry 计数锚 8→9,13/13 绿。

## 前置与依赖

- **上游**:auto-lang VM ffi shim(T2)经依赖 worktree
  (`auto-term-dev` 惯例或本仓 `.worktrees/`,执行时按 009/010 先例定);
  auto-term 侧无改动(真身/契约/部署件已就绪)。
- **并行协调**:Plan 010-vm-track-parity `executing`——T3/T4 触碰
  同一桌面工程,执行前与该轨对齐锚定纪律(010 T14b 教训:轮内 CLI
  被并行重建须重验版本锚)。
- **输入文档**:auto-term `docs/designs/003-ash-compatibility.md` §5、
  `at-gen/README.md`、`docs/plans/archived/009-autoize-phase1.md`。

## 待澄清

1. 引擎桥粒度:最小七函数 vs 全 12 符号——按桌面应用实际需要裁剪,
   样式面(row_style)待真彩场景再接;
2. 应用源归属:`at/autoterm.at` 单源在 auto-term,桌面侧拷贝或路径
   引用(装载管线能力 T1 调查后定);
3. 与 Plan 010 的协调窗口(避免同文件并行)。
4. **[T2 发现,非阻塞] auto-lang fn-main 语境两处 VM 缺陷**:①嵌套 if
   内对外层变量赋值 + 外层 loop break 的组合会挂死(T2 二分实证);②
   native 返回的临时 list 直接 `.join()` 触发 RC 墓碑(string tombstone
   access)。T3 桌面 widget 与 T6 冒烟须绕开这两形态(单层赋值/fn 封装/
   变量持有 list)。上报上游(auto-lang)另立修复,不在本计划范围。

## T1 执行记录(2026-09-07,调查/裁定)

**装载管线(auto/ 工程)**:`auto run -r vm` = merged 模式——pac.at
声明工程(`scene: ui`,CLI `-r vm` 切轨),`back: { project }` 仅链接外部
back.api + 其 cdylib;**front 视图/ store 无跨仓路径引用能力** → 待澄清②
裁定 = **拷贝**(桌面侧以 widget/store 惯例重写装载,`at/autoterm.at`
真身留 auto-term 作 a2r 语料/at-gen harness 单源)。模块发现链:back 侧
registry(DEFAULT_REGISTRY_ATOM + modules.d drop-in)→ modules_store
fetchModulesRaw → sidebar 导航 → app.at 按 `active_view_name` 分发命名
视图(Plan 551 T4 插件模式,desktop_page 先例)→ T4 沿此形态加
`view: "autoterm_page"` 模块项。

**宿主加载形态定稿**:VM 轨进程内装载可行,四要件全核实——
① `<terminal/>` VM 轨已接线(aura_view_builder convert_terminal:
key/cols/rows/lines/scroll_offset/preedit props;iced renderer 经
terminal core 注册表每帧 feed);
② **周期收割机制现成**:.at widget 声明 `.Tick` handler + model var
`interval int`(aura/extract.rs:721 → tick_interval → renderer 每 App
widget_tick 订阅,stopwatch/minesweeper 先例)——store 的 .Tick 调
`term.rows(handle)` 内联 feed+快照,免 Rust 侧泵改动;
③ 引擎桥 = T2 stdlib shim(`stdlib/auto/term.vm.at` `#[vm]` 声明 +
stdlib.rs register_shim_by_name,调用面 `use auto.term: spawn, …`),
DLL 经 libloading 运行期加载(auto-lang 已依赖 libloading 0.8,
对 auto-term 零 Cargo 依赖,无环铁律保持);
④ at-gen 独立 exe 定位 dev harness 不进桌面(003 §5 第 6 条随包分发
契约照抄:dll+ctrlc.exe 与宿主同目录)。

**待澄清①裁定**:最小七函数(spawn/write_line/rows/resize/interrupt/
is_exited/free),对齐 at-gen engine.rs 语义(句柄表+快照表+内联 feed);
row_style/cursor/kill 待真彩场景再接。
**待澄清③裁定**:Plan 010 已 19/19 execution 完结、worktree 已拆、
工作全并入 main(checkout 干净)——无同文件并行窗口,直接开工。
