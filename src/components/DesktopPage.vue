<!-- DesktopPage component - Auto-generated from Auto language -->
<script setup lang="ts">
import WallpaperPicker from '@/components/WallpaperPicker.vue'


const emit = defineEmits<{
  Nav: [string]
  PickPosition: [string]
  PickEnabled: [string]
  DraftPinned: [string]
  SavePinned: []
  PickNotes: [string]
  DraftWallpaper: [string]
  SaveWallpaper: []
  DraftWallpapersDir: [string]
  SaveWallpapersDir: []
  PickTheme: [string]
  PickTransparency: [string]
}>()

import { useDesktopCfgStore } from '../stores/auto/useDesktopCfgStore'
import { reactive } from 'vue'
const store = reactive(useDesktopCfgStore())

function DraftPinned(v: any): void {
  store.DraftPinned(v);

  emit('DraftPinned', v)
}

function DraftWallpaper(v: any): void {
  store.DraftWallpaper(v);

  emit('DraftWallpaper', v)
}

function DraftWallpapersDir(v: any): void {
  store.DraftWallpapersDir(v);

  emit('DraftWallpapersDir', v)
}

function Nav(s: any): void {
  store.Nav(s);

  emit('Nav', s)
}

function PickEnabled(v: any): void {
  store.PickEnabled(v);

  emit('PickEnabled', v)
}

function PickNotes(v: any): void {
  store.PickNotes(v);

  emit('PickNotes', v)
}

function PickPosition(v: any): void {
  store.PickPosition(v);

  emit('PickPosition', v)
}

function PickTheme(v: any): void {
  store.PickTheme(v);

  emit('PickTheme', v)
}

function PickTransparency(v: any): void {
  store.PickTransparency(v);

  emit('PickTransparency', v)
}

function SavePinned(): void {
  store.SavePinned();

  emit('SavePinned')
}

function SaveWallpaper(): void {
  store.SaveWallpaper();

  emit('SaveWallpaper')
}

function SaveWallpapersDir(): void {
  store.SaveWallpapersDir();

  emit('SaveWallpapersDir')
}


</script>

