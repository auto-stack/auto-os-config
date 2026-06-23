<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConfigModule } from '../composables/useModules'

const props = defineProps<{
  modules: ConfigModule[]
  activeId: string | null
  loading: boolean
}>()

const emit = defineEmits<{ select: [id: string] }>()

const search = ref('')

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
</style>
