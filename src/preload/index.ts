import { contextBridge, ipcRenderer } from 'electron'
import type { BroverAPI } from '../shared/ipc'

console.log('[preload] Loading preload script...')

const api: BroverAPI = {
  listApps: () => ipcRenderer.invoke('apps:list'),
  createApp: (payload) => ipcRenderer.invoke('apps:create', payload),
  toggleApp: (id) => ipcRenderer.invoke('apps:toggle', id),
  deleteApp: (id) => ipcRenderer.invoke('apps:delete', id),

  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  createProfile: (name) => ipcRenderer.invoke('profiles:create', name),
  setActiveProfile: (id) => ipcRenderer.invoke('profiles:set-active', id),

  listEnvs: () => ipcRenderer.invoke('envs:list'),
  createEnv: (payload) => ipcRenderer.invoke('envs:create', payload),
  revealEnv: (payload) => ipcRenderer.invoke('envs:reveal', payload),
  copyEnv: (payload) => ipcRenderer.invoke('envs:copy', payload),
  updateEnv: (payload) => ipcRenderer.invoke('envs:update', payload),
  updateEnvConfirmed: (payload) => ipcRenderer.invoke('envs:update-confirmed', payload),
  deleteEnv: (payload) => ipcRenderer.invoke('envs:delete', payload),
  deleteEnvConfirmed: (payload) => ipcRenderer.invoke('envs:delete-confirmed', payload),
  toggleEnvEnabled: (id) => ipcRenderer.invoke('envs:toggle-enabled', id),

  listSpaces: () => ipcRenderer.invoke('spaces:list'),
  createSpace: (payload) => ipcRenderer.invoke('spaces:create', payload),
  renameSpace: (payload) => ipcRenderer.invoke('spaces:rename', payload),
  deleteSpace: (spaceId) => ipcRenderer.invoke('spaces:delete', spaceId),
  toggleSpaceTiedSecrets: (spaceId) => ipcRenderer.invoke('spaces:toggle-tied-secrets', spaceId),
  pickDotfile: () => ipcRenderer.invoke('system:pick-dotfile'),
  toggleSpaceExpanded: (spaceId) => ipcRenderer.invoke('spaces:toggle-expanded', spaceId),
  listTargets: (spaceId) => ipcRenderer.invoke('targets:list', spaceId),
  createTarget: (payload) => ipcRenderer.invoke('targets:create', payload),
  deleteTarget: (payload) => ipcRenderer.invoke('targets:delete', payload),
  reorderTargets: (payload) => ipcRenderer.invoke('targets:reorder', payload),
  renameTarget: (payload) => ipcRenderer.invoke('targets:rename', payload),
  setTargetColor: (payload) => ipcRenderer.invoke('targets:set-color', payload),
  setActiveTarget: (payload) => ipcRenderer.invoke('targets:set-active', payload),
  secretExists: (profile, name) => ipcRenderer.invoke('secrets:exists', { profile, name }),
  launch: {
    terminal: (targetId, terminalApp) => ipcRenderer.invoke('launch:terminal', { targetId, terminalApp }),
    listTerminals: () => ipcRenderer.invoke('launch:list-terminals'),
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
