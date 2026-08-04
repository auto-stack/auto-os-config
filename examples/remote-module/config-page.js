// Example remote config-page component for auto-os-config (Plan 003 §2).
//
// This demonstrates the `createComponent(Vue)` factory protocol: the component
// does NOT import vue — it receives the host's single Vue instance as an
// argument. That's what guarantees one shared reactivity system (no second
// Vue copy, no importmap, no vendored runtime).
//
// Build with `npm run build` (vite lib mode, `vue` externalized) and serve the
// resulting dist/config-page.js from any HTTP server. Register it via a drop-in
// TOML with `kind = "custom"` and `remote = "<url>"`.
//
// Two hard rules (documented in plans/003):
//   1. Pre-compiled: use vite lib mode + @vitejs/plugin-vue so <template>
//      becomes render functions. The host Vue is runtime-only (no compiler).
//   2. Never import vue: externalize it and take Vue from the factory arg.

// NOTE: we write this as a plain JS options object (no SFC) so it needs no
// compiler at all — the simplest possible remote. A .vue SFC works too; see
// the vite.config comment.

export function createComponent(Vue) {
  const { ref, onMounted, h } = Vue

  return {
    name: 'ExampleRemoteModule',
    props: { moduleId: String },
    setup(props) {
      const count = ref(0)
      const config = ref(null)
      const error = ref('')

      async function load() {
        // The remote component reads its config via the SAME unified daemon
        // endpoints the generic editor uses — props.moduleId identifies the
        // file. So a custom view is "just UX"; the data layer stays unified.
        try {
          const resp = await fetch(`/api/config/${props.moduleId}`)
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          config.value = (await resp.json()).value
        } catch (e) {
          error.value = e.message || String(e)
        }
      }

      onMounted(load)

      return () =>
        h('div', { class: 'example-remote' }, [
          h('h2', 'Example Remote Module'),
          h('p', { class: 'tagline' }, [
            'This component was loaded from a remote bundle via the ',
            h('code', 'createComponent(Vue)'),
            ' factory. It shares the host’s single Vue instance.',
          ]),
          h('div', { class: 'demo-row' }, [
            h('span', 'Reactivity check: '),
            h('strong', String(count.value)),
            h('button', { class: 'btn', onClick: () => count.value++ }, 'increment'),
            count.value > 0
              ? h('span', { class: 'ok' }, ' ✓ reactivity works (UI updated)')
              : h('span', { class: 'hint' }, ' (click to prove the template re-renders)'),
          ]),
          error.value
            ? h('div', { class: 'err' }, `✗ ${error.value}`)
            : config.value
              ? h(
                  'div',
                  { class: 'cfg' },
                  `Loaded /api/config/${props.moduleId}: ${Object.keys(config.value).length} top-level keys.`,
                )
              : h('div', { class: 'hint' }, 'Loading config…'),
        ])
    },
  }
}
