import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'void-navy': '#10161f',
        'rift-edge': '#1d2b3f',
        'signal-cyan': '#1fb6ff',
        'abyss-bg': '#070b12',
        panel: '#10161f',
        edge: '#1d2b3f',
        accent: '#1fb6ff',
        bg: '#070b12',
        'surface-base': 'rgb(15 23 42 / 0.70)',
        'surface-card': 'rgb(2 6 14 / 0.40)',
        'surface-hover': 'rgb(2 6 14 / 0.60)',
        'surface-active': 'rgb(30 41 59 / 0.95)',
        'surface-overlay': 'rgb(2 6 14 / 0.70)',
        'surface-sidebar': 'rgb(2 6 14 / 0.50)',
        'text-muted': '#94a3b8',
        'text-base': '#e2e8f0',
        'text-emphasis': '#f1f5f9',
        'emerald-status': '#6ee7b7',
        'emerald-on': 'rgb(16 185 129 / 0.12)',
        'rose-status': '#fca5a5',
        'rose-action': '#f87171',
        'rose-on': 'rgb(127 29 29 / 0.30)',
        'rose-hover': 'rgb(127 29 29 / 0.40)',
        'slate-900': '#0f172a',
        'slate-950': '#020614',
        'slate-850': '#1e293b',
        'slate-800': '#1e293b',
        'slate-700': '#334155',
        'slate-600': '#475569',
        'slate-500': '#64748b',
        'slate-400': '#94a3b8',
        'slate-300': '#cbd5e1',
        'slate-200': '#e2e8f0',
        'slate-100': '#f1f5f9',
        'slate-50': '#f8fafc',
      }
    }
  }
} satisfies Config
