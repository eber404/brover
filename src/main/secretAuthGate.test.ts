import { describe, expect, it, vi } from 'vitest'
import { createSecretAuthGate } from './secretAuthGate'
import { createAuthSessionCache } from './authSessionCache'

describe('createSecretAuthGate', () => {
  it('requires auth for reveal, update and delete', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt)

    await gate.authorize('reveal')
    await gate.authorize('update')
    await gate.authorize('delete')

    expect(prompt).toHaveBeenCalledTimes(3)
  })

  it('requires auth for copy only when value is hidden', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt)

    await gate.authorize('copy', { isRevealed: false })
    await gate.authorize('copy', { isRevealed: true })

    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('skips prompt when cache is valid', async () => {
    const cache = createAuthSessionCache()
    cache.grant('target-1')
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt, cache)

    await gate.authorize('reveal', { targetId: 'target-1' })
    expect(prompt).not.toHaveBeenCalled()
  })

  it('calls prompt and grants session when cache is invalid', async () => {
    const cache = createAuthSessionCache()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt, cache)

    await gate.authorize('reveal', { targetId: 'target-1' })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(cache.isAuthorized('target-1')).toBe(true)
  })

  it('auth on one target authorizes another target within TTL', async () => {
    const cache = createAuthSessionCache()
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt, cache)

    await gate.authorize('reveal', { targetId: 'target-A' })
    await gate.authorize('reveal', { targetId: 'target-B' })

    expect(prompt).toHaveBeenCalledTimes(1)
  })

  it('copy with isRevealed=true skips cache check', async () => {
    const cache = createAuthSessionCache()
    cache.grant('target-1')
    const prompt = vi.fn().mockResolvedValue(undefined)
    const gate = createSecretAuthGate(prompt, cache)

    await gate.authorize('copy', { isRevealed: true })
    expect(prompt).not.toHaveBeenCalled()
  })
})
