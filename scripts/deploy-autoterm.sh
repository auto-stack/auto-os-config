#!/usr/bin/env bash
# deploy-autoterm.sh — OS-013 T5:AutoTerm 引擎件部署(幂等)。
#
# 003 §5 部署契约:
#   - autoterm_core.dll + autoterm-ctrlc.exe 与宿主(auto exe)同目录;
#   - auto.lang term 门面(stdlib/auto/term.at + term.vm.at)同步进运行期
#     stdlib 安装副本(~/.auto/libs/stdlib/auto——compile.rs find_std_lib 的
#     实际解析根,缺则 `use auto.term` 模块文件解析失败)。
#
# 来源解析(组布局惯例:env → 组兄弟 → 主检出):
#   AUTO_TERM_ROOT / AUTO_LANG_ROOT env → ../auto-term、../auto-lang 组内
#   兄弟(本 worktree 组)→ D:/autostack 主检出。
#
# Usage: bash scripts/deploy-autoterm.sh [target-dir]   # 缺省 = PATH 上 auto exe 目录
#        PROFILE=release bash scripts/deploy-autoterm.sh [target-dir]
set -euo pipefail

PROFILE="${PROFILE:-debug}"
GROUP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"   # .wt/<group>/<repo>/.. = 组根

pick() { # pick <env-var> <group-sibling> <main-checkout>
  if [ -n "${!1:-}" ]; then echo "${!1}"; return; fi
  if [ -d "$GROUP_DIR/$2" ]; then echo "$GROUP_DIR/$2"; return; fi
  echo "/d/autostack/$3"
}

TERM_ROOT="$(pick AUTO_TERM_ROOT auto-term auto-term)"
LANG_ROOT="$(pick AUTO_LANG_ROOT auto-lang auto-lang)"
PROFILE_DIR="$PROFILE"; [ "$PROFILE" = "release" ] && PROFILE_DIR="release"

DLL="$TERM_ROOT/target/$PROFILE_DIR/autoterm_core.dll"
CTRLC="$TERM_ROOT/target/$PROFILE_DIR/autoterm-ctrlc.exe"
TERM_AT="$LANG_ROOT/stdlib/auto/term.at"
TERM_VM_AT="$LANG_ROOT/stdlib/auto/term.vm.at"

if [ -n "${1:-}" ]; then
  TARGET="$1"
else
  AUTO_BIN="$(command -v auto || true)"
  [ -z "$AUTO_BIN" ] && { echo "✗ 未找到 auto exe(传目标目录为参数,或把 auto 加入 PATH)"; exit 1; }
  TARGET="$(dirname "$AUTO_BIN")"
fi
mkdir -p "$TARGET"

fail=0
for f in "$DLL" "$CTRLC" "$TERM_AT" "$TERM_VM_AT"; do
  [ -f "$f" ] || { echo "✗ 缺件: $f"; fail=1; }
done
[ $fail -eq 1 ] && { echo "  (auto-term 侧先 cargo build -p autoterm-core;auto-lang 侧需含 OS-013 T2 的 stdlib/auto/term{,.vm}.at)"; exit 1; }

cp -f "$DLL" "$CTRLC" "$TARGET/"
# stdlib 安装副本可能是主检出 stdlib 的联接(实测本机即是)——同文件时
# cp 报错,以落位检查代替强拷。
STD_LIBS="${HOME:-/c/Users/$USERNAME}/.auto/libs/stdlib/auto"
mkdir -p "$STD_LIBS"
for f in "$TERM_AT" "$TERM_VM_AT"; do
  base="$(basename "$f")"
  if [ -f "$STD_LIBS/$base" ] && [ "$(cmp -s "$f" "$STD_LIBS/$base" && echo same || echo diff)" = "same" ]; then
    echo "  - $base 已同内容在位($STD_LIBS)"
  else
    cp -f "$f" "$STD_LIBS/"
  fi
done

echo "✓ 引擎件 → $TARGET"
echo "  - $(basename "$DLL") ($(stat -c%s "$DLL") bytes)"
echo "  - $(basename "$CTRLC") ($(stat -c%s "$CTRLC") bytes)"
echo "✓ term 门面 → $STD_LIBS (term.at + term.vm.at)"
echo "幂等:重复执行安全(覆盖式拷贝)。"
