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
        // 像素对拍基准（2026-08-27）：CSS 原版渲染字体 = Segoe UI（styles.css
        // --font-family 原栈）。Inter 只是 vm 对齐的历史决策，vm 端字体并不取自
        // 这里的类串，回退不影响 vm 轨。
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // css-era 从不设 line-height（全部 normal）；preflight 的 1.5 与 text-* 的
      // 固定行高会把每行文字撑高 1-3px，逐组件放大成节奏差。全字号回 normal。
      fontSize: {
        xs: ['12px', { lineHeight: 'normal' }],
        sm: ['14px', { lineHeight: 'normal' }],
        base: ['16px', { lineHeight: 'normal' }],
        lg: ['18px', { lineHeight: 'normal' }],
        xl: ['20px', { lineHeight: 'normal' }],
        '2xl': ['24px', { lineHeight: 'normal' }],
      },
    },
  },
  plugins: [],
}
