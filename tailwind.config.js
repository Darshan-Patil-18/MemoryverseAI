/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#080B14',
          900: '#0B1120',
          800: '#111827',
          700: '#1A2333',
          600: '#28334A'
        },
        parchment: {
          100: '#FBF8F1',
          200: '#F6F1E7',
          300: '#EDE4D0'
        },
        gold: {
          400: '#E6BE72',
          500: '#D4A24C',
          600: '#B4813A'
        },
        thread: {
          400: '#5FC3B0',
          500: '#3FA796',
          600: '#2E8577'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: []
}
