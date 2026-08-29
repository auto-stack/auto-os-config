<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CollectionBrowser from './components/CollectionBrowser.vue'
import ConfigEditor from './components/ConfigEditor.vue'
import DaemonView from './components/DaemonView.vue'
import Sidebar from './components/Sidebar.vue'

import { system_info } from '@/lib/api'

const sys_host = ref<string>('')
const sys_os = ref<string>('')
const sys_cpu = ref<string>('')
const sys_cpu_name = ref<string>('')
const sys_cpu_cores = ref<string>('')
const sys_mem_bar = ref<string>('')
const sys_mem_display = ref<string>('')
const disks = ref<any[]>([])
const gpus = ref<any[]>([])

const emit = defineEmits<{
  Init: []
  SelectModule: [string]
}>()

import { useModulesStore } from './stores/auto/useModulesStore'
import { useThemeStore } from './stores/auto/useThemeStore'
import { reactive } from 'vue'
const store = reactive(useModulesStore())

const themeStore = reactive(useThemeStore())

function SelectModule(mid: any): void {
  store.Select(mid);
}

onMounted(async () => {


  store.Init();


  themeStore.Init();



  let r = await system_info();
  sys_host.value = r.hostname;
  sys_os.value = r.os_name + ' ' + r.os_version;
  sys_cpu.value = r.cpu;
  sys_cpu_name.value = r.cpu_name;
  sys_cpu_cores.value = r.cpu_cores;
  sys_mem_bar.value = r.memory_bar;
  sys_mem_display.value = r.memory_display;
  disks.value = r.disks;
  gpus.value = r.gpus;
})


</script>

<template>
    <div class="flex flex-row app-layout h-full w-full gap-[0px]">
      <Sidebar :key="'Sidebar-1'" />
      <div class="flex flex-col flex-1 gap-[0px]">
        <div class="flex flex-row content-header h-[48px] w-full shrink-0 items-center gap-[0px] px-6 border-b border-[#e0e0e0] bg-white">
          <span class="text-xl font-semibold text-[#1a1a1a]">{{ store.title }}</span>
        </div>
        <div class="flex flex-col content-body flex-1 gap-[0px] overflow-auto p-6 bg-white">
          <template v-if="store.loading">
            <div class="flex flex-col state-msg flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-[#8a8a8a]">Loading configuration...</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error != ''">
            <div class="flex flex-col state-msg error flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-[#c42b1c]">{{ '⚠️ ' + store.error }}</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error == ''">
            <template v-if="store.active_kind == ''">
              <div class="flex flex-col overview flex-1 gap-[0px] overflow-auto p-8 bg-white">
                <span class="text-2xl font-semibold text-[#1a1a1a] pb-1">System Overview</span>
                <span class="text-sm text-[#616161] pb-4">{{ sys_host + ' · ' + sys_os }}</span>
                <div class="flex flex-row w-full gap-3 pb-3">
                  <div class="flex flex-col ov-panel flex-1 gap-[6px] rounded-lg border border-[#e0e0e0] bg-[#f9f9f9] px-4 py-3">
                    <span class="text-sm font-semibold text-[#1a1a1a]">CPU</span>
                    <span class="text-sm text-[#1a1a1a]">{{ sys_cpu_name }}</span>
                    <span class="text-xs text-[#616161]">{{ sys_cpu_cores + ' logical cores' }}</span>
                    <span class="text-xs text-[#8a8a8a]">{{ sys_cpu }}</span>
                  </div>
                  <div class="flex flex-col ov-panel flex-1 gap-[6px] rounded-lg border border-[#e0e0e0] bg-[#f9f9f9] px-4 py-3">
                    <span class="text-sm font-semibold text-[#1a1a1a]">GPU</span>
                    <span class="text-sm text-[#1a1a1a]" v-for="gpu in gpus" :key="(((gpu as any)?.id ?? gpu))">{{ gpu }}</span>
                  </div>
                </div>
                <div class="flex flex-row w-full gap-3">
                  <div class="flex flex-col ov-panel flex-1 gap-[6px] rounded-lg border border-[#e0e0e0] bg-[#f9f9f9] px-4 py-3">
                    <span class="text-sm font-semibold text-[#1a1a1a]">Memory</span>
                    <span class="text-sm text-[#1a1a1a]">{{ sys_mem_bar }}</span>
                    <span class="text-xs text-[#616161]">{{ sys_mem_display }}</span>
                  </div>
                  <div class="flex flex-col ov-panel flex-1 gap-[6px] rounded-lg border border-[#e0e0e0] bg-[#f9f9f9] px-4 py-3">
                    <span class="text-sm font-semibold text-[#1a1a1a]">Storage</span>
                    <span class="text-xs text-[#616161]" v-for="dsk in disks" :key="(((dsk as any)?.id ?? dsk))">{{ dsk.display }}</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-if="store.active_kind == 'file'">
              <template v-if="store.active_id == 'ai-daemon'">
                <DaemonView :key="store.active_id" :module_id="store.active_id" />
                <ConfigEditor :key="'aaid-cfg'" :module_id="store.active_id" />
              </template>
              <template v-if="store.active_id != 'ai-daemon'">
                <ConfigEditor :key="store.active_id" :module_id="store.active_id" />
              </template>
            </template>
            <template v-if="store.active_kind == 'collection'">
              <CollectionBrowser :key="store.active_id" :module_id="store.active_id" :read_only="store.read_only" />
            </template>
            <template v-if="store.active_kind != '' && store.active_kind != 'file' && store.active_kind != 'collection'">
              <div class="flex flex-col state-msg flex-1 items-center justify-center gap-[0px]">
                <span class="text-base text-[#8a8a8a]">Custom remote modules were removed in Plan 006 (createComponent(Vue) protocol retired).</span>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
