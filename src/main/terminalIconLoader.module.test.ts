import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('terminalIconLoader module loading', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock('electron')
  })

  it('loads without resolving electron at import time', async () => {
    vi.doMock('electron', () => {
      throw new Error('electron unavailable')
    })

    await expect(import('./terminalIconLoader')).resolves.toHaveProperty('loadTerminalIconDataUrl')
  })
})
