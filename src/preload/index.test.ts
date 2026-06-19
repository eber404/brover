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

    api.listEnvs()
    api.createEnv({ name: 'API_KEY', profile: 'env-1', value: 'secret', description: 'desc' })
    api.revealEnv({ profile: 'env-1', name: 'API_KEY' })
    api.copyEnv({ profile: 'env-1', name: 'API_KEY', isRevealed: false })
    api.updateEnv({ id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next', description: 'desc' })
    api.updateEnvConfirmed({ id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next', description: 'desc' })
    api.deleteEnv({ id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    api.deleteEnvConfirmed({ id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    api.toggleEnvEnabled('secret-1')
    api.getSharedSecretNames()
    api.secretExists('env-1', 'API_KEY')
    api.setSharedSecretNames(true)
    api.listEnvironments()
    api.createEnvironment({ name: 'dev' })
    api.deleteEnvironment({ environmentId: 'env-1' })
    api.reorderEnvironments({ orderedEnvironmentIds: ['env-2', 'env-1'] })
    api.renameEnvironment({ environmentId: 'env-1', name: 'prod' })
    api.setEnvironmentColor({ environmentId: 'env-1', color: '#123456' })
    api.setActiveEnvironment({ environmentId: 'env-1' })
    api.launch.terminal('env-1', 'Warp')
    api.launch.listTerminals()
    api.launch.pickTerminalApp()
    api.onboarding.getStatus()
    api.onboarding.scanDotfiles()
    api.onboarding.runRetroactive({ scanResult: { files: [], warnings: [] }, selection: { selectedSensitiveIds: ['v1'] } })
    api.onboarding.runFreshStart({ scanResult: { files: [], warnings: [] } })
    api.onboarding.complete()

    expect(invoke).toHaveBeenNthCalledWith(1, 'envs:list')
    expect(invoke).toHaveBeenNthCalledWith(2, 'envs:create', { name: 'API_KEY', profile: 'env-1', value: 'secret', description: 'desc' })
    expect(invoke).toHaveBeenNthCalledWith(3, 'envs:reveal', { profile: 'env-1', name: 'API_KEY' })
    expect(invoke).toHaveBeenNthCalledWith(4, 'envs:copy', { profile: 'env-1', name: 'API_KEY', isRevealed: false })
    expect(invoke).toHaveBeenNthCalledWith(5, 'envs:update', { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next', description: 'desc' })
    expect(invoke).toHaveBeenNthCalledWith(6, 'envs:update-confirmed', { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next', description: 'desc' })
    expect(invoke).toHaveBeenNthCalledWith(7, 'envs:delete', { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    expect(invoke).toHaveBeenNthCalledWith(8, 'envs:delete-confirmed', { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    expect(invoke).toHaveBeenNthCalledWith(9, 'envs:toggle-enabled', 'secret-1')
    expect(invoke).toHaveBeenNthCalledWith(10, 'environments:get-shared-secret-names')
    expect(invoke).toHaveBeenNthCalledWith(11, 'secrets:exists', { profile: 'env-1', name: 'API_KEY' })
    expect(invoke).toHaveBeenNthCalledWith(12, 'environments:set-shared-secret-names', true)
    expect(invoke).toHaveBeenNthCalledWith(13, 'environments:list')
    expect(invoke).toHaveBeenNthCalledWith(14, 'environments:create', { name: 'dev' })
    expect(invoke).toHaveBeenNthCalledWith(15, 'environments:delete', { environmentId: 'env-1' })
    expect(invoke).toHaveBeenNthCalledWith(16, 'environments:reorder', { orderedEnvironmentIds: ['env-2', 'env-1'] })
    expect(invoke).toHaveBeenNthCalledWith(17, 'environments:rename', { environmentId: 'env-1', name: 'prod' })
    expect(invoke).toHaveBeenNthCalledWith(18, 'environments:set-color', { environmentId: 'env-1', color: '#123456' })
    expect(invoke).toHaveBeenNthCalledWith(19, 'environments:set-active', { environmentId: 'env-1' })
    expect(invoke).toHaveBeenNthCalledWith(20, 'launch:terminal', { environmentId: 'env-1', terminalApp: 'Warp' })
    expect(invoke).toHaveBeenNthCalledWith(21, 'launch:list-terminals')
    expect(invoke).toHaveBeenNthCalledWith(22, 'launch:pick-terminal-app')
    expect(invoke).toHaveBeenNthCalledWith(23, 'onboarding:get-status')
    expect(invoke).toHaveBeenNthCalledWith(24, 'onboarding:scan-dotfiles')
    expect(invoke).toHaveBeenNthCalledWith(25, 'onboarding:run-retroactive', {
      scanResult: { files: [], warnings: [] },
      selection: { selectedSensitiveIds: ['v1'] },
    })
    expect(invoke).toHaveBeenNthCalledWith(26, 'onboarding:run-fresh-start', {
      scanResult: { files: [], warnings: [] },
    })
    expect(invoke).toHaveBeenNthCalledWith(27, 'onboarding:complete')
  })
})
