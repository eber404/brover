import { describe, expect, it, vi } from 'vitest'
import { createSecretAuthGate } from './secretAuthGate'

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
})
