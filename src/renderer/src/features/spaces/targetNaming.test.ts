import { describe, expect, it } from 'vitest'

function nextTargetName(existing: string[]): string {
  const existingNames = new Set(existing.map((n) => n.trim().toLowerCase()))
  const baseName = 'env'
  let name = baseName
  let index = 1
  while (existingNames.has(name.toLowerCase())) {
    name = `${baseName}-${index}`
    index += 1
  }
  return name
}

describe('target naming', () => {
  it('first target defaults to env', () => {
    expect(nextTargetName([])).toBe('env')
  })

  it('second target becomes env-1', () => {
    expect(nextTargetName(['env'])).toBe('env-1')
  })

  it('third target increments to env-2', () => {
    expect(nextTargetName(['env', 'env-1'])).toBe('env-2')
  })

  it('handles gaps in naming', () => {
    expect(nextTargetName(['env', 'env-2'])).toBe('env-1')
  })

  it('is case-insensitive', () => {
    expect(nextTargetName(['ENV'])).toBe('env-1')
  })

  it('ignores unrelated target names', () => {
    expect(nextTargetName(['prod', 'staging'])).toBe('env')
  })
})
