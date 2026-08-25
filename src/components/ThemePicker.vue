<!-- ThemePicker component - Auto-generated from Auto language -->
<script setup lang="ts">

const emit = defineEmits<{
  Pick: [string]
}>()

import { useThemeStore } from '../stores/auto/useThemeStore'
import { reactive } from 'vue'
const store = reactive(useThemeStore())

function Pick(name: any): void {
  store.SetAccent(name);

  emit('Pick', name)
}


</script>

<template>
    <div class="flex flex-col gap-4 theme-picker shrink-0 pt-3 pb-4 px-5 gap-2">
      <div class="h-px bg-[#e0e0e0] mb-1" />
      <span class="theme-label text-xs font-semibold text-[#8a8a8a]">Accent color</span>
      <div class="flex flex-row gap-4 swatches items-center gap-2">
        <button :class="(store.current == 'indigo' ? 'swatch active px-3 py-1 rounded-full text-xs text-white bg-[#6366f1] shadow-md border-2 border-white' : 'swatch px-3 py-1 rounded-full text-xs text-white bg-[#6366f1]')" @click="Pick('indigo')">Indigo</button>
        <button :class="(store.current == 'coral' ? 'swatch active px-3 py-1 rounded-full text-xs text-white bg-[#e85d75] shadow-md border-2 border-white' : 'swatch px-3 py-1 rounded-full text-xs text-white bg-[#e85d75]')" @click="Pick('coral')">Coral</button>
        <button :class="(store.current == 'ocean' ? 'swatch active px-3 py-1 rounded-full text-xs text-white bg-[#3b82f6] shadow-md border-2 border-white' : 'swatch px-3 py-1 rounded-full text-xs text-white bg-[#3b82f6]')" @click="Pick('ocean')">Ocean</button>
        <button :class="(store.current == 'sage' ? 'swatch active px-3 py-1 rounded-full text-xs text-white bg-[#10b981] shadow-md border-2 border-white' : 'swatch px-3 py-1 rounded-full text-xs text-white bg-[#10b981]')" @click="Pick('sage')">Sage</button>
        <button :class="(store.current == 'amber' ? 'swatch active px-3 py-1 rounded-full text-xs text-white bg-[#f59e0b] shadow-md border-2 border-white' : 'swatch px-3 py-1 rounded-full text-xs text-white bg-[#f59e0b]')" @click="Pick('amber')">Amber</button>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
