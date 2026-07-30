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
        'accent-gold': 'var(--color-accent)',
        'accent-gold-hover': 'var(--color-accent-hover)',
        'accent-gold-bg': 'var(--color-accent-bg)',
        'accent-gold-text': 'var(--color-accent-text)',
        'theme-border': 'var(--color-border)',
        'theme-border-hover': 'var(--color-border-hover)',
        'theme-border-focus': 'var(--color-border-focus)',
        layer2: {
          bg: '#0B1226',
          surface: '#101A33',
          text: '#F5F3FF',
          muted: '#D6D6D6',
          border: '#2A4A73',
          web: '#4EA8FF',
          github: '#FFFFFF',
          papers: '#34D8B0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
