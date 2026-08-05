# Plan 005: 配置架构功能对等 — 增删 provider/子节点块 + 清理 aaid 旧配置服务

> **状态**：待实施（2026-08-05 规划）
> **前置**：Plan 002（统一 daemon + 通用编辑器）、Plan 003（模块自注册）、Plan 004（架构收尾）
> **仓库**：auto-os-config（主）、auto-ai（清理 + 注释）
> **目的**：补齐新配置架构与 aaid 旧嵌入式配置服务的功能对等（增/删整个 provider 块），达到"可完全替代"后，清理 aaid 的旧配置服务残留。

---

## 0. 背景：功能对等审计结论

清理 aaid 旧配置服务前，对旧服务（`config.html` + `GET/PUT /v1/config/data`）与新架构（auto-os-config daemon + ConfigEditor）做了逐功能核查与实机验证：

| 旧功能 | 新架构 | 结论 |
|---|---|---|
| 编辑 daemon 标量 | ConfigEditor | ✅ 新更好（旧页只读，新可编辑） |
| 编辑现有 provider 字段（kind/base_url/api_key/key_env/max_concurrency/models） | ConfigEditor 子表单 | ✅ |
| API key 密码遮挡 | password input | ✅ |
| 保存 | `PUT /api/config/:id` | ✅ |
| 测试连接 | DaemonView（只测 default provider） | ⚠️ 部分 |
| **新增整个 provider 块** | **假阳性**：merge 把新对象键写成 `name : { … }` prop（内联对象），运行时 `kids_iter()` 不认 → provider 对 runtime 不可见 | ❌ |
| **删除 provider 块** | **不持久**：merge 只合并 JSON 中出现的键，absent 键保留 | ❌ |

**根因**：`merge_node_body` 对"非现有子节点的对象值键"走 prop 路径（`json_to_value` → `name : { … }`）；而旧配置页是**整文件重建**（PUT 直接序列化完整 body），任意增删。Plan 002 §4.2 早已标注"v1 不支持新增整个 provider 块"，本次实测确认其为硬缺口。

**结论**：功能对等**未达成**，直接清理旧服务会让用户无法通过设置中心增删 LLM provider（需手编文件）。本计划先补齐缺口，再清理。

---

## 1. 实施内容

### 1.1 修复新增：`merge_node_body` 创建子节点块（auto-os-config）

`backend/src/project.rs` 的 `merge_node_body`：当一个 JSON 键**不是现有子节点名**且**值为对象**时，应创建为新的**子节点块**（`name { … }`），而非 prop（`name : { … }`）。

- 判定规则：`Json::Object` 值 → 子节点块；标量/数组 → prop。这是 `.at` 配置的天然映射（对象即块）。
- 新建的子节点内部递归 merge（其 props/kids 照常处理）。
- 需要确认序列化端（`to_at_source`）对新子节点正确输出 `name { … }`。
- 新增行为**不改变**现有 prop 更新路径（回归风险小，单测覆盖）。

### 1.2 补删除：结构化端点（auto-os-config）

merge 语义是"JSON 是当前 AST 的投影，absent 键保留"，删除需显式信号。新增端点：

```
DELETE /api/config/:module_id/blocks/:name
```

- daemon 直接对 AST 删除指定子节点，持久化回文件（保留 `.bak` 机制）。
- 校验：模块存在、指定子节点存在（404）、文件可解析。
- 仅作用于子节点块（不删除 prop，避免误删标量）。

### 1.3 前端：ConfigEditor 增删入口（auto-os-config）

- 顶层 provider 级子表单加 **"+ Add block"**（新增）与 **"Delete"**（删除）按钮。
- 新增：填写 name + 初始 `{ kind : "openai" }` 等默认块 → `POST/PUT` 通过现有 `PUT /api/config/:id`（走 1.1 的 merge）或单独端点。
- 删除：调 1.2 的 `DELETE` 端点，`confirm()` 二次确认。
- 与既有 `BUILTIN_FILE_VIEWS`（DaemonView）兼容——DaemonView 也可复用 ConfigEditor 的表单，按钮逻辑在 ConfigEditor 内。

### 1.4 对等验证后清理 aaid 旧配置服务（auto-ai）

在 1.1–1.3 全部落地并验证后：

- 删除 aaid 的 `src/config.html`。
- 删除 `server.rs` 中 `/v1/config`（config_page）、`/v1/config/data`（config_data/config_update）路由与 handler。
- **保留**：`/v1/config/test`（auto-os-config 的 Test connection 代理它）、`config.rs` 的 `DaemonConfig`（aaid 启动读取配置的核心）。
- 更新 `auto-ai-cli/src/main.rs` `open_config` 的陈旧注释（"musk 提供 Roles/Skills 页面、aaid 提供 AI Daemon 页面"——实际页面全在 auto-os-config :17700）。

### 1.5 债务登记

- 功能对等达成后，更新 `docs/plans/KNOWN-DEBT-AND-RISKS.md`：移除/标注 Plan 002 §4.2 限制已闭合，登记本次清理。

---

## 2. 验证清单

- [ ] 单测：merge_node_body 新增对象键 → 生成子节点块（非 prop），round-trip 可解析。
- [ ] 单测：`DELETE /api/config/:id/blocks/:name` 删除子节点并持久化；不存在 → 404。
- [ ] 后端测试全绿（当前 27 项 + 新增）。
- [ ] E2E（`scripts/e2e.sh` 三套）无回归。
- [ ] 实机：通过设置中心新增一个 provider → `~/.config/autoos/ai-daemon.at` 出现 `name { … }` 子块 → `enum_self_providers` 下拉出现该 provider → 删除后消失。
- [ ] aaid 旧端点移除后：`/v1/config`、`/v1/config/data` 404；`/v1/config/test` 正常；aaid 启动读取配置正常。
- [ ] auto-ai workspace check 通过。

---

## 3. 不做什么

- ⏸ 通用编辑器对**任意嵌套层级**的增删（v1 只做顶层 provider 级子块；嵌套块仍手编）。
- ⏸ 删除 prop（仅删除子节点块，避免误删标量）。
- ⏸ per-provider 测试连接的完整 UI（DaemonView 保持只测 default；`/v1/config/test` 本身支持任意 provider，如需可后续加）。
- ⏸ aaid service registry（`/v1/services/*/ensure`）——服务管理，非配置服务，保留。

---

## 4. 关联

- Plan 002 §4.2（"v1 不支持新增整个 provider 块"）——本计划闭合该已知限制。
- Plan 004（架构收尾 + KNOWN-DEBT 登记）——本计划的债务更新对象。
- auto-ai Plan 016/017（Auto 化路线图）——aaid 清理属 auto-ai 侧改动，独立提交。
