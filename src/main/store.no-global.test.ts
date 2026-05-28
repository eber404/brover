import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, beforeEach } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'

describe('BroverStore global space', () => {
  let root: string
  let dbPath: string
  let store: BroverStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'brover-noglobal-'))
    dbPath = join(root, 'config.json')
    store = new BroverStore(dbPath, new MemorySecretStore())
  })

  it('does not auto-create global space on empty DB', async () => {
    const spaces = await store.listSpaces()
    expect(spaces).toHaveLength(0)
  })

  it('ensureGlobalSpace creates global space + target on demand', async () => {
    await store.ensureGlobalSpace()
    const spaces = await store.listSpaces()
    expect(spaces).toHaveLength(1)
    expect(spaces[0].kind).toBe('dotfile')
    const targets = await store.listTargets('space-global')
    expect(targets).toHaveLength(1)
  })

  it('ensureGlobalSpace is idempotent', async () => {
    await store.ensureGlobalSpace()
    await store.ensureGlobalSpace()
    const spaces = await store.listSpaces()
    expect(spaces).toHaveLength(1)
  })

  it('default target name is default not dev', async () => {
    const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
    const space = spaces.find(s => s.name === 'Repo')!
    const targets = await store.listTargets(space.id)
    expect(targets[0].name).toBe('default')
  })
})
