---
plan_id: OS-015
status: execution_done
feature_name: 设置中心 select 组件修复——默认 Provider/Model 行（016 走查批回归）
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

# [OS-015] 设置中心 select 组件修复——默认 Provider/Model 行

## 0. 变更摘要

用户 09-15 截图走查（AI Client 页 Default Provider / Default Model 行）裁定
「这一部分的组件也很奇怪」。实机 DOM 探针 + 端点探针定位到**两处缺陷**：

1. **前端 select 分支结构损坏**（016 批 918b4d6 引入的回归）：016 设计注释
   宣称「select 改选项按钮组」，但 `options.len() > 0` 的按钮组分支整体丢失，
   只剩**无条件**的自由文本回退 div + 提示；其内又嵌套 `options.len() == 0`
   的第二份回退 div——空候选时**双份输入框 + 双份提示**（Default Model 行
   实况），有候选时也永远降级自由文本 + 冗长提示（Default Provider 行实况）。
2. **后端 self-models 枚举不认字符串数组**：`enum_self_models_json`
   （core.rs:249）只收 `Value::Obj` 的 `id` 字段，而实机 parity 形态是
   `models : ["glm-5.3", ...]` 字符串数组（005 provider 块）——
   `GET /api/enums/self/ai-client/models/zhipu` 实测返回 `[]`，正是
   Default Model 走进空候选双渲染的根因。

修复：前端按 016 意图落地分段按钮组（toggle 同款形态，双轨可靠）+ 单一回退；
后端 `models` 双形态兼容（字符串数组 + `[{id}]` 对象数组）。

## 1. 目标

- 有候选的 select（Default Provider → zhipu/deepseek/local；Default Model →
  该 provider 的 models）渲染为分段按钮组：当前值 `bg-primary` 高亮，点选即
  Apply；当前值不在候选时追加 `(current)` 高亮钮（css-era optionValuesHave
  语义，方向取反修正）。
- 空候选 select 渲染**单份**自由文本输入 + 短提示（不再双份）。
- `models` 字符串数组与 `[{id}]` 对象数组都产出枚举（夹具两种形态都有在用）。

非目标：multiselect/tags/table 分支不动；枚举预热（warmEnums）时机不动；
不新增 npm 依赖。

## 2. 架构方案

- 前端唯一事实源 `auto/src/front/config_editor.at` select 分支重写：
  `options.len() > 0` → `row` 分段按钮组（`bg-muted p-[3px]` 容器 + 未选中
  `text-muted-foreground` / 选中 `bg-primary text-primary-foreground`，与
  toggle 开/关钮同款类，双轨已验证）；`options.len() == 0` → 单份 fallback。
  点选 `.Apply(e, o.value)`（msg 契约 `Apply(map, str)` 既有）。
- 后端 `auto-os-config-back/src/core.rs`：抽出 `enum_models_for_provider`
  纯函数（节点+provider → opts），`models` 项按
  `Obj{id}` / `Str|String|StrSlice` 双形态取值；`enum_self_models_json` 改调
  该函数。`.at` 侧无此 HTTP handler（`enumUrlOfEk`+`loadEnum` 走 HTTP 调
  Rust daemon），无需孪生改动。

## 3. 技术栈

- 前端：auto-lang `.at` + regen（`bash auto/gen/regen.sh`）+ 门禁
  （build/三套件/e2e-vm）。
- 后端：Rust（auto-os-config-back），`cargo test` 门禁（基线 40 绿）。

## 4. 需求分析与背景调查

- 需求来源：用户 2026-09-15 截图走查「这一部分的组件也很奇怪」，沿用 OS-014
  同消息工作流授权惯例（记录到计划文件，再实施）。
