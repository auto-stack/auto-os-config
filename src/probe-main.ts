// probe-main.ts — mounts the Phase 1 DSL probes (Plan 006). Temporary side
// entrance at /probe.html; removed when the probes are retired.
// Uses h() (not a template string): the app's vue import is runtime-only.
import { createApp, h } from 'vue'
import ProbeA from './components/ProbeA.vue'
import ProbeB from './components/ProbeB.vue'
import './styles.css'

createApp({
  render: () => h('div', [h(ProbeA), h('hr'), h(ProbeB)]),
}).mount('#app')
