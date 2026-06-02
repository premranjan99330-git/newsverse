/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Instrument Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f2f2f0',
          100: '#e4e3de',
          200: '#c8c6bb',
          300: '#aaa89a',
          400: '#8c8979',
          500: '#6e6b5a',
          600: '#575548',
          700: '#413f37',
          800: '#2b2a25',
          900: '#161613',
          950: '#0b0b09',
        },
        flame: {
          400: '#ff6b35',
          500: '#f54e00',
          600: '#cc4100',
        },
        sage: {
          400: '#7fb069',
          500: '#5f8f49',
        },
        amber: {
          400: '#ffc857',
          500: '#ffb830',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        }
      },
    },
  },
  plugins: [],
}
