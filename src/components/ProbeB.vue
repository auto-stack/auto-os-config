<!-- ProbeB component - Auto-generated from Auto language -->
<script setup lang="ts">
import { computed } from 'vue'

const config = defineModel<any>("config", { default: {provider: {api_key: 'orig', models: ['m1']}} })
const marker = defineModel<string>("marker", { default: '' })

const key_len = computed<any>(() => config.value.provider.api_key.length)
const models_len = computed<any>(() => config.value.provider.models.length)

const emit = defineEmits<{
  SafeSetKey: []
  RiskySetKey: []
  SafeAddModel: []
  RiskyAddModel: []
  MarkerInput: []
}>()

function MarkerInput(): void {
  marker.value = marker.value;

  emit('MarkerInput')
}

function RiskyAddModel(): void {
  config.value.provider.models.push('r2');

  emit('RiskyAddModel')
}

function RiskySetKey(): void {
  config.value.provider.api_key = 'risky';

  emit('RiskySetKey')
}

function SafeAddModel(): void {
  let ms = config.value.provider.models.concat(['s2']);
  config.value = { provider: { api_key: config.value.provider.api_key, models: ms } };

  emit('SafeAddModel')
}

function SafeSetKey(): void {
  config.value = { provider: { api_key: 'safe', models: config.value.provider.models } };

  emit('SafeSetKey')
}


</script>

<template>
    <div class="probe-b">
      <div class="pb-safe">
        <span>safe: key={{ config.provider.api_key }} len={{ key_len }} models={{ models_len }}</span>
      </div>
      <div class="pb-key">
        <span>key-view={{ config.provider.api_key }}</span>
      </div>
      <div class="pb-models">
        <span>models-view={{ config.provider.models.join(',') }}</span>
      </div>
      <input class="pb-marker" v-model="marker" @input="MarkerInput" />
      <button class="pb-btn-safe" @click="SafeSetKey">
        <span>safe-set</span>
      </button>
      <button class="pb-btn-risky" @click="RiskySetKey">
        <span>risky-set</span>
      </button>
      <button class="pb-btn-adds" @click="SafeAddModel">
        <span>safe-add</span>
      </button>
      <button class="pb-btn-addr" @click="RiskyAddModel">
        <span>risky-add</span>
      </button>
    </div>

</template>

<style>
/* Component styles */

</style>
