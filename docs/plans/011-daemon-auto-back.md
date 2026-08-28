---
plan_id: PLAN-011
status: drafting
feature_name: os-config-daemon Auto 版——外部 back 形态改造
author: [zcode]
created_at: 2026-08-28T18:30:00+08:00
updated_at: 2026-08-28T18:30:00+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 0
total_steps: 11
---

# [PLAN-011] os-config-daemon Auto 版——外部 back 形态改造

## 变更摘要

把 Rust 版 os-config-daemon（`backend/`，axum :17701，2173 行 / 11 端点 / 5 模块文件）改造成
**Auto 版外部 back**：Auto 语言写后端（`#[api]` 端点 + Rust 桥），作为 os-config 前端的
外部 back 项目（pac.at `back: { project }`，Plan 061 外部后端根）。承接 plan010 G 相方案
与 T18 概要页的 `system_info` 数据源。架构参考 `auto-ai` 仓 `crates/auto-ai-daemon`
（Rust daemon + `.at` 混编移植 + `use.rust` 桥的同款架构）。

## 目标

1. **Auto 版 daemon**（外部 back 项目 `auto-os-config-back/`）：契约层 `api.at`（与前端
   `use back.api:` 对接）+ 端点实现（Auto + `use.rust` 桥）；
2. **system_info 新端点**（OS 版本 / 设备名 / CPU / 内存 / 存储）——plan010 T18 概要页数据源；
3. **存量 11 端点分组移植**（config get/put、collection CRUD、enums、test-daemon、
   health、modules）——auto-ai-daemon 同款混编模式（逻辑 `.at` 化，Rust 能力 `use.rust` 桥）；
4. **pac.at 接线 + 双模式启动**：vue 模式 = 后端起 Rust 版 HTTP 服务（等价现 daemon）；
   vm 模式（merged）= 前端进程内直调后端代码（零 HTTP）；
5. **Rust daemon 退役**：os-config 双轨 e2e 全链在新后端绿后归档 `backend/`。

## 架构方案

```
os-config-front/ (现 auto/)                      auto-os-config-back/ (新)
  pac.at ── back: { project } ──────────────▶     pac.at
  use back.api: fns ──契约──▶  api.at（契约层）      api.at（#[api] 端点实现）
  vue 模式：back 起为 Rust HTTP 服务（axum，等价现 daemon :17701）
  vm  模式：merged——前端进程内直调 api.at fn（零 HTTP）
```

- 架构参考（按证据强度）:
  - `auto-ai/crates/auto-ai-daemon`：Rust daemon + `.at` 混编移植（config.at 头注
    "Auto port of src/config.rs"）；`use.rust std::path::PathBuf / dirs` 直桥 Rust；
  - `auto-lang/examples/ui/015-notes/src/back/api.at`：`#[api(method, path)] pub fn`
    端点 + `db.at` 逻辑层（Auto 写后端的完例）;
  - `auto-lang/examples/rust-workspace/015-notes-back`：axum + AUTO_HTTP_PORT 的
    Rust HTTP 服务形态（vue 模式的服务化参考）;
  - Plan 061（auto-lang lib.rs:2347）：pac.at `back: { project }` 外部后端根，
    `back.*` 模块解析映射到后端项目（契约与桩由后端项目拥有，链接式引用）。
- 形态抉择（T1 POC 定）：a) `#[api]` 端点自动路由（015-notes 式）vs b) axum main +
  `.at` 逻辑（auto-ai-daemon 式）——裁决标准：「pac.at back: 接线 + vue 模式 HTTP +
  vm merged 直调」三条路径在最小端点上的实证结果。

## 技术栈

- Auto（`.at`：端点/逻辑层）+ `use.rust` 桥（std / dirs / 系统能力）；
- Rust 服务形态：axum + tokio（015-notes-back 同款）；
- 现前端消费面不变：`use back.api:` 导出行逐字保留（契约稳定）。

## 需求分析与背景调查

os-config-daemon 现状（`backend/src/`，2173 行）:

