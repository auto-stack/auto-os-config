<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { onMounted } from 'vue'
import CollectionBrowser from './components/CollectionBrowser.vue'
import ConfigEditor from './components/ConfigEditor.vue'
import DaemonView from './components/DaemonView.vue'
import Sidebar from './components/Sidebar.vue'


const emit = defineEmits<{
  Init: []
}>()

import { useModulesStore } from './stores/auto/useModulesStore'
import { useThemeStore } from './stores/auto/useThemeStore'
import { reactive } from 'vue'
const store = reactive(useModulesStore())

onMounted(() => {
  store.Init();


  useThemeStore().Init();
})


</script>

<template>
    <div class="flex flex-row gap-4 app-layout h-full w-full gap-[0px]">
      <Sidebar :key="'Sidebar-1'" />
      <div class="flex flex-col gap-4 flex-1 gap-[0px]">
        <div class="flex flex-row gap-4 content-header h-[48px] shrink-0 items-center gap-[0px] px-6 border-b border-[#e0e0e0] bg-white">
          <span class="text-xl font-semibold text-[#1a1a1a]">{{ store.title }}</span>
        </div>
        <div class="flex flex-col gap-4 content-body flex-1 gap-[0px] overflow-auto p-6">
          <template v-if="store.loading">
            <div class="flex flex-col gap-4 state-msg flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-[#8a8a8a]">Loading configuration...</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error != ''">
            <div class="flex flex-col gap-4 state-msg error flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-[#c42b1c]">{{ '⚠️ ' + store.error }}</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error == ''">
            <template v-if="store.active_kind == ''">
              <div class="flex flex-col gap-4 state-msg flex-1 items-center justify-center gap-[0px]">
                <span class="text-base text-[#8a8a8a]">Select a module from the left to configure it.</span>
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
              <div class="flex flex-col gap-4 state-msg flex-1 items-center justify-center gap-[0px]">
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
