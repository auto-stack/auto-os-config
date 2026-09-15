---
plan_id: OS-014
status: execution_done
feature_name: 设置中心 Provider 删除按钮 lucide 图标化
author: [zcode]
created_at: 2026-09-15
updated_at: 2026-09-15
plan_revision: 1
current_step: 2
total_steps: 2
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
---

# [OS-014] 设置中心 Provider 删除按钮 lucide 图标化

## 0. 变更摘要

通用编辑器（ConfigEditor）Provider 分区头部的删除按钮，当前是红色实心方块内嵌
`🗑` emoji（config_editor.at:175，生成物 ConfigEditor.vue:517），用户 09-15 实机
走查裁定观感差。本计划将其替换为 lucide trash-2 内联 SVG 图标的 ghost 风格图标
按钮（透明底 + muted 前景，hover 转危险红），删除交互（AskDelete → 确认条）不变。

- 唯一事实源改动：`auto/src/front/config_editor.at`；生成物经
  `bash auto/gen/regen.sh` 再部署，不手改 `src/components/ConfigEditor.vue`。
- 双端覆盖：vue 轨（regen 直通）+ vm 轨（442 A4 svg 直绘已支持）。

## 1. 目标

- 删除按钮渲染为 lucide trash-2 几何的 SVG 图标，不再是 emoji 字符。
- ghost 风格：默认透明底 + `text-muted-foreground`，hover 时 `text-[#c42b1c]`
  + `bg-[#c42b1c]/10`（vm 轨无 hover 为已知 L3 残差，基础态需独立成立）。
- 删除行为、确认条文案、`.bak` 备份语义零变化。

非目标：其余按钮（确认条 Yes/Cancel、工具栏）不在本批；不引入
`lucide-vue-next` npm 依赖（用内联 svg，沿 app.at 先例）。

## 2. 架构方案

`.at` 双端共享源（vue: regen 产出；vm: 解释执行）。改动集中在
config_editor.at 的 subform-header is_provider 臂：

```
button (style: "btn danger btn-sm bg-[#c42b1c] ... text-xs h-auto", text: "🗑")
```
→
```
button (style: "ghost 图标按钮类") {
    onclick: .AskDelete(e.key)
    svg (viewBox: "0 0 24 24", style: "h-4 w-4") { path/line ×5 }
}
```

依据（背景调查实证）：
- button 子节点 + text 共存分支为上游 Plan 407 能力（a2vue golden 006
  icon_child：lucide 外部组件作 button 子节点）；本仓走更轻的内联 svg——
  app.at:116-213 已有 rect/line/circle/polyline/path 全套直通先例
  （生成物 src/App.vue:238 path 直通验证）。
- vm 轨 svg 子树经 `convert_svg_image` 序列化直绘（aura_view_builder.rs:3219，
  Plan 442 A4），currentColor 跟随文字色类。
- `bg-primary/10` 形态的 alpha 后缀类 app.at:115 在用，`hover:bg-[#c42b1c]/10`
  解析无新风险。

lucide trash-2 几何（24×24, stroke 2, round cap/join, currentColor）：
`path M3 6h18`；`path M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`；
`path M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`；`line 10,11→10,17`；`line 14,11→14,17`。

## 3. 技术栈

- 源：auto-lang `.at` DSL（auto/src/front/config_editor.at）
- 再生成：`bash auto/gen/regen.sh`（auto.exe --gen-only → sed 部署 → src/）
- 门禁：`npm run build`（vue-tsc + vite）+ generic-editor/collection-editor/
  theme-switch 三套件 + e2e-vm（vm 轨回归）

## 4. 需求分析与背景调查

- 需求来源：用户 2026-09-15 截图走查（设置中心 → Local provider 分区头部，
  红色 🗑 方块按钮），裁定「删除按钮比较丑，请换成 lucide 的 icon」，并指示
  「记录到计划文件里去，再实施」——同消息内已授权记录与实施。
- 授权范围：本仓（auto-os-config）前端 .at 源 + regen 再部署 + 门禁验证；
  不涉及其它仓库、不涉后端。
- 现状证据：
  - `auto/src/front/config_editor.at:175-177` 唯一事实源按钮；
  - `src/components/ConfigEditor.vue:517` 生成物现状（与 .at 同步，016 走查
    批 918b4d6 后无漂移）；
  - `AskDelete` → `confirm_del` 确认条链路在 .at:153-164/723，不在改动面。
- 本仓无 `docs/specs/`（规范权威缺位，沿用 plans + KNOWN-DEBT 台账惯例）；
  本改动为纯展示层，无行为/接口/投影词表变化，故无规范增量（见 §5 表）。

## 5. 详细设计

按钮类变更（唯一任务改动点）：

| 项 | before | after |
|---|---|---|
| 形态 | 红实心块 `bg-[#c42b1c] text-white px-2 py-0.5` + `🗑` 字符 | ghost 图标钮 `h-7 w-7 p-1 rounded-md border-0 bg-transparent text-muted-foreground hover:text-[#c42b1c] hover:bg-[#c42b1c]/10 flex items-center justify-center` |
| 内容 | text: "🗑" | 子节点 svg（trash-2 五笔划，`h-4 w-4`） |
| 交互 | `onclick: .AskDelete(e.key)` | 不变 |

设计取舍：
- 默认态 muted 灰而非常红：与分节标题 `text-muted-foreground` 同层，常态
  不抢视觉；危险意图由 hover 红 + 确认条兜底表达（GitHub/shadcn danger-ghost
  惯例）。vm 轨无 hover 残差下基础态仍完整可辨（图标即删除语义）。
