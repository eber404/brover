import { contextBridge, ipcRenderer } from 'electron'
import type { BroverAPI } from '../shared/ipc'

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
  updateEnv: (payload) => ipcRenderer.invoke('envs:update', payload),
  deleteEnv: (payload) => ipcRenderer.invoke('envs:delete', payload),
  toggleEnvEnabled: (id) => ipcRenderer.invoke('envs:toggle-enabled', id)
}

contextBridge.exposeInMainWorld('brover', api)