- 实证（2026-09-15 探针）：
  - 实机配置 `~/.config/autoos/ai-client.at`：`default_provider : zhipu`、
    `default_model : "glm-5.3"`、zhipu.models 字符串数组 2 项——**值都在**；
  - DOM 探针（playwright,localhost:17700 AI Client 页）：Default Provider 行
    =1 自由文本 input（值 zhipu 在）+1 条 "free text —…" 提示；Default Model
    行 =**2 个重复 input** + 2 条提示（"free text…" + "no options…"）；
  - 端点探针：`/api/enums/self/ai-client/providers` → 3 项正常；
    `.../models/zhipu` → `[]`（core.rs 只认 Obj.id 所致）；
  - 回归源头：016 批 diff 中 select 分支的 `options.len() > 0` select/option
    臂被删（原 7de5df2 plan009 形态），设计注释与实现脱节。
- 本仓无 `docs/specs/`；纯展示层 + 后端枚举读侧修复，无接口/投影词表变化
  （枚举端点输出形状 {value,label} 不变，只是从 [] 变为有值），无规范增量。

## 5. 详细设计

select 分支（重写后）：

```
if e.kind == "select" {
    if e.options.len() > 0 {
        row (bg-muted 分段容器, flex-wrap w-fit) {
            for o in e.options {
                选中(o.value == e.value):   bg-primary 高亮钮
                未选中:                      text-muted-foreground 钮
                onclick: .Apply(e, o.value)
            }
            if e.has_current == false && e.value != "" {
                追加高亮钮 text: e.value + " (current)"
            }
        }
    }
    if e.options.len() == 0 {
        div fallback-text { input + 短提示 "no options available (e.g. builtin-only) — type freely" }
    }
}
```

后端：

```
fn enum_models_for_provider(node, provider) -> Json(Array)   // 纯函数,单测锚
item → Obj(o)=o.get_str_of("id") | Str/String/StrSlice=s.to_string() | 其它跳过
enum_self_models_json = read_file_module → parse_root → enum_models_for_provider
```

设计取舍：
- 按钮组而非恢复 `<select>`：016 批已裁定 vm 轨 select 映射空壳不渲染
  option 子节点；分段按钮组是 016 的既定方向（注释在案），本次补齐落地。
- `(current)` 条件用 `has_current == false`（css-era 注释「不含才追加」——
  016 前 7de5df2 旧码写反为 `if e.has_current`,顺带修正）。
- 值为空串时不追加 `(current)` 钮（避免 "(current)" 空标签）。

### 规范增量

| delta_id | add/modify/retire | docs/specs/... target | before/after rule | rationale | acceptance IDs |
|---|---|---|---|---|---|
| （无） | — | — | — | 本仓无 docs/specs/；枚举端点输出形状不变（[] → 有值属修缺非改契约），视图分支为既有 kind 的渲染修复 | — |

## 6. 测试设计

- 后端单测（core.rs tests）：`enum_models_for_provider` 对字符串数组夹具
  （实机形态）产 2 项、对 `[{id}]` 夹具（project.rs 既有夹具形态）产 1 项、
  非 provider 子块不串扰。
- 后端门禁：`cargo test`（基线 40 绿 + 新增）。
- 前端门禁：regen 无告警 → `npm run build` → generic-editor /
  collection-editor / theme-switch 三套件 → `scripts/e2e-vm.mjs` 全断言。
- 实机复验（DOM 探针，可选）：AI Client 页两行变按钮组 / 单回退。注意
  常驻 daemon（:17901）为旧二进制，需重启后才吃到后端修复——交用户重启。

## 7. 验收标准

| ID | 可观察行为 | 验证方法与预期 |
|---|---|---|
| AC-01 | Default Provider 行渲染 zhipu/deepseek/local 三钮分段组，当前值高亮 | regen 后生成物含 select-group 分支；DOM 探针 3 钮 + zhipu 高亮 |
| AC-02 | Default Model 行不再双渲染；models 枚举修复后有候选 | cargo test 新单测绿；探针单 input 或按钮组 |
| AC-03 | 空候选 select 单份回退（无双 input） | 生成物 select 分支仅一份 fallback div |
| AC-04 | models 枚举端点双形态 | `cargo test` 新单测绿（字符串数组 + `[{id}]`） |
| AC-05 | 前端双轨零回归 | build 绿 + 三套件 PASS + e2e-vm 全 PASS |

