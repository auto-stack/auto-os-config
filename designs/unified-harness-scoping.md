# 统一 Harness + 作用域架构设计

> **Status**: Design Draft — 待评审
> **位置**: 跨 `auto-os-config`(host) / `auto-musk`(app) / `auto-ai`(capability 库)
> **前身**: Plan 004(Agent Roles,确立了 `inherit:` + 作用域查找的雏形)
> **动机**: 随着 App 增多、Harness 类型增多(Role/Skill/Tool/MCP/Mode),需要一个统一的"继承/定制/扩展"模型,避免每种类型各搞一套、每个 app 各复制一套。

---

## 1. 问题陈述

AutoOS 的 AI 能力正从"单一 OS 级"走向"多 App 共享 + 各自扩展"。当前(Plan 004 之后):

- Roles / Skills / Modes 都存在 `~/.config/autoos/{roles,skills,modes}/`,只有**一层**作用域
- `inherit:` 机制允许 role 借用内置基类并改字段
- 但**没有**"app 作用域"概念:musk 和未来的 forge、其他 app 共用同一池,无法区分"这个 coder 是 OS 通用的还是 musk 专有的"

未来还会出现更多 **Harness 类型**(Tool、MCP server 声明……),以及更多 **App**。如果每种类型 × 每个 app 各写一套继承/查找逻辑,复杂度会爆炸。需要**一个统一模型**。

### 1.1 三个易混操作的精确定义

用户说的"继承/定制/扩展"其实是两种操作:

| 操作 | 精确含义 | 架构归约 |
|---|---|---|
| **继承**(inherit) | 全盘借用一个上游实体,只改少数字段 | 已有机制:`inherit: "coder"` + 单字段覆盖 |
| **定制**(customize) | 改一个已存在实体的行为 | = 继承改字段,**等价于继承** |
| **扩展**(extend) | 新增一个上游不存在的实体 | = 普通新建,在 app 作用域建文件 |

**关键结论**:继承和定制是同一件事(借用 + 改),扩展就是新建。真正要解决的机制只有一个——**按作用域查找 + 借用上游 + 标记来源**。

---

## 2. 核心抽象:Harness

把所有"可被 app 继承/扩展的 AI 能力实体"统一为 **Harness**。

```
一个 Harness = { 类型(kind), 名字(name), 作用域(scope), 来源(source), 内容(content) }
```

### 2.1 Harness 类型

| kind | 内容载体 | 现状 | L1 目录 |
|---|---|---|---|
| `Role` | `.at` + sidecar `.soul.md` | ✅ Plan 004 | `roles/` |
| `Skill` | `SKILL.md` | ✅ 已有 | `skills/` |
| `Mode` | `.at` | ✅ 已有 | `modes/` |
| `Tool` | (待定,可能代码或声明) | 未来 | `tools/` |
| `Mcp` | `mcp.json` 片段 | 未来 | `mcp/` |

**统一的价值**:作用域查找、来源标记、继承语义实现**一次**,所有 kind 复用。新增 Tool/MCP 只是加一个枚举值 + 目录,不动核心逻辑。

### 2.2 为什么必须统一(而非每类各搞一套)

- 5 种 kind × 3 层作用域,若各写继承逻辑 = 15 套相似代码
- 跨 kind 的"app 想借用 OS 的 coder role + tdd skill"需要一致的查找语义
- UI 想做统一的"能力面板"(见 §6),后端必须先统一

---

## 3. 作用域模型:层级目录 + 名字覆盖

### 3.1 目录布局

```
~/.config/autoos/                  ← L1: OS 级(所有 app 共享)
  roles/   skills/   modes/   tools/   mcp/
  apps/
    musk/                           ← L2: app 级
      roles/   skills/   modes/   tools/   mcp/
      config.at                     ← musk 运行时配置(非 capability)
    <future-app>/
      ...
```

### 3.2 解析顺序(名字覆盖,不字段合并)

```
L0 编译内置(builtin) → L1 OS 通用(~/.config/autoos/<kind>/) → L2 app 专属(apps/<app>/<kind>/)
```

