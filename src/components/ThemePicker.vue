<!-- ThemePicker component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref } from 'vue'

const open = ref<boolean>(false)

const emit = defineEmits<{
  Toggle: []
  Close: []
  SetTheme: [string]
  SetAccent: [string]
}>()

import { useThemeStore } from '../stores/auto/useThemeStore'
import { reactive } from 'vue'
const store = reactive(useThemeStore())

function Close(): void {
  open.value = false;

  emit('Close')
}

function SetAccent(name: any): void {
  store.SetAccent(name);

  emit('SetAccent', name)
}

function SetTheme(m: any): void {
  store.SetMode(m);

  emit('SetTheme', m)
}

function Toggle(): void {
  open.value = !open.value;
}


</script>

<template>
    <div class="flex flex-col theme-picker shrink-0 pt-3 pb-4 px-5 border-t border-border gap-[0px]">
      <div class="w-[240px] bg-card border border-border rounded-lg shadow-lg" :placement="'top-start'">
        <div>
          <button @click="Toggle" class="settings-trigger w-full h-9 flex flex-row items-center gap-2 px-2 rounded-md hover:bg-secondary">
            <span class="text-base leading-none">⚙️</span>
            <span class="text-sm font-medium text-foreground">Settings</span>
          </button>
        </div>
        <div>
          <div v-if="open" class="flex flex-col settings-panel gap-[0px] p-2">
            <span class="settings-section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2">Theme</span>
            <button :class="(store.mode == 'light' ? 'theme-option flex flex-row items-center gap-2 w-full px-2 py-[6px] rounded-md text-sm text-foreground bg-primary/10' : 'theme-option flex flex-row items-center gap-2 w-full px-2 py-[6px] rounded-md text-sm text-foreground hover:bg-secondary')" @click="SetTheme('light')">
              <span class="text-sm leading-none">🌞</span>
              <span class="flex-1 text-left">Light</span>
              <template v-if="store.mode == 'light'">
                <span class="text-xs font-bold text-primary">✓</span>
              </template>
            </button>
            <button :class="(store.mode == 'dark' ? 'theme-option flex flex-row items-center gap-2 w-full px-2 py-[6px] rounded-md text-sm text-foreground bg-primary/10' : 'theme-option flex flex-row items-center gap-2 w-full px-2 py-[6px] rounded-md text-sm text-foreground hover:bg-secondary')" @click="SetTheme('dark')">
              <span class="text-sm leading-none">🌙</span>
              <span class="flex-1 text-left">Dark</span>
              <template v-if="store.mode == 'dark'">
                <span class="text-xs font-bold text-primary">✓</span>
              </template>
            </button>
            <span class="settings-section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-2">Accent color</span>
            <div class="flex flex-row swatches items-center gap-[10px] px-2 pb-1">
              <button :class="(store.current == 'indigo' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#6366f1] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#6366f1] cursor-pointer')" @click="SetAccent('indigo')">
                <template v-if="store.current == 'indigo'">
                  <span class="text-xs font-bold text-white leading-none">✓</span>
                </template>
              </button>
              <button :class="(store.current == 'coral' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#e85d75] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#e85d75] cursor-pointer')" @click="SetAccent('coral')">
                <template v-if="store.current == 'coral'">
                  <span class="text-xs font-bold text-white leading-none">✓</span>
                </template>
              </button>
              <button :class="(store.current == 'ocean' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#3b82f6] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#3b82f6] cursor-pointer')" @click="SetAccent('ocean')">
                <template v-if="store.current == 'ocean'">
                  <span class="text-xs font-bold text-white leading-none">✓</span>
                </template>
              </button>
              <button :class="(store.current == 'sage' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#10b981] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#10b981] cursor-pointer')" @click="SetAccent('sage')">
                <template v-if="store.current == 'sage'">
                  <span class="text-xs font-bold text-white leading-none">✓</span>
                </template>
              </button>
              <button :class="(store.current == 'amber' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#f59e0b] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#f59e0b] cursor-pointer')" @click="SetAccent('amber')">
                <template v-if="store.current == 'amber'">
                  <span class="text-xs font-bold text-white leading-none">✓</span>
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
