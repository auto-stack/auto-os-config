<script setup lang="ts">
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import { useModules } from './composables/useModules'

const {
  modules, groups, expandedGroups, activeModuleId, activeComponent, loading, error,
  loadModules, selectModule, standaloneModules, groupMembers, toggleGroup,
} = useModules()

onMounted(() => {
  loadModules()
})
</script>

<template>
  <div class="layout">
    <Sidebar
      :modules="modules"
      :groups="groups"
      :expanded-groups="expandedGroups"
      :active-id="activeModuleId"
      :loading="loading"
      :standalone="standaloneModules()"
      :group-members="groupMembers"
      :toggle-group="toggleGroup"
      @select="selectModule"
    />
    <main class="content">
      <header class="content-header">
        <h1>{{ modules.find(m => m.id === activeModuleId)?.name || 'AutoOS Settings' }}</h1>
      </header>
      <div class="content-body">
        <!-- Loading state -->
        <div v-if="loading" class="state-msg">
          <p>Loading configuration...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="state-msg error">
          <p>⚠️ {{ error }}</p>
        </div>

        <!-- No selection -->
        <div v-else-if="!activeComponent" class="state-msg">
          <p>Select a module from the left to configure it.</p>
        </div>

        <!-- Module config page (federated remote component) -->
        <component v-else :is="activeComponent" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.content-header h1 {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.state-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: var(--font-size-lg);
}

.state-msg.error {
  color: var(--danger);
}
</style>
