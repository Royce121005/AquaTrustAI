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
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        scada: {
          bg: '#0B0F17',
          card: '#111827',
          surface: '#161F30',
          elevated: '#1E293B',
          border: '#1F293D',
          'border-focus': '#38BDF8',
          'border-light': '#334155',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#0b1120',
        },
        status: {
          valid: '#10B981',
          'valid-bg': 'rgba(16, 185, 129, 0.15)',
          suspect: '#F59E0B',
          'suspect-bg': 'rgba(245, 158, 11, 0.15)',
          invalid: '#EF4444',
          'invalid-bg': 'rgba(239, 68, 68, 0.15)',
        },
        crypto: {
          violet: '#8B5CF6',
          'violet-bg': 'rgba(139, 92, 246, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'scada-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'scada-glow': '0 0 15px -3px rgba(14, 165, 233, 0.3)',
        'scada-glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.3)',
        'scada-glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.3)',
        'scada-glow-rose': '0 0 15px -3px rgba(239, 68, 68, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
