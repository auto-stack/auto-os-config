# Plan 003: 模块自注册机制

> **状态**:已实施(Step 1–5)
> **日期**:2026-08-04
> **目标**:第三方模块(如 auto-musk)在自己的代码/安装流程里声明自己,**零侵入 auto-os-config 源码**就能出现在设置中心。通用编辑器模块零成本;需要定制 UX 的模块通过一个干净的远程组件协议接入(不再用旧的 importmap/vendor-Vue hack)。
> **前置**:Plan 002 已完成(统一 daemon + 通用编辑器)。

---

## 0. 解决了什么

Plan 002 之后,注册分散在 auto-os-config 的 **3 个源文件**里(全是编译期硬编码):后端 `registry.rs` 的 `DEFAULT_REGISTRY_ATOM`、前端 `useModules.ts` 的 `loadModules()` 侧栏数组 + `LOCAL_VIEWS` 映射。第三方模块无法自己注册——必须提 PR 改 auto-os-config 源码。

本计划补一层**运行期发现**,并重新引入远程组件能力(比旧架构更干净)。

---

## 1. 核心机制

### 1.1 磁盘 drop-in 声明
模块往约定目录丢一个 **auto-atom** 声明文件(与 `~/.config/autoos/` 下所有配置同格式):
```
~/.config/autoos/modules.d/<id>.at
```
auto-os-config 启动时扫描该目录(`Registry::merge_dropins`),合并进内置注册表。**一个模块 = 一个文件,零侵入 auto-os-config 仓库**。drop-in 按 `id` 去重——同名 drop-in **覆盖**内置项(支持重新定义/重命名)。用 auto-atom 而非 TOML 是为了和整个配置树保持一致(drop-in 文件本身也能被通用编辑器编辑)。

### 1.2 声明格式(auto-atom,一个文件一个 `module {}` 块)
```text
# ~/.config/autoos/modules.d/auto-musk.at
module {
    kind : file          # 或 collection / custom
    id : "auto-musk"
    file : "apps/musk/config.at"
    root : "musk"
    name : "Auto Musk"   # 可选展示字段(侧栏用)
    icon : "🦌"
    description : "Musk app: daemon, defaults, harness"
    group : ""           # 可选,空 = 顶层
}
```

### 1.3 `/api/modules` 发现端点
后端把合并后的注册表扁平化暴露:
```
GET /api/modules → [{ id, kind, name, icon, description, group, remote? }, ...]
```
前端 `loadModules()` 改为 `fetch('/api/modules')`,替换硬编码数组。侧栏分组从 `group` 字段派生(同 group 聚成一个可折叠段,保序)。

### 1.4 三种 dispatch 路径(按 kind)
| kind | dispatch | 谁需要 |
|---|---|---|
| `file` | ConfigEditor(通用,静态 import) | 大多数 |
| `collection` | CollectionBrowser(通用) | roles/skills 类 |
| `custom` | 远程组件工厂 `createComponent(Vue)`(见 §2) | 需要特殊 UX 的少数 |

`file`/`collection` **完全零前端代码**——后端声明即出现。`custom` 走远程协议。

---

## 2. 远程组件协议:`createComponent(Vue)` 工厂注入

取代旧 importmap hack 的核心创新。**根本区别**:远程组件**不 import vue**,由宿主把自己的 Vue 模块作为参数注入。

### 2.1 为什么这消除了旧 hack 的所有问题
旧架构脆弱性源于"宿主和远程各自 import vue,必须解析到字节相同的 URL,否则两个 Vue 实例 → 反应性静默失效"。工厂注入让远程**根本不持有 vue 引用**,从源头消灭失败模式:
- **无 importmap**(无页面级全局副作用)
- **无 vendored vue 文件**(无 383KB 文件、无版本漂移)
- **无 `optimizeDeps.exclude`/alias/dedupe**(`vite.config.ts` 保持 Plan 002 Phase 4 之后的干净状态)
- **无 URL 字符串匹配**(远程不问 vue 要谁)

### 2.2 协议契约
远程 ESM bundle 导出工厂:
```ts
// 远程 entry,由模块自己的 Vite lib mode 构建
// build.rollupOptions.external = ['vue']  ← 关键:不打包 vue
export function createComponent(Vue) {
  const { ref, onMounted, h } = Vue   // 用宿主的 vue
  return { /* 组件选项对象 */ }
}
```
宿主侧(`useModules.ts` 的 custom 分支):
```ts
import * as Vue from 'vue'                       // 宿主唯一实例
const mod = await import(/* @vite-ignore */ remoteUrl)
activeComponent.value = mod.createComponent(Vue)
```

### 2.3 两个硬约束(写入远程模块文档)
1. **必须预编译**:宿主 Vue 是 runtime-only(`vue.runtime.esm-bundler.js`,无编译器)。远程用 Vite lib mode 把 `<template>` 编译成 render 函数,或用 `h()` 手写。不能 ship 模板字符串。
2. **必须 externalize vue 且不 import**:远程 `vite.config` 设 `external: ['vue']`,导出 `createComponent(Vue)` 而非 `import { ref } from 'vue'`。

### 2.4 远程组件访问配置数据
远程组件读写配置用**与通用编辑器相同的 daemon 端点**(`/api/config/:id`、`/api/collection/:id`),通过 `props.moduleId` 拿 id。远程组件只负责 UX,数据层仍统一——避免回到"每模块自己开发配置服务器"的旧冗余。

