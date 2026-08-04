<script setup lang="ts">
// The one custom view in the unified architecture: the AI Daemon config page.
//
// It's just the generic ConfigEditor + a "Test connection" button that pings
// the live daemon (the only feature that needs aaid online — it actually
// calls the LLM). When aaid is offline the button is disabled with a hint.
// Everything else (providers, models, tier routing, API keys) is edited by the
// generic editor against the ai-daemon.at file.

import { ref, watch } from 'vue'
import ConfigEditor from './ConfigEditor.vue'

// The module id is passed in (Plan 003 unified front/back ids); it's 'ai-daemon'
// for the built-in daemon, but a DaemonView could wrap any file module that
// exposes a test-connection action.
const props = defineProps<{ moduleId: string }>()
const moduleId = props.moduleId

// ---- connection test ----
type Status = 'idle' | 'checking' | 'ok' | 'fail' | 'unreachable'
const status = ref<Status>('idle')
const latency = ref<number | null>(null)
const testError = ref('')

async function testConnection() {
  status.value = 'checking'
  latency.value = null
  testError.value = ''
  try {
    const t0 = performance.now()
    const resp = await fetch('/api/action/test-daemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The backend reads ai-daemon.at for provider/model details, so the
      // body just flags "test the default". (Endpoint proxies to aaid :17654.)
      body: JSON.stringify({ use_default: true }),
      signal: AbortSignal.timeout(20000),
    })
    latency.value = Math.round(performance.now() - t0)
    if (resp.status === 503) {
      status.value = 'unreachable'
      return
    }
    const j = await resp.json().catch(() => ({}))
    if (resp.ok && j.success) status.value = 'ok'
    else {
      status.value = 'fail'
      testError.value = j.error || `HTTP ${resp.status}`
    }
  } catch (e: any) {
    status.value = 'fail'
    testError.value = e.message || String(e)
  }
}

// Reset status when entering the view.
watch(
  () => moduleId,
  () => {
    status.value = 'idle'
  },
  { immediate: true },
)
</script>

<template>
  <div class="daemon-view">
    <div class="test-card">
      <div class="test-row">
        <span class="test-label">Daemon connection</span>
        <span class="test-status" :class="status">
          <template v-if="status === 'idle'">not tested</template>
          <template v-else-if="status === 'checking'">testing…</template>
          <template v-else-if="status === 'ok'">✓ online ({{ latency }}ms)</template>
          <template v-else-if="status === 'unreachable'">offline</template>
          <template v-else>✗ failed</template>
        </span>
        <button class="btn" :disabled="status === 'checking'" @click="testConnection">Test</button>
      </div>
      <p v-if="status === 'fail' && testError" class="test-err">{{ testError }}</p>
      <p v-if="status === 'unreachable'" class="test-hint">
        The AI Daemon (aaid, :17654) is offline. Start it with
        <code>cargo run -p auto-ai-daemon</code>. Config fields below can still be
        edited — they're written to <code>ai-daemon.at</code> directly.
      </p>
    </div>

    <ConfigEditor :module-id="moduleId" />
  </div>
</template>

<style scoped>
.daemon-view {
  max-width: 820px;
}
.test-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  padding: 14px 18px;
  margin-bottom: 16px;
}
.test-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.test-label {
  font-weight: 600;
  font-size: var(--font-size-base);
}
.test-status {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}
.test-status.ok {
  color: var(--success);
  font-weight: 500;
}
.test-status.fail {
  color: var(--danger);
  font-weight: 500;
}
.test-status.unreachable {
  color: var(--text-muted);
  font-style: italic;
}
.btn {
  margin-left: auto;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 4px 14px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.btn:hover:not(:disabled) {
  background: var(--bg-hover);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.test-err {
  margin: 8px 0 0 0;
  font-size: var(--font-size-sm);
  color: var(--danger);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.test-hint {
  margin: 8px 0 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}
.test-hint code {
  background: var(--bg-hover);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
