<!-- DaemonView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref } from 'vue'
import { testDaemon } from '@/lib/api'

const conn_state = ref<string>('idle')
const test_error = ref<string>('')
const latency = ref<number>(0)

const props = defineProps<{
  module_id: string
}>()

const emit = defineEmits<{
  Test: []
}>()

async function Test(): Promise<void> {
  conn_state.value = 'checking';
  test_error.value = '';
  let r = await testDaemon();
  conn_state.value = r.status;
  test_error.value = r.error;
  latency.value = r.latency;

  emit('Test')
}


</script>

<template>
    <div class="flex flex-col daemon-view test-card gap-[0px] max-w-[820px]">
      <div class="flex flex-row test-row gap-[14px]">
        <span class="test-label">Daemon connection</span>
        <span class="test-status">
          <template v-if="conn_state == 'idle'">
            <span class="text-[#8a8a8a]">not tested</span>
          </template>
          <template v-if="conn_state == 'checking'">
            <span class="text-[#8a8a8a]">testing…</span>
          </template>
          <template v-if="conn_state == 'ok'">
            <span class="font-medium text-[#107c10]">{{ '✓ online (' + latency + 'ms)' }}</span>
          </template>
          <template v-if="conn_state == 'unreachable'">
            <span class="italic text-[#8a8a8a]">offline</span>
          </template>
          <template v-if="conn_state == 'fail'">
            <span class="font-medium text-[#c42b1c]">✗ failed</span>
          </template>
        </span>
        <div class="flex-1" />
        <button class="btn bg-white border border-[#e0e0e0] rounded px-5 py-2 text-sm text-[#1a1a1a] h-auto" :disabled="conn_state == 'checking'" @click="Test">Test</button>
      </div>
      <template v-if="conn_state == 'fail' && test_error != ''">
        <p class="test-err">{{ test_error }}</p>
      </template>
      <template v-if="conn_state == 'unreachable'">
        <p class="test-hint">
          <span>The AI Daemon (aaid, :17654) is offline. Start it with </span>
          <span class="inline-code">cargo run -p auto-ai-daemon</span>
          <span>. Config fields below can still be edited — they're written to </span>
          <span class="inline-code">ai-daemon.at</span>
          <span> directly.</span>
        </p>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