## 8. 执行步骤

| ID | 任务 | 依赖 | 文件/符号（已对仓核验） | 产出 | 验收 | 验证命令与预期 |
|---|---|---|---|---|---|---|
| T-01 | core.rs models 双形态枚举（抽纯函数+单测） | — | `auto-os-config-back/src/core.rs:249` enum_self_models_json；`mod tests:367` | 后端修复 | AC-02/04 | `cargo test` 全绿（含新增 enum_models 用例） |
| T-02 | config_editor.at select 分支重写 + regen + 前端门禁 | — | `auto/src/front/config_editor.at`（select 分支）;`src/components/ConfigEditor.vue`（regen 产物） | 前端修复 | AC-01/02/03/05 | regen 无告警;build 绿;三套件 PASS;e2e-vm 全 PASS;探针复验两行形态 |

执行勾稽（2026-09-15）：

- [x] T-01 ✅ `enum_models_for_provider` 纯函数（Node+provider → opts，
  Obj{id}/Str/String/StrSlice 双形态），`enum_self_models_json` 改薄壳。
  `cargo test` **41 passed**（40 基线 + 新增
  `enum_models_for_provider_accepts_string_and_object_items`：字符串数组产
  2 项、`[{id}]` 产 1 项、provider 块不串扰）。
- [x] T-02 ✅ select 分支重写（按钮组/单回退/`(current)` 追加）；regen OK
  （AutoTerm 漂移照 OS-014 惯例还原，改动面仅 .at+ConfigEditor.vue）；
  `npm run build` 绿（1.54s）；generic-editor **PASS**（select shapes:
  provider 3 钮 / model 2 钮按钮组，default_provider 当前值 zhipu 从高亮钮
  读出；测试断言按新契约更新，替换 016 批的「永远回退」断言）；
  collection-editor / theme-switch PASS；e2e-vm **18/18 PASS**（第二跑现
  「重启失败/导航丢失」3 断言，第三跑全绿——失败点逐跑漂移，属 VM 宿主
  重启抖动已知域，与本改动无关）；DOM 探针实拍：Provider 行=分段按钮组
  （zhipu 高亮），Model 行=单回退（常驻 :17901 旧 daemon models 枚举仍空，
  重启后转按钮组）。

## 9. 复审记录

- 2026-09-15 draft handoff（/auto-plan:new）：`stage: new`，OS-015 rev1。
  `outcome: pass`——两处缺陷均探针实证（DOM + 端点），修复方案有既有先例
  （toggle 分段形态双轨、Apply(msg) 契约、project.rs Value 转换路径）。
  `next: work`（用户走查工作流已授权实施）。

- 2026-09-15 work handoff（/auto-plan:work）：`stage: work` | `plan_id:
  OS-015` | `plan_revision: 1` | `outcome: pass` | `code_commit: 本仓 main
  （基于 9482307）` | `task_ids: T-01,T-02` | `evidence: §8 执行勾稽——
  cargo test 41 绿（含新增双形态单测）/build 绿/三套件 PASS/e2e-vm 18/18
  PASS/探针实拍两行形态正确` | `blockers: 无` | `next: review`。

## 10. 待澄清事项

- 常驻 daemon（:17901）运行旧二进制：后端修复需用户重启（start-os-config.cmd）
  后实机生效（Default Model 届时由单回退转按钮组）；本计划门禁以 cargo test
  + e2e-vm 为准，不代重启。
- e2e-vm 存在 VM 宿主重启抖动（accent 持久化重启臂偶发失败，失败点逐跑漂移、
  复跑即绿），与本项目改动面无关；如频发宜另立计划查宿主重启时序。
