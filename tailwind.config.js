/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep marine navy palette
        navy: {
          50: '#eef3fb',
          100: '#d4e0f4',
          200: '#a9c1e8',
          300: '#7098d4',
          400: '#3f6cb8',
          500: '#264f96',
          600: '#1b3c79',
          700: '#162f5e',
          800: '#11244a',
          900: '#0b1f3a',
          950: '#06122a',
        },
        harbor: {
          // teal/cyan accent (water)
          400: '#34d0c4',
          500: '#14b8a6',
          600: '#0d9488',
        },
        signal: {
          ok: '#16a34a',
          warn: '#f59e0b',
          fail: '#dc2626',
          flag: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
