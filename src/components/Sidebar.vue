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
      <nav class="nav-list flex-1 overflow-auto px-2 pt-2 flex flex-col">
        <div class="nav-search flex items-center gap-2 mx-3 mb-2 px-3 h-9 rounded-md border border-input bg-muted/50 text-sm shrink-0">
          <span class="h-4 w-4 shrink-0 text-muted-foreground shrink-0">🔍</span>
          <input class="w-full bg-transparent border-0 outline-none placeholder:text-muted-foreground text-foreground text-sm" :value="store.search" placeholder="Search settings" @input="SearchChanged(($event.target as HTMLInputElement).value)" />
        </div>
        <button class="nav-item flex w-full items-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors h-[50px] mb-1" :data-active="!!(store.active_kind == '')" :class="store.active_kind == '' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'" type="button" @click="SelectOverview">
          <span class="inline-flex items-center justify-center h-5 w-5 shrink-0">🏠</span>
          <span class="flex flex-col min-w-0">
            <span class="nav-name truncate">{{'System Overview'}}</span>
            <span class="text-xs text-muted-foreground truncate">{{'System information dashboard'}}</span>
          </span>
        </button>
        <template v-if="store.search == ''">
          <button class="nav-item flex w-full items-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors" :data-active="!!(store.active_id == m.id)" :class="store.active_id == m.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'" type="button" @click="SelectModule(m.id)" v-for="m in store.view_standalone" :key="(((m as any)?.id ?? m))">
            <span class="inline-flex items-center justify-center h-5 w-5 shrink-0">{{m.icon}}</span>
            <span class="flex flex-col min-w-0">
              <span class="nav-name truncate">{{m.name}}</span>
              <span class="text-xs text-muted-foreground truncate">{{m.description}}</span>
            </span>
          </button>
        </template>
        <div v-for="(g, __for_idx) in store.view_groups" :key="__for_idx">
          <template v-if="store.search == ''">
            <div class="nav-group flex flex-col">
              <button type="button" class="nav-group-toggle flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground cursor-pointer select-none hover:bg-accent" @click="ToggleGroup(g.id)">
                <span v-if="g.open" class="text-[11px] text-muted-foreground w-[14px] shrink-0">▾</span>
                <span v-else class="text-[11px] text-muted-foreground w-[14px] shrink-0">▸</span>
                <span class="truncate"></span>
              </button>
              <div v-show="g.open" class="nav-group-content flex flex-col gap-1">
                <button class="nav-item flex w-full items-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors" :data-active="!!(store.active_id == m.id)" :class="store.active_id == m.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'" type="button" @click="SelectModule(m.id)" v-for="m in g.members" :key="(((m as any)?.id ?? m))">
                  <span class="inline-flex items-center justify-center h-5 w-5 shrink-0">{{m.icon}}</span>
                  <span class="flex flex-col min-w-0">
                    <span class="nav-name truncate">{{m.name}}</span>
                    <span class="text-xs text-muted-foreground truncate">{{m.description}}</span>
                  </span>
                </button>
              </div>
            </div>
          </template>
          <template v-if="store.search != ''">
            <button class="nav-item flex w-full items-start gap-3 rounded-md px-3 py-[10px] text-sm text-left text-foreground select-none cursor-pointer transition-colors" :data-active="!!(store.active_id == m.id)" :class="store.active_id == m.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent hover:text-accent-foreground'" type="button" @click="SelectModule(m.id)" v-for="m in g.members" :key="(((m as any)?.id ?? m))">
              <span class="inline-flex items-center justify-center h-5 w-5 shrink-0">{{m.icon}}</span>
              <span class="flex flex-col min-w-0">
                <span class="nav-name truncate">{{m.name}}</span>
                <span class="text-xs text-muted-foreground truncate">{{m.description}}</span>
              </span>
            </button>
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
      </nav>
      <ThemePicker :key="'ThemePicker-1'" />
    </aside>

</template>

<style>
/* Component styles */

</style>
