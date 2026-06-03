import { describe, expect, it } from 'vitest'
import { MacOSKeytarSecretStore, MemorySecretStore, UnsupportedSecretStore } from './store'
import { createSecretStore } from './secretStoreFactory'

describe('createSecretStore', () => {
  it('uses in-memory secrets for e2e on non-darwin platforms', () => {
    const store = createSecretStore({ platform: 'linux', isE2E: true })

    expect(store).toBeInstanceOf(MemorySecretStore)
  })

  it('uses unsupported store on non-darwin platforms outside e2e', () => {
    const store = createSecretStore({ platform: 'linux', isE2E: false })

    expect(store).toBeInstanceOf(UnsupportedSecretStore)
  })

  it('uses keytar store on darwin', () => {
    const store = createSecretStore({ platform: 'darwin', isE2E: false })

    expect(store).toBeInstanceOf(MacOSKeytarSecretStore)
  })
})
