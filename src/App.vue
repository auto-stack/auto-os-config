<!-- App component - Auto-generated from Auto language -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CollectionBrowser from './components/CollectionBrowser.vue'
import ConfigEditor from './components/ConfigEditor.vue'
import DaemonView from './components/DaemonView.vue'
import Sidebar from './components/Sidebar.vue'

import { fetchModulesRaw, moduleAt, modulesCount, system_info } from '@/lib/api'

const sys_host = ref<string>('')
const sys_os_edition = ref<string>('')
const sys_os_build = ref<string>('')
const sys_kernel = ref<string>('')
const sys_arch = ref<string>('')
const sys_uptime = ref<string>('')
const sys_cpu = ref<string>('')
const sys_cpu_name = ref<string>('')
const sys_cpu_cores = ref<string>('')
const sys_mem_used = ref<string>('')
const sys_mem_dash = ref<string>('0 100')
const sys_mem_display = ref<string>('')
const disks = ref<any[]>([])
const gpus = ref<any[]>([])
const sys_mod_total = ref<number>(0)
const sys_mod_files = ref<number>(0)
const sys_mod_coll = ref<number>(0)

const emit = defineEmits<{
  Init: []
  SelectModule: [string]
}>()

import { useModulesStore } from './stores/auto/useModulesStore'
import { useThemeStore } from './stores/auto/useThemeStore'
import { reactive } from 'vue'
const store = reactive(useModulesStore())

const themeStore = reactive(useThemeStore())

function SelectModule(mid: any): void {
  store.Select(mid);
}

onMounted(async () => {


  store.Init();


  themeStore.Init();



  let r = await system_info();
  sys_host.value = r.hostname;
  sys_os_edition.value = r.os_edition;
  sys_os_build.value = r.os_version;
  sys_kernel.value = r.kernel;
  sys_arch.value = r.arch;
  sys_cpu.value = r.cpu;
  sys_cpu_name.value = r.cpu_name;
  sys_cpu_cores.value = r.cpu_cores;



  let us = r.uptime_s;
  let ud = Math.floor(us / 86400);
  let uh = Math.floor((us - ud * 86400) / 3600);
  let um = Math.floor((us - ud * 86400 - uh * 3600) / 60);
  if (ud > 0) {sys_uptime.value = ud + 'd ' + uh + 'h ' + um + 'm';
  }
  if (ud == 0 && uh > 0) {sys_uptime.value = uh + 'h ' + um + 'm';
  }
  if (ud == 0 && uh == 0) {sys_uptime.value = um + 'm';
  }


  let mp = r.memory_used_percent;
  sys_mem_used.value = mp;
  let mrest: number = 100 - mp;
  sys_mem_dash.value = mp + ' ' + mrest;
  sys_mem_display.value = r.memory_free_mb + ' / ' + r.memory_total_mb + ' MB free';


  let dl = [];
  for (const d of r.disks) {dl.push({ drive: d.drive, pct: d.used_percent, free: d.free_gb, total: d.total_gb });
  }
  disks.value = dl;

  let gl = [];
  for (const g of r.gpus) {gl.push(g);
  }
  gpus.value = gl;


  let mr = await fetchModulesRaw();
  if (mr.ok) {let mn = await modulesCount(mr.text);
  sys_mod_total.value = mn;
  let files: number = 0;
  let colls: number = 0;
  let i: number = 0;
  while (true) {
  if (i >= mn) {break;
  }let m = await moduleAt(mr.text, i);
  if (m.kind == 'file') {files = files + 1;
  }if (m.kind != 'file') {colls = colls + 1;
  }i = i + 1;
  }
  sys_mod_files.value = files;
  sys_mod_coll.value = colls;
  }
})


</script>

