import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const EXPECTED_UTILITY_CLASSES = [
  '.bg-surface-overlay',
  '.bg-surface-base',
  '.bg-surface-card',
  '.bg-surface-sidebar',
  '.bg-surface-active',
  '.bg-surface-hover',
  '.bg-emerald-on',
  '.bg-rose-on',
  '.text-text-muted',
  '.text-text-base',
  '.text-text-emphasis',
  '.border-emerald-status',
  '.border-rose-action',
]

describe('Tailwind v4 theme tokens', () => {
  it('compila tokens custom no CSS de producao', () => {
    execSync('npm run build:renderer', {
      cwd: join(__dirname, '../../..'),
      stdio: 'pipe',
      timeout: 30000,
    })

    const distDir = join(__dirname, '../../../dist/assets')
    const cssFiles = readdirSync(distDir).filter((f) => f.endsWith('.css'))
    expect(cssFiles.length).toBeGreaterThan(0)

    const css = cssFiles
      .map((f) => readFileSync(join(distDir, f), 'utf-8'))
      .join('\n')

    for (const cls of EXPECTED_UTILITY_CLASSES) {
      expect(css).toContain(cls)
    }

    expect(css).toContain('--color-surface-overlay')
    expect(css).toContain('--color-emerald-on')
    expect(css).toContain('--color-rose-on')
  }, 30000)
})
