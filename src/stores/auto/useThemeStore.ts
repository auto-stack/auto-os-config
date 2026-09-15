import { ref } from 'vue'
import { loadAccent, saveAccent, loadMode, saveMode } from '../../lib/api'

const current = ref<string>('indigo')
const dark_mode = ref<boolean>(true)
const accent_color = ref<string>('indigo')
const mode = ref<string>('dark')

export function useThemeStore(): any {
    const Init = async () => { current.value = await loadAccent();
accent_color.value = current.value;
mode.value = await loadMode();
dark_mode.value = mode.value == 'dark';
 }
    const SetAccent = async (name: string) => { current.value = name;
accent_color.value = name;
await saveAccent(name);
; applyAccent(accent_color.value, dark_mode.value) }
    const SetMode = async (m: string) => { mode.value = m;
dark_mode.value = m == 'dark';
await saveMode(m);
 }
    return {
        current,
        dark_mode,
        accent_color,
        mode,
        Init,
        SetAccent,
        SetMode,
        get accent_names() {
            return getAccentNames();
        },
    }
}


// Plan 360: Accent color palette (aligned with auto-forge).
// Each entry maps a name → shadcn --primary HSL triplet (space-separated).
const ACCENT_PALETTES: Record<string, string> = {
  indigo: '239 84% 67%',
  // Plan 503: coral 校准至 stella-os 玫瑰粉 light #c4706a(dark +4 由 applyAccent 处理)。
  coral:  '4 43% 59%',
  ocean:  '217 91% 60%',
  sage:   '160 84% 39%',
  amber:  '38 92% 50%',
}
const ACCENT_NAMES = Object.keys(ACCENT_PALETTES)
const ACCENT_STORAGE_KEY = 'notes-accent-color'

/** Apply the named accent by writing the --primary CSS variable.
 *  Also adjusts lightness up slightly in dark mode for readability.
 *  HSL values are stored as "H S% L%" (shadcn format); the % is preserved
 *  so we use parseFloat to read the numeric part for the lightness tweak.
 *
 *  The variable is written to BOTH <html> AND any element carrying the
 *  `.dark` class. This is necessary because the generated dark-mode CSS
 *  puts `.dark { --primary: ... }` on a root wrapper div, which would
 *  otherwise shadow the value inherited from <html>. We use a microtask
 *  (setTimeout 0) for the .dark pass so Vue has flushed the :class change. */
function applyAccent(name: string, isDark = false): void {
  const hsl = ACCENT_PALETTES[name]
  if (!hsl) return
  let finalHsl = hsl
  // Dark mode: boost lightness for contrast against dark backgrounds.
  // PLAN-601 D2 归一：+4 → +10（与 Rust/VM 侧 accent_primary_hsl 统一，
  // coral 校准/stella 对齐实证为准；vue 暗色 accent 视觉微调在案）。
  if (isDark) {
    const match = hsl.match(/^(\d+\s+[\d.]+%)\s+([\d.]+)%$/)
    if (match) {
      const boosted = Math.min(85, parseFloat(match[2]) + 10)
      finalHsl = match[1] + ' ' + boosted + '%'
    }
  }
  const root = document.documentElement
  root.style.setProperty('--primary', finalHsl)
  // Also set on any .dark element so it overrides the .dark { --primary }
  // rule defined in index.css (which lives on a different element than <html>).
  // Done synchronously AND on next tick (covers both: dark already applied,
  // and dark just toggled — Vue flushes :class after this call returns).
  // CRITICAL: in light mode (no .dark elements) we must also REMOVE any
  // stale inline --primary left over from a previous dark-mode apply, otherwise
  // the old value shadows the new <html>-level value via CSS inheritance.
  function applyToDark() {
    if (isDark) {
      document.querySelectorAll('.dark').forEach(function (el) {
        ;(el as HTMLElement).style.setProperty('--primary', finalHsl)
      })
    } else {
      // Light mode: clear any stale inline --primary on elements that
      // previously carried .dark (the wrapper still exists, just without .dark).
      // IMPORTANT: skip documentElement (html) — that's where we just set the
      // current value. Only clear child elements with a stale inline override.
      document.querySelectorAll('[style*="--primary"]').forEach(function (el) {
        if (el !== document.documentElement) {
          ;(el as HTMLElement).style.removeProperty('--primary')
        }
      })
    }
  }
  applyToDark()
  setTimeout(applyToDark, 0)
  try { localStorage.setItem(ACCENT_STORAGE_KEY, name) } catch {}
}

