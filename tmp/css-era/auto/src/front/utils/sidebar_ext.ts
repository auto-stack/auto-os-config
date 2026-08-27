// sidebar_ext.ts — dual-resolution shim: Sidebar consumes BOTH stores plus
// the accent palette and the search filters through this module.
export { useModulesStore, filterStandalone, filterGroups } from './modules_store_ext'
export { useThemeStore, ACCENT_OPTIONS } from './theme_ext'
