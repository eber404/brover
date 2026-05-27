import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#10161f',
        edge: '#1d2b3f',
        accent: '#1fb6ff',
        bg: '#070b12'
      }
    }
  }
} satisfies Config
