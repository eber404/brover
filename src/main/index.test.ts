import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNSUPPORTED_SECRET_BACKEND } from '../shared/models'

const handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>()
const appOn = vi.fn()
const appMock = {
  isPackaged: true,
  commandLine: { appendSwitch: vi.fn() },
  getPath: vi.fn(() => '/tmp/app-data'),
  getAppPath: vi.fn(() => '/tmp/app'),
  whenReady: vi.fn(() => new Promise(() => {})),
  on: appOn,
  quit: vi.fn(),
}
const watchFile = vi.fn()
const unwatchFile = vi.fn()

const authPrompt = vi.fn()
const authorize = vi.fn()
const isAuthorized = vi.fn()
const revealEnv = vi.fn()
const listEnvs = vi.fn()
const listEnvironments = vi.fn()
const secretExists = vi.fn()
const createEnv = vi.fn()
const updateEnv = vi.fn()
const deleteEnv = vi.fn()
const toggleEnvEnabled = vi.fn()
const createEnvironment = vi.fn()
const deleteEnvironment = vi.fn()
const reorderEnvironments = vi.fn()
const renameEnvironment = vi.fn()
const setEnvironmentColor = vi.fn()
const setActiveEnvironment = vi.fn()
const getSharedSecretNames = vi.fn()
const setSharedSecretNames = vi.fn()
const getOnboardingStatus = vi.fn()
const markOnboardingComplete = vi.fn()
const terminalLaunch = vi.fn()
const listTerminals = vi.fn()
const startupCleanup = vi.fn()
const shutdownCleanup = vi.fn()
const scanDotfiles = vi.fn()
const loadTerminalIconDataUrl = vi.fn()
const runRetroactiveImport = vi.fn()
const runFreshStartImport = vi.fn()
const runDeleteMutation = vi.fn()
const runUpdateMutation = vi.fn()
const storeInstance = {
  secrets: { get: vi.fn() },
  revealEnv,
  listEnvs,
  listEnvironments,
  secretExists,
  createEnv,
  updateEnv,
  deleteEnv,
  toggleEnvEnabled,
  createEnvironment,
  deleteEnvironment,
  reorderEnvironments,
  renameEnvironment,
  setEnvironmentColor,
  setActiveEnvironment,
  getSharedSecretNames,
  setSharedSecretNames,
  getOnboardingStatus,
  markOnboardingComplete,
}
const BroverStoreMock = vi.fn(function BroverStoreMock() {
  return storeInstance
})

const browserWindowState = {
  on: vi.fn(),
  loadFile: vi.fn(),
  loadURL: vi.fn(),
  webContents: {
    on: vi.fn(),
    getURL: vi.fn(() => 'file://index.html'),
    openDevTools: vi.fn(),
    reload: vi.fn(),
    session: {
      clearStorageData: vi.fn(),
      clearCache: vi.fn(),
    },
  },
}
const BrowserWindowMock = vi.fn(function BrowserWindowMock(_options?: unknown) {
  return browserWindowState
})
const showOpenDialog = vi.fn()
const clipboardWriteText = vi.fn()

vi.mock('electron', () => ({
  app: appMock,
  BrowserWindow: BrowserWindowMock,
  clipboard: { writeText: clipboardWriteText },
  dialog: {
    showOpenDialog,
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => unknown) => {
      handlers.set(channel, handler)
    }),
  },
  systemPreferences: {},
}))

vi.mock('node:fs', () => ({ watchFile, unwatchFile }))

vi.mock('./store', () => ({
  BroverStore: BroverStoreMock,
}))

vi.mock('./authSessionCache', () => ({
  createAuthSessionCache: vi.fn(() => ({ isAuthorized, grant: vi.fn(), revoke: vi.fn() })),
}))

vi.mock('./authPrompt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./authPrompt')>()
  return {
    ...actual,
    createMacSecretAuthPrompt: vi.fn(() => authPrompt),
  }
})

vi.mock('./secretAuthGate', () => ({
  createSecretAuthGate: vi.fn(() => ({ authorize })),
}))

