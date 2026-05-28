import { app, BrowserWindow, dialog, ipcMain, systemPreferences } from 'electron'
import { join } from 'node:path'
import { watchFile, unwatchFile } from 'node:fs'
import {
  BroverStore,
  MacOSKeytarSecretStore,
  UnsupportedSecretStore,
} from './store'
import {
  UNSUPPORTED_SECRET_BACKEND,
  type SecretActionResult,
  type ScanResult,
  type RetroactiveSelection,
} from '../shared/models'
import { scanDotfiles } from './onboardingScanner'
import { runRetroactiveImport, runFreshStartImport } from './onboardingImporter'
import { createSecretAuthGate } from './secretAuthGate'
import { createAuthSessionCache } from './authSessionCache'
import { createMacSecretAuthPrompt } from './authPrompt'

if (!app.isPackaged) {
  app.commandLine.appendSwitch('disable-http-cache')
  app.commandLine.appendSwitch('disable-features', 'ServiceWorker')
}

const isDev = !app.isPackaged
const isE2E = process.env.BROVER_E2E === '1'

function createSecretStore() {
  if (process.platform === 'darwin') {
    return new MacOSKeytarSecretStore()
  }
  return new UnsupportedSecretStore()
}

function ok(value?: string): SecretActionResult {
  return { ok: true, value }
}

function failure(error: unknown): SecretActionResult {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (message.includes(UNSUPPORTED_SECRET_BACKEND)) {
    return { ok: false, error: UNSUPPORTED_SECRET_BACKEND }
  }
  return { ok: false, error: message }
}

async function bootstrap() {
  const dbPath =
    process.env.BROVER_DB_PATH ??
    join(app.getPath('appData'), 'brover', 'config.json')
  const store = new BroverStore(dbPath, createSecretStore())
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

  ipcMain.handle('apps:list', () => store.listApps())
  ipcMain.handle(
    'apps:create',
    (_, payload: { displayName: string; bundleID: string }) =>
      store.createApp(payload.displayName, payload.bundleID)
  )
  ipcMain.handle('apps:toggle', (_, id: string) => store.toggleApp(id))
  ipcMain.handle('apps:delete', (_, id: string) => store.deleteApp(id))

  ipcMain.handle('profiles:list', () => store.listProfiles())
  ipcMain.handle('profiles:create', (_, name: string) =>
    store.createProfile(name)
  )
  ipcMain.handle('profiles:set-active', (_, id: string) =>
    store.setActiveProfile(id)
  )

  ipcMain.handle('spaces:list', () => store.listSpaces())
  ipcMain.handle('spaces:create', (_, payload: { name: string; path: string }) =>
    store.createSpace(payload)
  )
  ipcMain.handle('spaces:rename', (_, payload: { spaceId: string; name: string }) =>
    store.renameSpace(payload)
  )
  ipcMain.handle('spaces:delete', (_, spaceId: string) => store.deleteSpace(spaceId))
  ipcMain.handle('spaces:toggle-tied-secrets', (_, spaceId: string) =>
    store.toggleSpaceTiedSecrets(spaceId)
  )
  ipcMain.handle('system:pick-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })
    return {
      canceled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    }
  })
  ipcMain.handle('system:pick-dotfile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Dotfiles', extensions: ['zshrc', 'bashrc', 'env', 'zprofile', 'bash_profile', 'profile'] }],
    })
    return {
      canceled: result.canceled,
      path: result.canceled ? null : (result.filePaths[0] ?? null),
    }
  })
  ipcMain.handle('spaces:toggle-expanded', (_, spaceId: string) =>
    store.toggleSpaceExpanded(spaceId)
  )
  ipcMain.handle('targets:list', (_, spaceId: string) => store.listTargets(spaceId))
  ipcMain.handle('targets:create', (_, payload: { spaceId: string; name: string }) =>
    store.createTarget(payload)
  )
  ipcMain.handle('targets:delete', (_, payload: { targetId: string }) =>
    store.deleteTarget(payload)
  )
  ipcMain.handle('targets:reorder', (_, payload: { spaceId: string; orderedTargetIds: string[] }) =>
    store.reorderTargets(payload)
  )
  ipcMain.handle('targets:rename', (_, payload: { targetId: string; name: string }) =>
    store.renameTarget(payload)
  )
  ipcMain.handle('targets:set-color', (_, payload: { targetId: string; color: string }) =>
    store.setTargetColor(payload)
  )
  ipcMain.handle(
    'targets:set-active',
    (_, payload: { spaceId: string; targetId: string }) =>
      store.setActiveTarget(payload)
  )
  ipcMain.handle('apply:global-shell', () => store.applyGlobalShell())
  ipcMain.handle('apply:directory-target', (_, payload: { targetId: string }) =>
    store.applyDirectoryTarget(payload)
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
      const expiresAt = authSessionCache.expiresAt(payload.profile)
      const value = await store.revealEnv(payload.profile, payload.name)
      return { ok: true, value: value ?? '', expiresAt }
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
      const expiresAt = authSessionCache.expiresAt(payload.profile)
      const value = await store.revealEnv(payload.profile, payload.name)
      return { ok: true, value: value ?? '', expiresAt }
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
        await authGate.authorize('update', { targetId: payload.profile })
        await store.updateEnv(payload)
        return ok()
      } catch (error) {
        return failure(error)
      }
    }
  )

  ipcMain.handle('envs:delete', async (_, payload: { id: string; profile: string; name: string }) => {
    try {
      const cached = authSessionCache.isAuthorized(payload.profile)
      if (cached) {
        return { ok: true, value: 'needs-confirmation' }
      }
      await authGate.authorize('delete', { targetId: payload.profile })
      await store.deleteEnv(payload)
      return { ok: true }
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:delete-confirmed', async (_, payload: { id: string; profile: string; name: string }) => {
    try {
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
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
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
    await window.webContents.session.clearStorageData({
      storages: [
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
      ],
    })
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
