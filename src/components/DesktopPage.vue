<!-- DesktopPage component - Auto-generated from Auto language -->
<script setup lang="ts">

const emit = defineEmits<{
  Nav: [string]
  PickPosition: [string]
  PickEnabled: [string]
  DraftPinned: [string]
  SavePinned: []
  PickNotes: [string]
  PickAccent: [string]
  DraftWallpapersDir: [string]
  SaveWallpapersDir: []
  RequestWallpaperPick: []
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

function DraftWallpapersDir(v: any): void {
  store.DraftWallpapersDir(v);

  emit('DraftWallpapersDir', v)
}

function Nav(s: any): void {
  store.Nav(s);

  emit('Nav', s)
}

function PickAccent(name: any): void {
  store.PickAccent(name);

  emit('PickAccent', name)
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

function RequestWallpaperPick(): void {
  store.RequestWallpaperPick();

  emit('RequestWallpaperPick')
}

function SavePinned(): void {
  store.SavePinned();

  emit('SavePinned')
}

function SaveWallpapersDir(): void {
  store.SaveWallpapersDir();

  emit('SaveWallpapersDir')
}


</script>

<template>
    <div class="flex flex-col gap-4 flex-1">
      <template v-if="store.loading">
        <span class="text-xs text-muted">Loading desktop config...</span>
      </template>
      <template v-if="store.loading == false && store.error != ''">
        <span class="text-sm text-destructive">{{ store.error }}</span>
      </template>
      <template v-if="store.loading == false && store.error == ''">
        <div class="flex flex-row w-fit inline-flex h-9 items-center gap-[4px] rounded-lg bg-muted p-[4px] mb-[16px]">
          <template v-if="store.section == 'appearance'">
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-background text-foreground border-0 shadow-sm">显示</button>
          </template>
          <template v-else>
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-muted text-muted-foreground border-0" @click="Nav('appearance')">显示</button>
          </template>
          <template v-if="store.section == 'dock'">
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-background text-foreground border-0 shadow-sm">Dock</button>
          </template>
          <template v-else>
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-muted text-muted-foreground border-0" @click="Nav('dock')">Dock</button>
          </template>
          <template v-if="store.section == 'notes'">
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-background text-foreground border-0 shadow-sm">通知</button>
          </template>
          <template v-else>
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-muted text-muted-foreground border-0" @click="Nav('notes')">通知</button>
          </template>
          <template v-if="store.section == 'about'">
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-background text-foreground border-0 shadow-sm">关于</button>
          </template>
          <template v-else>
            <button class="h-7 px-3 text-xs font-medium rounded-md bg-muted text-muted-foreground border-0" @click="Nav('about')">关于</button>
          </template>
        </div>
        <div class="flex flex-col gap-4 flex-1">
          <template v-if="store.section == 'dock'">
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border mb-[16px]">
              <span class="text-sm font-medium text-foreground">位置</span>
              <div class="flex flex-row items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                <template v-if="store.cfg_dock_position == 'bottom'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">底部</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickPosition('bottom')">底部</button>
                </template>
                <template v-if="store.cfg_dock_position == 'top'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">顶部</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickPosition('top')">顶部</button>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border mb-[16px]">
              <span class="text-sm font-medium text-foreground">显示 Dock</span>
              <div class="flex flex-row items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                <template v-if="store.cfg_dock_enabled == '1'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">开</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickEnabled('1')">开</button>
                </template>
                <template v-if="store.cfg_dock_enabled == '0'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">关</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickEnabled('0')">关</button>
                </template>
              </div>
            </div>
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">固定应用（逗号分隔 app id）</span>
              <input class="flex-1 text-sm text-foreground bg-background rounded-lg border border-border px-2" :placeholder="'011-calculator,013-todo,015-notes'" :value="store.pinned_draft" @input="DraftPinned(($event.target as HTMLInputElement).value)" />
              <div class="flex flex-row items-center gap-[8px]">
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="SavePinned">保存并热同步</button>
                <span class="text-xs text-muted-foreground">空值 = 清空固定项；桌面宿主热应用</span>
              </div>
              <template v-if="store.pinned_saved == '1'">
                <span class="text-success text-xs">已保存</span>
              </template>
              <template v-else>
                <div class="flex flex-row items-center gap-[8px]">
                  <span class="text-xs text-muted-foreground">当前：</span>
                  <span class="text-xs text-foreground">{{ store.cfg_dock_pinned }}</span>
                </div>
              </template>
            </div>
          </template>
          <template v-if="store.section == 'notes'">
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">通知中心</span>
              <div class="flex flex-row items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                <template v-if="store.cfg_notes_enabled == '1'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">开</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickNotes('1')">开</button>
                </template>
                <template v-if="store.cfg_notes_enabled == '0'">
                  <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">关</button>
                </template>
                <template v-else>
                  <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickNotes('0')">关</button>
                </template>
              </div>
              <span class="text-xs text-muted-foreground">关闭后桌面 notify 全链路短路（入史/toast/未读）</span>
            </div>
          </template>
          <template v-if="store.section == 'appearance'">
            <div class="flex flex-row w-full gap-[16px] mb-[16px]">
              <div class="flex flex-col flex-1 gap-[10px] p-4 bg-card rounded-xl border border-border">
                <span class="text-sm font-medium text-foreground">主题</span>
                <div class="flex flex-row items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                  <template v-if="store.cfg_theme == 'dark'">
                    <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">深色</button>
                  </template>
                  <template v-else>
                    <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickTheme('dark')">深色</button>
                  </template>
                  <template v-if="store.cfg_theme == 'light'">
                    <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">浅色</button>
                  </template>
                  <template v-else>
                    <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickTheme('light')">浅色</button>
                  </template>
                </div>
              </div>
              <div class="flex flex-col flex-1 gap-[10px] p-4 bg-card rounded-xl border border-border">
                <span class="text-sm font-medium text-foreground">主色调</span>
                <div class="flex flex-row swatches items-center gap-[10px] h-8">
                  <button :class="(store.accent == 'indigo' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#6366f1] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#6366f1] cursor-pointer')" @click="PickAccent('indigo')">
                    <template v-if="store.accent == 'indigo'">
                      <span class="text-xs font-bold text-white leading-none">✓</span>
                    </template>
                  </button>
                  <button :class="(store.accent == 'coral' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#e85d75] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#e85d75] cursor-pointer')" @click="PickAccent('coral')">
                    <template v-if="store.accent == 'coral'">
                      <span class="text-xs font-bold text-white leading-none">✓</span>
                    </template>
                  </button>
                  <button :class="(store.accent == 'ocean' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#3b82f6] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#3b82f6] cursor-pointer')" @click="PickAccent('ocean')">
                    <template v-if="store.accent == 'ocean'">
                      <span class="text-xs font-bold text-white leading-none">✓</span>
                    </template>
                  </button>
                  <button :class="(store.accent == 'sage' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#10b981] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#10b981] cursor-pointer')" @click="PickAccent('sage')">
                    <template v-if="store.accent == 'sage'">
                      <span class="text-xs font-bold text-white leading-none">✓</span>
                    </template>
                  </button>
                  <button :class="(store.accent == 'amber' ? 'swatch w-6 h-6 rounded-full border-2 border-foreground flex flex-row items-center justify-center bg-[#f59e0b] cursor-pointer' : 'swatch w-6 h-6 rounded-full border-2 border-transparent flex flex-row items-center justify-center bg-[#f59e0b] cursor-pointer')" @click="PickAccent('amber')">
                    <template v-if="store.accent == 'amber'">
                      <span class="text-xs font-bold text-white leading-none">✓</span>
                    </template>
                  </button>
                </div>
              </div>
              <div class="flex flex-col flex-1 gap-[10px] p-4 bg-card rounded-xl border border-border">
                <span class="text-sm font-medium text-foreground">窗口透明度</span>
                <div class="flex flex-row items-center rounded-lg bg-muted p-[3px] gap-[3px] w-fit">
                  <template v-if="store.cfg_transparency == 'off'">
                    <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">关</button>
                  </template>
                  <template v-else>
                    <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickTransparency('off')">关</button>
                  </template>
                  <template v-if="store.cfg_transparency == 'low'">
                    <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">低</button>
                  </template>
                  <template v-else>
                    <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickTransparency('low')">低</button>
                  </template>
                  <template v-if="store.cfg_transparency == 'high'">
                    <button class="h-7 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-md border-0">高</button>
                  </template>
                  <template v-else>
                    <button class="h-7 px-3 text-xs text-muted-foreground rounded-md border-0" @click="PickTransparency('high')">高</button>
                  </template>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">壁纸</span>
              <div class="flex flex-row items-center gap-[8px]">
                <input class="flex-1 text-sm text-foreground bg-background rounded-lg border border-border px-2" :placeholder="'壁纸目录，如 D:\\wallpapers'" :value="store.wallpapers_dir_draft" @input="DraftWallpapersDir(($event.target as HTMLInputElement).value)" />
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="SaveWallpapersDir">保存目录</button>
                <button class="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-lg" @click="RequestWallpaperPick">切换壁纸</button>
              </div>
            </div>
          </template>
          <template v-if="store.section == 'about'">
            <div class="flex flex-col gap-[10px] p-4 bg-card rounded-xl border border-border">
              <span class="text-sm font-medium text-foreground">关于</span>
              <div class="flex flex-row items-center gap-[8px]">
                <span class="text-xs text-muted-foreground">虚拟桌面</span>
                <span class="text-xs text-foreground">Auto Desktop（auto-lang ui_desktop / desktop-host）</span>
              </div>
              <div class="flex flex-row items-center gap-[8px]">
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
