import { readonly, ref, onMounted } from 'vue'

/* ═════════════════════════════════════════════════════════════════════════════
   useTheme — accent color picker for AutoOS Settings
   ═════════════════════════════════════════════════════════════════════════════
   Lets the user pick a primary accent. The curated palette mirrors AutoForge's
   useAccentColor.ts exactly, so the two products share visual language.

   Mechanism: `setAccent` writes a single HSL value onto `documentElement` as
   `--primary`. Because CSS custom properties inherit down the DOM tree, every
   `var(--accent)` / `var(--primary)` reference updates INSTANTLY — including in
   remote config pages (aaid/musk) mounted inside this host. No cross-module
   message passing needed; the remote pages just reference the variables.
   ═════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'autoos-accent-color'

export type AccentName = 'indigo' | 'coral' | 'ocean' | 'sage' | 'amber'

export interface AccentOption {
  name: AccentName
  label: string
  /** Solid swatch color (used by the picker UI) */
  swatch: string
  /** shadcn-style HSL triplet WITHOUT the hsl() wrapper, e.g. '239 84% 67%' */
  primaryHsl: string
}

/*
 * Curated colours — identical to AutoForge so the apps feel like siblings.
 *  indigo – AutoForge's default brand
 *  coral  – warm, energetic rose-coral
 *  ocean  – blue (closest to the original Win11 accent)
 *  sage   – fresh modern green
 *  amber  – warm gold
 */
const PALETTES: Record<AccentName, AccentOption> = {
  indigo: { name: 'indigo', label: 'Indigo', swatch: '#6366f1', primaryHsl: '239 84% 67%' },
  coral:  { name: 'coral',  label: 'Coral',  swatch: '#e85d75', primaryHsl: '350 75% 64%' },
  ocean:  { name: 'ocean',  label: 'Ocean',  swatch: '#3b82f6', primaryHsl: '217 91% 60%' },
  sage:   { name: 'sage',   label: 'Sage',   swatch: '#10b981', primaryHsl: '160 84% 39%' },
  amber:  { name: 'amber',  label: 'Amber',  swatch: '#f59e0b', primaryHsl: '38 92% 50%' },
}

export const ACCENT_OPTIONS = Object.values(PALETTES)

const _current = ref<AccentName>('indigo')

/** Write the chosen accent's HSL onto <html> so --accent/--ring/etc. recompute. */
function apply(name: AccentName) {
  const p = PALETTES[name]
  const root = document.documentElement
  root.style.setProperty('--primary', p.primaryHsl)
  // --ring is derived from --primary in styles.css, so it follows automatically;
  // no need to set it explicitly here.
}

export function useTheme() {
  const current = readonly(_current)

  function setAccent(name: AccentName) {
    if (!PALETTES[name]) return
    _current.value = name
    localStorage.setItem(STORAGE_KEY, name)
    apply(name)
  }

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentName | null
    const initial: AccentName = stored && PALETTES[stored] ? stored : 'indigo'
    _current.value = initial
    apply(initial)
  })

  return { current, setAccent, options: ACCENT_OPTIONS }
}
