import { describe, expect, it } from 'vitest'
import { MacOSKeytarSecretStore, MemorySecretStore, UnsupportedSecretStore } from './store'
import { createSecretStore } from './secretStoreFactory'

describe('createSecretStore', () => {
  it('uses in-memory secrets for e2e on non-darwin', () => {
    const store = createSecretStore({ platform: 'linux', isE2E: true, isDev: false })

    expect(store).toBeInstanceOf(MemorySecretStore)
  })

  it('uses in-memory secrets for e2e on darwin', () => {
    const store = createSecretStore({ platform: 'darwin', isE2E: true, isDev: false })

    expect(store).toBeInstanceOf(MemorySecretStore)
  })

  it('uses in-memory secrets in dev mode regardless of platform', () => {
    const store = createSecretStore({ platform: 'darwin', isE2E: false, isDev: true })

    expect(store).toBeInstanceOf(MemorySecretStore)
  })

  it('uses unsupported store on non-darwin outside e2e/dev', () => {
    const store = createSecretStore({ platform: 'linux', isE2E: false, isDev: false })

    expect(store).toBeInstanceOf(UnsupportedSecretStore)
  })

  it('uses keytar store on darwin outside e2e/dev', () => {
    const store = createSecretStore({ platform: 'darwin', isE2E: false, isDev: false })

    expect(store).toBeInstanceOf(MacOSKeytarSecretStore)
  })
})
