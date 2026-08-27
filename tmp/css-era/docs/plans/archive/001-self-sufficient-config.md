# Plan 001: auto-os-config 自给自足重构

> **状态**：已被 Plan 002 取代(superseded) → 已归档(2026-08-04)
> **仓库**：`auto-os-config`（主）、`auto-musk`（清理）
> **设计文档**：`auto-ai/docs/os-config-self-sufficient-design.md`
>
> **与 Plan 002 的关系**:本计划的 Phase 1(给 os-config 加 Rust 后端)被
> Plan 002 吸收并**通用化**(Plan 002 的后端是 generic AST 投影,而非 Plan 001
> 设想的 per-entity typed API)。本计划的 Phase 2–4(搬 4 个手写 .vue 页面)
> 被 Plan 002 **取代**——Plan 002 用一个 schema 驱动的通用编辑器
> (ConfigEditor/CollectionBrowser)替代了所有手写页面,新模块零前端成本。
> 详见 [`002-unified-config-daemon.md`](002-unified-config-daemon.md)。
>
> 下方原文保留作为历史记录。

---

## 实施路线（5 个 Phase）

### Phase 1：os-config Rust 后端骨架
- `backend/Cargo.toml` + workspace
- axum server (:17701)
- `config_api.rs`：文件读写 API（复用 auto-ai-agent 的 parse/serialize）
- vite proxy `/api` → `:17701`
- 验证：`curl localhost:17701/api/roles` 返回 role 列表

### Phase 2：Roles + Skills 页面内置化
- 从 musk 搬 `roles-config-page.vue` → `os-config/src/views/RolesView.vue`
- 从 musk 搬 `skills-config-page.vue` → `os-config/src/views/SkillsView.vue`
- API URL 改为同源 `/api/`
- useModules.ts 改为直接 import 组件（去掉 remote/import()）
- 验证：os-config 单独运行，Roles/Skills 页面正常

### Phase 3：Agents + AutoMusk 页面内置化
- 从 musk 搬 `agents-config-page.vue` → `AgentsView.vue`
- 从 musk 搬 `app-config-page.vue` → `AutoMuskView.vue`
- 验证：全部 4 个页面不依赖 musk 后端

### Phase 4：AI Daemon 页面 + 连接测试
- 搬 aaid 的 `config-page.vue` → `DaemonView.vue`
- 读写 `ai-daemon.at`（os-config 自己做）
- 连接测试：aaid 在线则调 `:17654/v1/config/test`，离线则禁用按钮
- 验证：Daemon 页面读写正常

### Phase 5：清理
- 移除 importmap / vendor vue / optimizeDeps hack
- musk `frontend/` 删除（或标记 deprecated）
- musk `frontend-dist/` 删除
- auto-ai-cli `/config` 改为只 ensure os-config（不再检查 musk/aaid）
- 验证：os-config 单独运行，全部配置功能完整

---

## 范围
- ✅ 5 个 Phase 全部实施
- ⏸ musk 运行时不变（仍用 RoleRegistry::load() 读文件）
- ⏸ 不改 auto-forge
