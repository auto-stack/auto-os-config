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
const sys_mem = ref<string>('')
const sys_disk = ref<string>('')

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

  emit('SelectModule', mid)
}

onMounted(async () => {


  store.Init();


  themeStore.Init();



  let r = await system_info();
  sys_host.value = r.hostname;
  sys_os.value = r.os_name + ' ' + r.os_version;
  sys_cpu.value = r.cpu;
  sys_mem.value = r.memory_display;
  sys_disk.value = r.storage_display;
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
                <span class="text-2xl font-semibold text-[#1a1a1a]">System Overview</span>
                <span class="text-sm text-[#616161] pb-4">Pick a module below to jump straight into its settings.</span>
                <div class="flex flex-col overview-info w-full gap-[0px] rounded-lg border border-[#e0e0e0] bg-[#f9f9f9] px-4 py-3 mb-4" :key="'sysinfo'">
                  <span class="text-sm font-semibold text-[#1a1a1a] pb-2">System Information</span>
                  <span class="text-xs text-[#616161]">{{ 'Hostname: ' + sys_host }}</span>
                  <span class="text-xs text-[#616161]">{{ 'OS: ' + sys_os }}</span>
                  <span class="text-xs text-[#616161]">{{ 'CPU: ' + sys_cpu }}</span>
                  <span class="text-xs text-[#616161]">{{ 'Memory: ' + sys_mem }}</span>
                  <span class="text-xs text-[#616161]">{{ 'Disk: ' + sys_disk }}</span>
                </div>
                <button class="overview-card w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border border-[#e0e0e0] bg-white hover:bg-[#f5f5f5] text-[#1a1a1a]" :key="m.id" @click="SelectModule(m.id)" v-for="m in store.view_standalone">
                  <div class="flex flex-row items-center gap-3 w-full">
                    <span class="text-2xl shrink-0">{{ m.icon }}</span>
                    <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                      <span class="text-sm font-semibold text-[#1a1a1a]">{{ m.name }}</span>
                      <span class="text-xs text-[#616161]">{{ m.description }}</span>
                    </div>
                  </div>
                </button>
                <div v-for="(g, __for_idx) in store.view_groups" :key="__for_idx">
                  <span class="text-sm font-semibold text-[#1a1a1a] pt-4 pb-1">{{ g.label }}</span>
                  <button class="overview-card w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border border-[#e0e0e0] bg-white hover:bg-[#f5f5f5] text-[#1a1a1a]" :key="m.id" @click="SelectModule(m.id)" v-for="m in g.members">
                    <div class="flex flex-row items-center gap-3 w-full">
                      <span class="text-2xl shrink-0">{{ m.icon }}</span>
                      <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                        <span class="text-sm font-semibold text-[#1a1a1a]">{{ m.name }}</span>
                        <span class="text-xs text-[#616161]">{{ m.description }}</span>
                      </div>
                    </div>
                  </button>
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
