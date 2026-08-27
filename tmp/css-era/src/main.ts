// main.ts — handwritten bootstrap (Plan 006特许手写): mounts the generated
// AppShell and loads the design-system CSS. Everything else in src/components
// and src/stores/auto is generated from auto/src/front/*.at.
import { createApp } from 'vue'
import AppShell from './components/AppShell.vue'
import './styles.css'

createApp(AppShell).mount('#app')
