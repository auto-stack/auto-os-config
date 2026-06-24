<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConfigModule } from '../composables/useModules'
import { useTheme } from '../composables/useTheme'

const props = defineProps<{
  modules: ConfigModule[]
  activeId: string | null
  loading: boolean
}>()

const emit = defineEmits<{ select: [id: string] }>()

const search = ref('')

const { current: accent, setAccent, options: accentOptions } = useTheme()

const filtered = computed(() => {
  if (!search.value.trim()) return props.modules
  const q = search.value.toLowerCase()
  return props.modules.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q),
  )
})
</script>

<template>
  <aside class="sidebar">
    <!-- Title -->
    <div class="sidebar-title">
      <span class="logo">⚙️</span>
      <span>AutoOS Settings</span>
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <input
        v-model="search"
        type="text"
        placeholder="Search settings"
        class="search-input"
      />
    </div>

    <!-- Module list -->
    <nav class="nav-list">
      <div class="nav-group-label">System</div>
      <button
        v-for="mod in filtered"
        :key="mod.id"
        class="nav-item"
        :class="{ active: mod.id === activeId }"
        @click="emit('select', mod.id)"
      >
        <span class="nav-icon">{{ mod.icon }}</span>
        <div class="nav-text">
          <div class="nav-name">{{ mod.name }}</div>
          <div class="nav-desc">{{ mod.description }}</div>
        </div>
      </button>
    </nav>

    <!-- Loading indicator -->
    <div v-if="loading" class="sidebar-loading">
      Loading modules...
    </div>

    <!-- Empty state -->
    <div v-if="!loading && filtered.length === 0" class="sidebar-empty">
      No modules found.
    </div>

    <!-- Accent color picker — pinned to the bottom.
         Writes --primary on <html>; every page (incl. remote modules) follows. -->
    <div class="theme-picker">
      <div class="theme-label">Accent color</div>
      <div class="swatches">
        <button
          v-for="opt in accentOptions"
          :key="opt.name"
          class="swatch"
          :class="{ active: accent === opt.name }"
          :style="{ background: opt.swatch }"
          :title="opt.label"
          :aria-label="opt.label"
          @click="setAccent(opt.name)"
        >
          <svg v-if="accent === opt.name" class="check" viewBox="0 0 16 16" width="12" height="12">
            <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

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

.logo {
  font-size: 20px;
}

.search-bar {
  padding: 8px 16px 12px;
}

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

.nav-group-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  padding: 12px 12px 4px;
  font-weight: 600;
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
.nav-item:hover {
  background: var(--bg-hover);
}
.nav-item.active {
  background: var(--bg-active);
}
.nav-item.active .nav-name {
  color: var(--accent);
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
  padding-top: 1px;
}

.nav-text {
  flex: 1;
  min-width: 0;
}

.nav-name {
  font-size: var(--font-size-base);
  font-weight: 500;
}

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

/* ── Accent color picker (pinned to sidebar bottom) ────────────────────────── */
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
.swatches {
  display: flex;
  gap: 10px;
}
.swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s, box-shadow 0.12s;
}
.swatch:hover {
  transform: scale(1.12);
}
.swatch.active {
  box-shadow: 0 0 0 2px var(--bg-sidebar), 0 0 0 4px currentColor;
}
.swatch .check {
  pointer-events: none;
}
</style>