<template>
    <div class="flex flex-col flex-1 p-4 gap-2">
      <template v-if="store.loading">
        <span class="text-xs text-muted">Loading desktop config...</span>
      </template>
      <template v-if="store.loading == false && store.error != ''">
        <span class="text-sm text-destructive">{{ store.error }}</span>
      </template>
      <template v-if="store.loading == false && store.error == ''">
        <div class="flex flex-row gap-1 pb-2 border-b border-border">
          <template v-if="store.section == 'dock'">
            <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">Dock</button>
          </template>
          <template v-else>
            <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="Nav('dock')">Dock</button>
          </template>
          <template v-if="store.section == 'notes'">
            <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">通知</button>
          </template>
          <template v-else>
            <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="Nav('notes')">通知</button>
          </template>
          <template v-if="store.section == 'appearance'">
            <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">外观</button>
          </template>
          <template v-else>
            <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="Nav('appearance')">外观</button>
          </template>
          <template v-if="store.section == 'about'">
            <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">关于</button>
          </template>
          <template v-else>
            <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="Nav('about')">关于</button>
          </template>
        </div>
        <div class="flex flex-col flex-1 p-4 gap-3">
          <template v-if="store.section == 'dock'">
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">位置</span>
              <div class="flex flex-row gap-2">
                <template v-if="store.cfg_dock_position == 'bottom'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">底部</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickPosition('bottom')">底部</button>
                </template>
                <template v-if="store.cfg_dock_position == 'top'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">顶部</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickPosition('top')">顶部</button>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">显示 Dock</span>
              <div class="flex flex-row gap-2">
                <template v-if="store.cfg_dock_enabled == '1'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">开</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickEnabled('1')">开</button>
                </template>
                <template v-if="store.cfg_dock_enabled == '0'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">关</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickEnabled('0')">关</button>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">固定应用（逗号分隔 app id）</span>
              <input class="flex-1 text-sm text-foreground bg-background rounded-lg border border-border px-2" :placeholder="'011-calculator,013-todo,015-notes'" :value="store.pinned_draft" @input="DraftPinned(($event.target as HTMLInputElement).value)" />
              <div class="flex flex-row items-center gap-2">
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="SavePinned">保存并热同步</button>
                <span class="text-xs text-muted-foreground">空值 = 复位默认三枚；桌面宿主热应用</span>
              </div>
              <template v-if="store.pinned_saved == '1'">
                <span class="text-success text-xs">已保存</span>
              </template>
              <template v-else>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-xs text-muted-foreground">当前：</span>
                  <span class="text-xs text-foreground">{{ store.cfg_dock_pinned }}</span>
                </div>
              </template>
            </div>
          </template>
          <template v-if="store.section == 'notes'">
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">通知中心</span>
              <div class="flex flex-row gap-2">
                <template v-if="store.cfg_notes_enabled == '1'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">开</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickNotes('1')">开</button>
                </template>
                <template v-if="store.cfg_notes_enabled == '0'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">关</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickNotes('0')">关</button>
                </template>
              </div>
              <span class="text-xs text-muted-foreground">关闭后桌面 notify 全链路短路（入史/toast/未读）</span>
            </div>
          </template>
          <template v-if="store.section == 'appearance'">
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">壁纸</span>
              <span class="text-xs text-muted-foreground">图片路径或 #hex 色值；内置宣纸/水墨可填 builtin:ricepaper / builtin:inkwash</span>
              <div class="flex flex-row items-center gap-2">
                <input class="flex-1 text-sm text-foreground bg-background rounded-lg border border-border px-2" :placeholder="'D:\\wallpaper.png 或 #243b55'" :value="store.wallpaper_draft" @input="DraftWallpaper(($event.target as HTMLInputElement).value)" />
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="SaveWallpaper">保存</button>
              </div>
              <WallpaperPicker :current="store.cfg_wallpaper" :dir="store.cfg_wallpapers_dir" :field="'cfg_wallpaper'" :module_id="'desktop'" :key="'WallpaperPicker-1'" />
              <template v-if="store.wallpaper_saved == '1'">
                <span class="text-success text-xs">已保存，桌面宿主热应用</span>
              </template>
              <template v-else>
                <div class="flex flex-row items-center gap-2">
                  <span class="text-xs text-muted-foreground">当前：</span>
                  <span class="text-xs text-foreground">{{ store.cfg_wallpaper }}</span>
                </div>
              </template>
              <div class="flex flex-row items-center gap-2">
                <input class="flex-1 text-sm text-foreground bg-background rounded-lg border border-border px-2" :placeholder="'壁纸目录，如 D:\\wallpapers'" :value="store.wallpapers_dir_draft" @input="DraftWallpapersDir(($event.target as HTMLInputElement).value)" />
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="SaveWallpapersDir">保存目录</button>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">主题</span>
              <div class="flex flex-row gap-2">
                <template v-if="store.cfg_theme == 'dark'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">深色</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickTheme('dark')">深色</button>
                </template>
                <template v-if="store.cfg_theme == 'light'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">浅色</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickTheme('light')">浅色</button>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">窗口透明度</span>
              <div class="flex flex-row gap-2">
                <template v-if="store.cfg_transparency == 'off'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">关</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickTransparency('off')">关</button>
                </template>
                <template v-if="store.cfg_transparency == 'low'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">低</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickTransparency('low')">低</button>
                </template>
                <template v-if="store.cfg_transparency == 'high'">
                  <button class="h-8 px-4 text-xs bg-primary text-primary-foreground rounded-lg">高</button>
                </template>
                <template v-else>
                  <button class="h-8 px-4 text-xs bg-muted text-muted-foreground rounded-lg" @click="PickTransparency('high')">高</button>
                </template>
              </div>
            </div>
          </template>
          <template v-if="store.section == 'about'">
            <div class="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">关于</span>
              <div class="flex flex-row items-center gap-2">
                <span class="text-xs text-muted-foreground">虚拟桌面</span>
                <span class="text-xs text-foreground">Auto Desktop（auto-lang ui_desktop / desktop-host）</span>
              </div>
              <div class="flex flex-row items-center gap-2">
                <span class="text-xs text-muted-foreground">配置单源</span>
                <span class="text-xs text-foreground">~/.config/autoos/apps/desktop/config.at</span>
              </div>
              <span class="text-xs text-muted-foreground">桌面宿主读取同一文件并在变更后热应用（≤2s）</span>
            </div>
          </template>
        </div>
      </template>
    </div>

</template>

<style>
/* Component styles */

</style>
