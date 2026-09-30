import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-electron/**', '**/.worktrees/**', 'tests/electron/**'],
    setupFiles: ['src/test/setup.ts'],
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
