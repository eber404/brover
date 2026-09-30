import { app, BrowserWindow, dialog, ipcMain, systemPreferences } from 'electron'
import { join } from 'node:path'
import { watchFile, unwatchFile } from 'node:fs'
import {
  BroverStore,
} from './store'
import {
  AUTH_CANCELED,
  UNSUPPORTED_SECRET_BACKEND,
  type EnvMetadata,
  type SecretActionResult,
  type ScanResult,
  type RetroactiveSelection,
} from '../shared/models'
import { scanDotfiles } from './onboardingScanner'
import { runRetroactiveImport, runFreshStartImport } from './onboardingImporter'
import { createSecretAuthGate } from './secretAuthGate'
import { createAuthSessionCache } from './authSessionCache'
import { createMacSecretAuthPrompt, isAuthCanceledError } from './authPrompt'
import { createTerminalLauncher } from './terminalLauncher'
import {
  collectLaunchEntries,
  mergeLaunchEntries,
  pickGlobalEnvironmentId,
  type LaunchEnvEntry,
  type LaunchValueLookup,
} from './launchEnvMerge'
import { runDeleteMutation, runUpdateMutation } from './envMutationFlow'
import { loadTerminalIconDataUrl } from './terminalIconLoader'
import { getDevStorageClearOptions } from './devSession'
import { createSecretStore } from './secretStoreFactory'

if (!app.isPackaged) {
  app.commandLine.appendSwitch('disable-http-cache')
  app.commandLine.appendSwitch('disable-features', 'ServiceWorker')
}

const isDev = !app.isPackaged
const isE2E = process.env.BROVER_E2E === '1'

function ok(value?: string): SecretActionResult {
  return { ok: true, value }
}

async function collectGlobalLaunchEntries(
  envs: EnvMetadata[],
  globalEnvironmentId: string | null,
  launchedEnvironmentId: string,
  readValue: LaunchValueLookup
): Promise<LaunchEnvEntry[]> {
  if (globalEnvironmentId === null) return []
  if (globalEnvironmentId === launchedEnvironmentId) return []
  return collectLaunchEntries(envs, globalEnvironmentId, readValue)
}

function failure(error: unknown): SecretActionResult {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (isAuthCanceledError(error)) {
    return { ok: false, error: AUTH_CANCELED }
  }
  if (message.includes(UNSUPPORTED_SECRET_BACKEND)) {
    return { ok: false, error: UNSUPPORTED_SECRET_BACKEND }
  }
  return { ok: false, error: message }
}

