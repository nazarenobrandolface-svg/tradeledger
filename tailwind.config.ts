import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          50: '#EDEBFC',
          100: '#D5D1F8',
          200: '#ABA3F1',
          300: '#8275EA',
          400: '#6C5CE7',
          500: '#5A4BD4',
          600: '#4A3DC0',
          700: '#3B309C',
          800: '#2B2378',
          900: '#1C1754',
          foreground: '#FFFFFF'
        },
        profit: '#16C784',
        loss: '#EA3943',
        navy: {
          DEFAULT: '#0F1222',
          800: '#1A1E35',
          700: '#252A44',
          600: '#313655'
        },
        background: '#F6F7FB',
        card: '#FFFFFF',
        border: '#E8EAF0',
        muted: {
          DEFAULT: '#F1F2F6',
          foreground: '#6B7280'
        },
        foreground: '#1F2937',
        accent: {
          DEFAULT: '#F1F2F6',
          foreground: '#1F2937'
        },
        destructive: {
          DEFAULT: '#EA3943',
          foreground: '#FFFFFF'
        }
      },
      borderRadius: {
        card: '12px',
        lg: '12px',
        md: '8px',
        sm: '6px'
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out'
      },
      transitionDuration: {
        DEFAULT: '150ms'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config;
