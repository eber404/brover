import { describe, expect, it } from 'vitest'
import { UnsupportedSecretStore, BroverStore, MemorySecretStore } from './store'
import { mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('UnsupportedSecretStore', () => {
  it('rejects sensitive operations', async () => {
    const store = new UnsupportedSecretStore()
    await expect(store.save()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.get()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
    await expect(store.delete()).rejects.toThrow('UNSUPPORTED_SECRET_BACKEND')
  })
})

describe('BroverStore onboarding', () => {
  function createStore(dbContent?: object): { store: BroverStore; dbPath: string; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'brover-test-'))
    const dbPath = join(dir, 'config.json')
    if (dbContent) {
      writeFileSync(dbPath, JSON.stringify(dbContent))
    }
    const store = new BroverStore(dbPath, new MemorySecretStore())
    const cleanup = () => {
      try { unlinkSync(dbPath) } catch { /* ignore */ }
      try { rmdirSync(dir) } catch { /* ignore */ }
    }
    return { store, dbPath, cleanup }
  }

  it('defaults to pending when DB is empty', async () => {
    const { store, cleanup } = createStore()
    try {
      const status = await store.getOnboardingStatus()
      expect(status.completedAt).toBeUndefined()
    } finally {
      cleanup()
    }
  })

  it('defaults to pending when DB file does not exist', async () => {
    const { store, cleanup } = createStore()
    try {
      const status = await store.getOnboardingStatus()
      expect(status.completedAt).toBeUndefined()
    } finally {
      cleanup()
    }
  })

  it('markOnboardingComplete sets completedAt to a timestamp string', async () => {
    const { store, cleanup } = createStore()
    try {
      await store.markOnboardingComplete()
      const status = await store.getOnboardingStatus()
      expect(typeof status.completedAt).toBe('string')
      expect(new Date(status.completedAt!).getTime()).not.toBeNaN()
    } finally {
      cleanup()
    }
  })

  it('getOnboardingStatus returns persisted timestamp after mark', async () => {
    const { store, dbPath, cleanup } = createStore()
    try {
      await store.markOnboardingComplete()
      const status1 = await store.getOnboardingStatus()
      expect(typeof status1.completedAt).toBe('string')

      // Read from same DB file with a new store instance
      const store2 = new BroverStore(dbPath, new MemorySecretStore())
      const status2 = await store2.getOnboardingStatus()
      expect(status2.completedAt).toBe(status1.completedAt)
    } finally {
      cleanup()
    }
  })

  it('existing DB without onboarding field migrates safely to pending', async () => {
    const { store, cleanup } = createStore({
      apps: [],
      profiles: [],
      envs: [],
      spaces: [],
      targets: []
    })
    try {
      const status = await store.getOnboardingStatus()
      expect(status.completedAt).toBeUndefined()
    } finally {
      cleanup()
    }
  })

  it('legacy spaces tiedSecrets migrate to shared secret names', async () => {
    const { store, cleanup } = createStore({
      envs: [],
      spaces: [
        {
          id: 'space-1',
          name: 'Repo',
          kind: 'dotfile',
          dotfilePath: '/tmp/repo/.zshrc',
          tiedSecrets: false,
          updatedAt: '2026-06-04T00:00:00.000Z'
        }
      ],
      targets: [
        {
          id: 'target-1',
          spaceId: 'space-1',
          name: 'default',
          color: '#34d399',
          isActive: true,
          updatedAt: '2026-06-04T00:00:00.000Z'
        }
      ]
    })

    try {
      await expect(store.getSharedSecretNames()).resolves.toBe(false)
      const environments = await store.listEnvironments()
      expect(environments).toHaveLength(1)
      expect(environments[0]?.name).toBe('Repo')
    } finally {
      cleanup()
    }
  })

  it('legacy per-space default targets flatten into root-level environments and stay visible after activation changes', async () => {
    const { store, cleanup } = createStore({
      envs: [],
      spaces: [
        {
          id: 'space-1',
          name: 'API',
          kind: 'dotfile',
          dotfilePath: '/tmp/api/.env',
          tiedSecrets: true,
          updatedAt: '2026-06-04T00:00:00.000Z'
        },
        {
          id: 'space-2',
          name: 'Web',
          kind: 'dotfile',
          dotfilePath: '/tmp/web/.env',
          tiedSecrets: true,
          updatedAt: '2026-06-04T00:00:00.000Z'
        }
      ],
      targets: [
        {
          id: 'target-1',
          spaceId: 'space-1',
          name: 'default',
          color: '#34d399',
          isActive: true,
          updatedAt: '2026-06-04T00:00:00.000Z'
        },
        {
          id: 'target-2',
          spaceId: 'space-2',
          name: 'default',
          color: '#f59e0b',
          isActive: false,
          updatedAt: '2026-06-04T00:00:00.000Z'
        }
      ]
    })

    try {
      const initialEnvironments = await store.listEnvironments()
      expect(initialEnvironments.map((environment) => environment.name)).toEqual(['API', 'Web'])

      await store.setActiveEnvironment({ environmentId: 'target-2' })

      const updatedEnvironments = await store.listEnvironments()
      expect(updatedEnvironments.map((environment) => environment.name)).toEqual(['API', 'Web'])
      expect(updatedEnvironments.filter((environment) => environment.isActive)).toHaveLength(1)
      expect(updatedEnvironments.find((environment) => environment.isActive)?.id).toBe('target-2')
    } finally {
      cleanup()
    }
  })

  it('keeps fresh-start dotfile environments separate when no env metadata exists yet', async () => {
    const { store, cleanup } = createStore({
      envs: [],
      targets: [
        {
          id: 'target-1',
          name: '.bash_profile',
          color: '#34d399',
          isActive: true,
          updatedAt: '2026-06-04T00:00:00.000Z'
        },
        {
          id: 'target-2',
          name: '.zshrc',
          color: '#f59e0b',
          isActive: false,
          updatedAt: '2026-06-04T00:00:00.000Z'
        }
      ]
    })

    try {
      const environments = await store.listEnvironments()
      expect(environments).toHaveLength(2)
      expect(environments.map((environment) => environment.name)).toEqual(['.bash_profile', '.zshrc'])
      expect(environments.find((environment) => environment.isActive)?.id).toBe('target-1')
    } finally {
      cleanup()
    }
  })
})

