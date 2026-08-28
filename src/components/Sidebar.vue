<!-- Sidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import ThemePicker from '@/components/ThemePicker.vue'


const emit = defineEmits<{
  SearchChanged: [string]
  SelectModule: [string]
  ToggleGroup: [string]
}>()

import { useModulesStore } from '../stores/auto/useModulesStore'
import { reactive } from 'vue'
const store = reactive(useModulesStore())

function SearchChanged(q: any): void {
  store.Search(q);

  emit('SearchChanged', q)
}

function SelectModule(mid: any): void {
  store.Select(mid);

  emit('SelectModule', mid)
}

function ToggleGroup(gid: any): void {
  store.ToggleGroup(gid);

  emit('ToggleGroup', gid)
}


</script>

<template>
    <aside class="sidebar flex flex-col w-[280px] shrink-0 bg-[#f9f9f9] border-r border-[#e0e0e0]">
      <div class="flex items-center gap-2 px-5 py-4 text-base font-semibold text-[#1a1a1a]">
        <span class="text-xl">⚙️</span>
        <span>AutoOS Settings</span>
      </div>
      <div class="pt-2 px-4 pb-3">
        <input class="search-input w-full px-3 py-2 text-sm bg-[#f0f0f0] border border-[#e0e0e0] rounded" :placeholder="'Search settings'" :value="store.search" @input="SearchChanged(($event.target as HTMLInputElement).value)" />
      </div>
      <nav class="nav-list flex-1 overflow-auto px-2">
        <template v-if="store.search == ''">
          <div v-for="m in store.view_standalone" :key="m.id">
            <template v-if="store.active_id == m.id">
              <button class="nav-item active w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-primary/10 text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                  <span :class="m.name_class">{{ m.name }}</span>
                  <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                </div>
              </button>
            </template>
            <template v-if="store.active_id != m.id">
              <button class="nav-item w-full text-left flex items-start gap-3 px-3 py-[10px] rounded bg-[#f9f9f9] hover:bg-[#ededed] transition-colors duration-[120ms] text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                  <span :class="m.name_class">{{ m.name }}</span>
                  <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                </div>
              </button>
            </template>
          </div>
        </template>
        <div class="contents" :key="g.id" v-for="g in store.view_groups">
          <template v-if="store.search == ''">
            <button class="group-header w-full text-left flex items-center gap-[6px] px-3 py-[10px] mt-2 rounded bg-[#f9f9f9] hover:bg-[#ededed] transition-colors duration-[120ms] text-[#1a1a1a] h-auto" :key="g.id" @click="ToggleGroup(g.id)">
              <template v-if="g.open">
                <span class="text-[11px] text-[#8a8a8a] w-[14px] shrink-0">▾</span>
              </template>
              <template v-if="g.open == false">
                <span class="text-[11px] text-[#8a8a8a] w-[14px] shrink-0">▸</span>
              </template>
              <span class="text-sm font-semibold text-[#1a1a1a]">{{ g.label }}</span>
            </button>
          </template>
          <template v-if="store.search != ''">
            <div v-for="m in g.members" :key="m.id">
              <template v-if="store.active_id == m.id">
                <button class="nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10 text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                  <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                  <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                    <span :class="m.name_class">{{ m.name }}</span>
                    <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                  </div>
                </button>
              </template>
              <template v-if="store.active_id != m.id">
                <button class="nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-[#f9f9f9] hover:bg-[#ededed] transition-colors duration-[120ms] text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                  <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                  <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                    <span :class="m.name_class">{{ m.name }}</span>
                    <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                  </div>
                </button>
              </template>
            </div>
          </template>
          <template v-if="store.search == ''">
            <template v-if="g.open">
              <div v-for="m in g.members" :key="m.id">
                <template v-if="store.active_id == m.id">
                  <button class="nav-item active w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-primary/10 text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                    <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                    <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                      <span :class="m.name_class">{{ m.name }}</span>
                      <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                    </div>
                  </button>
                </template>
                <template v-if="store.active_id != m.id">
                  <button class="nav-item w-full text-left flex items-start gap-3 pl-[28px] pr-3 py-[10px] rounded bg-[#f9f9f9] hover:bg-[#ededed] transition-colors duration-[120ms] text-[#1a1a1a] h-auto" :key="m.id" @click="SelectModule(m.id)">
                    <span class="nav-icon text-lg shrink-0 pt-px">{{ m.icon }}</span>
                    <div class="flex flex-col nav-text flex-1 min-w-0 gap-[0px]">
                      <span :class="m.name_class">{{ m.name }}</span>
                      <span class="nav-desc text-xs text-[#8a8a8a] truncate">{{ m.description }}</span>
                    </div>
                  </button>
                </template>
              </div>
            </template>
          </template>
        </div>
        <template v-if="store.loading">
          <span class="block p-4 text-center text-xs text-[#8a8a8a]">Loading modules...</span>
        </template>
        <template v-if="store.loading == false">
          <template v-if="store.search != ''">
            <template v-if="store.has_results == false">
              <span class="block p-4 text-center text-xs text-[#8a8a8a]">No modules found.</span>
            </template>
          </template>
        </template>
      </nav>
      <ThemePicker :key="'ThemePicker-1'" />
    </aside>

</template>

<style>
/* Component styles */

</style>
