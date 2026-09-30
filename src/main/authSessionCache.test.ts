import { describe, expect, it } from 'vitest'
import { createAuthSessionCache } from './authSessionCache'

describe('createAuthSessionCache', () => {
  it('isAuthorized returns false when no session exists', () => {
    const cache = createAuthSessionCache()
    expect(cache.isAuthorized('target-1')).toBe(false)
  })

  it('stays authorized for the whole app session without expiring', () => {
    const cache = createAuthSessionCache()
    cache.grant('target-1')
    expect(cache.isAuthorized('target-1')).toBe(true)
  })

  it('session for targetA also authorizes targetB', () => {
    const cache = createAuthSessionCache()
    cache.grant('target-A')
    expect(cache.isAuthorized('target-B')).toBe(true)
  })

  it('revoke clears the session', () => {
    const cache = createAuthSessionCache()
    cache.grant('target-A')
    cache.revoke('target-A')
    expect(cache.isAuthorized('target-A')).toBe(false)
  })

  it('revoke without a target clears the session', () => {
    const cache = createAuthSessionCache()
    cache.grant('target-A')
    cache.revoke()
    expect(cache.isAuthorized('target-A')).toBe(false)
  })
})