---

## 3. 第一方定制视图 vs 第三方远程

一个关键区分(避免混淆):

- **第三方 `custom` 模块**:drop-in 声明 `kind=custom` + `remote=<url>`,宿主动态 `import()` 远程 bundle,调 `createComponent(Vue)`。
- **第一方定制视图**(如 DaemonView):是宿主自己的组件,**静态 import** 进 bundle。通过 `BUILTIN_FILE_VIEWS` 映射把特定 file 模块 id(如 `ai-daemon`)路由到它,优先于通用 ConfigEditor。

这避免了把宿主自己的视图经 HTTP 路由的自举问题。ai-daemon 仍是 `kind=file`(数据流不变),前端检测到它在 `BUILTIN_FILE_VIEWS` 里就用 DaemonView。

---

## 4. 实施记录(全部完成)

| Step | 内容 | 验证 |
|---|---|---|
| **1** | 后端:registry 加展示字段(name/icon/description/group)+ Custom 变体 + `merge_dropins` + `/api/modules` 端点 | 19 单测(含 4 新增:display_fields/custom_kind/merge_dropins missing-dir/merge_dropins add-and-override)+ curl drop-in 发现 + 覆盖 |
| **2** | 前端:`loadModules` fetch /api/modules + kind dispatch + 删 LOCAL_VIEWS + group 从字段派生 | 两套既有 E2E 通过(14/14 + 14/14) |
| **3** | 远程协议 `createComponent(Vue)` 加载分支 + `examples/remote-module/` 示例 | `test-remote-module.mjs` 通过(反应性 0→1→2、单 Vue 实例、daemon 数据集成) |
| **4** | 迁移内置 4 模块(统一 id)+ DaemonView 作为第一方定制视图(BUILTIN_FILE_VIEWS) | test-connection 恢复通过;三套 E2E 全过 |
| **5** | 文档:本计划 + README 注册流程重写 + 示例 README | — |
| **6**(修正) | **格式统一:drop-in 从 TOML 改为 auto-atom**。初版图省事用了 `toml` crate,但 `~/.config/autoos/` 下所有配置都是 auto-atom,模块声明不应例外。改为手写从 `AtomParser` 的 `Node`/`Value` 抽字段(同 `role_config.rs` 模式),`DEFAULT_REGISTRY_ATOM` 常量 + `modules.d/*.at` drop-in。移除 `toml` 依赖。drop-in 文件本身也能被通用编辑器编辑(闭环)。 | 22 单测(含 3 新增 atom 解析错误用例)+ `.at` drop-in curl 验证 + 两套 E2E 通过 |

---

## 5. 关键决策

### 5.1 drop-in 覆盖(非报错)同名内置项
允许第三方重定义/重命名内置模块(如把 ai-daemon 改个展示名)。合并按 id 去重,drop-in 胜。

### 5.2 展示字段用 `#[serde(flatten)] DisplayMeta`
name/icon/description/group 集中在一个 struct,三种 Module 变体复用,向后兼容(全可选,缺省时 name 回退为 id)。

### 5.3 只读集合格式探测(已知小瑕疵)
`/api/modules` 不暴露 collection 的 `format`(atom vs frontmatter-md),前端用 `id === 'skills'` 启发式判定只读。后续可让端点带 `format` 字段消除这个启发式。

### 5.4 组件实例 `:key` 强制重建
`<component :is :key="activeModuleId">` —— 切换两个同类型模块(如 Roles→Skills 都是 CollectionBrowser)时强制重新 mount,让 setup 期的 `useCollection(moduleId)` 重新绑定。否则保留旧模块的加载状态。

---

## 6. 如何注册一个新模块(零侵入)

### 通用编辑器模块(最常见)
往 `~/.config/autoos/modules.d/my-module.at` 丢一个 auto-atom 声明:
```text
module {
    kind : file            # 或 collection
    id : "my-module"
    file : "my-module.at"  # 相对 ~/.config/autoos/
    root : "mymod"
    name : "My Module"
    icon : "🔧"
    description : "..."
}
```
重启 auto-os-config daemon → 侧栏自动出现 → 通用编辑器自动渲染表单。**不改 auto-os-config 一行代码。**

### 需要定制 UX 的模块
1. 构建远程 bundle(导出 `createComponent(Vue)`,externalize vue),用你自己的 HTTP server serve。参考 `examples/remote-module/`。
2. drop-in 声明 `kind : "custom"` + `remote : "<url>"`(同样 auto-atom 格式)。

详见 README "Registering a new module"。

---

## 7. 范围与不做什么
- ✅ drop-in 磁盘发现 + `/api/modules`
- ✅ 展示字段从后端来
- ✅ `createComponent(Vue)` 工厂协议
- ✅ kind dispatch 消除 LOCAL_VIEWS
- ✅ 统一 sidebar/backend id
- ⏸ 运行期热注册(drop-in 重启即生效)
- ⏸ 远程组件沙箱/安全(本地 trusted 模型)
- ⏸ 远程组件版本协商(v1 固定 `createComponent(Vue)` 签名)
- ⏸ `/api/modules` 暴露 collection format(消除 §5.3 启发式)