/** Read the saved accent from localStorage, or '' when nothing was persisted
 * (callers apply their own fallback — store default 'indigo', or the Plan 458
 * CLI/env-seeded value which must NOT be clobbered). */
function getSavedAccent(): string {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (saved && ACCENT_PALETTES[saved]) return saved
  } catch {}
  return ''
}

/** List of accent names for UI rendering (swatch buttons). */
function getAccentNames(): string[] {
  return ACCENT_NAMES
}

// PLAN-601 T-06: Named theme hot-switch runtime (applyAccent generalized
// to the full token set). Values mirror the generated index.css registry
// source (dual-face single source of truth).
const THEME_PALETTES: Record<string, { light: Record<string, string>, dark: Record<string, string> }> = {
  'zinc': { light: {
    'background': '0 0% 100%',
    'foreground': '222.2 84% 4.9%',
    'card': '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    'popover': '0 0% 100%',
    'popover-foreground': '222.2 84% 4.9%',
    'primary': '222.2 47.4% 11.2%',
    'primary-foreground': '210 40% 98%',
    'secondary': '40 24% 85.5%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    'muted': '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    'accent': '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '222.2 84% 4.9%'
  }, dark: {
    'background': '222.2 47% 7%',
    'foreground': '210 40% 98%',
    'card': '222.2 47% 11%',
    'card-foreground': '210 40% 98%',
    'popover': '222.2 47% 11%',
    'popover-foreground': '210 40% 98%',
    'primary': '210 40% 98%',
    'primary-foreground': '222.2 47.4% 11.2%',
    'secondary': '215 25% 27%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217.2 32.6% 17.5%',
    'muted-foreground': '215 20.2% 65.1%',
    'accent': '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '217.2 32.6% 17.5%',
    'input': '217.2 32.6% 17.5%',
    'ring': '212.7 26.8% 83.9%'
  } },
  'scaffold': { light: {
    'background': '0 0% 100%',
    'foreground': '222.2 84% 4.9%',
    'card': '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    'popover': '0 0% 100%',
    'popover-foreground': '222.2 84% 4.9%',
    'primary': '239 84% 67%',
    'primary-foreground': '210 40% 98%',
    'secondary': '40 24% 85.5%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    'muted': '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    'accent': '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '239 84% 67%',
    'sidebar-background': '0 0% 98%',
    'sidebar-foreground': '222.2 47.4% 11.2%',
    'sidebar-primary': '239 84% 67%',
    'sidebar-primary-foreground': '210 40% 98%',
    'sidebar-accent': '210 40% 96.1%',
    'sidebar-accent-foreground': '222.2 47.4% 11.2%',
    'sidebar-border': '214.3 31.8% 91.4%',
    'sidebar-ring': '239 84% 67%'
  }, dark: {
    'background': '222.2 47% 7%',
    'foreground': '210 40% 98%',
    'card': '222.2 47% 10%',
    'card-foreground': '210 40% 98%',
    'popover': '222.2 47% 10%',
    'popover-foreground': '210 40% 98%',
    'primary': '239 84% 77%',
    'primary-foreground': '222.2 47.4% 11.2%',
    'secondary': '215 25% 27%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217.2 32.6% 15%',
    'muted-foreground': '215 20.2% 65.1%',
    'accent': '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '217.2 32.6% 17.5%',
    'input': '217.2 32.6% 17.5%',
    'ring': '239 84% 77%',
    'sidebar-background': '222.2 47% 10%',
    'sidebar-foreground': '210 40% 98%',
    'sidebar-primary': '239 84% 77%',
    'sidebar-primary-foreground': '222.2 47.4% 11.2%',
    'sidebar-accent': '217.2 32.6% 17.5%',
    'sidebar-accent-foreground': '210 40% 98%',
    'sidebar-border': '217.2 32.6% 17.5%',
    'sidebar-ring': '239 84% 77%'
  } },
  'stella': { light: {
    'background': '42 39% 94%',
    'foreground': '34 9% 15%',
    'card': '40 53% 97%',
    'card-foreground': '34 9% 15%',
    'popover': '40 53% 97%',
    'popover-foreground': '34 9% 15%',
    'primary': '239 84% 67%',
    'primary-foreground': '210 40% 98%',
    'secondary': '40 24% 85%',
    'secondary-foreground': '34 9% 15%',
    'muted': '39 32% 91%',
    'muted-foreground': '38 7% 46%',
    'accent': '39 32% 91%',
    'accent-foreground': '38 7% 46%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '40 24% 85%',
    'input': '40 24% 85%',
    'ring': '239 84% 67%',
    'success': '142 71% 45%',
    'warning': '45 93% 47%',
    'info': '217 91% 60%',
    'error': '0 84% 60%'
  }, dark: {
    'background': '223 34% 12%',
    'foreground': '210 40% 98%',
    'card': '222 34% 15%',
    'card-foreground': '210 40% 98%',
    'popover': '222 34% 15%',
    'popover-foreground': '210 40% 98%',
    'primary': '239 84% 77%',
    'primary-foreground': '222 47% 11%',
    'secondary': '215 25% 27%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217 33% 17%',
    'muted-foreground': '216 17% 65%',
    'accent': '217 33% 17%',
    'accent-foreground': '216 17% 65%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '222 27% 22%',
    'input': '222 27% 22%',
    'ring': '239 84% 77%',
    'success': '142 71% 45%',
    'warning': '45 93% 47%',
    'info': '217 91% 60%',
    'error': '0 84% 60%'
  } },
  'tauri': { light: {
    'background': '0 0% 100%',
    'foreground': '222.2 84% 4.9%',
    'card': '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    'popover': '0 0% 100%',
    'popover-foreground': '222.2 84% 4.9%',
    'primary': '222.2 47.4% 11.2%',
    'primary-foreground': '210 40% 98%',
    'secondary': '40 24% 85.5%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    'muted': '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    'accent': '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '222.2 84% 4.9%'
  }, dark: {
    'background': '222.2 84% 4.9%',
    'foreground': '210 40% 98%',
    'card': '222.2 84% 4.9%',
    'card-foreground': '210 40% 98%',
    'popover': '222.2 84% 4.9%',
    'popover-foreground': '210 40% 98%',
    'primary': '210 40% 98%',
    'primary-foreground': '222.2 47.4% 11.2%',
    'secondary': '215 25% 27%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217.2 32.6% 17.5%',
    'muted-foreground': '215 20.2% 65.1%',
    'accent': '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '217.2 32.6% 17.5%',
    'input': '217.2 32.6% 17.5%',
    'ring': '212.7 26.8% 83.9%'
  } },
  'cli-vue': { light: {
    'background': '0 0% 100%',
    'foreground': '222.2 84% 4.9%',
    'card': '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    'popover': '0 0% 100%',
    'popover-foreground': '222.2 84% 4.9%',
    'primary': '239 84% 67%',
    'primary-foreground': '0 0% 100%',
    'secondary': '40 24% 85.5%',
    'secondary-foreground': '222.2 47.4% 11.2%',
    'muted': '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    'accent': '210 40% 96.1%',
    'accent-foreground': '222.2 47.4% 11.2%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '239 84% 67%',
    'sidebar-background': '0 0% 98%',
    'sidebar-foreground': '240 5.3% 26.1%',
    'sidebar-primary': '239 84% 67%',
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-accent': '240 4.8% 95.9%',
    'sidebar-accent-foreground': '240 5.9% 10%',
    'sidebar-border': '220 13% 91%',
    'sidebar-ring': '239 84% 67%'
  }, dark: {
    'background': '222 47% 11%',
    'foreground': '210 40% 98%',
    'card': '222 47% 13%',
    'card-foreground': '210 40% 98%',
    'popover': '222 47% 13%',
    'popover-foreground': '210 40% 98%',
    'primary': '239 84% 77%',
    'primary-foreground': '222 47% 11%',
    'secondary': '215 25% 27%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217 33% 17%',
    'muted-foreground': '215 20.2% 65.1%',
    'accent': '217 33% 17%',
    'accent-foreground': '210 40% 98%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '217 33% 20%',
    'input': '217 33% 20%',
    'ring': '239 84% 77%',
    'sidebar-background': '222 47% 9%',
    'sidebar-foreground': '210 40% 90%',
    'sidebar-primary': '239 84% 77%',
    'sidebar-primary-foreground': '222 47% 11%',
    'sidebar-accent': '217 33% 15%',
    'sidebar-accent-foreground': '210 40% 98%',
    'sidebar-border': '217 33% 18%',
    'sidebar-ring': '239 84% 77%'
  } }
}
// pac.at theme{} declared app theme (generator-injected) joins the set.
if ((window as any).__AUTO_COMPOSED_THEME__) {
  const ct = (window as any).__AUTO_COMPOSED_THEME__
  if (ct && ct.name && ct.light && ct.dark) THEME_PALETTES[ct.name] = ct
}
const THEME_STORAGE_KEY = 'auto-theme'