vi.mock('./terminalLauncher', () => ({
  createTerminalLauncher: vi.fn(() => ({
    launch: terminalLaunch,
    listTerminals,
    startupCleanup,
    shutdownCleanup,
  })),
}))

vi.mock('./terminalIconLoader', () => ({
  loadTerminalIconDataUrl,
}))

vi.mock('./onboardingScanner', () => ({ scanDotfiles }))
vi.mock('./onboardingImporter', () => ({
  runRetroactiveImport,
  runFreshStartImport,
}))
vi.mock('./envMutationFlow', () => ({
  runDeleteMutation,
  runUpdateMutation,
}))
vi.mock('./devSession', () => ({
  getDevStorageClearOptions: vi.fn(() => ({})),
}))
vi.mock('./secretStoreFactory', () => ({
  createSecretStore: vi.fn(() => ({ get: vi.fn(), save: vi.fn(), delete: vi.fn(), exists: vi.fn() })),
}))

async function loadModule() {
  handlers.clear()
  const module = await import('./index')
  await module.bootstrap()
}

async function loadFreshModule() {
  handlers.clear()
  vi.resetModules()
  const module = await import('./index')
  await module.bootstrap()
}

describe('main IPC wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appMock.isPackaged = true
    isAuthorized.mockReturnValue(false)
    revealEnv.mockResolvedValue('secret-value')
    listEnvs.mockResolvedValue([])
    listEnvironments.mockResolvedValue([{ id: 'env-1', isActive: true }])
    secretExists.mockResolvedValue(true)
    createEnv.mockResolvedValue(undefined)
    updateEnv.mockResolvedValue(undefined)
    deleteEnv.mockResolvedValue(undefined)
    toggleEnvEnabled.mockResolvedValue([])
    createEnvironment.mockResolvedValue([{ id: 'env-1', isActive: true }])
    deleteEnvironment.mockResolvedValue([{ id: 'env-2', isActive: true }])
    reorderEnvironments.mockResolvedValue([{ id: 'env-2', isActive: true }])
    renameEnvironment.mockResolvedValue([{ id: 'env-1', isActive: true }])
    setEnvironmentColor.mockResolvedValue([{ id: 'env-1', isActive: true }])
    setActiveEnvironment.mockResolvedValue([{ id: 'env-1', isActive: true }])
    getSharedSecretNames.mockResolvedValue(false)
    setSharedSecretNames.mockResolvedValue(false)
    getOnboardingStatus.mockResolvedValue({ completedAt: undefined })
    markOnboardingComplete.mockResolvedValue(undefined)
    terminalLaunch.mockResolvedValue(undefined)
    listTerminals.mockReturnValue([])
    startupCleanup.mockResolvedValue(undefined)
    shutdownCleanup.mockResolvedValue(undefined)
    scanDotfiles.mockResolvedValue({ files: [], warnings: [] })
    loadTerminalIconDataUrl.mockResolvedValue(null)
    runRetroactiveImport.mockResolvedValue({ importedSensitive: 1 })
    runFreshStartImport.mockResolvedValue({ importedSensitive: 0 })
    runDeleteMutation.mockResolvedValue({ ok: true })
    runUpdateMutation.mockResolvedValue({ ok: true })
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })
    storeInstance.secrets.get = vi.fn()
    process.env.BROVER_HOME = '/tmp/home'
    process.env.BROVER_E2E = '0'
    process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173'
  })

  it('reveal skips auth prompt when session cache already authorized', async () => {
    isAuthorized.mockReturnValue(true)
    await loadModule()

    const result = await handlers.get('envs:reveal')?.({}, { profile: 'env-1', name: 'API_KEY' })

    expect(authorize).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, value: 'secret-value' })
  })

  it('launch passes only selected environment secrets with stored values', async () => {
    listEnvs.mockResolvedValue([
      { id: '1', profile: 'env-1', name: 'API_KEY' },
      { id: '2', profile: 'env-1', name: 'EMPTY' },
      { id: '3', profile: 'env-2', name: 'OTHER' },
    ])

    await loadModule()

    storeInstance.secrets.get = vi.fn(async (account: string) => {
      if (account === 'env-1:API_KEY') return 'abc'
      if (account === 'env-1:EMPTY') return null
      if (account === 'env-2:OTHER') return 'skip'
      return null
    })

    await handlers.get('launch:terminal')?.({}, { environmentId: 'env-1', terminalApp: 'Warp' })

    expect(terminalLaunch).toHaveBeenCalledWith('env-1', 'Warp', [{ name: 'API_KEY', value: 'abc' }])
  })

  it('launch injects global secrets first and lets the launched environment override them', async () => {
    listEnvironments.mockResolvedValue([
      { id: 'env-0', isActive: false, isGlobal: true },
      { id: 'env-1', isActive: true, isGlobal: false },
    ])
    listEnvs.mockResolvedValue([
      { id: '1', profile: 'env-0', name: 'GLOBAL_ONLY' },
      { id: '2', profile: 'env-0', name: 'SHARED' },
      { id: '3', profile: 'env-0', name: 'NO_VALUE' },
      { id: '4', profile: 'env-1', name: 'SHARED' },
      { id: '5', profile: 'env-1', name: 'LOCAL_ONLY' },
    ])

    await loadModule()

    storeInstance.secrets.get = vi.fn(async (account: string) => {
      if (account === 'env-0:GLOBAL_ONLY') return 'global-only'
      if (account === 'env-0:SHARED') return 'from-global'
      if (account === 'env-0:NO_VALUE') return null
      if (account === 'env-1:SHARED') return 'from-launched'
      if (account === 'env-1:LOCAL_ONLY') return 'local-only'
      return null
    })

    await handlers.get('launch:terminal')?.({}, { environmentId: 'env-1', terminalApp: 'Warp' })

    expect(terminalLaunch).toHaveBeenCalledWith('env-1', 'Warp', [
      { name: 'GLOBAL_ONLY', value: 'global-only' },
      { name: 'SHARED', value: 'from-launched' },
      { name: 'LOCAL_ONLY', value: 'local-only' },
    ])
  })

  it('launch from the global environment does not duplicate entries', async () => {
    listEnvironments.mockResolvedValue([
      { id: 'env-0', isActive: true, isGlobal: true },
      { id: 'env-1', isActive: false, isGlobal: false },
    ])
    listEnvs.mockResolvedValue([
      { id: '1', profile: 'env-0', name: 'A' },
      { id: '2', profile: 'env-1', name: 'B' },
    ])

    await loadModule()

    storeInstance.secrets.get = vi.fn(async (account: string) => {
      if (account === 'env-0:A') return 'a'
      if (account === 'env-1:B') return 'b'
      return null
    })

    await handlers.get('launch:terminal')?.({}, { environmentId: 'env-0', terminalApp: 'Warp' })

    expect(terminalLaunch).toHaveBeenCalledWith('env-0', 'Warp', [{ name: 'A', value: 'a' }])
  })

  it('launch returns failure payload when launcher throws', async () => {
    terminalLaunch.mockRejectedValueOnce(new Error('launch failed'))
    await loadModule()

    const result = await handlers.get('launch:terminal')?.({}, { environmentId: 'env-1', terminalApp: 'Warp' })
    expect(result).toEqual({ success: false, error: 'Error: launch failed' })
  })

  it('scan-dotfiles throws when home missing', async () => {
    delete process.env.BROVER_HOME
    delete process.env.HOME
    await loadModule()

    await expect(handlers.get('onboarding:scan-dotfiles')?.({})).rejects.toThrow('HOME not found')
    expect(scanDotfiles).not.toHaveBeenCalled()
  })

  it('maps unsupported backend errors to stable code', async () => {
    revealEnv.mockRejectedValue(new Error(UNSUPPORTED_SECRET_BACKEND))
    await loadModule()

    const result = await handlers.get('envs:reveal')?.({}, { profile: 'env-1', name: 'API_KEY' })

    expect(result).toEqual({ ok: false, error: UNSUPPORTED_SECRET_BACKEND })
  })

  it('lists terminals with icon augmentation', async () => {
    listTerminals.mockReturnValue([
      { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
      { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
    ])
    loadTerminalIconDataUrl
      .mockResolvedValueOnce('data:image/png;base64,warp')
      .mockResolvedValueOnce(null)

    await loadModule()

    const result = await handlers.get('launch:list-terminals')?.({})
    expect(result).toEqual({
      terminals: [
        { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app', iconDataUrl: 'data:image/png;base64,warp' },
        { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
      ],
    })
  })

  it('pick-terminal-app returns cancel and unsupported cases', async () => {
    listTerminals.mockReturnValue([
      { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
    ])
    await loadModule()

    const handler = handlers.get('launch:pick-terminal-app')
    const canceled = await handler?.({})
    expect(canceled).toEqual({ canceled: true })

    showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [] })
    const emptyPath = await handler?.({})
    expect(emptyPath).toEqual({ canceled: true })

    showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/Applications/Notes.app'] })
    const unsupported = await handler?.({})
    expect(unsupported).toEqual({ canceled: false, error: 'UNSUPPORTED_TERMINAL_APP', appName: 'Notes' })
  })

  it('pick-terminal-app returns matched known terminal', async () => {
    listTerminals.mockReturnValue([
      { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
    ])
    loadTerminalIconDataUrl.mockResolvedValue('data:image/png;base64,warp')
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/Applications/Warp.app'] })
    await loadModule()

    const result = await handlers.get('launch:pick-terminal-app')?.({})
    expect(result).toEqual({
      canceled: false,
      terminal: { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app', iconDataUrl: 'data:image/png;base64,warp' },
    })
  })

  it('passes through environment and secret handlers', async () => {
    await loadModule()

    await handlers.get('secrets:exists')?.({}, { profile: 'env-1', name: 'API_KEY' })
    await handlers.get('environments:get-shared-secret-names')?.({})
    await handlers.get('environments:set-shared-secret-names')?.({}, true)
    await handlers.get('environments:list')?.({})
    await handlers.get('environments:create')?.({}, { name: 'dev' })
    await handlers.get('environments:delete')?.({}, { environmentId: 'env-1' })
    await handlers.get('environments:reorder')?.({}, { orderedEnvironmentIds: ['env-2', 'env-1'] })
    await handlers.get('environments:rename')?.({}, { environmentId: 'env-1', name: 'prod' })
    await handlers.get('environments:set-color')?.({}, { environmentId: 'env-1', color: '#123456' })
    await handlers.get('environments:set-active')?.({}, { environmentId: 'env-1' })
    await handlers.get('envs:list')?.({})
    await handlers.get('envs:toggle-enabled')?.({}, 'secret-1')

    expect(secretExists).toHaveBeenCalledWith('env-1', 'API_KEY')
    expect(createEnvironment).toHaveBeenCalledWith({ name: 'dev' })
    expect(deleteEnvironment).toHaveBeenCalledWith({ environmentId: 'env-1' })
    expect(reorderEnvironments).toHaveBeenCalledWith({ orderedEnvironmentIds: ['env-2', 'env-1'] })
    expect(renameEnvironment).toHaveBeenCalledWith({ environmentId: 'env-1', name: 'prod' })
    expect(setEnvironmentColor).toHaveBeenCalledWith({ environmentId: 'env-1', color: '#123456' })
    expect(setActiveEnvironment).toHaveBeenCalledWith({ environmentId: 'env-1' })
    expect(toggleEnvEnabled).toHaveBeenCalledWith('secret-1')
  })

  it('handles env mutations and onboarding imports', async () => {
    isAuthorized.mockReturnValue(true)
    await loadModule()

    await handlers.get('envs:create')?.({}, { name: 'API_KEY', profile: 'env-1', value: 'secret' })
    await handlers.get('envs:copy')?.({}, { profile: 'env-1', name: 'API_KEY', isRevealed: false })
    await handlers.get('envs:update')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    await handlers.get('envs:update-confirmed')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    await handlers.get('envs:delete')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    await handlers.get('envs:delete-confirmed')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    await handlers.get('onboarding:get-status')?.({})
    await handlers.get('onboarding:run-retroactive')?.({}, { scanResult: { files: [], warnings: [] }, selection: { selectedSensitiveIds: ['v1'] } })
    await handlers.get('onboarding:run-fresh-start')?.({}, { scanResult: { files: [], warnings: [] } })
    await handlers.get('onboarding:complete')?.({})

    expect(createEnv).toHaveBeenCalledWith({ name: 'API_KEY', profile: 'env-1', value: 'secret' })
    expect(authorize).not.toHaveBeenCalledWith('copy', { isRevealed: false, targetId: 'env-1' })
    expect(runUpdateMutation).toHaveBeenCalledTimes(1)
    expect(updateEnv).toHaveBeenCalledWith({ id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    expect(runDeleteMutation).toHaveBeenCalledTimes(1)
    expect(deleteEnv).toHaveBeenCalledWith({ id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    expect(runRetroactiveImport).toHaveBeenCalled()
    expect(runFreshStartImport).toHaveBeenCalled()
    expect(markOnboardingComplete).toHaveBeenCalledTimes(1)
  })

  it('authenticates hidden copy before writing secret to system clipboard', async () => {
    isAuthorized.mockReturnValue(false)
    authPrompt.mockResolvedValue(undefined)
    revealEnv.mockResolvedValue('copy-secret-value')
    clipboardWriteText.mockImplementation(() => {
      expect(authorize).toHaveBeenCalledWith('copy', { isRevealed: false, targetId: 'env-1' })
    })
    await loadFreshModule()

    const result = await handlers.get('envs:copy')?.({}, {
      profile: 'env-1',
      name: 'API_KEY',
      isRevealed: false,
    })

    expect(result).toEqual({ ok: true })
    expect(clipboardWriteText).toHaveBeenCalledWith('copy-secret-value')
  })

  it('maps env create and confirmed mutation failures', async () => {
    createEnv.mockRejectedValueOnce(new Error('boom'))
    updateEnv.mockRejectedValueOnce(new Error('bad update'))
    deleteEnv.mockRejectedValueOnce(new Error('bad delete'))
    await loadModule()

    const createResult = await handlers.get('envs:create')?.({}, { name: 'API_KEY', profile: 'env-1', value: 'secret' })
    const updateResult = await handlers.get('envs:update-confirmed')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    const deleteResult = await handlers.get('envs:delete-confirmed')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })

    expect(createResult).toEqual({ ok: false, error: 'boom' })
    expect(updateResult).toEqual({ ok: false, error: 'bad update' })
    expect(deleteResult).toEqual({ ok: false, error: 'bad delete' })
  })

  it('authorizes confirmed updates when the auth cache is absent', async () => {
    isAuthorized.mockReturnValue(false)
    await loadModule()

    const result = await handlers.get('envs:update-confirmed')?.({}, {
      id: 'secret-1',
      profile: 'env-1',
      name: 'API_KEY',
      value: 'next',
    })

    expect(authorize).toHaveBeenCalledWith('update', { targetId: 'env-1' })
    expect(updateEnv).toHaveBeenCalledWith({
      id: 'secret-1',
      profile: 'env-1',
      name: 'API_KEY',
      value: 'next',
    })
    expect(result).toEqual({ ok: true })
  })

  it('authorizes confirmed deletes when the auth cache is absent', async () => {
    isAuthorized.mockReturnValue(false)
    await loadModule()

    const result = await handlers.get('envs:delete-confirmed')?.({}, {
      id: 'secret-1',
      profile: 'env-1',
      name: 'API_KEY',
    })

    expect(authorize).toHaveBeenCalledWith('delete', { targetId: 'env-1' })
    expect(deleteEnv).toHaveBeenCalledWith({ id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    expect(result).toEqual({ ok: true })
  })

  it('maps update and delete mutation wrapper failures', async () => {
    runUpdateMutation.mockRejectedValueOnce(new Error('update wrapper failed'))
    runDeleteMutation.mockRejectedValueOnce(new Error('delete wrapper failed'))
    await loadModule()

    const updateResult = await handlers.get('envs:update')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    const deleteResult = await handlers.get('envs:delete')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })

    expect(updateResult).toEqual({ ok: false, error: 'update wrapper failed' })
    expect(deleteResult).toEqual({ ok: false, error: 'delete wrapper failed' })
  })

  it('passes authorize and mutation closures into update and delete flows', async () => {
    isAuthorized.mockReturnValue(false)
    runUpdateMutation.mockImplementationOnce(async ({ authorize: auth, update }) => {
      await auth()
      await update()
      return { ok: true, value: 'needs-confirmation' }
    })
    runDeleteMutation.mockImplementationOnce(async ({ authorize: auth, remove }) => {
      await auth()
      await remove()
      return { ok: true, value: 'needs-confirmation' }
    })
    await loadModule()

    const updateResult = await handlers.get('envs:update')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    const deleteResult = await handlers.get('envs:delete')?.({}, { id: 'secret-1', profile: 'env-1', name: 'API_KEY' })

    expect(authorize).toHaveBeenCalledWith('update', { targetId: 'env-1' })
    expect(authorize).toHaveBeenCalledWith('delete', { targetId: 'env-1' })
    expect(updateEnv).toHaveBeenCalledWith({ id: 'secret-1', profile: 'env-1', name: 'API_KEY', value: 'next' })
    expect(deleteEnv).toHaveBeenCalledWith({ id: 'secret-1', profile: 'env-1', name: 'API_KEY' })
    expect(updateResult).toEqual({ ok: true, value: 'needs-confirmation' })
    expect(deleteResult).toEqual({ ok: true, value: 'needs-confirmation' })
  })

  it('caps the window width at 760px', async () => {
    await loadFreshModule()

    const options = BrowserWindowMock.mock.calls.at(-1)?.[0] as {
      width: number
      maxWidth: number
      minWidth: number
    }

    expect(options.maxWidth).toBe(760)
    expect(options.width).toBeLessThanOrEqual(760)
    expect(options.minWidth).toBeLessThanOrEqual(options.maxWidth)
  })

  it('centers the window so the system auth sheet anchors to the app', async () => {
    await loadFreshModule()

    const options = BrowserWindowMock.mock.calls.at(-1)?.[0] as { center?: boolean }

    expect(options.center).toBe(true)
  })

  it('boots dev window with storage cleanup and preload watcher', async () => {
    appMock.isPackaged = false
    await loadFreshModule()

    expect(browserWindowState.webContents.openDevTools).toHaveBeenCalledTimes(1)
    expect(browserWindowState.webContents.session.clearStorageData).toHaveBeenCalledTimes(1)
    expect(browserWindowState.webContents.session.clearCache).toHaveBeenCalledTimes(1)
    expect(browserWindowState.loadURL).toHaveBeenCalledWith('http://127.0.0.1:5173')
    expect(watchFile).toHaveBeenCalledTimes(1)
    const didFinishLoadHandler = browserWindowState.webContents.on.mock.calls.find((call) => call[0] === 'did-finish-load')?.[1]
    didFinishLoadHandler?.()

    const closedHandler = browserWindowState.on.mock.calls.find((call) => call[0] === 'closed')?.[1]
    closedHandler?.()
    expect(unwatchFile).toHaveBeenCalledTimes(1)

    const watchCallback = watchFile.mock.calls[0]?.[1]
    watchCallback?.()
    expect(browserWindowState.webContents.reload).toHaveBeenCalledTimes(1)
  })

  it('quits app on window-all-closed outside darwin', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux' })
    await loadFreshModule()

    const allClosedHandler = appOn.mock.calls.find((call) => call[0] === 'window-all-closed')?.[1]
    allClosedHandler?.()
    expect(appMock.quit).toHaveBeenCalledTimes(1)
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })
})
