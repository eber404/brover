import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UNSUPPORTED_SECRET_BACKEND } from '../shared/models'

const handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>()

const authPrompt = vi.fn()
const authorize = vi.fn()
const isAuthorized = vi.fn()
const expiresAt = vi.fn()
const revealEnv = vi.fn()
const listEnvs = vi.fn()
const listEnvironments = vi.fn()
const secretExists = vi.fn()
const getSharedSecretNames = vi.fn()
const setSharedSecretNames = vi.fn()
const getOnboardingStatus = vi.fn()
const markOnboardingComplete = vi.fn()
const terminalLaunch = vi.fn()
const listTerminals = vi.fn()
const startupCleanup = vi.fn()
const shutdownCleanup = vi.fn()
const scanDotfiles = vi.fn()
const storeInstance = {
  secrets: { get: vi.fn() },
  revealEnv,
  listEnvs,
  listEnvironments,
  secretExists,
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
const BrowserWindowMock = vi.fn(function BrowserWindowMock() {
  return browserWindowState
})

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    commandLine: { appendSwitch: vi.fn() },
    getPath: vi.fn(() => '/tmp/app-data'),
    getAppPath: vi.fn(() => '/tmp/app'),
    whenReady: vi.fn(() => new Promise(() => {})),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: BrowserWindowMock,
  dialog: {
    showOpenDialog: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => unknown) => {
      handlers.set(channel, handler)
    }),
  },
  systemPreferences: {},
}))

vi.mock('./store', () => ({
  BroverStore: BroverStoreMock,
}))

vi.mock('./authSessionCache', () => ({
  createAuthSessionCache: vi.fn(() => ({ isAuthorized, expiresAt })),
}))

vi.mock('./authPrompt', () => ({
  createMacSecretAuthPrompt: vi.fn(() => authPrompt),
}))

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
  loadTerminalIconDataUrl: vi.fn(async () => null),
}))

vi.mock('./onboardingScanner', () => ({ scanDotfiles }))
vi.mock('./onboardingImporter', () => ({
  runRetroactiveImport: vi.fn(),
  runFreshStartImport: vi.fn(),
}))
vi.mock('./envMutationFlow', () => ({
  runDeleteMutation: vi.fn(),
  runUpdateMutation: vi.fn(),
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

describe('main IPC wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthorized.mockReturnValue(false)
    expiresAt.mockReturnValue(123)
    revealEnv.mockResolvedValue('secret-value')
    listEnvs.mockResolvedValue([])
    listEnvironments.mockResolvedValue([{ id: 'env-1', isActive: true }])
    getSharedSecretNames.mockResolvedValue(false)
    setSharedSecretNames.mockResolvedValue(false)
    getOnboardingStatus.mockResolvedValue({ completedAt: undefined })
    markOnboardingComplete.mockResolvedValue(undefined)
    terminalLaunch.mockResolvedValue(undefined)
    listTerminals.mockResolvedValue([])
    startupCleanup.mockResolvedValue(undefined)
    shutdownCleanup.mockResolvedValue(undefined)
    scanDotfiles.mockResolvedValue({ files: [], warnings: [] })
    storeInstance.secrets.get = vi.fn()
    process.env.BROVER_HOME = '/tmp/home'
  })

  it('reveal skips auth prompt when session cache already authorized', async () => {
    isAuthorized.mockReturnValue(true)
    await loadModule()

    const result = await handlers.get('envs:reveal')?.({}, { profile: 'env-1', name: 'API_KEY' })

    expect(authorize).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, value: 'secret-value', expiresAt: 123 })
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
})
