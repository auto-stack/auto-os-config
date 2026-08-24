<!-- DaemonView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ConfigEditor } from '../../auto/src/front/utils/daemon_view_ext'
import { testDaemon } from '../../auto/src/front/utils/daemon_view_ext'


const status = defineModel<string>("status", { default: 'idle' })
const latency = defineModel<number>("latency", { default: 0 })
const test_error = defineModel<string>("test_error", { default: '' })

const props = defineProps<{
  module_id: string
}>()

const emit = defineEmits<{
  Test: []
}>()

function Test(): void {
  status.value = 'checking';
  latency.value = 0;
  test_error.value = '';


  let p = testDaemon();
  p.then((r: any) => { status.value = r.status;
  latency.value = r.latency;
  test_error.value = r.error;
   });

  emit('Test')
}


</script>

<template>
    <div class="daemon-view">
      <div class="test-card">
        <div class="test-row">
          <span class="test-label">
            <span>Daemon connection</span>
          </span>
          <span :class="'test-status ' + status">
            <template v-if="status == 'idle'">
              <span>not tested</span>
            </template>
            <template v-if="status == 'checking'">
              <span>testing…</span>
            </template>
            <template v-if="status == 'ok'">
              <span>✓ online ({{ latency }}ms)</span>
            </template>
            <template v-if="status == 'unreachable'">
              <span>offline</span>
            </template>
            <template v-if="status == 'fail'">
              <span>✗ failed</span>
            </template>
          </span>
          <button class="btn" :disabled="status == 'checking'" @click="Test">
            <span>Test</span>
          </button>
        </div>
        <template v-if="status == 'fail' && test_error != ''">
          <p class="test-err">
            <span>{{ test_error }}</span>
          </p>
        </template>
        <template v-if="status == 'unreachable'">
          <p class="test-hint">
            <span>The AI Daemon (aaid, :17654) is offline. Start it with </span>
            <div>
              <span>cargo run -p auto-ai-daemon</span>
            </div>
            <span>. Config fields below can still be edited — they're written to </span>
            <div>
              <span>ai-daemon.at</span>
            </div>
            <span> directly.</span>
          </p>
        </template>
      </div>
      <ConfigEditor :key="module_id" :module_id="module_id" />
    </div>

</template>

<style>
/* Component styles */

</style>

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
