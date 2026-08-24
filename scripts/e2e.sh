#!/usr/bin/env bash
# One-command E2E verification for auto-os-config (Plan 002/003/004).
#
# Builds the backend, then runs the three Playwright suites against a
# fresh daemon + vite dev + the remote-module example, cleaning up after
# itself. Already-running servers on :17701/:17700/:17720 are reused (and
# NOT killed) — useful when you keep a dev environment up.
#
# Usage:  ./scripts/e2e.sh
# Prereqs: cargo, node/npm, playwright chromium (npx playwright install chromium)
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG_ROOT="${HOME}/.config/autoos"
DROPIN="${CONFIG_ROOT}/modules.d/example-remote.at"
DAEMON_PID=""; VITE_PID=""; SERVE_PID=""

# A service answers on either IPv6 loopback (::1, how vite binds) or IPv4
# (127.0.0.1, how the daemon/example bind). Try both — the tests connect via
# `localhost`, and Node resolves that to ::1 first on Windows.
is_up() { # port
  curl -s -o /dev/null "http://localhost:$1" && return 0
  curl -s -o /dev/null "http://127.0.0.1:$1" && return 0
  return 1
}

wait_up() { # port tries
  local port="$1" tries="$2" i
  for i in $(seq 1 "$tries"); do
    if is_up "$port"; then return 0; fi
    sleep 0.5
  done
  echo "[e2e] ERROR: localhost:$port not up after $((tries/2))s" >&2
  exit 1
}

# Kill a process we started. `$!` yields a MSYS pid (kill understands it) but
# NOT the Windows pid taskkill wants; children (npm→node) also survive a plain
# kill. So: kill by pid, then if the port is still listening, taskkill the
# actual Windows pid bound to it. Only runs when WE started the service
# (pid non-empty) — reused servers are never touched.
kill_tree() { # pid port
  local pid="$1" port="$2"
  [ -n "$pid" ] || return 0
  kill "$pid" 2>/dev/null || true
  sleep 0.3
  if [ -n "$port" ] && is_up "$port"; then
    local winpid
    winpid="$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | awk '{print $NF}' | head -1)"
    [ -n "$winpid" ] && taskkill //F //PID "$winpid" >/dev/null 2>&1 || true
  fi
}

cleanup() {
  set +e
  rm -f "$DROPIN"
  kill_tree "$SERVE_PID" 17720
  kill_tree "$VITE_PID" 17700
  kill_tree "$DAEMON_PID" 17701
}
trap cleanup EXIT

echo "── Building backend ──"
cargo build --manifest-path backend/Cargo.toml

echo "── Starting services (reusing any already running) ──"
if is_up 17701; then
  echo "[e2e] daemon already on :17701 (reusing — NOTE: must be freshly built for current code)"
else
  # Redirect so the daemon's stdout doesn't keep this script's pipe open.
  ./backend/target/debug/auto-os-config-daemon.exe >/dev/null 2>&1 & DAEMON_PID=$!
  wait_up 17701 20
fi

if is_up 17700; then
  echo "[e2e] vite already on :17700 (reusing)"
else
  npm run dev >/dev/null 2>&1 & VITE_PID=$!
  wait_up 17700 30
fi

if is_up 17720; then
  echo "[e2e] remote example already served on :17720 (reusing)"
else
  ( cd examples/remote-module && npm run build && node serve.mjs ) >/dev/null 2>&1 & SERVE_PID=$!
  wait_up 17720 20
fi

echo "── Drop-in for the remote-module test ──"
mkdir -p "$(dirname "$DROPIN")"
cat > "$DROPIN" <<'EOF'
module {
    kind : custom
    id : "example-remote"
    remote : "http://127.0.0.1:17720/config-page.js"
    name : "Example Remote"
    icon : "🧩"
    description : "createComponent(Vue) protocol demo"
}
EOF

echo "── Running E2E suites ──"
# test-remote-module.mjs retired with the createComponent(Vue) protocol
# (Plan 006 Phase 2: custom kind now renders a removal placeholder).
FAIL=0
node test-generic-editor.mjs    || FAIL=1
node test-collection-editor.mjs || FAIL=1
node test-theme-switch.mjs      || FAIL=1

if [ "$FAIL" = 0 ]; then
  echo ""
  echo "=== ALL E2E PASS ==="
else
  echo ""
  echo "=== E2E FAILED ===" >&2
  exit 1
fi