同名实体:**后者整体覆盖前者**,不逐字段合并。

### 3.3 为什么坚决不做跨层字段合并

这是整个架构的**关键决策**,必须挡掉。字段合并(三层逐字段三方 merge)的问题:

| 问题 | 说明 |
|---|---|
| **歧义** | OS 把 coder.temperature 从 0.3→0.25,musk 曾定制 0.1,谁赢?用户当初定制的是绝对值还是"比默认低"? |
| **追踪负担** | 要记录"改过哪些字段"、"上游何时变"、"是否提示 rebase"——等于配置版 git merge |
| **语义不一致** | Role 合并 skills、Skill 合并 prompt、Tool 合并参数……每种 kind 合并规则可能不同,N×复杂度 |
| **UI 灾难** | 每张卡片要显示"继承自 X,已覆盖: temperature, max_turns",编辑时逐字段标"用继承/用我的" |

**名字覆盖 + inherit 借字段**绕开这一切:要么用上游原样,要么整个自己定义(借不借字段你说了算),零歧义。`inherit:` 已有测试覆盖。

---

## 4. 查找协议:HarnessResolver

这是**最该早定的接口**——给 app 一个统一的查找入口,以后加 kind 不返工。

### 4.1 trait 定义

```rust
/// Harness 类型枚举。新增类型只加一个变体。
enum HarnessKind { Role, Skill, Mode, Tool, Mcp }

/// 一个被解析出的 harness:带类型、名字、来源、原始内容。
struct Harness {
    kind: HarnessKind,
    name: String,
    source: HarnessSource,   // Builtin / Os / App(name)
    scope: Option<String>,   // None=OS 级解析; Some(app)=含 app 层
    content: HarnessContent, // Role(.at+soul) / Skill(md) / ...
}

/// 按 app 作用域解析一个 harness。
/// 解析顺序:L0 builtin → L1 OS → L2 app(若提供)。同名后者覆盖。
trait HarnessResolver {
    fn resolve(
        &self,
        kind: HarnessKind,
        name: &str,
        app: Option<&str>,
    ) -> Option<Harness>;

    /// 列出某 kind 的全部 harness,可按作用域过滤。
    fn list(
        &self,
        kind: HarnessKind,
        scope: ScopeFilter,   // All / OsOnly / App(name)
    ) -> Vec<HarnessSummary>;
}
```

### 4.2 解析示例

- musk 启动建 agent:`resolver.resolve(Role, "coder", Some("musk"))`
  - 先查 `apps/musk/roles/coder.at` → 没有
  - 再查 `roles/coder.at` → 没有
  - 再查内置 `coder` → 命中,返回 `source: Builtin`
- musk 想定制 coder:在 `apps/musk/roles/coder.at` 建 `inherit: "coder"` + 改字段 → 下次解析命中 L2,source=`App("musk")`

---

## 5. 继承机制的复用(不新造)

`inherit:` 已在 Plan 004 实现(role 层)。统一化时:

1. 把 `inherit:` 语义从 Role 专用,提升为**所有 kind 通用**的 Harness 属性
2. 解析时若 harness 声明 `inherit: "X"`,先递归解析 X(同 kind、同或上游作用域),再把当前 harness 的字段覆盖上去
3. Skill 的"继承"可能是 prompt 拼接(append)而非覆盖——这种 kind 特异语义保留在各 kind 的加载器里,Resolver 只负责"找到实体",不负责合并

**分层**:Resolver 负责"找"(按作用域),各 kind loader 负责"装"(inherit 合并的 kind 特异规则)。这样统一与特异分离。

---

## 6. UI 组织:全局能力面板

### 6.1 反模式(绝不采用)

```
❌ AI Roles(OS) / AI Roles(musk) / AI Skills(OS) / AI Skills(musk) ...
```
这是 kind × scope 的笛卡尔积,项数随两者线性增长,侧栏爆炸。

### 6.2 推荐模式:合并视图 + 类型 tab + 作用域滤镜

