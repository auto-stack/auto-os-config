<!-- DaemonView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref } from 'vue'
import { testDaemon } from '@/lib/api'

const status = ref<string>('idle')
const test_error = ref<string>('')
const latency = ref<number>(0)

const props = defineProps<{
  module_id: string
}>()

const emit = defineEmits<{
  Test: []
}>()

async function Test(): Promise<void> {
  status.value = 'checking';
  test_error.value = '';
  let r = await testDaemon();
  status.value = r.status;
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
          <template v-if="status == 'idle'">
            <span class="text-[#8a8a8a]">not tested</span>
          </template>
          <template v-if="status == 'checking'">
            <span class="text-[#8a8a8a]">testing…</span>
          </template>
          <template v-if="status == 'ok'">
            <span class="font-medium text-[#107c10]">{{ '✓ online (' + latency + 'ms)' }}</span>
          </template>
          <template v-if="status == 'unreachable'">
            <span class="italic text-[#8a8a8a]">offline</span>
          </template>
          <template v-if="status == 'fail'">
            <span class="font-medium text-[#c42b1c]">✗ failed</span>
          </template>
        </span>
        <div class="flex-1" />
        <button class="btn" :disabled="status == 'checking'" @click="Test">Test</button>
      </div>
      <template v-if="status == 'fail' && test_error != ''">
        <p class="test-err">{{ test_error }}</p>
      </template>
      <template v-if="status == 'unreachable'">
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
