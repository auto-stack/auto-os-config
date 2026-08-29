#!/bin/bash
# Regen + deploy for auto-os-config Auto sources (Plan 006; jade-garden
# front/auto/gen/regen.sh pattern, simplified: no gen-side typecheck — the
# authoritative gate is the host `npm run build` (vue-tsc + vite) + e2e).
# Lives in gitignored auto/gen/. Usage: bash auto/gen/regen.sh
set -e
cd "$(dirname "$0")/.."   # -> auto/
AUTO=${AUTO:-D:/autostack/auto-lang/target/debug/auto.exe}
shopt -s nullglob

mkdir -p gen
# Clean generated components/stores first: `auto build` does NOT remove
# outputs of deleted widgets — without this, stale SFCs from removed .at
# files keep getting re-deployed (bit us with ProbeB.vue after Phase 5).
rm -rf gen/front/vue/src/components gen/front/vue/src/stores
"$AUTO" build -d . --gen-only 2>&1 | tee gen/build.log
if grep -q "Warning: Failed to compile" gen/build.log; then
  echo "!!! BUILD HAD COMPILE WARNINGS — aborting deploy" >&2
  exit 1
fi
# Parse errors print differently (and --gen-only still exits 0) — grep both.
if grep -qE "Parse error|error\[|Error:" gen/build.log; then
  echo "!!! BUILD HAD PARSE/COMPILE ERRORS — aborting deploy" >&2
  exit 1
fi

# Deploy store composables: rewrite the codegen's imports to the host tree —
# @/lib/api -> handwritten transport; @/ext/... -> the auto tree (stores sit
# one level deeper than components: ../../../ = repo root).
mkdir -p ../src/stores/auto
for f in gen/front/vue/src/stores/use*Store.ts; do
  base=$(basename "$f")
  sed -e "s|@/lib/api|../../lib/api|g" \
      -e "s|@/ext/src/front/utils/|../../../auto/src/front/utils/|g" \
      -e "s|@/ext/src/lib/api|../../../src/lib/api|g" \
      "$f" > "../src/stores/auto/${base}"
done

# plan010 R10: store-to-store call — codegen emits a bare `Collection.Init(...)`
# inside useModulesStore (no import/facade for cross-store refs, same family as
# the multi-store facade gap). Rewrite to the composable call + import; the
# module-level refs are singletons so state is shared.
# (446 撤绕行 VG16: Collection.Open 已回归自然名 Init。)
if [ -f "../src/stores/auto/useModulesStore.ts" ] && grep -q "Collection.Init(" "../src/stores/auto/useModulesStore.ts"; then
  grep -q "^import { useCollectionStore }" "../src/stores/auto/useModulesStore.ts" || \
    sed -i "1i import { useCollectionStore } from './useCollectionStore'" "../src/stores/auto/useModulesStore.ts"
  sed -i "s|Collection\.Init(|useCollectionStore().Init(|g" "../src/stores/auto/useModulesStore.ts"
fi

# 概要页四期:dark 类 DOM 同步——theme_store.at 的 SetMode 无 DOM 通道(.at
# 不持 DOM),部署侧给 useThemeStore 追加模块级 watcher:dark_mode ref →
# documentElement.classList('dark') + localStorage('autoos-theme')。vm 端
# 无需此步(dark_mode 字段每帧直驱 renderer)。index.html bootstrap 防首帧
# 闪烁;三处 keep-in-sync:index.html / 此注入 / styles.css .dark 令牌。
THEME_TS=../src/stores/auto/useThemeStore.ts
if [ -f "$THEME_TS" ] && ! grep -q "autoos-theme" "$THEME_TS"; then
  cat >> "$THEME_TS" <<'TS'

// [deploy-injected 概要页四期] dark 类 DOM 同步(源:theme_store.at dark_mode;
// 本注入由 regen.sh 追加,勿手编)。
import { watch as _watch } from 'vue'
{
  const _s = useThemeStore()
  let _firstDarkSync = true
  _watch(() => _s.dark_mode.value, (d) => {
    document.documentElement.classList.toggle('dark', !!d)
    // 首拍(immediate)只同步 class 不落盘——此时 dark_mode 还是声明初值,
    // 先落盘会用 false 覆盖 Init 即将读到的持久化偏好(实测回归)。
    if (!_firstDarkSync) { try { localStorage.setItem('autoos-theme', d ? 'dark' : 'light') } catch {} }
    _firstDarkSync = false
  }, { immediate: true })
}
TS
fi

# plan446 撤绕行 VG16/A1: collection_store 内部自限定调用 `Collection.Select(name)`
# (vm 侧 A1 要求同名 msg 显式限定)——codegen 原样带进 TS,composable 内本地直调即可。
if [ -f "../src/stores/auto/useCollectionStore.ts" ] && grep -q "Collection\.Select(" "../src/stores/auto/useCollectionStore.ts"; then
  sed -i "s|Collection\.Select(|Select(|g" "../src/stores/auto/useCollectionStore.ts"
fi

