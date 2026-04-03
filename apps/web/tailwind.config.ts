import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
        },
        input: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
          lighter: '#86EFAC',
          pale: '#DCFCE7',
          dark: '#0F172A',
        },
        green: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        },
        // Legacy aliases kept for session pages that still use these
        neon: {
          DEFAULT: '#22C55E',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          glow: 'rgba(34,197,94,0.3)',
        },
        navy: {
          DEFAULT: '#FFFFFF',
          light: '#F8FAF5',
          deep: '#F0FDF4',
          300: '#6B7280',
          400: '#9CA3AF',
          500: '#D1D5DB',
          600: '#E5E7EB',
          700: '#F3F4F6',
          800: '#F9FAFB',
          900: '#FFFFFF',
          950: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAF5',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          muted: '#4B5563',
          faint: '#9CA3AF',
        },
        risk: {
          low: '#f59e0b',
          moderate: '#f97316',
          high: '#ef4444',
          critical: '#991b1b',
        },
        status: {
          approved: '#16A34A',
          pending: '#64748b',
          revised: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        green: '0 0 24px rgba(34,197,94,0.25)',
        'green-sm': '0 0 12px rgba(34,197,94,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
