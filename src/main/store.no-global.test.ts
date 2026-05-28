import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, beforeEach } from 'vitest'
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

  afterEach(() => {
    // no cleanup needed
  })

  it('does not auto-create any space on empty DB', async () => {
    const spaces = await store.listSpaces()
    expect(spaces).toHaveLength(0)
  })

  it('default target name is default', async () => {
    const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
    const space = spaces.find(s => s.name === 'Repo')!
    const targets = await store.listTargets(space.id)
    expect(targets[0].name).toBe('default')
  })
})
