---
plan_id: OS-016
status: executing
feature_name: AutoUI select 组件 vm 轨缺陷——demo 示例与上游修复契约
author: [zcode]
created_at: 2026-09-15
updated_at: 2026-09-15
plan_revision: 1
current_step: 2
total_steps: 3
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
---

# [OS-016] AutoUI select 组件 vm 轨缺陷——demo 示例与上游修复契约

## 0. 变更摘要

OS-015 修复 config 编辑器 select 行时确认：016 批注释「vm 轨 select 映射为
空壳不渲染 option 子节点」指向的是 **auto-lang 上游 AutoUI select 组件的
vm 轨缺陷**（vue 轨原生 `<select>` 一直正常）。本计划把缺陷定级、列出
独立 demo 示例（复现 + 上游修复验收载体），并给出上游修复契约。修复本体
属 auto-lang，经其自有计划体系落地。

## 1. 缺陷清单（2026-09-15 代码实证，auto-lang main 1e05b8614）

| ID | 缺陷 | 证据 | 状态 |
|---|---|---|---|
| D1 | vm view-builder **无 select 路由**——select 落 unknown fallback,快照有、渲染丢（「空壳」最初成因） | `aura_view_builder.rs:3532-3536` 注释：Plan 446 批五 U4 补 `"select" => convert_select(...)`;iced 渲染臂 `renderer.rs:4581` pick_list | **上游已修**（446 批五 U4） |
| D2 | **for 循环选项漏收**：`convert_select`（aura_view_builder.rs:9254-9272）只扫**直接** `option` Element 子节点,`AuraNode::ForLoop` 不展开——数据驱动选项（config 编辑器形态）全漏 → options=[] → pick_list 空壳 | convert_select 源码（无 ForLoop 臂）;016 批走查实况「空壳不渲染 option 子节点」 | **未修,本计划 demo 主验点** |
| D3 | **value 契约缺失**：option 只取 `text`（label）,`value:` prop 被忽略;选中态匹配 `select.value` 对比 option **文本**——value≠label 的选择无法绑定/回显 | convert_select:9258-9266（只取 text）,9277-9281（value 对 options 文本 position） | **未修** |
| D4 | **回调单串 relay**：onselect 经 `SelectCallback` 只发 `"handler⟨US⟩s⟨US⟩selected"` 单串（aura_view_builder.rs:9286-9294）,绑定参数被丢弃——无法驱动 `Apply(entry, value)` 双参处理器（config 编辑器所需形态） | convert_select 源码;config_editor.at 旧 select 臂 `onchange: .Apply(e, $event.target.value)` | **未修** |

注：vue 轨无缺陷（`ui_gen/vue.rs:12404` select 臂直出原生 select/option,
`v-for` 展开循环选项）——016 批若查此一层即可避免误判「组件不可用」。

## 2. 目标

- demo 示例独立成件：字面选项 / for 循环选项 / value≠label 三场景一屏,
  vue 轨契约经 a2vue golden 锚定,vm 轨行为修复前后可对照。
- 上游修复契约成文（D2/D3/D4 各有验收口径）,交 auto-lang 计划体系执行。

非目标：本计划不改 auto-lang 渲染器源码（上游在途工作 PLAN-632/634/635,
修复经其自有计划落地）;不改 os-config config 编辑器（OS-015 按钮组已是
当前双轨可靠形态,上游修复后可另行评估回归原生 select）。

## 3. 架构方案

- `auto-lang:examples/select_demo.at`——独立可运行 demo（照 loop_demo.at
  惯例）,三场景 + 验收口径头注。
- `auto-lang:crates/auto-lang/test/a2vue/013_select_children/`——vue 轨
  契约 golden（input.at + input.expected.vue + vue.rs 测试钩子,照 006/012
  惯例）,防上游修复期间 vue 轨回归。
- 上游修复面（供 auto-lang 计划引用,非本计划执行件）：
  convert_select 增 ForLoop 子节点展开（循环绑定内逐迭代收 option）;option
  增 value prop 通道（`View::Select` options 升 (value,label) 对,渲染器
  pick_list/回显/snapshot/vnode/gpui 各臂随动）;SelectCallback 携带绑定参
  数 relay（对齐 367 P1-4 handler 参数转发先例）。

## 4. 需求分析与背景调查

- 需求来源：用户 09-15 走查追问「select 是半成品是否 AutoUI 组件缺陷,
  缺陷是什么,需单独列 demo 解决」。
- 实证：OS-015 探针链（DOM/端点）+ auto-lang 源码读（缺陷清单 §1）;
  016 批注释为**先于 446-U4 的过时信息**——D1 已修而 D2/D3/D4 仍在,
  「空壳」主因是 D2（config 编辑器选项恰为 for 循环形态）。
- 协调约束：auto-lang main 检出有在途未提交工作（PLAN-632 gallery-demo-
  component-bridge,与 select 无关）——本计划只**新增文件**,不提交 auto-lang,
  不动其源码;提交与上游修复经 auto-lang 计划体系（.next-id 分配）。
