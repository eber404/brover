import { describe, expect, it } from 'vitest'
import { UnsupportedSecretStore } from './store'

describe('UnsupportedSecretStore', () => {
  it('rejects sensitive operations', async () => {
    const store = new UnsupportedSecretStore()
    await expect(store.save()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.get()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.delete()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
  })
})
