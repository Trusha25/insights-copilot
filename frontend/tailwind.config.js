/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'border-subtle': 'var(--border-subtle)',
        'accent-start': 'var(--accent-start)',
        'accent-mid': 'var(--accent-mid)',
        'accent-end': 'var(--accent-end)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'glow-accent': 'var(--glow-accent)',
        'accent-gold': 'var(--accent-start)',
        'accent-gold-hover': 'var(--accent-end)',
        'accent-gold-bg': 'var(--color-accent-bg)',
        'accent-gold-text': 'var(--accent-end)',
        'theme-border': 'var(--border-subtle)',
        'theme-border-hover': 'var(--color-border-hover)',
        'theme-border-focus': 'var(--color-border-focus)',
        layer2: {
          bg: '#0B0F19',
          surface: '#111827',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#1E293B',
          web: '#63D7E8',
          github: '#F8FAFC',
          papers: '#8FEA8A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
