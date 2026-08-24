<!-- SmokePanel component - Auto-generated from Auto language -->
<script setup lang="ts">

const n = defineModel<number>("n", { default: 0 })

const emit = defineEmits<{
  Ping: []
}>()

function Ping(): void {
  n.value = n.value + 1;

  emit('Ping')
}


</script>

<template>
    <div class="smoke">
      <span>smoke {{ n }}</span>
      <button @click="Ping">ping</button>
    </div>

</template>

<style>
/* Component styles */

</style>
