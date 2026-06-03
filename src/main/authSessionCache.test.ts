import { describe, expect, it, vi } from 'vitest'
import { createAuthSessionCache } from './authSessionCache'

describe('createAuthSessionCache', () => {
  it('isAuthorized returns false when no session exists', () => {
    const cache = createAuthSessionCache()
    expect(cache.isAuthorized('target-1')).toBe(false)
  })

  it('isAuthorized returns true within TTL', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-1', 60_000, now)
    expect(cache.isAuthorized('target-1', now + 30_000)).toBe(true)
  })

  it('isAuthorized returns false after TTL expires', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-1', 60_000, now)
    expect(cache.isAuthorized('target-1', now + 60_001)).toBe(false)
  })

  it('session for targetA also authorizes targetB within TTL', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    expect(cache.isAuthorized('target-B', now)).toBe(true)
  })

  it('revoke one target clears only that session', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    cache.grant('target-B', 60_000, now)
    cache.revoke('target-A')
    expect(cache.isAuthorized('target-A', now)).toBe(false)
    expect(cache.isAuthorized('target-B', now)).toBe(false)
  })

  it('revoke all clears all sessions', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    cache.grant('target-B', 60_000, now)
    cache.revoke()
    expect(cache.isAuthorized('target-A', now)).toBe(false)
    expect(cache.isAuthorized('target-B', now)).toBe(false)
  })
})
