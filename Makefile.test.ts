import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Makefile', () => {
  const content = readFileSync('Makefile', 'utf8')

  it('has reset target', () => {
    expect(content).toMatch(/^reset:/m)
  })

  it('reset target removes config.json', () => {
    expect(content).toMatch(/rm.*config\.json/)
  })

  it('reset target is phony', () => {
    expect(content).toMatch(/\.PHONY:\s*reset/)
  })
})