# Deploy components: rewrite the codegen's @/ext/... imports to point into
# the auto tree (../../ = repo root from src/components/). @/ext/src/lib/api
# (direct api imports in components) maps to the host transport layer.
mkdir -p ../src/components
# Plan 008 batch 6: the vm/web exclusions are retired — App.vue (shared root
# from app.at) deploys like any widget; sweep stale Plan 006/007 artifacts
# (AppShell + retired Vm widgets) that the gen tree no longer produces.
for stale in AppShell.vue ConfigEditorVm.vue DaemonViewVm.vue CollectionBrowserVm.vue SidebarVm.vue ThemePickerVm.vue; do
  rm -f "../src/components/${stale}"
done
for f in gen/front/vue/src/components/*.vue; do
  base=$(basename "$f")
  sed -e "s|@/ext/src/front/utils/|../../auto/src/front/utils/|g" \
      -e "s|@/ext/src/lib/api|../../lib/api|g" \
      -e "s|@/stores/use|../stores/auto/use|g" \
      -e "s|\$event\.target\.value|(\$event.target as HTMLInputElement).value|g" \
      -e "s|\$event\.target\.checked|(\$event.target as HTMLInputElement).checked|g" \
      -e "s|\$event\.target\.value|($event.target as HTMLInputElement).value|g" \
      -e "s|\$event\.target\.checked|($event.target as HTMLInputElement).checked|g" \
      "$f" > "../src/components/${base}"
done
# plan446 撤绕行 C1: 确认层迁回 popover 后,上游 vue codegen 对 popover 是惰性
# div 透传(:open 属性无效 → 面板常显;@dismiss 不接线)——部署侧补偿为 v-if 门控
# (行为与旧 if 块等价)。VM 轨走真 popover。上游 vue 半缺口已登记回传。
for f in ../src/components/CollectionBrowser.vue; do
  sed -i -e 's| :open="confirm_open"| v-if="confirm_open"|'          -e 's| :x="620"||' -e 's| :y="300"||'          -e 's| @dismiss="ConfirmDeleteNo"||' "$f"
done

# 概要页四期:ThemePicker settings 弹窗的 popover 部署侧补偿(非 shadcn
# popover 惰性 div 透传,C1 同款家族,另含 popover_trigger 子树 onclick 丢失):
# ①trigger button 注入 @click="Toggle"(codegen 丢 popover_trigger 内
#   onclick);②:open/@dismiss/:placement 剥除(无效属性);③panel div 注入
#   v-if="open" 门控(:open 无效则面板常显)。vm 轨走真 popover 不受影响。
for f in ../src/components/ThemePicker.vue; do
  sed -i -e 's| class="settings-trigger | @click="Toggle" class="settings-trigger |'          -e 's| :open="open"||'          -e 's| :placement=."top-start".||'          -e 's| @dismiss="Close"||'          -e 's|<div class="flex flex-col settings-panel|<div v-if="open" class="flex flex-col settings-panel|' "$f"
done

# plan011 后续: 侧栏 nav item 长描述截断悬停提示——plain-mode button 无
# title 属性通道(codegen 只透传已知 props),部署侧补 :title(popover C1
# 同款部署侧 sed 先例);三处 nav_class 按钮形态一致,一条规则全覆盖。仅改
# 部署 Sidebar.vue,VM 轨不受影响。配合 sidebar.at 的 min-w-0+truncate。
sed -i 's|<button :class="m.nav_class" :key="m.id" @click=|<button :class="m.nav_class" :key="m.id" :title="m.description" @click=|g' ../src/components/Sidebar.vue

# Root App.vue (batch 6): the codegen emits it at the scaffold root position
# (gen/front/vue/src/App.vue), not in components/ — deploy to src/ with the
# root-depth import rewrites (batch 6: the shared root from app.at).
# plan010: multi-store root Init — codegen emits `Theme.Init()` without
# creating a reactive binding for the second imported store; rewrite to a
# direct composable call (upstream codegen gap, same family as 007 G-list).
# plan446批二 A1 follow-up: the bare `store.Init()` form is now REJECTED by
# vm-side handler synthesis (ambiguous Init across Modules+Theme), so app.at
# qualifies it as `Modules.Init()` — which vue codegen passes through raw
# (multi-store facade is an upstream v1 gap). Rewrite it back to the local
# `store` const (= useModulesStore), byte-identical to the pre-A1 artifact.
sed -e "s|@/components/|./components/|g" \
    -e "s|@/stores/use|./stores/auto/use|g" \
    -e "s|@/ext/src/front/utils/|../auto/src/front/utils/|g" \
    -e "s|@/ext/src/lib/api|./lib/api|g" \
    -e "s|^  Modules\.Init();|  store.Init();|" \
    -e "s|^  Theme\.Init();|  useThemeStore().Init();|" \
    -e "s|\$event\.target\.value|(\$event.target as HTMLInputElement).value|g" \
    -e "s|\$event\.target\.checked|(\$event.target as HTMLInputElement).checked|g" \
    -e "s|\$event\.target\.value|($event.target as HTMLInputElement).value|g" \
    -e "s|\$event\.target\.checked|($event.target as HTMLInputElement).checked|g" \
    "gen/front/vue/src/App.vue" > "../src/App.vue"

echo "REGEN OK — components: $(find ../src/components -maxdepth 1 -name '*.vue' | wc -l), stores: $(find ../src/stores/auto -maxdepth 1 -name '*.ts' 2>/dev/null | wc -l)"