/** Active theme: last applied choice persisted in localStorage, else the
 *  scaffold default (matching the generated index.css :root block). */
function getActiveTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && THEME_PALETTES[saved]) return saved
  } catch {}
  return 'scaffold'
}

/** Apply a named theme by writing its FULL variable set. Light values go on
 *  <html> inline (beats every stylesheet); when dark, the dark set is also
 *  written on every `.dark` element (declarations beat inheritance), so a
 *  mode flip keeps the active theme instead of falling back to the scaffold
 *  `.dark` block. Light mode clears stale inline vars from a previous dark
 *  write. The accent overlay runs LAST so a named --primary rides on top of
 *  any theme (+10 dark boost inside applyAccent). Unknown names are ignored
 *  (closed vocabulary). */
function applyTheme(name: string, isDark = document.documentElement.classList.contains('dark'), accentName = getSavedAccent()): void {
  const pal = THEME_PALETTES[name]
  if (!pal) return
  const root = document.documentElement
  function writeVars(el: HTMLElement, vars: Record<string, string>) {
    for (const k in vars) el.style.setProperty('--' + k, vars[k])
  }
  writeVars(root, pal.light)
  function applyDarkPass() {
    if (isDark) {
      document.querySelectorAll('.dark').forEach(function (el) { writeVars(el as HTMLElement, pal!.dark) })
    } else {
      // Any previous full write carries --background — use it as the marker
      // for stale inline overrides (documentElement keeps its own value).
      document.querySelectorAll('.dark, [style*="--background"]').forEach(function (el) {
        if (el !== root) for (const k in pal!.light) (el as HTMLElement).style.removeProperty('--' + k)
      })
    }
  }
  applyDarkPass()
  setTimeout(applyDarkPass, 0)
  try { localStorage.setItem(THEME_STORAGE_KEY, name) } catch {}
  if (accentName) applyAccent(accentName, isDark)
}

// Restore saved accent on module load.
(function bootstrapAccent() {
  const __th = getActiveTheme()
  if (__th !== 'scaffold') applyTheme(__th, document.documentElement.classList.contains('dark'))
  const saved = getSavedAccent()
  accent_color.value = saved || 'indigo'
  const isDark = document.documentElement.classList.contains('dark')
  applyAccent(saved || 'indigo', isDark)
})()

// [deploy-injected 概要页四期] dark 类 DOM 同步(源:theme_store.at dark_mode;
// 本注入由 regen.sh 追加,勿手编)。
import { watch as _watch } from 'vue'
{
  const _s = useThemeStore()
  let _firstDarkSync = true
  _watch(() => _s.dark_mode.value, (d) => {
    document.documentElement.classList.toggle('dark', !!d)
    // 首拍(immediate)只同步 class 不落盘——此时 dark_mode 还是声明初值,
    // 先落盘会用 false 覆盖 Init 即将读到的持久化偏好(实测回归)。
    if (!_firstDarkSync) { try { localStorage.setItem('autoos-theme', d ? 'dark' : 'light') } catch {} }
    _firstDarkSync = false
  }, { immediate: true })
}
