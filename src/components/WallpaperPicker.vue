<!-- WallpaperPicker component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { editField, fetchDesktopCfgSafe, imageAt, imageCount, listImagesSafe, putConfigSafe } from '@/lib/api'

const props = defineProps<{
  module_id: string
  field: string
  dir: string
  current: string
}>()

const images = ref<any[]>([])
const scanned = ref<boolean>(false)
const saved_path = ref<string>('')
const saved = ref<string>('0')
const error = ref<string>('')

const emit = defineEmits<{
  Init: []
  Load: []
  Pick: [string]
}>()

async function Load(): Promise<void> {
  let r = await listImagesSafe(props.dir);
  if (r.ok) {let arr = [];
  let n = await imageCount(r.items);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }let im = await imageAt(r.items, i);
  arr.push({ name: im.name, path: im.path });
  i = i + 1;
  }
  images.value = arr;
  error.value = '';
  } else {images.value = [];
  error.value = r.error;
  }
  scanned.value = true;

  emit('Load')
}

async function Pick(path: any): Promise<void> {

  let r = await fetchDesktopCfgSafe(props.module_id);
  if (r.ok) {let body = await editField(r.body, props.field, path);
  let w = await putConfigSafe(props.module_id, body);
  if (w.ok) {saved_path.value = path;
  saved.value = '1';
  error.value = '';
  } else {error.value = w.error;
  }} else {error.value = r.error;
  }

  emit('Pick', path)
}

onMounted(async () => {
  let r = await listImagesSafe(props.dir);
  if (r.ok) {let arr = [];
  let n = await imageCount(r.items);
  let i: number = 0;
  while (true) {
  if (i >= n) {break;
  }let im = await imageAt(r.items, i);
  arr.push({ name: im.name, path: im.path });
  i = i + 1;
  }
  images.value = arr;
  error.value = '';
  } else {images.value = [];
  error.value = r.error;
  }
  scanned.value = true;
})


</script>

<template>
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center gap-2">
        <button class="h-7 px-3 text-xs bg-muted text-muted-foreground rounded-lg" @click="Load">扫描目录</button>
        <span class="text-xs text-muted-foreground">{{ dir }}</span>
      </div>
      <template v-if="error != ''">
        <span class="text-xs text-muted-foreground">{{ error }}</span>
      </template>
      <template v-if="scanned && images.length == 0">
        <span class="text-xs text-muted-foreground">目录无图片(或目录不可读)— 可用手输路径 / #hex / builtin:</span>
      </template>
      <template v-if="scanned && images.length > 0">
        <span class="text-xs text-muted-foreground">点击即应用(桌面宿主热生效)：</span>
        <div class="flex flex-col flex-row flex-wrap gap-2">
          <button class="h-7 px-2 text-[10px] bg-muted text-muted-foreground rounded border border-border hover:bg-background max-w-[180px] truncate" @click="Pick(it.path)" v-for="it in images" :key="(((it as any)?.id ?? it))">{{ it.name }}</button>
        </div>
      </template>
      <template v-if="saved == '1'">
        <div class="flex flex-row items-center gap-2">
          <span class="text-xs text-success">已应用：</span>
          <span class="text-xs text-foreground">{{ saved_path }}</span>
        </div>
      </template>
      <template v-else-if="current != ''">
        <div class="flex flex-row items-center gap-2">
          <span class="text-xs text-muted-foreground">当前：</span>
          <span class="text-xs text-foreground">{{ current }}</span>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
