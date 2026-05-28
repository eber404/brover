import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'

describe('BroverStore apply writers', () => {
  const previousHome = process.env.BROVER_HOME

  afterEach(() => {
    process.env.BROVER_HOME = previousHome
  })

  it('applies active global target to zsh and bash managed block', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-apply-global-'))
    process.env.BROVER_HOME = root
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    await store.ensureGlobalSpace()
    const targets = await store.listTargets('space-global')
    const active = targets.find((target) => target.isActive) ?? targets[0]

    await store.createEnv({
      name: 'API_KEY',
      profile: active.id,
      value: 'secret-123',
    })

    const result = await store.applyGlobalShell()
    expect(result.applied).toBe(1)

    const zshrc = await readFile(join(root, '.zshrc'), 'utf8')
    const bashrc = await readFile(join(root, '.bashrc'), 'utf8')
    expect(zshrc).toContain('BROVER MANAGED START')
    expect(zshrc).toContain('export API_KEY=')
    expect(bashrc).toContain('export API_KEY=')
  })

  it('writes .env.<target> for directory space target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-apply-dir-'))
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    await store.createSpace({ name: 'Repo', path: join(root, 'repo') })
    const spaces = await store.listSpaces()
    const repoSpace = spaces.find((space) => space.name === 'Repo')!
    const targets = await store.listTargets(repoSpace.id)
    const devTarget = targets.find((target) => target.name === 'default')!

    await store.createEnv({
      name: 'DATABASE_URL',
      profile: devTarget.id,
      value: 'postgres://local',
    })

    const result = await store.applyDirectoryTarget({ targetId: devTarget.id })
    expect(result.path.endsWith('.env.default')).toBe(true)

    const dotenv = await readFile(result.path, 'utf8')
    expect(dotenv).toContain('DATABASE_URL=postgres://local')
  })
})
