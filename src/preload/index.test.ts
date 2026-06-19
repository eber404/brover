import { beforeEach, describe, expect, it, vi } from 'vitest'

const exposeInMainWorld = vi.fn()
const invoke = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}))

describe('preload bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    exposeInMainWorld.mockReset()
    invoke.mockReset()
  })

  it('exposes brover API in main world', async () => {
    await import('./index')

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1)
    expect(exposeInMainWorld).toHaveBeenCalledWith('brover', expect.objectContaining({
      listEnvs: expect.any(Function),
      launch: expect.objectContaining({ terminal: expect.any(Function) }),
      onboarding: expect.objectContaining({ scanDotfiles: expect.any(Function) }),
    }))
  })

  it('invokes exact IPC channels and payload shapes', async () => {
    await import('./index')
    const api = exposeInMainWorld.mock.calls[0]?.[1]

    api.secretExists('env-1', 'API_KEY')
    api.setSharedSecretNames(true)
    api.launch.terminal('env-1', 'Warp')
    api.onboarding.runRetroactive({ scanResult: { files: [], warnings: [] }, selection: { selectedSensitiveIds: ['v1'] } })
    api.onboarding.runFreshStart({ scanResult: { files: [], warnings: [] } })

    expect(invoke).toHaveBeenNthCalledWith(1, 'secrets:exists', { profile: 'env-1', name: 'API_KEY' })
    expect(invoke).toHaveBeenNthCalledWith(2, 'environments:set-shared-secret-names', true)
    expect(invoke).toHaveBeenNthCalledWith(3, 'launch:terminal', { environmentId: 'env-1', terminalApp: 'Warp' })
    expect(invoke).toHaveBeenNthCalledWith(4, 'onboarding:run-retroactive', {
      scanResult: { files: [], warnings: [] },
      selection: { selectedSensitiveIds: ['v1'] },
    })
    expect(invoke).toHaveBeenNthCalledWith(5, 'onboarding:run-fresh-start', {
      scanResult: { files: [], warnings: [] },
    })
  })
})
