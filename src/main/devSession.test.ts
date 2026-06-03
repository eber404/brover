import { describe, expect, it } from 'vitest'
import { getDevStorageClearOptions } from './devSession'

describe('devSession', () => {
  it('does not clear localStorage in dev session reset', () => {
    expect(getDevStorageClearOptions().storages).not.toContain('localstorage')
  })
})
