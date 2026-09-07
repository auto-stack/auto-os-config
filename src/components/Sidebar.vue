<!-- Sidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import ThemePicker from '@/components/ThemePicker.vue'


const emit = defineEmits<{
  SearchChanged: [string]
  SelectModule: [string]
  ToggleGroup: [string]
  SelectOverview: []
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

function SelectOverview(): void {
  store.Overview();

  emit('SelectOverview')
}

function ToggleGroup(gid: any): void {
  store.ToggleGroup(gid);

  emit('ToggleGroup', gid)
}


</script>

<template>
    <aside class="sidebar flex flex-col w-[280px] shrink-0 bg-card border-r border-border">
      <div class="flex items-center gap-2 px-5 py-4 text-base font-semibold text-foreground h-[50px]">
        <span class="text-xl">⚙️</span>
        <span>AutoOS Settings</span>
      </div>
      <div class="w-full min-h-0 flex-1 flex flex-col">
        <div class="px-2 pt-2">
          <input class="w-full text-sm px-2.5 py-1.5 rounded-md border border-border bg-background outline-none focus:border-primary transition-colors" :placeholder="'Search settings'" :value="store.search" @input="SearchChanged(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="nav-list flex-1 overflow-auto px-2 pt-2 flex flex-col">
          <div>
            <div>
              <button :class="(store.active_kind == '' ? 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-primary font-medium bg-primary/10 select-none cursor-pointer transition-colors h-[50px] mb-1' : 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors hover:bg-secondary h-[50px] mb-1')" :active="store.active_kind == ''" :key="'ov-home'" :size="'lg'" @click="SelectOverview">
                <div class="flex flex-row items-center gap-2">
                  <span>🏠</span>
                  <div class="flex flex-col gap-4 items-start">
                    <span class="nav-name">System Overview</span>
                    <span class="text-xs text-muted-foreground">System information dashboard</span>
                  </div>
                </div>
              </button>
            </div>
            <template v-if="store.search == ''">
              <div v-for="m in store.view_standalone" :key="(((m as any)?.id ?? m))">
                <button :class="(store.active_id == m.id ? 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-primary font-medium bg-primary/10 select-none cursor-pointer transition-colors' : 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors hover:bg-secondary')" :active="store.active_id == m.id" :key="m.id" :size="'lg'" @click="SelectModule(m.id)">
                  <div class="flex flex-row items-center gap-2">
                    <span>{{ m.icon }}</span>
                    <div class="flex flex-col gap-4 items-start">
                      <span class="nav-name">{{ m.name }}</span>
                      <span class="text-xs text-muted-foreground">{{ m.description }}</span>
                    </div>
                  </div>
                </button>
              </div>
            </template>
          </div>
          <div v-for="g in store.view_groups" :key="g.id">
            <template v-if="store.search == ''">
              <div class="flex flex-col">
                <button class="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground cursor-pointer select-none transition-colors hover:bg-secondary" :key="g.id" @click="ToggleGroup(g.id)">
                  <span>{{ g.label }}</span>
                  <template v-if="g.open">
                    <span class="ml-auto text-muted-foreground">▾</span>
                  </template>
                  <template v-if="g.open == false">
                    <span class="ml-auto text-muted-foreground">▸</span>
                  </template>
                </button>
                <template v-if="g.open">
                  <div>
                    <div>
                      <div v-for="m in g.members" :key="(((m as any)?.id ?? m))">
                        <button :class="(store.active_id == m.id ? 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-primary font-medium bg-primary/10 select-none cursor-pointer transition-colors' : 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors hover:bg-secondary')" :active="store.active_id == m.id" :key="m.id" :size="'lg'" @click="SelectModule(m.id)">
                          <div class="flex flex-row items-center gap-2">
                            <span>{{ m.icon }}</span>
                            <div class="flex flex-col gap-4 items-start">
                              <span class="nav-name">{{ m.name }}</span>
                              <span class="text-xs text-muted-foreground">{{ m.description }}</span>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </template>
            <template v-if="store.search != ''">
              <div>
                <div v-for="m in g.members" :key="(((m as any)?.id ?? m))">
                  <button :class="(store.active_id == m.id ? 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-primary font-medium bg-primary/10 select-none cursor-pointer transition-colors' : 'nav-item flex w-full items-start justify-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors hover:bg-secondary')" :active="store.active_id == m.id" :key="m.id" :size="'lg'" @click="SelectModule(m.id)">
                    <div class="flex flex-row items-center gap-2">
                      <span>{{ m.icon }}</span>
                      <div class="flex flex-col gap-4 items-start">
                        <span class="nav-name">{{ m.name }}</span>
                        <span class="text-xs text-muted-foreground">{{ m.description }}</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </template>
          </div>
          <template v-if="store.loading">
            <span class="block p-4 text-center text-xs text-muted">Loading modules...</span>
          </template>
          <template v-if="store.loading == false">
            <template v-if="store.search != ''">
              <template v-if="store.has_results == false">
                <span class="block p-4 text-center text-xs text-muted">No modules found.</span>
              </template>
            </template>
          </template>
        </div>
      </div>
      <ThemePicker :key="'ThemePicker-1'" />
    </aside>

</template>

<style>
/* Component styles */

</style>