- 不加 aria-label/title：.at button 未见 title 属性直通先例，emoji 原状亦无；
  不在本次扩大上游面。

### 规范增量

| delta_id | add/modify/retire | docs/specs/... target | before/after rule | rationale | acceptance IDs |
|---|---|---|---|---|---|
| （无） | — | — | — | 本仓无 docs/specs/；纯展示层改动，不新增/修改任何投影字段、动词、store 接口或视图词表（svg 为 442 A4 既有直通能力），无规范面变化 | — |

## 6. 测试设计

- 再生成门禁：regen.sh 编译告警/解析错误即 abort（脚本内建 grep 门）；
  diff 检查 `src/components/ConfigEditor.vue` 仅删除按钮一处变化（无意外
  漂移再部署）。
- vue 轨：`npm run build` 绿；`node test-generic-editor.mjs`（toggle/编辑器
  契约同族，覆盖 ConfigEditor 渲染路径）；collection-editor/theme-switch
  两套件照跑防连带回归。
- vm 轨：`node scripts/e2e-vm.mjs`（svg 直绘 + 模块页渲染断言；基线 18 断言）。
- 人工走查：设置中心任一 provider 分区头部目检 ghost 图标钮（双主题）。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
|---|---|---|
| AC-01 | Provider 分区头部删除按钮渲染为 lucide trash-2 线性图标（非 emoji 字符） | regen 后 grep 生成物 ConfigEditor.vue：含 `<svg viewBox="0 0 24 24"` + trash-2 path，无 `🗑`；npm run build 绿 |
| AC-02 | 点击图标仍走 AskDelete 确认链路 | e2e/generic-editor 套件 PASS；生成物按钮 `@click="AskDelete(...)"` 在位 |
| AC-03 | ghost 样式生效（透明底/muted 前景/红色 hover 类在位） | 生成物按钮 class 含 `bg-transparent text-muted-foreground hover:text-[#c42b1c]`；截图目检 |
| AC-04 | vm 轨零回归 | e2e-vm 断言全 PASS（基线 18） |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（已对仓核验） | 产出 | 验收 | 验证命令与预期 |
|---|---|---|---|---|---|---|
| T-01 | config_editor.at 删除按钮换 lucide trash-2 svg（ghost 类） | — | `auto/src/front/config_editor.at:175-177`（AskDelete 臂） | .at 源更新 | AC-01/03 | grep 无 `text: "🗑"`；含 trash-2 path |
| T-02 | regen 再部署 + 全门禁 | T-01 | `auto/gen/regen.sh` → `src/components/ConfigEditor.vue:517` 一带；`package.json` scripts | 生成物同步、门禁绿 | AC-01/02/03/04 | `bash auto/gen/regen.sh` 无告警；`npm run build` 绿；generic-editor/collection-editor/theme-switch PASS；`node scripts/e2e-vm.mjs` 全 PASS |

执行勾稽（2026-09-15）：

- [x] T-01 ✅ config_editor.at按钮臂重写为 trash-2 svg ghost 钮（五笔划
  path/line，`h-4 w-4 shrink-0`；按钮类 `btn h-7 w-7 p-1 border-0 rounded-md
  bg-transparent text-muted-foreground hover:text-[#c42b1c]
  hover:bg-[#c42b1c]/10 flex items-center justify-center`）。
- [x] T-02 ✅ regen REGEN OK（8 组件 5 store，无编译告警）；生成物
  ConfigEditor.vue diff 仅删除按钮一处（`<svg viewBox="0 0 24 24">` + 5 笔划
  + `@click="AskDelete(e.key)"` 在位，无 `🗑` 残留）。门禁：`npm run build`
  绿（vue-tsc+vite 1.49s）；generic-editor / collection-editor /
  theme-switch 三套件 PASS；`scripts/e2e-vm.mjs` 全断言 PASS（VM E2E
  PASSED，含 Test connection roundtrip/accent 持久化/collection 编辑链）。

## 9. 复审记录

- 2026-09-15 draft handoff（/auto-plan:new）：`stage: new`，OS-014 rev1。
  `outcome: pass`——任务/验收齐备，路径与命令均经仓库实证（button 子节点
  Plan 407、svg 双端直通 442 A4、`/10` alpha 类在用先例）。用户同消息授权
  记录+实施，`next: work`（无待澄清阻塞）。

- 2026-09-15 work handoff（/auto-plan:work）：`stage: work` | `plan_id:
  OS-014` | `plan_revision: 1` | `outcome: pass` | `code_commit: 本仓 main
  （基于 918b4d6）` | `task_ids: T-01,T-02` | `evidence: §8 执行勾稽——
  regen OK/build 绿/三套件 PASS/e2e-vm 全 PASS，改动面仅 config_editor.at +
  ConfigEditor.vue` | `blockers: 无` | `next: review`。

## 10. 待澄清事项

（无）——样式方向（ghost + 红 hover）为既有走查裁定语境下的标准做法，
如用户实机走查后另有偏好（如常红描边钮），按复审流程修订 rev2。

### 执行期发现（非阻塞，归属他计划）

regen 全量再部署时暴露**预存的源/产物滞后**：HEAD 的 `app.at` 已含 OS-013
AutoTerm 集成臂（Tick 转发/AutoTermPage/自动概要装载），但签入的
`src/App.vue` 停在 Plan 559 时代、`AutoTermPage.vue`/`useAutoTermStore.ts`
未签入，且宿主树缺 `Term` 类型绑定（部署即 vue-tsc TS2304）。本计划将
regen 带出的三处 AutoTerm 产物还原/移除，保持签入构建绿；OS-013 vue 轨
收口时应整批再部署并补 `Term` 绑定。
