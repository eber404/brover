import { describe, expect, it } from 'vitest'
import { UnsupportedSecretStore, BroverStore, MemorySecretStore } from './store'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
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

  it('legacy spaces tiedSecrets migrate to global tiedTargets', async () => {
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
      await expect(store.getTiedTargets()).resolves.toBe(false)
      const targets = await store.listTargets()
      expect(targets).toHaveLength(1)
      expect(targets[0]?.name).toBe('default')
    } finally {
      cleanup()
    }
  })
})