| 文件 | 行数 | 职责 |
|---|---|---|
| main.rs | 590 | 11 路由 + 启动 + CORS |
| registry.rs | 615 | 模块 registry（builtin + 用户覆盖，kind/file/collection 判定） |
| project.rs | 518 | 项目/路径解析 |
| collection.rs | 429 | 集合 CRUD（entity 文件 + sidecar + .bak） |
| config_root.rs | 21 | `~/.config/autoos` 根解析（硬编码，已知限制） |

端点清单（11）: `/api/modules`、`/api/config/:module_id`(GET/PUT)、`/api/collection/:mid`
(GET/POST)、`/api/collection/:mid/:name`(GET/PUT/DELETE)、`/api/enums/tiers`、
`/api/enums/dir/:kind`、`/api/action/test-daemon`(POST)、`/api/health`。
数据流:全部读写 `~/.config/autoos/*.at`（文件 IO + .at 解析）。

消费方:前端 `use back.api:` 56 个 fn（api.at 配方层，vm in-process 打 HTTP；vue 端
`src/lib/api.ts` 手写 transport）——**契约（fn 签名与语义）必须逐字稳定**。

## 详细设计

### 阶段 0 · 形态 POC（T1，裁决 a/b）

最小端点（`hello` + 文件读一个）分别在两形态落地，各验证三条路径（back: 接线、
vue 模式 HTTP、vm merged 直调）。POC 产物即 T2 骨架的模板。

### 阶段 1 · 骨架与 system_info（T2/T3）

`auto-os-config-back/`：Cargo crate（auto-ai-daemon 布局）+ `pac.at` + `api.at`
（契约层：**从前端 api.at 的 56 fn 反向提取签名**，先只实现 system_info + health，
其余端点 stub 返回 `{"error":"not-migrated"}`）；`system_info` 用 sys.at/env.at
native 取数（OS/主机名/CPU env 变量 + sys native；MEM/存储按 sys.at 能力定，
缺则登记）。

### 阶段 2 · 契约对接（T8 前置）

os-config 前端 `auto/pac.at` 增 `back: { project }` 指向新后端;`use back.api:` 解析
切换到外部 back（本地 `auto/src/back/api.at` 的 HTTP 配方层**退役**——它的存在理由
就是等这一刻）。

### 阶段 3 · 端点分组移植（T4-T7）

顺序按依赖与风险:**registry/modules（只读）→ config get/put → collection CRUD →
enums/action**。每 fn 的移植模式:逻辑 `.at` 化（auto-ai-daemon config.at 同款），
Rust 依赖 `use.rust` 桥;文件 IO 保持 `~/.config/autoos` 根（config_root 21 行随之移植）。
每组移植 = fn 实现 + 前端回归（`use back.api:` 零改动 = 契约稳定的直接证据）。

### 阶段 4 · 双模式与切换（T9/T10/T11）

vue 模式:后端起 Rust HTTP 服务（端口策略:沿用 17701 或 AUTO_HTTP_PORT，T9 定）;
vm 模式:merged 直调。e2e 双门禁（scripts/e2e.sh 三套件 + e2e-vm 15 断言）全链在新
后端绿 → `backend/` 归档退役。

## 测试设计

- 既有回归即迁移判据:scripts/e2e.sh（vue 28 断言）+ e2e-vm（15 断言）——前端
  零改动通过 = 契约稳定;
- system_info 端点:单测（字段齐全/类型）+ 概要页渲染对照;
- 每组端点移植后跑对应前端套件（test-generic-editor/test-collection-editor/
  test-theme-switch 对应 config/collection/theme 面）。

## 验收标准

- G1:形态 POC 三路径实证通过（形态 a/b 裁决有据）;
- G2:`system_info` 端点在双模式下返回真实系统信息，plan010 T18 概要页渲染;
- G3:11 端点全部在新后端实现，前端 `use back.api:` 导出行与 `src/lib/api.ts`
  语义零改动，e2e 双门禁全绿;
- G4:双模式启动可用（vue=HTTP 服务 / vm=merged），pac.at `back:` 接线生效;
- G5:`backend/` 退役归档，README/KNOWN-DEBT 同步。

## 执行步骤

> 载体:worktree `.worktrees/plan-011-dev`（/auto-plan:work 创建）。

### 阶段 0 · 形态 POC

