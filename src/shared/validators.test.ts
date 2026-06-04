import { describe, expect, it } from 'vitest'
import { isValidEnvName } from './validators'

describe('validators', () => {
  it('validates env names', () => {
    expect(isValidEnvName('OPENAI_API_KEY')).toBe(true)
    expect(isValidEnvName('1INVALID')).toBe(false)
  })
})
