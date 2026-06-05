import { describe, expect, it, vi } from 'vitest'
import { runDeleteMutation, runUpdateMutation } from './envMutationFlow'

describe('envMutationFlow', () => {
  it('returns needs-confirmation for cached update without auth or save', async () => {
    const authorize = vi.fn()
    const update = vi.fn()

    const result = await runUpdateMutation({ cached: true, authorize, update })

    expect(result).toEqual({ ok: true, value: 'needs-confirmation' })
    expect(authorize).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('authorizes and saves update immediately when cache is absent', async () => {
    const authorize = vi.fn().mockResolvedValue(undefined)
    const update = vi.fn().mockResolvedValue(undefined)

    const result = await runUpdateMutation({ cached: false, authorize, update })

    expect(result).toEqual({ ok: true, value: undefined })
    expect(authorize).toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
  })

  it('returns needs-confirmation for cached delete without auth or delete', async () => {
    const authorize = vi.fn()
    const remove = vi.fn()

    const result = await runDeleteMutation({ cached: true, authorize, remove })

    expect(result).toEqual({ ok: true, value: 'needs-confirmation' })
    expect(authorize).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('authorizes and deletes immediately when cache is absent', async () => {
    const authorize = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)

    const result = await runDeleteMutation({ cached: false, authorize, remove })

    expect(result).toEqual({ ok: true, value: undefined })
    expect(authorize).toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
  })
})
