import { describe, expect, it } from 'vitest'
import { buildDotenvContent, buildManagedShellBlock, upsertManagedShellBlock } from './envWriters'

describe('envWriters', () => {
  it('builds managed shell block with exports', () => {
    const block = buildManagedShellBlock([
      { name: 'API_KEY', value: 'secret' },
      { name: 'PORT', value: '3000' },
    ])

    expect(block).toContain('export API_KEY=')
    expect(block).toContain('export PORT=')
    expect(block).toContain('BROVER MANAGED START')
    expect(block).toContain('BROVER MANAGED END')
  })

  it('replaces managed block when already present', () => {
    const original = 'line1\n# >>> BROVER MANAGED START >>>\nexport OLD=1\n# <<< BROVER MANAGED END <<<\nline2\n'
    const next = upsertManagedShellBlock(original, buildManagedShellBlock([{ name: 'NEW', value: '2' }]))

    expect(next).toContain('export NEW=')
    expect(next).not.toContain('export OLD=')
  })

  it('builds dotenv content with newline at end', () => {
    const text = buildDotenvContent([{ name: 'A', value: 'x' }])
    expect(text).toBe('A=x\n')
  })
})
