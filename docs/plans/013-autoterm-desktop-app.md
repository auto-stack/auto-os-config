---
plan_id: OS-013
status: drafting
feature_name: 虚拟桌面加载 AutoTerm 复刻应用
author: [zcode]
created_at: 2026-09-07
updated_at: 2026-09-07
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

- [ ] T1 [调查/裁定] 宿主加载形态定稿:VM 轨进程内装载(桌面 iced
  运行时直渲染 `<terminal/>`,应用逻辑跑 VM)为缺省方向;at-gen 独立
  exe 形态定位为 dev harness(不进桌面)。调查 `auto run -r vm` 应用
  发现/装载管线(auto/ 工程 widget/store 模式),落执行记录。
- [ ] T2 [auto-lang] 引擎 VM 绑定面:VM ffi shim 注册最小集
  `engine_spawn/engine_write_line/engine_rows/engine_resize/
  engine_interrupt/engine_is_exited/engine_free`(内联 feed+快照,对齐
  auto-term at-gen `src/engine.rs` 语义;真彩/逐格样式面后续按需)。
  验证:auto-lang 侧 shim 单测(注册→VM 内调用→echo 往返)。
- [ ] T3 [auto-os-config] AutoTerm 应用源进桌面工程:`at/autoterm.at`
  布进 `auto/`(装载形态按 T1 裁定:拷贝或路径引用;view = `<terminal/>`
  + 模块入口,model/逻辑对齐桌面 store 惯例)。
  验证:`auto run -r vm` 装载不炸,terminal 占位渲染。
- [ ] T4 [auto-os-config] 桌面入口注册:模块导航/应用清单加 AutoTerm
  项(与 007 模块导航形态对齐)。
  验证:桌面导航见入口并可进入。
- [ ] T5 部署脚本:构建/布置 `autoterm_core.dll` + `autoterm-ctrlc.exe`
  至桌面运行目录(003 §5 契约;来源 = auto-term workspace target)。
  验证:脚本幂等,桌面进程能加载 DLL。
- [ ] T6 验收冒烟:桌面窗口开 AutoTerm 会话——echo 往返、timeout+中断
  (008 双投递)、resize;截图入 evidence;e2e-vm 既有套件零回归。
  验证:e2e-vm 全绿 + 新增 AutoTerm 冒烟断言 + 截图在案。
- [ ] T7 收账:KNOWN-DEBT-AND-RISKS 与 auto-term DEBTS 交叉更新
  (集成面遗留/新债记录);003 §5 契约执行核对。

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
