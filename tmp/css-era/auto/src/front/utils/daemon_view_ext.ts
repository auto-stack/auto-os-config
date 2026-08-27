// daemon_view_ext.ts — DaemonView wraps the (still hand-written until Plan
// 006 Phase 4) generic ConfigEditor. When Phase 4 replaces it with the
// generated component, this re-export keeps pointing at the same path and
// the swap happens underneath. testDaemon relays the transport fn (use-block
// imports must live under auto/src/front/).
import ConfigEditor from '../../../../src/components/ConfigEditor.vue'

export { ConfigEditor }
export { testDaemon } from '../../../../src/lib/api'

