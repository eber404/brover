import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'

describe('BroverStore startup', () => {
  let root: string
  let dbPath: string
  let store: BroverStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'brover-noglobal-'))
    dbPath = join(root, 'config.json')
    store = new BroverStore(dbPath, new MemorySecretStore())
  })

  it('does not auto-create any environment on empty DB', async () => {
    const environments = await store.listEnvironments()
    expect(environments).toHaveLength(0)
  })

  it('default environment name is default', async () => {
    const environments = await store.createEnvironment({ name: 'default' })
    expect(environments[0].name).toBe('default')
  })
})
