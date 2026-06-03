import { MacOSKeytarSecretStore, MemorySecretStore, UnsupportedSecretStore, type SecretStore } from './store'

export function createSecretStore({
  platform,
  isE2E,
}: {
  platform: NodeJS.Platform
  isE2E: boolean
}): SecretStore {
  if (platform === 'darwin') {
    return new MacOSKeytarSecretStore()
  }

  if (isE2E) {
    return new MemorySecretStore()
  }

  return new UnsupportedSecretStore()
}
