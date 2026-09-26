/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        victus: {
          bg: 'var(--color-bg, #0d0e15)',
          surface: 'var(--color-surface, #141622)',
          surfaceHover: 'var(--color-surface-hover, #1d2032)',
          card: 'var(--color-card, rgba(22, 24, 38, 0.75))',
          border: 'var(--color-border, rgba(147, 51, 234, 0.25))',
          borderHover: 'var(--color-border-hover, rgba(168, 85, 247, 0.5))',
          primary: 'var(--color-primary, #9333ea)',
          primaryHover: 'var(--color-primary-hover, #a855f7)',
          primaryLight: 'var(--color-primary-light, #c084fc)',
          secondary: 'var(--color-secondary, #3b82f6)',
          text: 'var(--color-text, #f3f4f6)',
          textMuted: 'var(--color-text-muted, #9ca3af)',
          glow: 'var(--color-glow, rgba(147, 51, 234, 0.35))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px var(--color-glow, rgba(147, 51, 234, 0.35))',
        'glow': '0 0 25px 0px var(--color-glow, rgba(147, 51, 234, 0.45))',
        'glow-lg': '0 0 40px 4px var(--color-glow, rgba(147, 51, 234, 0.55))',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
