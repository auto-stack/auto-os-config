/** @type {import('tailwindcss').Config} */
// Plan 008 D2/D5: the shared style vocabulary for BOTH backends. Web side
// consumes it through Tailwind here; the vm side maps the same class strings
// to iced (auto-lang ui/style/class.rs). Rules of the vocabulary:
//   - accent family ONLY via the semantic `primary` token (driven by the
//     --primary HSL triplet that useTheme rewrites at runtime) — the vm
//     renderer resolves the same token from its accent thread-local;
//   - neutrals use deterministic classes (bg-[#f3f3f3], text-gray-500 …),
//     never mode-adaptive tokens (vm DARK_MODE drift, Plan 008 P4);
//   - `hover:` variants are web-only enhancement (vm silently skips unknown
//     classes) — core states must not depend on them.
module.exports = {
  // Scan the .at widget sources directly (class strings' first home) in
  // addition to the generated/deployed src/ output — regen lag can't cause
  // a missing utility then.
  content: ['./index.html', './src/**/*.{vue,ts}', './auto/src/front/**/*.at'],
  // The primary-token utilities are the vocabulary's backbone; guarantee
  // them regardless of scan gaps (full class strings elsewhere stay
  // scan-driven — D3 literals land in scanned files).
  safelist: [
    'bg-primary', 'text-primary', 'border-primary',
    'bg-primary/10', 'text-primary-foreground',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
