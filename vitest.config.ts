import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**', '**/.worktrees/**', 'tests/electron/**'],
    // Radix dialogs mount through rAF plus animation frames. Under parallel
    // workers the default 1s budget for findBy*/waitFor starves, so give
    // jsdom assertions room without hiding real hangs via a long testTimeout.
    asyncUtilTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/dist-electron/**',
        '**/.worktrees/**',
        'tests/**',
        '**/*.config.*',
        '**/*.d.ts'
      ]
    }
  }
})
