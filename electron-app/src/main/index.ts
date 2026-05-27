import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { BroverStore, MacOSKeytarSecretStore, UnsupportedSecretStore } from './store'
import { UNSUPPORTED_SECRET_BACKEND, type SecretActionResult } from '../shared/models'

if (!app.isPackaged) {
  app.commandLine.appendSwitch('disable-http-cache')
  app.commandLine.appendSwitch('disable-features', 'ServiceWorker')
}

const isDev = !app.isPackaged

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
  const dbPath = join(app.getPath('appData'), 'brover', 'config.json')
  const store = new BroverStore(dbPath, createSecretStore())

  ipcMain.handle('apps:list', () => store.listApps())
  ipcMain.handle('apps:create', (_, payload: { displayName: string; bundleID: string }) => store.createApp(payload.displayName, payload.bundleID))
  ipcMain.handle('apps:toggle', (_, id: string) => store.toggleApp(id))
  ipcMain.handle('apps:delete', (_, id: string) => store.deleteApp(id))

  ipcMain.handle('profiles:list', () => store.listProfiles())
  ipcMain.handle('profiles:create', (_, name: string) => store.createProfile(name))
  ipcMain.handle('profiles:set-active', (_, id: string) => store.setActiveProfile(id))

  ipcMain.handle('envs:list', () => store.listEnvs())
  ipcMain.handle('envs:toggle-enabled', (_, id: string) => store.toggleEnvEnabled(id))

  ipcMain.handle('envs:create', async (_, payload: { name: string; profile: string; value: string; description?: string }) => {
    try {
      await store.createEnv(payload)
      return ok()
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:reveal', async (_, payload: { profile: string; name: string }) => {
    try {
      const value = await store.revealEnv(payload.profile, payload.name)
      return ok(value ?? '')
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:update', async (_, payload: { id: string; profile: string; name: string; value: string; description?: string; enabled: boolean }) => {
    try {
      await store.updateEnv(payload)
      return ok()
    } catch (error) {
      return failure(error)
    }
  })

  ipcMain.handle('envs:delete', async (_, payload: { id: string; profile: string; name: string }) => {
    try {
      await store.deleteEnv(payload)
      return ok()
    } catch (error) {
      return failure(error)
    }
  })

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#070b12',
    webPreferences: {
      preload: join(app.getAppPath(), 'dist-electron', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.webContents.on('did-finish-load', () => {
    console.log('[main] Page loaded:', window.webContents.getURL())
  })

  if (isDev) {
    window.webContents.openDevTools()
    console.log('[main] Clearing Electron storage (cache, cookies, service workers)...')
    await window.webContents.session.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    })
    await window.webContents.session.clearCache()
    console.log('[main] Loading dev server...')
    await window.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173')
  } else {
    await window.loadFile(join(app.getAppPath(), 'dist', 'index.html'))
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
