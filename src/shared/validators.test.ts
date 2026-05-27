import { describe, expect, it } from 'vitest'
import { isValidBundleID, isValidEnvName } from './validators'

describe('validators', () => {
  it('validates env names', () => {
    expect(isValidEnvName('OPENAI_API_KEY')).toBe(true)
    expect(isValidEnvName('1INVALID')).toBe(false)
  })

  it('validates bundle ids', () => {
    expect(isValidBundleID('com.apple.Terminal')).toBe(true)
    expect(isValidBundleID('terminal')).toBe(false)
  })
})
