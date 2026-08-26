// main.ts — handwritten bootstrap (Plan 006特许手写): mounts the generated
// root and loads the design-system CSS. Everything else in src/components
// and src/stores/auto is generated from auto/src/front/*.at.
// Plan 008 batch 6: mounts App.vue — the shared root from app.at (vue regen
// + vm consume the same file; the AppShell-era ext shims are retired).
// Plan 008 Phase 1: Inter (matches the vm renderer's default font) →
// Tailwind (shared class vocabulary + preflight) → styles.css (tokens must
// stay last so the named-class residual keeps overriding preflight).
import { createApp } from 'vue'
import App from './App.vue'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './tailwind.css'
import './styles.css'

createApp(App).mount('#app')
