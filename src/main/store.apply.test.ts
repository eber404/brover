import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'

describe('BroverStore apply writers', () => {
  const previousHome = process.env.BROVER_HOME

  afterEach(() => {
    process.env.BROVER_HOME = previousHome
  })

  it('applySpace writes shell block to space dotfile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-apply-space-'))
    process.env.BROVER_HOME = root
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const dotfilePath = join(root, '.zshrc')
    await writeFile(dotfilePath, '', 'utf8')

    const spaces = await store.createSpace({ name: 'Shell', dotfilePath })
    const space = spaces[0]
    const targets = await store.listTargets(space.id)
    const defaultTarget = targets[0]

    await store.createEnv({
      name: 'API_KEY',
      profile: defaultTarget.id,
      value: 'secret-123',
    })

    const result = await store.applySpace(space.id)
    expect(result.applied).toBe(1)

    const zshrc = await readFile(dotfilePath, 'utf8')
    expect(zshrc).toContain('BROVER MANAGED START')
    expect(zshrc).toContain('export API_KEY=')
  })

  it('applySpace does nothing when no enabled envs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-apply-empty-'))
    process.env.BROVER_HOME = root
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const dotfilePath = join(root, '.zshrc')
    await writeFile(dotfilePath, '', 'utf8')

    const spaces = await store.createSpace({ name: 'Shell', dotfilePath })
    const space = spaces[0]

    const result = await store.applySpace(space.id)
    expect(result.applied).toBe(0)
  })

  it('applySpace upserts block with all enabled envs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-apply-upsert-'))
    process.env.BROVER_HOME = root
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const dotfilePath = join(root, '.zshrc')
    await writeFile(dotfilePath, '', 'utf8')

    const spaces = await store.createSpace({ name: 'Shell', dotfilePath })
    const space = spaces[0]
    const targets = await store.listTargets(space.id)
    const defaultTarget = targets[0]

    await store.createEnv({ name: 'KEY_V1', profile: defaultTarget.id, value: 'v1' })
    await store.applySpace(space.id)
    const firstContent = await readFile(dotfilePath, 'utf8')
    expect(firstContent).toContain('export KEY_V1=')

    await store.createEnv({ name: 'KEY_V2', profile: defaultTarget.id, value: 'v2' })
    await store.applySpace(space.id)
    const secondContent = await readFile(dotfilePath, 'utf8')
    expect(secondContent).toContain('export KEY_V1=')
    expect(secondContent).toContain('export KEY_V2=')
    expect(secondContent).toContain('BROVER MANAGED START')
  })
})
