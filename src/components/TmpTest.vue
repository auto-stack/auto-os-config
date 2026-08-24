<!-- TmpTest component - Auto-generated from Auto language -->
<script setup lang="ts">
import { useModulesStore } from '../../auto/src/front/utils/modules_store_ext'

const modulesStore = useModulesStore()


const search = defineModel<string>("search", { default: '' })

const emit = defineEmits<{
  SearchChanged: []
  SelectModule: [string]
  ToggleGroup: [string]
  PickAccent: []
}>()

function SearchChanged(): void {
  search.value = search.value;
}

function SelectModule(target: any): void {
  modulesStore.Select(target);

  emit('SelectModule', target)
}

function ToggleGroup(gid: any): void {
  modulesStore.ToggleGroup(gid);
}


</script>

<template>
    <div>
      <button @click="SelectModule('x')">
        <span>g</span>
      </button>
    </div>

</template>

<style>
/* Component styles */

</style>