- [ ] T1 (P0) 双形态 POC:①在 `auto-os-config-back/` 落 015-notes 式最小 `#[api]`
  端点（`hello` + 读 `~/.config/autoos` 下一文件名）——验证 pac.at `back:` 接线、
  vue 模式（后端起 HTTP，前端 use back.api 拿到值）、vm merged 直调三条路径;②同款
  端点以 auto-ai-daemon 式（axum main + .at 逻辑）复现一次。产出:形态裁决记录
  （三路径 × 两形态对照表），入本文件复审记录。
  验证:两形态各自的 hello 端点在三路径下返回一致值;裁决记录提交。

### 阶段 1 · 骨架与 system_info

- [ ] T2 (S1) 项目骨架:按 T1 裁决形态落 `auto-os-config-back/`（Cargo/pac.at/api.at
  契约层——从前端 api.at 反向提取 56 fn 签名，未迁移端点 stub 返回
  `{"error":"not-migrated"}`）+ os-config 前端 `auto/pac.at` 增 `back: { project }`。
  验证:`auto run` 双模式起，前端 boot 不因 back 切换报错（stub 端点可见）。
- [ ] T3 (S2) `system_info` 端点:sys.at/env.at 取 OS 版本/主机名/CPU（PROCESSOR_IDENTIFIER）
  + sys native 能力内的 MEM/存储（缺则字段登记 "n/a"）;实现 + 单测。
  验证:`curl /api/system-info`（vue 模式）与 vm 直调均返回字段齐全的 JSON。

### 阶段 2 · 端点分组移植

- [ ] T4 (M1) registry/modules 组:`/api/modules`（registry.rs 615 行的只读部分先行）。
  验证:前端 boot 侧栏 7 模块渲染（e2e-vm `modules loaded (7)`）。
- [ ] T5 (M2) config get/put 组:config_root 移植 + `/api/config/:id`。
  验证:test-generic-editor.mjs 全绿（AI Daemon 表单读写回环）。
- [ ] T6 (M3) collection CRUD 组:collection.rs 429 行（entity/sidecar/.bak）。
  验证:test-collection-editor.mjs 全绿（roles 增删改查回环）。
- [ ] T7 (M4) enums + action 组:`/api/enums/*` + `/api/action/test-daemon` + health。
  验证:test-theme-switch.mjs 全绿 + e2e-vm `Test connection roundtrip`。

### 阶段 3 · 接线与切换

- [ ] T8 (W1) 双模式启动固化:vue 模式启动脚本（后端 HTTP 服务拉起）+ vm 模式
  merged 直调确认;端口策略定案并写入 auto/README。
  验证:两条启动路径各跑一遍 e2e 对应轨全绿。
- [ ] T9 (W2) plan010 T18 概要页接 `system_info` 真数据（vue-first）。
  验证:概要页信息卡双端渲染一致;plan010 双门禁绿。
- [ ] T10 (W3) 全链切换:e2e 双门禁（scripts/e2e.sh 三套件 + e2e-vm 15 断言）在新
  后端上连续两遍全绿;known 残差清单复核（U1/U8 等在新后端下的表现）。
  验证:两遍全绿输出存档本文件。
- [ ] T11 (W4) `backend/` 退役归档（archive/）+ README/KNOWN-DEBT 同步 + 计划收尾。
  验证:仓库无 backend/ 活代码引用;文档三处同步。

## 复审记录

（/auto-plan:review 回填）

## 待澄清事项

1. **形态 a/b 的裁决权**:T1 POC 若两形态三路径全通，默认采 a（#[api] 自动路由，
   逻辑层独立 db.at 式文件，与 015-notes/前端消费面最贴近）;用户可否决。
2. **端口策略**:沿用 17701（e2e 脚本零改动）vs AUTO_HTTP_PORT 新端口（多实例隔离）
   ——T9 定，倾向沿用。
3. **MEM/存储取数**:sys.at 若无对应 native，候选:①`use.rust` 直桥 Windows API
   （GlobalMemoryStatusEx）②powershell/wmic 子进程（慢）③登记 "n/a"。T3 时按
   实测定，不预设。
4. **与 plan010 的边界**:本计划交付后端与接线;plan010 的 T18（概要页）在 T3 完成
   后即可 vue-first 推进（不阻塞于 T4-T7 的存量迁移）——两计划可并行，T9 是汇合点。
