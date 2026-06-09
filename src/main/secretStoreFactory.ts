import { MacOSKeytarSecretStore, MemorySecretStore, UnsupportedSecretStore, type SecretStore } from './store'

export function createSecretStore({
  platform,
  isE2E,
  isDev,
}: {
  platform: NodeJS.Platform
  isE2E: boolean
  isDev: boolean
}): SecretStore {
  if (isE2E || isDev) {
    return new MemorySecretStore()
  }

  if (platform === 'darwin') {
    return new MacOSKeytarSecretStore()
  }

  return new UnsupportedSecretStore()
}