- 本仓无 docs/specs/;select 组件契约的规范落点在 auto-lang docs/specs,
  由上游修复计划承载,本计划 §3 仅记录契约草案。

## 5. 详细设计

### demo 三场景（select_demo.at 与 golden 013 同构）

| 场景 | .at 形态 | 验收（vm 修复后） |
|---|---|---|
| S1 字面选项+value≠label | `option (value: "b", text: "Beta") {}` ×3 | 下拉 3 项,默认选中 Beta;onchange 收 "b" 非 "Beta" |
| S2 循环选项 | `for o in .providers { option (value: o.value, text: o.label) {} }` | N 项全渲染（修复前:空壳）,当前值回显 |
| S3 onchange relay | `onchange: .Pick`（单参） | 点选触发 Pick;双参 `Apply(e, v)` 形态待 D4 修复后另测 |

### 规范增量

| delta_id | add/modify/retire | docs/specs/... target | before/after rule | rationale | acceptance IDs |
|---|---|---|---|---|---|
| （无,本仓） | — | — | — | select 组件契约规范归 auto-lang docs/specs（上游修复计划承载）;本仓无规范面变化 | — |

## 6. 测试设计

- golden：`cargo test test_a2vue_select_children`（auto-lang）——vue 轨
  契约（select/option value+label、v-for 展开）锁定;首跑 mismatch 产
  input.wrong.vue,人工审后 bless 为 expected。
- vm 轨：demo 经 examples 惯例手动跑（desktop-host/发射器）;上游修复计划
  应补 convert_select 单测（ForLoop 展开/双形态/回调参数）。
- os-config 侧零改动,现有门禁不重跑。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
|---|---|---|
| AC-01 | examples/select_demo.at 在案,三场景齐备,头注含缺陷清单与验收口径 | 文件存在;内容覆盖 S1-S3 |
| AC-02 | a2vue golden 013 锚定 vue 轨契约 | `cargo test test_a2vue_select_children` 绿 |
| AC-03 | 上游修复契约成文（D2/D3/D4 验收口径） | 本计划 §1/§3;auto-lang 修复计划引用 |
| （上游）AC-U1 | vm 轨 S2 循环选项渲染 N 项 | select_demo vm 跑 + convert_select 单测（上游计划） |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（已核验） | 产出 | 验收 | 验证命令与预期 |
|---|---|---|---|---|---|---|
| T-01 | auto-lang examples/select_demo.at（S1-S3+头注） | — | `auto-lang/examples/`（loop_demo.at 惯例） | demo 件 | AC-01 | 文件在案 |
| T-02 | a2vue golden 013（input.at+expected.vue+vue.rs 钩子） | — | `auto-lang/crates/auto-lang/test/a2vue/013_select_children/`;vue.rs tests 模块（012 钩子后） | vue 契约锚 | AC-02 | `cargo test test_a2vue_select_children` 绿 |
| T-03 | 上游修复（convert_select D2/D3/D4）→ **auto-lang 计划体系** | T-01/T-02 | auto-lang aura_view_builder.rs/view.rs/iced renderer.rs 等 | vm 轨 select 可用 | AC-U1 | auto-lang 计划门禁（非本计划执行） |

## 9. 复审记录

- 2026-09-15 draft handoff（/auto-plan:new）：`stage: new`，OS-016 rev1。
  `outcome: pass`（T-01/T-02 可即执行;T-03 属上游,以 auto-lang 计划为
  owner）。`next: work`（用户已指示列 demo 解决）。

- 2026-09-15 work handoff（/auto-plan:work）：`stage: work` | `plan_id:
  OS-016` | `plan_revision: 1` | `outcome: pass`（T-01/T-02;T-03 路由上游）
  | `code_commit: 本仓 main（基于 f26f8b3）;auto-lang 侧新增文件**未提交**
  （协调约束 §10）` | `task_ids: T-01,T-02` | `evidence: ①examples/
  select_demo.at 落盘（S1-S3+缺陷清单/验收口径头注）;②a2vue golden 013
  三件套落盘,vue.rs 增 test_a2vue_select_children 钩子;首跑 mismatch 产
  input.wrong.vue——实况确认 vue 轨契约正确（字面 option 带 value+label,
  循环选项展开 v-for,o.value/o.label 绑定在）,审后 bless 为 expected,
  复跑 `cargo test -p auto-lang --lib test_a2vue_select_children`
  **1 passed**` | `blockers: 无（T-03 为上游范围,unblock=auto-lang 计划
  立项引用本计划 §1/§3）` | `next: upstream（auto-lang 计划体系）;本仓
  侧完成`。

## 10. 待澄清事项

- auto-lang main 有在途未提交工作（PLAN-632,与 select 无关）：本计划
  T-01/T-02 只新增文件、**不提交 auto-lang**——提交时机随上游修复计划
  （或用户裁定代提交）。T-03 须走 auto-lang 计划体系（.next-id 分配,
  worktree 惯例）。
- 上游修复落地后,os-config config 编辑器 select 行是否从 OS-015 按钮组
  回归原生 select 下拉,属产品裁定,另批处理。
