<!-- DaemonView component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref } from 'vue'
import { testDaemon } from '@/lib/api'

const status = ref<string>('idle')
const test_error = ref<string>('')

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

  emit('Test')
}


</script>

<template>
    <div class="flex flex-col gap-4 daemon-view test-card bg-white border border-[#e0e0e0] rounded-lg px-[18px] py-[14px] gap-2 max-w-[820px]">
      <div class="flex flex-row gap-4 test-row items-center gap-[14px]">
        <span class="test-label font-semibold text-sm text-[#1a1a1a]">Daemon connection</span>
        <span class="test-status text-xs">
          <template v-if="status == 'idle'">
            <span class="text-[#8a8a8a]">not tested</span>
          </template>
          <template v-if="status == 'checking'">
            <span class="text-[#8a8a8a]">testing…</span>
          </template>
          <template v-if="status == 'ok'">
            <span class="font-medium text-[#107c10]">✓ online</span>
          </template>
          <template v-if="status == 'unreachable'">
            <span class="text-[#8a8a8a]">offline</span>
          </template>
          <template v-if="status == 'fail'">
            <span class="font-medium text-[#c42b1c]">✗ failed</span>
          </template>
        </span>
        <div class="flex-1" />
        <button class="btn px-[14px] py-1 rounded text-xs border border-[#e0e0e0] bg-white text-[#1a1a1a] hover:bg-[#ededed]" @click="Test">Test</button>
      </div>
      <template v-if="status == 'fail' && test_error != ''">
        <span class="test-err text-xs font-mono text-[#c42b1c]">{{ test_error }}</span>
      </template>
      <template v-if="status == 'unreachable'">
        <span class="test-hint text-xs text-[#616161]">The AI Daemon (aaid, :17654) is offline. Start it with cargo run -p auto-ai-daemon. Config fields below can still be edited — they're written to ai-daemon.at directly.</span>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
