/** @type {import('tailwindcss').Config} */

const cssVarColor = (name, fallback) => `rgb(var(${name}${fallback ? `, ${fallback}` : ''}) / <alpha-value>)`

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: cssVarColor('--pc-brand-rgb', '108 99 255'),
          soft: cssVarColor('--pc-brand-soft-rgb', '139 132 255'),
          tint: cssVarColor('--pc-brand-tint-rgb', '167 162 255'),
        },
        ink: cssVarColor('--pc-ink-rgb', '31 41 55'),
        muted: cssVarColor('--pc-muted-rgb', '107 114 128'),
        background: cssVarColor('--pc-bg-rgb', '248 249 255'),
        surface: cssVarColor('--pc-surface-rgb', '255 255 255'),
        'surface-muted': cssVarColor('--pc-surface-muted-rgb', '241 243 255'),
        border: cssVarColor('--pc-border-rgb', '229 231 235'),
        card: cssVarColor('--pc-card-rgb', '255 255 255'),
      },
      boxShadow: {
        card: 'var(--pc-card-shadow, 0 10px 24px rgba(15, 23, 42, 0.08))',
        soft: 'var(--pc-soft-shadow, 0 6px 18px rgba(0, 0, 0, 0.06))',
      },
      borderRadius: {
        md: 'var(--pc-radius-md, 14px)',
        lg: 'var(--pc-radius-lg, 18px)',
        xl: 'var(--pc-radius-xl, 24px)',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
