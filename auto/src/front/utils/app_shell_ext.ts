// app_shell_ext.ts — AppShell dispatches to the content components. Sidebar
// and DaemonView are generated widgets (direct references); ConfigEditor and
// CollectionBrowser stay hand-written until Phases 3-4 and are consumed
// through this re-export (jade gen_components stub pattern, in reverse).
import ConfigEditor from '../../../../src/components/ConfigEditor.vue'
import CollectionBrowser from '../../../../src/components/CollectionBrowser.vue'

export { ConfigEditor, CollectionBrowser }
