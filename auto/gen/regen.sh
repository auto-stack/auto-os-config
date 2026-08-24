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

# Deploy store composables: rewrite the codegen's @/lib/api import to the host
# handwritten transport layer (src/lib/api.ts).
mkdir -p ../src/stores/auto
for f in gen/front/vue/src/stores/use*Store.ts; do
  base=$(basename "$f")
  sed "s|@/lib/api|../../lib/api|g" "$f" > "../src/stores/auto/${base}"
done

# Deploy components: rewrite the codegen's @/ext/src/front/utils/ imports to
# point into the auto tree (../../ = repo root from src/components/).
mkdir -p ../src/components
for f in gen/front/vue/src/components/*.vue; do
  base=$(basename "$f")
  sed "s|@/ext/src/front/utils/|../../auto/src/front/utils/|g" "$f" > "../src/components/${base}"
done

echo "REGEN OK — components: $(find ../src/components -maxdepth 1 -name '*.vue' | wc -l), stores: $(find ../src/stores/auto -maxdepth 1 -name '*.ts' 2>/dev/null | wc -l)"
