---
plan_id: PLAN-011
status: executing
feature_name: os-config-daemon Auto 版——外部 back 形态改造
author: [zcode]
created_at: 2026-08-28T18:30:00+08:00
updated_at: 2026-08-29T00:40:00+08:00

# Leave these EMPTY here — /auto-plan:review fills them:
supersedes_spec_components: []
new_spec_components: []
touched_goals: []

current_step: 11
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

- [x] T1 (P0) 双形态 POC:①在 `auto-os-config-back/` 落 015-notes 式最小 `#[api]`
  端点(`hello` + 读 `~/.config/autoos` 下一文件名)——验证 pac.at `back:` 接线、
  vue 模式(后端起 HTTP,前端 use back.api 拿到值)、vm merged 直调三条路径;②同款
  端点以 auto-ai-daemon 式(axum main + .at 逻辑)复现一次。产出:形态裁决记录
  (三路径 × 两形态对照表),入本文件复审记录。
  验证:两形态各自的 hello 端点在三路径下返回一致值;裁决记录提交。
  [✅ 已完成] 三路径×两形态实证完毕:形态b(桥)三路全通(poc-t1-verify PASS 双形态
  merged + axum bin curl 双端点);形态a merged ✅ / HTTP ❌(生成器骨架局限)。裁决:
  采形态 b,对照表与证据见复审记录 §T1;产物 commit 于 plan-011-dev
  (auto-os-config-back/ + examples/poc-hello/ + scripts/poc-t1-verify.mjs)。

### 阶段 1 · 骨架与 system_info

- [x] T2 (S1) 项目骨架:按 T1 裁决形态落 `auto-os-config-back/`（Cargo/pac.at/api.at
  契约层——从前端 api.at 反向提取 56 fn 签名，未迁移端点 stub 返回
  `{"error":"not-migrated"}`）+ os-config 前端 `auto/pac.at` 增 `back: { project }`。
  验证:`auto run` 双模式起，前端 boot 不因 back 切换报错（stub 端点可见）。
  [✅ 已完成] api.at 56 fn 落成(12 I/O fn 契约形状 stub);pac.at back: 接线。
  vm:external backend linked+loaded + boot 零报错 + error:"not-migrated" 可见;
  vue:regen 零意外 diff + e2e.sh ALL PASS。commit d5bdd54(plan-011-dev)。
- [x] T3 (S2) `system_info` 端点:sys.at/env.at 取 OS 版本/主机名/CPU（PROCESSOR_IDENTIFIER）
  + sys native 能力内的 MEM/存储（缺则字段登记 "n/a"）;实现 + 单测。
  验证:`curl /api/system-info`（vue 模式）与 vm 直调均返回字段齐全的 JSON。
  [✅ 已完成] Rust 单实现双传输(桥+axum):env 取 hostname/cpu,Windows API 取
  os 版本/内存/存储(待澄清#3 方案①,RtlGetVersion/GlobalMemoryStatusEx/
  GetDiskFreeSpaceExW);单测 2 绿;curl 全字段实值;vm 直调 hostname=VISUS。
  commit f0e01aa。

### 阶段 2 · 端点分组移植

- [x] T4 (M1) registry/modules 组:`/api/modules`（registry.rs 615 行的只读部分先行）。
  验证:前端 boot 侧栏 7 模块渲染（e2e-vm `modules loaded (7)`）。
  [✅ 已完成] registry.rs/config_root.rs 移植,core::modules_json 单实现双传输
  (桥 fetchModulesRaw + GET /api/modules);cargo test 16 绿;curl 7 模块同字段;
  vm 直调侧栏 7 模块渲染零 HTTP(e2e-vm 同口径断言)。
- [x] T5 (M2) config get/put 组:config_root 移植 + `/api/config/:id`。
  验证:test-generic-editor.mjs 全绿（AI Daemon 表单读写回环）。
  [✅ 已完成] project.rs(518 行含测试)移植;core::get/put/delete_block 单实现
  双传输(桥 fetchConfigSafe/putConfigSafe/deleteBlockSafe + GET/PUT
  /api/config/:id + DELETE blocks/:name);cargo test 30 绿;新 back 上 :17701 跑
  test-generic-editor:14 项功能断言全绿(save 落盘/.bak/dirty 回环)。套件残留
  404 console error = T6 collection / T7 enums+action 未移植端点(预期,计划
  分组推进的自然中间态),套件全绿在 T7 收口。
- [x] T6 (M3) collection CRUD 组:collection.rs 429 行（entity/sidecar/.bak）。
  验证:test-collection-editor.mjs 全绿（roles 增删改查回环）。
  [✅ 已完成] collection.rs 移植为纯核心函数(解析器/校验/测试逐字保留),
  7 个前端契约载荷桥 + 全 CRUD 路由;cargo test 37 绿(roles 回环/skills
  frontmatter/create-delete 新增);新 back :17701 跑 test-collection-editor
  13 项功能断言全绿(含 soul sidecar 与 skills 只读面;404 残留当时为 T7 端点)。
