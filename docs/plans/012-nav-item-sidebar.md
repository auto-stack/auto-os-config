---
plan_id: OS-012
status: executing
feature_name: nav-item-sidebar
author: [zcode]
created_at: 2026-08-29
---

# [OS-012] 侧栏换用 auto-lang Plan 482 nav 组件族

## 变更摘要
auto-lang Plan 482 落地 nav-item/nav-group/nav(search:) 双端契约组件（含
data-active 语义锚与非 shadcn 内联路径）。本计划把 auto/src/front/sidebar.at
重构到组件族上，并删除 modules_store.at 五处投影块里的 nav_class/name_class
预计算串（active 判定回归视图表达式，fa41ef5 的投影残留高亮问题根除）。
parity 台账重基线（视觉微变：选中块/搜索行/组头统一为主色调契约样式）。

## 任务
- [ ] T1 sidebar.at：nav(search:) 集成搜索行；Overview 单条 nav-item（原双
  if 块合一）；standalone/groups 成员 nav-item(icon/label/desc/lg)；组头
  nav-group(collapsible/open/ontoggle)；保留 loading/无结果占位与搜索扁平化。
- [ ] T2 modules_store.at：五处投影删 nav_class/name_class 字段与类串。
- [ ] T3 测试选择器更新（.nav-item.active .nav-name → data-active 锚）+
  auto/README 偏差段更新。
- [ ] T4 门禁：./scripts/e2e.sh 三套件 + node scripts/e2e-vm.mjs。
- [ ] T5 capture.mjs 双轨重基线。

## 验收
1. e2e 三套件 + e2e-vm 17 断言全绿。
2. modules_store 投影块净减（类串删除）。
3. parity 台账重基线提交，sidebar 差异率记录。

上游依赖：auto-lang master（Plan 482，target/debug/auto 已重建）。
