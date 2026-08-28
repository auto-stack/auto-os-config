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
