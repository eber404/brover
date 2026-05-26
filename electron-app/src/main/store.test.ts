import { describe, expect, it } from 'vitest'
import { UnsupportedSecretStore } from './store'

describe('UnsupportedSecretStore', () => {
  it('rejects sensitive operations', async () => {
    const store = new UnsupportedSecretStore()
    await expect(store.save('default:OPENAI_API_KEY', 'x')).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.get('default:OPENAI_API_KEY')).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.delete('default:OPENAI_API_KEY')).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
  })
})