function createTestStore(dbContent?: object): { store: BroverStore; dbPath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'brover-global-'))
  const dbPath = join(dir, 'config.json')
  if (dbContent) {
    writeFileSync(dbPath, JSON.stringify(dbContent))
  }
  const store = new BroverStore(dbPath, new MemorySecretStore())
  const cleanup = () => {
    try { unlinkSync(dbPath) } catch { /* ignore */ }
    try { rmdirSync(dir) } catch { /* ignore */ }
  }
  return { store, dbPath, cleanup }
}

describe('BroverStore global environment identity', () => {
  it('persists createdAt on create', async () => {
    const { store, dbPath, cleanup } = createTestStore()
    try {
      await store.createEnvironment({ name: 'default' })

      const persisted = JSON.parse(readFileSync(dbPath, 'utf8')) as {
        environments: { name: string; createdAt?: string }[]
      }
      const persistedEnvironment = persisted.environments.find((environment) => environment.name === 'default')
      expect(typeof persistedEnvironment?.createdAt).toBe('string')
      expect(new Date(persistedEnvironment!.createdAt!).getTime()).not.toBeNaN()
    } finally {
      cleanup()
    }
  })

  it('marks the first created environment as global and later ones as not global', async () => {
    const { store, cleanup } = createTestStore()
    try {
      const withDefault = await store.createEnvironment({ name: 'default' })
      const withStaging = await store.createEnvironment({ name: 'staging' })
      const withProd = await store.createEnvironment({ name: 'prod' })

      expect(withDefault.find((environment) => environment.name === 'default')?.isGlobal).toBe(true)
      expect(withStaging.find((environment) => environment.name === 'default')?.isGlobal).toBe(true)
      expect(withStaging.find((environment) => environment.name === 'staging')?.isGlobal).toBe(false)
      expect(withProd.find((environment) => environment.name === 'prod')?.isGlobal).toBe(false)
      expect(withProd.filter((environment) => environment.isGlobal)).toHaveLength(1)
    } finally {
      cleanup()
    }
  })

  it('keeps isGlobal on the global environment after rename', async () => {
    const { store, cleanup } = createTestStore()
    try {
      const created = await store.createEnvironment({ name: 'default' })
      const globalId = created[0]!.id
      await store.createEnvironment({ name: 'staging' })

      const renamed = await store.renameEnvironment({ environmentId: globalId, name: 'production' })
      expect(renamed.find((environment) => environment.id === globalId)?.isGlobal).toBe(true)
      expect(renamed.find((environment) => environment.name === 'staging')?.isGlobal).toBe(false)

      const listed = await store.listEnvironments()
      expect(listed.find((environment) => environment.id === globalId)?.isGlobal).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('keeps isGlobal on the same environment after reorder moves it to the end', async () => {
    const { store, cleanup } = createTestStore()
    try {
      const created = await store.createEnvironment({ name: 'default' })
      const globalId = created[0]!.id
      const staging = await store.createEnvironment({ name: 'staging' })
      const stagingId = staging.find((environment) => environment.name === 'staging')!.id
      const prod = await store.createEnvironment({ name: 'prod' })
      const prodId = prod.find((environment) => environment.name === 'prod')!.id

      const reordered = await store.reorderEnvironments({
        orderedEnvironmentIds: [stagingId, prodId, globalId],
      })

      expect(reordered.map((environment) => environment.id)).toEqual([stagingId, prodId, globalId])
      expect(new Set(reordered.map((environment) => environment.createdAt)).size).toBe(3)
      expect(reordered[reordered.length - 1]?.id).toBe(globalId)
      expect(reordered[reordered.length - 1]?.isGlobal).toBe(true)
      expect(reordered.filter((environment) => environment.isGlobal)).toHaveLength(1)
    } finally {
      cleanup()
    }
  })

  it('refuses to delete the global environment and keeps its secrets', async () => {
    const { store, cleanup } = createTestStore()
    try {
      const created = await store.createEnvironment({ name: 'default' })
      const globalId = created[0]!.id
      await store.createEnv({ name: 'API_KEY', profile: globalId, value: 'hunter2' })

      await expect(store.deleteEnvironment({ environmentId: globalId })).rejects.toThrow(/global/i)

      const remaining = await store.listEnvironments()
      expect(remaining.map((environment) => environment.id)).toEqual([globalId])
      expect(remaining[0]?.isGlobal).toBe(true)
      expect((await store.listEnvs()).map((env) => env.name)).toEqual(['API_KEY'])
      await expect(store.revealEnv(globalId, 'API_KEY')).resolves.toBe('hunter2')
    } finally {
      cleanup()
    }
  })

  it('still deletes a non-global environment', async () => {
    const { store, cleanup } = createTestStore()
    try {
      const created = await store.createEnvironment({ name: 'default' })
      const globalId = created[0]!.id
      const withStaging = await store.createEnvironment({ name: 'staging' })
      const stagingId = withStaging.find((environment) => environment.name === 'staging')!.id
      await store.createEnv({ name: 'STAGING_KEY', profile: stagingId, value: 'staging-secret' })

      await expect(store.deleteEnvironment({ environmentId: stagingId })).resolves.toHaveLength(1)

      const remaining = await store.listEnvironments()
      expect(remaining.map((environment) => environment.id)).toEqual([globalId])
      expect(remaining[0]?.isGlobal).toBe(true)
      await expect(store.revealEnv(stagingId, 'STAGING_KEY')).resolves.toBeNull()
    } finally {
      cleanup()
    }
  })

  it('resolves a global deterministically for legacy records without createdAt', async () => {
    const legacy = {
      envs: [],
      sharedSecretNames: false,
      environments: [
        { id: 'legacy-1', name: 'dev', color: '#111111', isActive: false, updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'legacy-2', name: 'prod', color: '#222222', isActive: true, updatedAt: '2026-01-02T00:00:00.000Z' },
        { id: 'legacy-3', name: 'staging', color: '#333333', isActive: false, updatedAt: '2026-01-03T00:00:00.000Z' },
      ],
    }
    const { store, dbPath, cleanup } = createTestStore(legacy)
    try {
      const environments = await store.listEnvironments()
      expect(environments.find((environment) => environment.isGlobal)?.id).toBe('legacy-1')
      expect(environments.filter((environment) => environment.isGlobal)).toHaveLength(1)

      const persisted = JSON.parse(readFileSync(dbPath, 'utf8')) as { environments: { id: string; createdAt?: string }[] }
      for (const environment of persisted.environments) {
        expect(typeof environment.createdAt).toBe('string')
      }
      const persistedCreatedAt = persisted.environments.map((environment) => environment.createdAt)
      expect(new Set(persistedCreatedAt).size).toBe(3)

      const reloaded = await new BroverStore(dbPath, new MemorySecretStore()).listEnvironments()
      expect(reloaded.find((environment) => environment.isGlobal)?.id).toBe('legacy-1')

      const reordered = await store.reorderEnvironments({ orderedEnvironmentIds: ['legacy-3', 'legacy-2', 'legacy-1'] })
      expect(reordered.find((environment) => environment.isGlobal)?.id).toBe('legacy-1')
    } finally {
      cleanup()
    }
  })
})