export async function bootstrap() {
  const dbDir = process.env.NODE_ENV === 'development' ? 'brover-dev' : 'brover'
  const dbPath =
    process.env.BROVER_DB_PATH ??
    join(app.getPath('appData'), dbDir, 'config.json')
  const store = new BroverStore(dbPath, createSecretStore({ platform: process.platform, isE2E, isDev }))
  const authSessionCache = createAuthSessionCache()
  const macSecretAuthPrompt = createMacSecretAuthPrompt(systemPreferences)
  const authGate = createSecretAuthGate(async (reason: string) => {
    if (process.env.BROVER_SKIP_AUTH === '1') {
      return
    }
    if (process.platform !== 'darwin') {
      throw new Error(UNSUPPORTED_SECRET_BACKEND)
    }
    await macSecretAuthPrompt(reason)
  }, authSessionCache)

  const terminalLauncher = createTerminalLauncher()

  async function listActiveEnvironmentIds(): Promise<string[]> {
    return (await store.listEnvironments())
      .filter(env => env.isActive)
      .map(env => env.id)
  }

  terminalLauncher.startupCleanup(await listActiveEnvironmentIds())

  app.on('will-quit', () => {
    void listActiveEnvironmentIds()
      .then(activeEnvironmentIds => {
        terminalLauncher.shutdownCleanup(activeEnvironmentIds)
      })
      .catch(() => {
        terminalLauncher.shutdownCleanup([])
      })
  })

  ipcMain.handle('launch:terminal', async (_, payload: { environmentId: string; terminalApp: string }) => {
    try {
      const envs = await store.listEnvs()
      const environments = await store.listEnvironments()
      const globalEnvironmentId = pickGlobalEnvironmentId(environments)
      const readValue = (environmentId: string, name: string) =>
        store.secrets.get(`${environmentId}:${name}`)

      const launchedEntries = await collectLaunchEntries(envs, payload.environmentId, readValue)
      const globalEntries = await collectGlobalLaunchEntries(
        envs,
        globalEnvironmentId,
        payload.environmentId,
        readValue
      )

      await terminalLauncher.launch(
        payload.environmentId,
        payload.terminalApp,
        mergeLaunchEntries(globalEntries, launchedEntries)
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('launch:list-terminals', () => {
    return Promise.all(
      terminalLauncher.listTerminals().map(async (terminal) => {
        const iconDataUrl = await loadTerminalIconDataUrl(terminal.bundlePath)
        return iconDataUrl ? { ...terminal, iconDataUrl } : terminal
      })
    ).then((terminals) => ({ terminals }))
  })

  ipcMain.handle('launch:pick-terminal-app', async () => {
    const result = await dialog.showOpenDialog({
      defaultPath: '/Applications',
      properties: ['openFile'],
      filters: [{ name: 'Applications', extensions: ['app'] }],
    })

    if (result.canceled) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    if (!filePath) {
      return { canceled: true }
    }

    const knownTerminals = await Promise.all(
      terminalLauncher.listTerminals().map(async (terminal) => {
        const iconDataUrl = await loadTerminalIconDataUrl(terminal.bundlePath)
        return iconDataUrl ? { ...terminal, iconDataUrl } : terminal
      })
    )

    const matchedTerminal = knownTerminals.find((terminal) => terminal.bundlePath === filePath)
    if (!matchedTerminal) {
      const appName = filePath.split('/').pop()?.replace(/\.app$/i, '') ?? 'App'
      return { canceled: false, error: 'UNSUPPORTED_TERMINAL_APP', appName }
    }

    return { canceled: false, terminal: matchedTerminal }
  })

  ipcMain.handle('secrets:exists', (_, payload: { profile: string; name: string }) =>
    store.secretExists(payload.profile, payload.name)
  )

  ipcMain.handle('environments:get-shared-secret-names', () => store.getSharedSecretNames())
  ipcMain.handle('environments:set-shared-secret-names', (_, sharedSecretNames: boolean) =>
    store.setSharedSecretNames(sharedSecretNames)
  )
  ipcMain.handle('environments:list', () => store.listEnvironments())
  ipcMain.handle('environments:create', (_, payload: { name: string }) =>
    store.createEnvironment(payload)
  )
  ipcMain.handle('environments:delete', (_, payload: { environmentId: string }) =>
    store.deleteEnvironment(payload)
  )
  ipcMain.handle('environments:reorder', (_, payload: { orderedEnvironmentIds: string[] }) =>
    store.reorderEnvironments(payload)
  )
  ipcMain.handle('environments:rename', (_, payload: { environmentId: string; name: string }) =>
    store.renameEnvironment(payload)
  )
  ipcMain.handle('environments:set-color', (_, payload: { environmentId: string; color: string }) =>
    store.setEnvironmentColor(payload)
  )
  ipcMain.handle('environments:set-active', (_, payload: { environmentId: string }) =>
    store.setActiveEnvironment(payload)
  )

  ipcMain.handle('envs:list', () => store.listEnvs())
  ipcMain.handle('envs:toggle-enabled', (_, id: string) =>
    store.toggleEnvEnabled(id)
  )

  ipcMain.handle(
    'envs:create',
    async (
      _,
      payload: {
        name: string
        profile: string
        value: string
        description?: string
      }
    ) => {
      try {
        await store.createEnv(payload)
        return ok()
      } catch (error) {
        return failure(error)
      }
    }
  )

  ipcMain.handle('envs:reveal', async (_, payload: { profile: string; name: string }) => {
    try {
      const cached = authSessionCache.isAuthorized(payload.profile)
      if (!cached) {
        await authGate.authorize('reveal', { targetId: payload.profile })
      }
      const value = await store.revealEnv(payload.profile, payload.name)
      return { ok: true, value: value ?? '' }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:copy', async (_, payload: { profile: string; name: string; isRevealed: boolean }) => {
    try {
      const cached = authSessionCache.isAuthorized(payload.profile)
      if (!cached) {
        await authGate.authorize('copy', { isRevealed: payload.isRevealed, targetId: payload.profile })
      }
      const value = await store.revealEnv(payload.profile, payload.name)
      return { ok: true, value: value ?? '' }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle(
    'envs:update',
    async (
      _,
      payload: {
        id: string
        profile: string
        name: string
        value: string
        description?: string
      }
    ) => {
      try {
        return await runUpdateMutation({
          cached: authSessionCache.isAuthorized(payload.profile),
          authorize: () => authGate.authorize('update', { targetId: payload.profile }),
          update: () => store.updateEnv(payload),
        })
      } catch (error) {
        return failure(error)
      }
    }
  )

  ipcMain.handle(
    'envs:update-confirmed',
    async (
      _,
      payload: {
        id: string
        profile: string
        name: string
        value: string
        description?: string
      }
    ) => {
      try {
        if (!authSessionCache.isAuthorized(payload.profile)) {
          await authGate.authorize('update', { targetId: payload.profile })
        }
        await store.updateEnv(payload)
        return ok()
      } catch (error) {
        return failure(error)
      }
    }
  )

  ipcMain.handle('envs:delete', async (_, payload: { id: string; profile: string; name: string }) => {
    try {
      return await runDeleteMutation({
        cached: authSessionCache.isAuthorized(payload.profile),
        authorize: () => authGate.authorize('delete', { targetId: payload.profile }),
        remove: () => store.deleteEnv(payload),
      })
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:delete-confirmed', async (_, payload: { id: string; profile: string; name: string }) => {
    try {
      if (!authSessionCache.isAuthorized(payload.profile)) {
        await authGate.authorize('delete', { targetId: payload.profile })
      }
      await store.deleteEnv(payload)
      return { ok: true }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('onboarding:get-status', () => store.getOnboardingStatus())

  ipcMain.handle('onboarding:scan-dotfiles', async () => {
    const home = process.env.BROVER_HOME ?? process.env.HOME
    if (!home) throw new Error('HOME not found')
    return scanDotfiles(home)
  })

  ipcMain.handle(
    'onboarding:run-retroactive',
    async (
      _,
      payload: {
        scanResult: ScanResult
        selection: RetroactiveSelection
      },
    ) => {
      return runRetroactiveImport(store, payload.scanResult, payload.selection)
    },
  )

  ipcMain.handle(
    'onboarding:run-fresh-start',
    async (_, payload: { scanResult: ScanResult }) => {
      return runFreshStartImport(store, payload.scanResult)
    },
  )

  ipcMain.handle('onboarding:complete', () => store.markOnboardingComplete())

  const window = new BrowserWindow({
    width: 760,
    height: 760,
    minWidth: 640,
    minHeight: 600,
    maxWidth: 760,
    center: true,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#070b12',
    webPreferences: {
      preload: join(app.getAppPath(), 'dist-electron', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.webContents.on('did-finish-load', () => {
    console.log('[main] Page loaded:', window.webContents.getURL())
  })

  if (isDev && !isE2E) {
    window.webContents.openDevTools()
    console.log(
      '[main] Clearing Electron storage (cache, cookies, service workers)...'
    )
    await window.webContents.session.clearStorageData(
      getDevStorageClearOptions()
    )
    await window.webContents.session.clearCache()
    console.log('[main] Loading dev server...')
    await window.loadURL(
      process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173'
    )

    const preloadPath = join(app.getAppPath(), 'dist-electron', 'preload', 'preload.js')
    watchFile(preloadPath, () => {
      console.log('[main] Preload changed, reloading window...')
      window.webContents.reload()
    })
    window.on('closed', () => {
      unwatchFile(preloadPath)
    })
  } else {
    await window.loadFile(join(app.getAppPath(), 'dist', 'index.html'))
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