- [x] T7 (M4) enums + action 组:`/api/enums/*` + `/api/action/test-daemon` + health。
  验证:test-theme-switch.mjs 全绿 + e2e-vm `Test connection roundtrip`。
  [✅ 已完成] core::enum_* + health + test_daemon_proxy(aaid 代理,裸 TcpStream
  同步 HTTP);桥 loadEnum(url 语义分派)/testDaemon;cargo test 38 绿;修复 T6
  注入的 5 处 doc 行缺 /// 解析错误(上游多字节 span panic 掩盖,auto trans 定位);
  vue 三套件对新 back :17701 全绿(32 断言含 no console errors);e2e-vm 数据面
  全通(modules 7/collection/field edit+save 首次 PASS),残留 2 FAIL = 待澄清#5
  上游 press 派发间歇(group collapse 运行间翻转/test connection 字段冲突),
  非数据层回归——e2e-vm 断言留待用户裁决(见待澄清#5 处置)。

### 阶段 3 · 接线与切换

- [x] T8 (W1) 双模式启动固化:vue 模式启动脚本（后端 HTTP 服务拉起）+ vm 模式
  merged 直调确认;端口策略定案并写入 auto/README。
  验证:两条启动路径各跑一遍 e2e 对应轨全绿。
  [✅ 已完成] 端口沿用 17701 定案;e2e.sh 服务源切至 auto-os-config-back(冷起
  自建自启验证 32 断言 ALL PASS);auto/README 双模式启动章节;vm merged 直调
  多轮实证(链接+cdylib 装载+桥直调)。
- [x] T9 (W2) plan010 T18 概要页接 `system_info` 真数据（vue-first）。
  验证:概要页信息卡双端渲染一致;plan010 双门禁绿。
  [✅ 已完成] App 直调形态 sys_* 字段 + overview-info 卡;Rust 侧加
  memory_display/storage_display 预格式串(绕 VM __json_object 浮点字段 Dot
  读上游缺陷,登记);vm MCP 实证真值上卡;vue regen+Playwright 同值渲染;
  e2e.sh ALL PASS。
- [x] T10 (W3) 全链切换:e2e 双门禁（scripts/e2e.sh 三套件 + e2e-vm 15 断言）在新
  后端上连续两遍全绿;known 残差清单复核（U1/U8 等在新后端下的表现）。
  验证:两遍全绿输出存档本文件。
  [✅ 已完成,带登记偏差] vue 双门禁:连续两遍 ALL PASS(32 断言,新 back 为
  :17701 服务源)。e2e-vm:连续两遍一致 15/17——数据面断言全绿(modules 7/
  collection/field edit/save);2 FAIL(group collapse、test connection)=
  待澄清#5 上游 press 派发间歇 + MCP 字段名冲突,先于本计划存在(pristine
  main 复现)。严格 e2e-vm 双遍全绿待用户裁决(见待澄清#5);残差复核:
  U1/U3 表现与 plan010 台账一致,新后端未引入新残差。
- [ ] T11 (W4) `backend/` 退役归档（archive/）+ README/KNOWN-DEBT 同步 + 计划收尾。
  验证:仓库无 backend/ 活代码引用;文档三处同步。

## 复审记录

（/auto-plan:review 回填）

### T1 形态裁决记录(执行期产出,2026-08-28)

**裁决:采形态 b(axum main + .at 混编桥,auto-ai-daemon/musk 式)。** 待澄清事项 1 的
默认采 a 条款不触发——形态 a 三路径未全通(HTTP 面失败,证据见下)。

三路径 × 两形态对照表:

| 路径 | 形态 a(#[api] 自动路由,015-notes 式) | 形态 b(axum main + 桥,auto-ai-daemon 式) |
|---|---|---|
| 1. pac.at `back:` 接线 | ✅ `external backend linked + loaded`(cdylib 空注册) | ✅ 同左(cdylib 注册 hello/config_probe) |
| 2. vue 模式 HTTP | ❌ `auto run --no-merge --server=rust` 生成 `poc-hello-back`:无 db.at 时只出骨架 stub(`// TODO: Implement`)且 main.rs 硬编码 `use api::Db` 编译失败;生成物落 auto-lang 共享 workspace(跨仓耦合) | ✅ crate 自带 axum bin,AUTOOS_BACK_PORT=17901 curl `/api/hello`→`"poc-hello"`、`/api/config-probe`→`"ai-daemon.at:ok"` |
| 3. vm merged 直调 | ✅ AUTOOS_BACK_BRIDGE=0 空注册 → has_host_calls()=false → #[api] 裸调用 VM 解释函数体(Env.get/File.read_text natives),零 HTTP | ✅ 桥注册 → #[api] 裸调用改写 auto.host.call → cdylib Rust 实现,零 HTTP |

证据(均可复跑):

- `node scripts/poc-t1-verify.mjs`(AUTOOS_BACK_BRIDGE=0/1 双态):MCP 读探针模型
  `hello_val="poc-hello"`、`probe_val="ai-daemon.at:ok"`,PASS;
  boot proof 行:external backend linked/loaded + cdylib 注册日志。
- 形态 a HTTP 失败现场:`/tmp` 已弃,生成物在
  `auto-lang/examples/rust-workspace/poc-hello-back/`(api.rs 全 TODO handler,
  cargo build E0432 unresolved import `api::Db`)。

裁决依据(超出三路径表的机制面):

1. **vue 轨的服务形态不变**:os-config vue 轨是仓内 npm/vite + 手写 `src/lib/api.ts`
   → HTTP :17701,`auto run` 的生成式编排(start_api_server → auto-lang 共享
   workspace)不在其启动模型内;新后端必须是一个可 `cargo run` 的自治 daemon——
   即形态 b 的 crate 形态(等价现 backend/,e2e.sh 无缝换源)。
2. **单实现双传输**:形态 b 中 axum bin 与 cdylib 桥共享同一 Rust 端点核心,
   vue(HTTP)与 vm(进程内)语义天然一致;形态 a 的 .at 函数体与 HTTP 实现是
   两份逻辑,漂移风险高。
3. **#[api] 注解保留但职责变为机器可读契约**:注解驱动桥注册名与未来工具链
   (a2r/LSP),不再承诺「自动路由出生产服务器」。
4. **形态 a 的解释路径不废弃**:未注解的纯 .at 辅助 fn 在 merged 模式恒走 VM 解释
   (codegen 只改写 #[api] 裸调用),「逻辑 .at 化」按 fn 逐个推进;涉 Rust 能力
   (auto-atom 解析 .at 配置)的端点经桥进入 Rust。
5. 残差:路径 2 的「前端拿到值」本次以 HTTP 契约层(curl)为证;真实前端全链
   (api.ts → 新后端)由 T8/T10 的 e2e 双门禁闭合——与计划分阶一致。

POC 产物(commit 于 plan-011-dev):`auto-os-config-back/`(pac.at + api.at 契约 +
Cargo crate:cdylib 桥 lib.rs / axum bin main.rs)、`examples/poc-hello/`(三路径
探针,T2 骨架模板)、`scripts/poc-t1-verify.mjs`(merged 轨验证器)。

## 待澄清事项

1. **形态 a/b 的裁决权**:T1 POC 若两形态三路径全通，默认采 a（#[api] 自动路由，
   逻辑层独立 db.at 式文件，与 015-notes/前端消费面最贴近）;用户可否决。
   → **已裁决(2026-08-28 执行期):采形态 b**——形态 a 三路径未全通(HTTP 面失败),
   证据与对照表见复审记录 §T1。
2. **端口策略**:沿用 17701（e2e 脚本零改动）vs AUTO_HTTP_PORT 新端口（多实例隔离）
   ——T9 定，倾向沿用。
3. **MEM/存储取数**:sys.at 若无对应 native，候选:①`use.rust` 直桥 Windows API
   （GlobalMemoryStatusEx）②powershell/wmic 子进程（慢）③登记 "n/a"。T3 时按
   实测定，不预设。
4. **与 plan010 的边界**:本计划交付后端与接线;plan010 的 T18（概要页）在 T3 完成
   后即可 vue-first 推进（不阻塞于 T4-T7 的存量迁移）——两计划可并行，T9 是汇合点。
5. **[Phase 0 折叠阻塞,非本计划引入] e2e-vm「Test connection roundtrip」断言在
   今日 rebuild 的 auto-lang 二进制上不稳定**(2026-08-28):
   - 现象:三遍 e2e-vm 全在 `test connection: "loaded"` 失败(vue 轨门禁全绿;
     其余 vm 断言全过;daemon 侧 `POST /api/action/test-daemon` ~1s 返回
     `{"success":true}` 实证正常);隔离探针显示按钮 press 派发**间歇性失效**
     (同代码一会话 nav 命中、另一会话不命中;`disabled:` 绑定按钮、
     `http.post_json`、参数化 msg 按钮均单独实证正常)。
   - 关联:auto 二进制 16:08 rebuild(含 plan-451 actions DSL / 458 theme entry /
     463 shell 合入),晚于 plan010 门禁绿的时间点;auto/README 的上游锚定
     (1487b5c5d)与「rebuild 后先 vue regen+e2e 再 vm 冒烟」惯例即为此场景。
     另有 `status` 字段名冲突(DaemonView vs ConfigEditor,MCP state 按 bare
     字段名恒读 ConfigEditor 的 "loaded")使该断言判据失真——但 press 派发
     间歇失效本身即足以失败。
   - 环境噪声(已清理)::17701 曾被 plan-010-dev worktree 残留 daemon 占用
     (AddrInUse),首遍 e2e 打到 stale daemon;taskkill 后换新 build 复跑失败
     依旧,排除该混杂因素。
   - 处置(2026-08-28 修订):本计划代码(POC 为纯新增目录)不触前端/旧
     backend,失败可于 pristine main 复现——登记为上游漂移问题。原定 Phase 0
     不折叠、改按 T8/T10 汇合点重试;现按用户指示于 T5 后提前合并入 main
     (e2e-vm 门禁仍红的事实如实随行,双门禁全绿仍在 T8/T10 收口;届时若仍红,
     需用户裁决:上游回退锚定 vs e2e-vm 断言改口径)。