<template>
    <div class="flex flex-row app-layout h-full w-full gap-[0px]">
      <Sidebar :key="'Sidebar-1'" />
      <div class="flex flex-col flex-1 gap-[0px]">
        <div class="flex flex-row content-header h-[48px] w-full shrink-0 items-center gap-[0px] px-6 border-b border-border bg-background">
          <span class="text-xl font-semibold text-foreground">{{ store.title }}</span>
        </div>
        <div class="flex flex-col content-body flex-1 gap-[0px] overflow-auto p-6 bg-background">
          <template v-if="store.loading">
            <div class="flex flex-col state-msg flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-muted">Loading configuration...</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error != ''">
            <div class="flex flex-col state-msg error flex-1 items-center justify-center gap-[0px]">
              <span class="text-base text-[#c42b1c]">{{ '⚠️ ' + store.error }}</span>
            </div>
          </template>
          <template v-if="store.loading == false && store.error == ''">
            <template v-if="store.active_kind == ''">
              <div class="flex flex-col overview flex-1 gap-[0px] overflow-auto p-8 bg-background">
                <span class="text-xs font-semibold text-muted tracking-wider uppercase pb-3">System Overview</span>
                <div class="flex flex-row w-full items-center gap-5 pb-6">
                  <div class="flex flex-col device-tile h-16 w-16 rounded-2xl bg-primary/10 flex-row items-center justify-center gap-[0px] shrink-0">
                    <svg class="h-8 w-8 text-primary" viewBox="0 0 24 24">
                      <rect fill="none" height="14" rx="2" ry="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="20" x="2" y="3" />
                      <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="8" x2="16" y1="21" y2="21" />
                      <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                  </div>
                  <div class="flex flex-col gap-[2px] min-w-0">
                    <span class="text-2xl font-semibold text-foreground">{{ sys_host }}</span>
                    <span class="text-sm text-muted-foreground">{{ sys_os_edition + ' · ' + sys_os_build + ' · ' + sys_arch }}</span>
                  </div>
                  <div class="flex flex-col flex-1 gap-[0px]" />
                  <div class="flex flex-col items-end gap-[2px] shrink-0">
                    <div class="flex flex-row items-center gap-1">
                      <svg class="h-[14px] w-[14px] text-muted" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                        <polyline fill="none" points="12 6 12 12 16 14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                      </svg>
                      <span class="text-xs text-muted">Uptime</span>
                    </div>
                    <span class="text-sm font-medium text-foreground">{{ sys_uptime }}</span>
                  </div>
                </div>
                <span class="text-xs font-semibold text-muted tracking-wider uppercase pb-2">Hardware</span>
                <div class="flex flex-row w-full gap-4 pb-4">
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[144px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <rect fill="none" height="16" rx="2" ry="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="16" x="4" y="4" />
                        <rect fill="none" height="6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="6" x="9" y="9" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="9" x2="9" y1="2" y2="4" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="15" x2="15" y1="2" y2="4" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="9" x2="9" y1="20" y2="22" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="15" x2="15" y1="20" y2="22" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="2" x2="4" y1="9" y2="9" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="2" x2="4" y1="15" y2="15" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="20" x2="22" y1="9" y2="9" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="20" x2="22" y1="15" y2="15" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Processor</span>
                    </div>
                    <span class="text-sm text-foreground">{{ sys_cpu_name }}</span>
                    <span class="text-xs bg-primary/10 text-primary rounded-full px-[10px] py-[2px] w-fit">{{ sys_cpu_cores + ' logical cores' }}</span>
                    <span class="text-xs text-muted">{{ sys_cpu }}</span>
                  </div>
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[144px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <rect fill="none" height="14" rx="2" ry="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="20" x="2" y="3" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="8" x2="16" y1="21" y2="21" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="12" x2="12" y1="17" y2="21" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Graphics</span>
                    </div>
                    <div class="flex flex-row items-center gap-2" v-for="gpu in gpus" :key="(((gpu as any)?.id ?? gpu))">
                      <div class="flex flex-col gap-4 h-[6px] w-[6px] rounded-full bg-primary shrink-0" />
                      <span class="text-sm text-foreground">{{ gpu }}</span>
                    </div>
                    <template v-if="gpus.length == 0">
                      <span class="text-sm text-muted">No GPU detected</span>
                    </template>
                  </div>
                </div>
                <div class="flex flex-row w-full gap-4 pb-6">
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[207px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <rect fill="none" height="8" rx="2" ry="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="20" x="2" y="6" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="8" x2="8" y1="9" y2="11" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="12" x2="12" y1="9" y2="11" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="16" x2="16" y1="9" y2="11" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="6" x2="6" y1="14" y2="17" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="10" x2="10" y1="14" y2="17" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="14" x2="14" y1="14" y2="17" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="18" x2="18" y1="14" y2="17" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Memory</span>
                    </div>
                    <div class="flex flex-row items-center gap-5">
                      <svg class="mem-donut h-[96px] w-[96px] shrink-0 text-primary" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" fill="none" r="15.9155" stroke="#e5e7eb" stroke-width="5" />
                        <circle class="text-primary" cx="18" cy="18" fill="none" r="15.9155" stroke="currentColor" :stroke-dasharray="sys_mem_dash" stroke-dashoffset="25" stroke-linecap="round" stroke-width="5" />
                      </svg>
                      <div class="flex flex-col gap-[2px]">
                        <div class="flex flex-row items-baseline gap-[6px]">
                          <span class="text-2xl font-semibold text-foreground">{{ sys_mem_used + '%' }}</span>
                          <span class="text-xs text-muted">used</span>
                        </div>
                        <span class="text-xs text-muted-foreground">{{ sys_mem_display }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[207px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="22" x2="2" y1="12" y2="12" />
                        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="6" x2="6.01" y1="16" y2="16" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="10" x2="10.01" y1="16" y2="16" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Storage</span>
                    </div>
                    <div class="flex flex-col gap-[10px]">
                      <div class="flex flex-col gap-[4px]" v-for="dsk in disks" :key="(((dsk as any)?.id ?? dsk))">
                        <div class="flex flex-row gap-4 w-full items-center justify-between">
                          <div class="flex flex-row items-center gap-2">
                            <span class="text-xs font-semibold text-foreground">{{ dsk.drive }}</span>
                            <span class="text-xs text-muted-foreground">{{ dsk.pct + '%' }}</span>
                          </div>
                          <span class="text-xs text-muted">{{ dsk.free + ' / ' + dsk.total + ' GB free' }}</span>
                        </div>
                        <progress class="w-full h-2" :class="(dsk.pct > 75 ? 'ov-disk-crit' : ((dsk.pct > 60 ? 'ov-disk-warn' : '')))" :max="100" :value="dsk.pct" />
                      </div>
                    </div>
                  </div>
                </div>
                <span class="text-xs font-semibold text-muted tracking-wider uppercase pb-2">Software</span>
                <div class="flex flex-row w-full gap-4">
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[159px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <rect fill="none" height="16" rx="2" ry="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="20" x="2" y="4" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="2" x2="22" y1="8" y2="8" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="6" x2="6" y1="4" y2="8" />
                        <line stroke="currentColor" stroke-linecap="round" stroke-width="2" x1="10" x2="10" y1="4" y2="8" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Operating System</span>
                    </div>
                    <div class="flex flex-col gap-[6px]">
                      <div class="flex flex-row gap-3">
                        <span class="text-xs text-muted w-24 shrink-0">Edition</span>
                        <span class="text-sm text-foreground">{{ sys_os_edition }}</span>
                      </div>
                      <div class="flex flex-row gap-3">
                        <span class="text-xs text-muted w-24 shrink-0">Kernel</span>
                        <span class="text-sm text-foreground">{{ sys_kernel }}</span>
                      </div>
                      <div class="flex flex-row gap-3">
                        <span class="text-xs text-muted w-24 shrink-0">OS build</span>
                        <span class="text-sm text-foreground">{{ sys_os_build }}</span>
                      </div>
                      <div class="flex flex-row gap-3">
                        <span class="text-xs text-muted w-24 shrink-0">Architecture</span>
                        <span class="text-sm text-foreground">{{ sys_arch }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex flex-col ov-panel flex-1 gap-3 rounded-xl border border-border bg-card px-5 py-4 min-h-[159px]">
                    <div class="flex flex-row items-center gap-2">
                      <svg class="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24">
                        <rect fill="none" height="7" rx="1" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="7" x="3" y="3" />
                        <rect fill="none" height="7" rx="1" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="7" x="14" y="3" />
                        <rect fill="none" height="7" rx="1" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="7" x="14" y="14" />
                        <rect fill="none" height="7" rx="1" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" width="7" x="3" y="14" />
                      </svg>
                      <span class="text-sm font-semibold text-foreground">Managed Modules</span>
                    </div>
                    <div class="flex flex-row items-baseline gap-2">
                      <span class="text-2xl font-semibold text-foreground">{{ sys_mod_total }}</span>
                      <span class="text-sm text-muted-foreground">modules under management</span>
                    </div>
                    <div class="flex flex-row gap-2">
                      <span class="text-xs bg-primary/10 text-primary rounded-full px-[10px] py-[2px]">{{ sys_mod_files + ' config files' }}</span>
                      <span class="text-xs bg-primary/10 text-primary rounded-full px-[10px] py-[2px]">{{ sys_mod_coll + ' collections' }}</span>
                    </div>
                    <span class="text-xs text-muted">Served by the unified AutoOS config daemon</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-if="store.active_kind == 'file'">
              <template v-if="store.active_id == 'ai-daemon'">
                <DaemonView :key="store.active_id" :module_id="store.active_id" />
                <ConfigEditor :key="'aaid-cfg'" :module_id="store.active_id" />
              </template>
              <template v-if="store.active_id != 'ai-daemon'">
                <ConfigEditor :key="store.active_id" :module_id="store.active_id" />
              </template>
            </template>
            <template v-if="store.active_kind == 'collection'">
              <CollectionBrowser :key="store.active_id" :module_id="store.active_id" :read_only="store.read_only" />
            </template>
            <template v-if="store.active_kind != '' && store.active_kind != 'file' && store.active_kind != 'collection'">
              <div class="flex flex-col state-msg flex-1 items-center justify-center gap-[0px]">
                <span class="text-base text-muted">Custom remote modules were removed in Plan 006 (createComponent(Vue) protocol retired).</span>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

</template>

<style>
/* Component styles */

</style>
