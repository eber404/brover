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
  deleteEnv: (payload) => ipcRenderer.invoke('envs:delete', payload),
  toggleEnvEnabled: (id) => ipcRenderer.invoke('envs:toggle-enabled', id),

  listSpaces: () => ipcRenderer.invoke('spaces:list'),
  createSpace: (payload) => ipcRenderer.invoke('spaces:create', payload),
  renameSpace: (payload) => ipcRenderer.invoke('spaces:rename', payload),
  pickDirectory: () => ipcRenderer.invoke('system:pick-directory'),
  toggleSpaceExpanded: (spaceId) => ipcRenderer.invoke('spaces:toggle-expanded', spaceId),
  listTargets: (spaceId) => ipcRenderer.invoke('targets:list', spaceId),
  createTarget: (payload) => ipcRenderer.invoke('targets:create', payload),
  deleteTarget: (payload) => ipcRenderer.invoke('targets:delete', payload),
  renameTarget: (payload) => ipcRenderer.invoke('targets:rename', payload),
  setTargetColor: (payload) => ipcRenderer.invoke('targets:set-color', payload),
  setActiveTarget: (payload) => ipcRenderer.invoke('targets:set-active', payload),
  applyGlobalShell: () => ipcRenderer.invoke('apply:global-shell'),
  applyDirectoryTarget: (payload) => ipcRenderer.invoke('apply:directory-target', payload)
}

contextBridge.exposeInMainWorld('brover', api)
console.log('[preload] Exposed window.brover API')
