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
    <div class="flex flex-col theme-picker shrink-0 pt-3 pb-4 px-5 border-t border-[#e0e0e0] gap-[0px]">
      <span class="theme-label text-xs font-semibold text-[#8a8a8a] mb-[10px]">Accent color</span>
      <div class="flex flex-row swatches items-center gap-[10px]">
        <button :class="(store.current == 'indigo' ? 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#6366f1] shadow-[0_0_0_2px_#f9f9f9,0_0_0_4px_#1a1a1a] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#6366f1] cursor-pointer hover:scale-[1.12]')" @click="Pick('indigo')">
          <template v-if="store.current == 'indigo'">
            <span class="text-xs font-bold text-white leading-none">✓</span>
          </template>
        </button>
        <button :class="(store.current == 'coral' ? 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#e85d75] shadow-[0_0_0_2px_#f9f9f9,0_0_0_4px_#1a1a1a] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#e85d75] cursor-pointer hover:scale-[1.12]')" @click="Pick('coral')">
          <template v-if="store.current == 'coral'">
            <span class="text-xs font-bold text-white leading-none">✓</span>
          </template>
        </button>
        <button :class="(store.current == 'ocean' ? 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#3b82f6] shadow-[0_0_0_2px_#f9f9f9,0_0_0_4px_#1a1a1a] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#3b82f6] cursor-pointer hover:scale-[1.12]')" @click="Pick('ocean')">
          <template v-if="store.current == 'ocean'">
            <span class="text-xs font-bold text-white leading-none">✓</span>
          </template>
        </button>
        <button :class="(store.current == 'sage' ? 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#10b981] shadow-[0_0_0_2px_#f9f9f9,0_0_0_4px_#1a1a1a] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#10b981] cursor-pointer hover:scale-[1.12]')" @click="Pick('sage')">
          <template v-if="store.current == 'sage'">
            <span class="text-xs font-bold text-white leading-none">✓</span>
          </template>
        </button>
        <button :class="(store.current == 'amber' ? 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#f59e0b] shadow-[0_0_0_2px_#f9f9f9,0_0_0_4px_#1a1a1a] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent p-0 flex items-center justify-center bg-[#f59e0b] cursor-pointer hover:scale-[1.12]')" @click="Pick('amber')">
          <template v-if="store.current == 'amber'">
            <span class="text-xs font-bold text-white leading-none">✓</span>
          </template>
        </button>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
