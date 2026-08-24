<!-- AppShell component - Auto-generated from Auto language -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { CollectionBrowser } from '../../auto/src/front/utils/app_shell_ext'
import { ConfigEditor } from '../../auto/src/front/utils/app_shell_ext'
import { useModulesStore } from '../../auto/src/front/utils/modules_store_ext'

const modulesStore = useModulesStore()

import DaemonView from '@/components/DaemonView.vue'
import Sidebar from '@/components/Sidebar.vue'


const emit = defineEmits<{
  Init: []
}>()

onMounted(() => {
  modulesStore.Init();
})


</script>

<template>
    <div class="layout">
      <Sidebar :key="'Sidebar-1'" />
      <main class="content">
        <header class="content-header">
          <h1>
            <span>{{ modulesStore.title }}</span>
          </h1>
        </header>
        <div class="content-body">
          <template v-if="modulesStore.loading">
            <div class="state-msg">
              <p>
                <span>Loading configuration...</span>
              </p>
            </div>
          </template>
          <template v-else-if="modulesStore.error != ''">
            <div class="state-msg error">
              <p>
                <span>⚠️ {{ modulesStore.error }}</span>
              </p>
            </div>
          </template>
          <template v-else-if="modulesStore.active_kind == ''">
            <div class="state-msg">
              <p>
                <span>Select a module from the left to configure it.</span>
              </p>
            </div>
          </template>
          <template v-else-if="modulesStore.active_kind == 'file'">
            <template v-if="modulesStore.active_id == 'ai-daemon'">
              <DaemonView :key="modulesStore.active_id" :module_id="modulesStore.active_id" />
            </template>
            <template v-else>
              <ConfigEditor :key="modulesStore.active_id" :module_id="modulesStore.active_id" />
            </template>
          </template>
          <template v-else-if="modulesStore.active_kind == 'collection'">
            <CollectionBrowser :key="modulesStore.active_id" :module_id="modulesStore.active_id" :read_only="modulesStore.read_only" />
          </template>
          <template v-else>
            <div class="state-msg">
              <p>
                <span>Custom remote modules were removed in Plan 006 (createComponent(Vue) protocol retired).</span>
              </p>
            </div>
          </template>
        </div>
      </main>
    </div>

</template>

<style>
/* Component styles */

</style>

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
