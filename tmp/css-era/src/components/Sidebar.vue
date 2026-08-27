<!-- Sidebar component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ACCENT_OPTIONS, filterStandalone, filterGroups } from '../../auto/src/front/utils/sidebar_ext'
import { useModulesStore } from '../../auto/src/front/utils/sidebar_ext'
import { useThemeStore } from '../../auto/src/front/utils/sidebar_ext'

const modulesStore = useModulesStore()
const themeStore = useThemeStore()


const search = ref<string>('')

const searching = computed<boolean>(() => !!(search.value.trim()))
const view_standalone = computed<any>(() => filterStandalone(modulesStore.standalone, search.value))
const view_groups = computed<any>(() => filterGroups(modulesStore.groups, search.value))
const has_results = computed<boolean>(() => view_standalone.value.length > 0 || view_groups.value.length > 0)

const emit = defineEmits<{
  SearchChanged: []
  SelectModule: [string]
  ToggleGroup: [string]
  PickAccent: [string]
}>()

function PickAccent(name: any): void {
  themeStore.SetAccent(name);

  emit('PickAccent', name)
}

function SearchChanged(): void {
  search.value = search.value;

  emit('SearchChanged')
}

function SelectModule(mid: any): void {
  modulesStore.Select(mid);

  emit('SelectModule', mid)
}

function ToggleGroup(gid: any): void {
  modulesStore.ToggleGroup(gid);

  emit('ToggleGroup', gid)
}


</script>

<template>
    <aside class="sidebar">
      <div class="sidebar-title">
        <span class="logo">
          <span>⚙️</span>
        </span>
        <span>AutoOS Settings</span>
      </div>
      <div class="search-bar">
        <input class="search-input" :placeholder="'Search settings'" v-model="search" @input="SearchChanged" />
      </div>
      <nav class="nav-list">
        <template v-if="searching == false">
          <button :class="(modulesStore.active_id == m.id ? 'nav-item active' : 'nav-item')" :key="m.id" @click="SelectModule(m.id)" v-for="m in view_standalone">
            <span class="nav-icon">
              <span>{{ m.icon }}</span>
            </span>
            <div class="nav-text">
              <div class="nav-name">
                <span>{{ m.name }}</span>
              </div>
              <div class="nav-desc">
                <span>{{ m.description }}</span>
              </div>
            </div>
          </button>
        </template>
        <div class="group" :key="g.id" v-for="g in view_groups">
          <template v-if="searching">
            <button :class="(modulesStore.active_id == m.id ? 'nav-item indented active' : 'nav-item indented')" :key="m.id" @click="SelectModule(m.id)" v-for="m in g.members">
              <span class="nav-icon">
                <span>{{ m.icon }}</span>
              </span>
              <div class="nav-text">
                <div class="nav-name">
                  <span>{{ m.name }}</span>
                </div>
                <div class="nav-desc">
                  <span>{{ m.description }}</span>
                </div>
              </div>
            </button>
          </template>
          <template v-if="searching == false">
            <button :class="(modulesStore.expanded.includes(g.id) ? 'group-header expanded' : 'group-header')" :key="g.id" @click="ToggleGroup(g.id)">
              <span class="group-chevron">
                <template v-if="modulesStore.expanded.includes(g.id)">
                  <span>▾</span>
                </template>
                <template v-if="modulesStore.expanded.includes(g.id) == false">
                  <span>▸</span>
                </template>
              </span>
              <span class="group-label">
                <span>{{ g.label }}</span>
              </span>
            </button>
            <template v-if="modulesStore.expanded.includes(g.id)">
              <div class="group-members">
                <button :class="(modulesStore.active_id == m.id ? 'nav-item indented active' : 'nav-item indented')" :key="m.id" @click="SelectModule(m.id)" v-for="m in g.members">
                  <span class="nav-icon">
                    <span>{{ m.icon }}</span>
                  </span>
                  <div class="nav-text">
                    <div class="nav-name">
                      <span>{{ m.name }}</span>
                    </div>
                    <div class="nav-desc">
                      <span>{{ m.description }}</span>
                    </div>
                  </div>
                </button>
              </div>
            </template>
          </template>
        </div>
      </nav>
      <template v-if="modulesStore.loading">
        <div class="sidebar-loading">
          <span>Loading modules...</span>
        </div>
      </template>
      <template v-if="modulesStore.loading == false && has_results == false">
        <div class="sidebar-empty">
          <span>No modules found.</span>
        </div>
      </template>
      <div class="theme-picker">
        <div class="theme-label">
          <span>Accent color</span>
        </div>
        <div class="swatches">
          <button :class="(themeStore.current == o.name ? 'swatch active' : 'swatch')" :key="o.name" :style="({ background: o.swatch } as any)" :title="o.label" @click="PickAccent(o.name)" v-for="o in ACCENT_OPTIONS">
            <template v-if="themeStore.current == o.name">
              <svg class="check" height="12" viewBox="0 0 16 16" width="12">
                <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" />
              </svg>
            </template>
          </button>
        </div>
      </div>
    </aside>

</template>

<style>
/* Component styles */

</style>

<style scoped>

        .sidebar {
            width: var(--sidebar-width);
            min-width: var(--sidebar-width);
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .sidebar-title {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 16px 20px;
            font-size: var(--font-size-lg);
            font-weight: 600;
        }
        .logo { font-size: 20px; }
        .search-bar { padding: 8px 16px 12px; }
        .search-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--bg-search);
            font-size: var(--font-size-base);
            outline: none;
        }
        .search-input:focus {
            background: var(--bg-input);
            border-color: var(--border-focus);
        }
        .nav-list {
            flex: 1;
            overflow-y: auto;
            padding: 0 8px;
        }
        .group-header {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: transparent;
            cursor: pointer;
            text-align: left;
            border-radius: var(--radius-sm);
            transition: background 0.12s;
            margin-top: 8px;
        }
        .group-header:hover { background: var(--bg-hover); }
        .group-chevron {
            font-size: 11px;
            color: var(--text-muted);
            width: 14px;
            flex-shrink: 0;
        }
        .group-label {
            font-size: var(--font-size-base);
            font-weight: 600;
            color: var(--text-primary);
        }
        .nav-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: transparent;
            border-radius: var(--radius-sm);
            cursor: pointer;
            text-align: left;
            transition: background 0.12s;
        }
        .nav-item:hover { background: var(--bg-hover); }
        .nav-item.active { background: var(--bg-active); }
        .nav-item.active .nav-name { color: var(--accent); font-weight: 600; }
        .nav-item.indented { padding-left: 28px; }
        .nav-icon {
            font-size: 18px;
            flex-shrink: 0;
            padding-top: 1px;
        }
        .nav-text { flex: 1; min-width: 0; }
        .nav-name { font-size: var(--font-size-base); font-weight: 500; }
        .nav-desc {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sidebar-loading,
        .sidebar-empty {
            padding: 16px;
            text-align: center;
            color: var(--text-muted);
            font-size: var(--font-size-sm);
        }
        .theme-picker {
            padding: 12px 20px 16px;
            border-top: 1px solid var(--border);
            flex-shrink: 0;
        }
        .theme-label {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 10px;
        }
        .swatches { display: flex; gap: 10px; }
        .swatch {
            width: 24px; height: 24px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s, box-shadow 0.12s;
        }
        .swatch:hover { transform: scale(1.12); }
        .swatch.active { box-shadow: 0 0 0 2px var(--bg-sidebar), 0 0 0 4px currentColor; }
        .swatch .check { pointer-events: none; }
    </style>