```
能力管理 (Capabilities)        [类型: Role ▾]   [作用域: 全部 ▾]
┌──────────────────────────────────────────────────────┐
│ 🔒 coder        🌐OS    max    3 skills    [继承→]    │
│ 🎯 musk-coder   🎯musk  inherits coder  mid  [编辑]   │
│ 🔒 reviewer     🌐OS    pro                [继承→]    │
└──────────────────────────────────────────────────────┘
```

- **类型切换**:顶部 tab 或下拉(Role / Skill / Mode / Tool / MCP)——加一种 kind = 加一个 tab
- **作用域切换**:全部 / 🌐 OS / 🎯 musk / 🎯 forge...
- **来源徽章**:🌐 OS / 🎯 app / 🔒 内置,一眼看出"这东西哪来的"
- **"继承"按钮**:点 OS 的 coder → 在当前选中 app 作用域建同名副本(自动加 `inherit: "coder"`)→ 进编辑器

### 6.3 为什么这样不爆炸

- 导航维度只有 **kind**(5 个 tab),scope 是**滤镜**(不占导航位)
- 加新 app = scope 下拉多一项,不动 kind 结构
- 加新 kind = 多一个 tab,不动 scope 结构
- 用户脑模型始终是"我有哪些 X 可用",而非"OS 层有啥、app 层有啥"

---

## 7. 实施路线(分阶段,需求驱动)

| 阶段 | 时机 | 内容 | 风险 |
|---|---|---|---|
| **现在**(与本设计同期) | 立即 | 做 `auto-musk-config` 运行时配置(连 daemon、默认 mode 等),**不含** harness 继承配置 | 低,正交 |
| **现在** | 顺手 | 抽象 `HarnessResolver` trait(一次性接口投资,便宜可逆);Role/Skill 接入 | 低 |
| **第二个 AI app 出现时** | 那时 | 引入 L2 app 目录 + 来源徽章 + 作用域滤镜 UI | 中,但有真实需求驱动分层怎么切 |
| **Tool/MCP harness 落地时** | 那时 | 加 `HarnessKind::Tool/Mcp` + 对应目录 + 一个 UI tab | 低,协议已定 |
| **永远不做** | — | 跨层字段合并 | — |

### 7.1 为什么 L2 app 作用域现在不急着做

只有 musk 一个 app 时,所有 capability 放 `autoos/` 加 `tags: [musk]` 也能工作。提前建 L2 的风险:等真有第二个 app,它的需求可能跟现在猜的分层不一样。**目录分层廉价可逆,真正成本在 UI**,等需求驱动更稳。

---

## 8. 关键决策汇总

| 决策点 | 结论 | 理由 |
|---|---|---|
| Harness 是否统一 | ✅ 统一为一个模型 | 避免 N kind × M scope 各搞一套 |
| 继承 vs 定制 vs 扩展 | 收敛为"inherit 借字段" + "新建" | 三操作实为两种,不造三套机制 |
| 作用域覆盖方式 | 名字整体覆盖 | 字段合并复杂度爆炸、歧义、UI 灾难 |
| Resolver 职责 | 只"找",不"合并" | 合并的 kind 特异语义留给各 loader |
| UI 维度 | kind 作 tab,scope 作滤镜 | 避免笛卡尔积爆炸 |
| L2 app 目录何时引入 | 第二个 app 出现时 | 现在单 app,分层是猜测 |
| 跨层字段合并 | 永不做 | — |

---

## 9. 开放问题(待第二个 app / 新 kind 时定)

- **Skill 的继承语义**:prompt 是覆盖还是 append?(Role 用覆盖;Skill 可能需 append)——留给 Skill loader 定
- **Tool harness 的内容形态**:是代码(WASM/插件)还是声明(类似 MCP)?——等 Tool 需求明确
- **作用域冲突的提示**:app 覆盖了 OS 同名实体时,UI 是否提示"你在覆盖 OS 的 X"?——倾向提示但不阻止
- **tags vs 目录**:过渡期(单 app)是否用 `tags: [musk]` 而非 L2 目录?——可作 L2 引入前的临时方案
