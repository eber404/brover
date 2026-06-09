import { contextBridge, ipcRenderer } from 'electron'
import type { BroverAPI } from '../shared/ipc'

console.log('[preload] Loading preload script...')

const api: BroverAPI = {
  listEnvs: () => ipcRenderer.invoke('envs:list'),
  createEnv: (payload) => ipcRenderer.invoke('envs:create', payload),
  revealEnv: (payload) => ipcRenderer.invoke('envs:reveal', payload),
  copyEnv: (payload) => ipcRenderer.invoke('envs:copy', payload),
  updateEnv: (payload) => ipcRenderer.invoke('envs:update', payload),
  updateEnvConfirmed: (payload) => ipcRenderer.invoke('envs:update-confirmed', payload),
  deleteEnv: (payload) => ipcRenderer.invoke('envs:delete', payload),
  deleteEnvConfirmed: (payload) => ipcRenderer.invoke('envs:delete-confirmed', payload),
  toggleEnvEnabled: (id) => ipcRenderer.invoke('envs:toggle-enabled', id),

  getSharedSecretNames: () => ipcRenderer.invoke('environments:get-shared-secret-names'),
  setSharedSecretNames: (sharedSecretNames) => ipcRenderer.invoke('environments:set-shared-secret-names', sharedSecretNames),
  listEnvironments: () => ipcRenderer.invoke('environments:list'),
  createEnvironment: (payload) => ipcRenderer.invoke('environments:create', payload),
  deleteEnvironment: (payload) => ipcRenderer.invoke('environments:delete', payload),
  reorderEnvironments: (payload) => ipcRenderer.invoke('environments:reorder', payload),
  renameEnvironment: (payload) => ipcRenderer.invoke('environments:rename', payload),
  setEnvironmentColor: (payload) => ipcRenderer.invoke('environments:set-color', payload),
  setActiveEnvironment: (payload) => ipcRenderer.invoke('environments:set-active', payload),

  secretExists: (profile, name) => ipcRenderer.invoke('secrets:exists', { profile, name }),
  launch: {
    terminal: (environmentId, terminalApp) => ipcRenderer.invoke('launch:terminal', { environmentId, terminalApp }),
    listTerminals: () => ipcRenderer.invoke('launch:list-terminals'),
    pickTerminalApp: () => ipcRenderer.invoke('launch:pick-terminal-app'),
  },

  onboarding: {
    getStatus: () => ipcRenderer.invoke('onboarding:get-status'),
    scanDotfiles: () => ipcRenderer.invoke('onboarding:scan-dotfiles'),
    runRetroactive: (selection) => ipcRenderer.invoke('onboarding:run-retroactive', selection),
    runFreshStart: (p) => ipcRenderer.invoke('onboarding:run-fresh-start', p),
    complete: () => ipcRenderer.invoke('onboarding:complete'),
  }
}

contextBridge.exposeInMainWorld('brover', api)
console.log('[preload] Exposed window.brover API')
