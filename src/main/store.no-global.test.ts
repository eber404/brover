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

  it('does not auto-create any target on empty DB', async () => {
    const targets = await store.listTargets()
    expect(targets).toHaveLength(0)
  })

  it('default target name is default', async () => {
    const targets = await store.createTarget({ name: 'default' })
    expect(targets[0].name).toBe('default')
  })
})
