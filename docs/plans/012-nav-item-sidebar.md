---
plan_id: OS-012
status: reviewed
feature_name: nav-item-sidebar
author: [zcode]
created_at: 2026-08-29
supersedes_spec_components: []
new_spec_components: []
touched_goals: []
---

# [OS-012] 侧栏换用 auto-lang Plan 482 nav 组件族

## 变更摘要
auto-lang Plan 482 落地 nav-item/nav-group/nav(search:) 双端契约组件（含
data-active 语义锚与非 shadcn 内联路径）。本计划把 auto/src/front/sidebar.at
重构到组件族上，并删除 modules_store.at 五处投影块里的 nav_class/name_class
预计算串（active 判定回归视图表达式，fa41ef5 的投影残留高亮问题根除）。
parity 台账重基线（视觉微变：选中块/搜索行/组头统一为主色调契约样式）。

## 任务
- [x] T1 sidebar.at
  [✅] 双 if Overview 块合一;nav(search:) 集成;组头 nav-group;成员 nav-item lg。：nav(search:) 集成搜索行；Overview 单条 nav-item（原双
  if 块合一）；standalone/groups 成员 nav-item(icon/label/desc/lg)；组头
  nav-group(collapsible/open/ontoggle)；保留 loading/无结果占位与搜索扁平化。
- [x] T2 modules_store.at：五处投影删 nav_class/name_class 字段与类串。
  [✅] -6.6KB;active 回归视图表达式(fa41ef5 残留高亮根除)。
- [x] T3 测试选择器更新 + README 偏差段更新。
  [✅] theme: .nav-item[data-active] .nav-name;generic/collection 沿用 .nav-name 锚(组件内建)。
- [x] T4 门禁：三套件 + e2e-vm。
  [✅] generic/collection/theme PASS;e2e-vm 全断言 PASS(含重启持久化/集合导航)。
- [x] T5 capture.mjs 双轨重基线。
  [✅] vue+vm 八视图捕获;sidebar 全窗 diff 2.1–5.0% 为新基线(PNG 不入库惯例);
  顺修 capture.mjs 就绪串(plan011 fa41ef5 改 title 未同步,vm 轨恒超时既有缺口)。

## 验收
1. e2e 三套件 + e2e-vm 17 断言全绿。
2. modules_store 投影块净减（类串删除）。
3. parity 台账重基线提交，sidebar 差异率记录。

上游依赖：auto-lang master（Plan 482，target/debug/auto 已重建）。

## 复审记录（2026-09-07，zcode，/auto-plan:review）

**载体说明**：012 实施早已折叠进 main（9ca1449，含实施提交 30617c2）；本复审按
skill 规程在主检出核验历史 diff + 重跑现行门禁。

### 验收标准逐条重验

1. **e2e 三套件 + e2e-vm 全绿 — ✅（经复审修复后现行树全绿）**
   - 复审期首跑发现主干 vue 三套件**全红**（generic/collection/theme 均超时于
     `.nav-item` 系选择器）。根因不在 012：后续 ebf0076（上游 562 迁移，直接提交、
     无本仓计划文件）把侧栏从 nav 族迁到 sidebar 族时**丢了 nav-item/nav-name
     marker 与 data-active 契约锚**，且该提交只验了 regen/build/vm 冒烟没跑三套件。
   - 复审修复（本复审提交）：①sidebar.at 按「marker 类 = 惰性测试钩子」惯例补回
     nav-item（8 支 style 串）/nav-name（4 处 label span），regen 重部署
     Sidebar.vue（diff 仅 marker 16 行）；②test-theme-switch 激活锚由
     `[data-active="true"]`（契约属性，562 后不复存在）改 `[class*="bg-primary/10"]`
     （激活分支类串子串，仅激活支含此串）；generic/collection 两套选择器
     `.nav-item .nav-name` 补锚后原样复用，零改动。
   - 修复后取证：`npm run build`（vue-tsc+vite）绿；`./scripts/e2e.sh` 三套件
     ALL E2E PASS；`node scripts/e2e-vm.mjs` 全断言 PASSED（modules 14 含
     AutoTerm，Test roundtrip status="ok"）。
2. **modules_store 投影块净减 — ✅** numstat 复核：modules_store.at +13/-81、
   useModulesStore.ts +10/-58，store 两件净减 116 行（≈6.6KB，与计划一致）；
   当前树 grep nav_class/name_class 仅余一行注释（modules_store.at:241 存档说明），
   active 判定回归视图表达式的结构性成果仍在（562 迁移延续该形态）。
3. **parity 台账重基线 — ✅** capture.mjs 就绪串修正随 30617c2 落库（plan011
   fa41ef5 既有缺口顺修，计划文本 T5 已记录非静默）；sidebar 2.1–5.0% 新基线数字
   落账于本文件 T5（PNG 不入库惯例）。注：562 迁移后视觉基线已再次漂移，属 562
   后续（见 D1），012 时点账目完整。

### 遗漏 / 延后 / workaround 猎捕

- **遗漏**：012 自身无——五任务逐一比对 30617c2 diff，全部有对应落点（双 if 合一/
  搜索集成/组头折叠/store 五处净化/选择器三件/README 偏差段/capture 顺修）。
- **延后**：无未经授权延后。
- **workaround**：012 diff 无新增 TODO/FIXME/HACK。
- **D1（外部，已修）**：562 迁移破坏 vue e2e 锚——本复审修复（见上）。侧栏视觉
  parity 基线随之过期（562 类串等值复刻自称像素近似，但无新台账），登记 KNOWN-DEBT。
- **D2（外部，登记不修，属 013 债）**：013 合并漏随行 vue 部署产物——app.at 已含
  autoterm 臂/Tick 节拍，而 src/App.vue 未重部署提交；任何 regen 都会物化出
  App.vue+AutoTermPage.vue+useAutoTermStore.ts，其中 `Term` 为无导入裸引用
  （vue-tsc 必红）。本复审将三件物化产物回退/清除以保主干 vue 门禁绿（维持 013
  合并后主干态），即 013 已登记债「vue 轨未适配」的精确化：需 Term web shim 或
  regen 排除规则，归 010 F 相/后续计划清偿。
- **D3（环境，登记）**：e2e-vm 的 Test-connection 两断言依赖 aaid（:17654）在线，
  且门禁只认 ok/fail——aaid 离线时 honest 终态 unreachable 判 FAIL（vue 侧门禁
  则容忍离线）。对照实验：干净 HEAD 同挂、aaid 拉起后全绿，非代码回归；另
  press('Test', 2000) 窗口偏紧（偶发按钮未及渲染）。登记为门禁口径债。
- 另：`Test button not found` 首败形态（按钮 2s 未现）与 aaid 无关的时序抖动，
  同记 D3。

### spec-impact 元数据

- supersedes_spec_components: []（ledger 现有条目仅 P011-*/P013-*，012 未触碰）
- new_spec_components: []（012 的结构性成果——store 投影净化/active 视图表达式/
  marker 测试锚惯例——均体现在代码与 README，无需独立 spec 组件）
- touched_goals: []（不推进 P011-2/P013-2 任一目标）

**裁定：三验收全过、012 范畴无未清事项 → status=reviewed，就绪 /auto-plan:merge。**
