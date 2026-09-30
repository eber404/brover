import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'

describe('BroverStore', () => {
  let root: string
  let dbPath: string
  let store: BroverStore

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'brover-store-'))
    dbPath = join(root, 'config.json')
    store = new BroverStore(dbPath, new MemorySecretStore())
  })

  describe('Environments', () => {
    it('listEnvironments returns empty array on empty DB', async () => {
      const environments = await store.listEnvironments()
      expect(environments).toHaveLength(0)
    })

    it('createEnvironment adds root-level environment', async () => {
      const environments = await store.createEnvironment({ name: 'default' })

      expect(environments).toHaveLength(1)
      expect(environments[0]?.name).toBe('default')
      expect(environments[0]?.isActive).toBe(true)
    })

    it('createEnvironment throws if name empty', async () => {
      await expect(store.createEnvironment({ name: '   ' })).rejects.toThrow('Environment name required')
    })

    it('createEnvironment throws on duplicate name', async () => {
      await store.createEnvironment({ name: 'prod' })
      await expect(store.createEnvironment({ name: 'prod' })).rejects.toThrow('Environment name already exists')
    })

    it('createEnvironment clones envs when shared secret names is true', async () => {
      await store.setSharedSecretNames(true)
      const initialTargets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = initialTargets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })

      const stagingTargets = await store.createEnvironment({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      const allEnvs = await store.listEnvs()
      const stagingEnvs = allEnvs.filter((env) => env.profile === stagingTarget.id)
      expect(stagingEnvs.find((env) => env.name === 'API_KEY')).toBeDefined()
    })

    it('createEnvironment does not clone envs when shared secret names is false', async () => {
      await store.setSharedSecretNames(false)
      const initialTargets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = initialTargets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })

      const prodTargets = await store.createEnvironment({ name: 'prod' })
      const prodTarget = prodTargets.find((target) => target.name === 'prod')!

      const allEnvs = await store.listEnvs()
      const prodEnvs = allEnvs.filter((env) => env.profile === prodTarget.id)
      expect(prodEnvs).toHaveLength(0)
    })

    it('deleteEnvironment removes secrets from store', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const stagingTargets = await store.createEnvironment({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      await store.createEnv({ name: 'SECRET', profile: stagingTarget.id, value: 'hunter2' })

      await store.deleteEnvironment({ environmentId: stagingTarget.id })

      const remaining = await store.listEnvironments()
      expect(remaining.find((target) => target.id === stagingTarget.id)).toBeUndefined()
      expect(targets[0]?.id).not.toBe(stagingTarget.id)
      await expect(store.revealEnv(stagingTarget.id, 'SECRET')).resolves.toBeNull()
    })

    it('deleteEnvironment promotes next environment if deleted was active', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      const stagingTargets = await store.createEnvironment({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!
      await store.setActiveEnvironment({ environmentId: stagingTarget.id })

      await store.deleteEnvironment({ environmentId: stagingTarget.id })

      const remaining = await store.listEnvironments()
      expect(remaining.find((target) => target.isActive)?.name).toBe('default')
      expect(defaultTarget.id).toBe(remaining[0]?.id)
    })

    it('renameEnvironment updates environment name', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      const updated = await store.renameEnvironment({ environmentId: defaultTarget.id, name: 'production' })
      expect(updated.find((target) => target.id === defaultTarget.id)?.name).toBe('production')
    })

    it('renameEnvironment throws if name empty', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.renameEnvironment({ environmentId: defaultTarget.id, name: '  ' })).rejects.toThrow('Environment name required')
    })

    it('renameEnvironment throws on duplicate name', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnvironment({ name: 'staging' })
      await expect(store.renameEnvironment({ environmentId: defaultTarget.id, name: 'staging' })).rejects.toThrow('Environment name already exists')
    })

    it('setEnvironmentColor updates color', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      const updated = await store.setEnvironmentColor({ environmentId: defaultTarget.id, color: '#ff0000' })
      expect(updated.find((target) => target.id === defaultTarget.id)?.color).toBe('#ff0000')
    })

    it('setActiveEnvironment marks only one active environment', async () => {
      await store.createEnvironment({ name: 'default' })
      const stagingTargets = await store.createEnvironment({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      await store.setActiveEnvironment({ environmentId: stagingTarget.id })

      const finalTargets = await store.listEnvironments()
      expect(finalTargets.filter((target) => target.isActive)).toHaveLength(1)
      expect(finalTargets.find((target) => target.isActive)?.id).toBe(stagingTarget.id)
    })

    it('setActiveEnvironment throws when environment id does not exist', async () => {
      await store.createEnvironment({ name: 'default' })

      await expect(store.setActiveEnvironment({ environmentId: 'missing-env' })).rejects.toThrow('Environment not found')

      const finalTargets = await store.listEnvironments()
      expect(finalTargets.filter((target) => target.isActive)).toHaveLength(1)
    })

    it('reorderEnvironments reorders root-level environments', async () => {
      const defaultTargets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = defaultTargets.find((target) => target.name === 'default')!
      const stagingTargets = await store.createEnvironment({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      const reordered = await store.reorderEnvironments({
        orderedEnvironmentIds: [stagingTarget.id, defaultTarget.id],
      })

      expect(reordered[0]?.id).toBe(stagingTarget.id)
      expect(reordered[1]?.id).toBe(defaultTarget.id)
    })
  })

  describe('Envs', () => {
    it('createEnv saves secret to store and creates metadata', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret123' })

      const revealed = await store.revealEnv(defaultTarget.id, 'API_KEY')
      expect(revealed).toBe('secret123')
    })

    it('createEnv propagates to all environments when shared secret names is true', async () => {
      await store.setSharedSecretNames(true)
      const defaultTargets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = defaultTargets.find((target) => target.name === 'default')!

      await store.createEnvironment({ name: 'staging' })
      const stagingTargets = await store.listEnvironments()
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      await store.createEnv({ name: 'DATABASE_URL', profile: defaultTarget.id, value: 'postgres://local' })

      const allEnvs = await store.listEnvs()
      expect(allEnvs.filter((env) => env.name === 'DATABASE_URL')).toHaveLength(2)

      const stagingRevealed = await store.revealEnv(stagingTarget.id, 'DATABASE_URL')
      expect(stagingRevealed).toBeNull()
    })

    it('createEnv throws if invalid env name', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.createEnv({ name: '123invalid', profile: defaultTarget.id, value: 'x' })).rejects.toThrow('Invalid env name')
    })

    it('createEnv throws if empty value', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: '' })).rejects.toThrow('Secret value required')
    })

    it('createEnv throws if duplicate in target', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })
      await expect(store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret2' })).rejects.toThrow('Secret already exists in this environment')
    })

    it('updateEnv updates metadata and optionally value', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'old' })
      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'API_KEY')!

      await store.updateEnv({ id: env.id, profile: defaultTarget.id, name: 'API_KEY', value: 'new', description: 'updated' })

      const revealed = await store.revealEnv(defaultTarget.id, 'API_KEY')
      expect(revealed).toBe('new')

      const updatedEnvs = await store.listEnvs()
      const updatedEnv = updatedEnvs.find((item) => item.id === env.id)!
      expect(updatedEnv.description).toBe('updated')
    })

    it('deleteEnv removes from store and metadata', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'TO_DELETE', profile: defaultTarget.id, value: 'secret' })
      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'TO_DELETE')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'TO_DELETE' })

      const revealed = await store.revealEnv(defaultTarget.id, 'TO_DELETE')
      expect(revealed).toBeNull()
    })

    it('deleteEnv removes from all environments when shared secret names is true', async () => {
      await store.setSharedSecretNames(true)
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnvironment({ name: 'staging' })
      await store.createEnv({ name: 'SHARED', profile: defaultTarget.id, value: 'secret' })

      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'SHARED')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'SHARED' })

      const remaining = await store.listEnvs()
      expect(remaining.find((item) => item.name === 'SHARED')).toBeUndefined()
    })

    it('toggleEnvEnabled flips enabled state by id', async () => {
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'TOGGLE_ME', profile: defaultTarget.id, value: 'secret' })
      const created = (await store.listEnvs()).find(
        (env) => env.name === 'TOGGLE_ME' && env.profile === defaultTarget.id
      )!

      const toggled = await store.toggleEnvEnabled(created.id)
      expect(toggled.find((env) => env.id === created.id)?.enabled).toBe(false)

      const toggledAgain = await store.toggleEnvEnabled(created.id)
      expect(toggledAgain.find((env) => env.id === created.id)?.enabled).toBe(true)
    })

    it('deleteEnv removes only local env when shared secret names is false', async () => {
      await store.setSharedSecretNames(false)
      const targets = await store.createEnvironment({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'LOCAL_ENV', profile: defaultTarget.id, value: 'secret1' })

      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'LOCAL_ENV')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'LOCAL_ENV' })

      const remaining = await store.listEnvs()
      expect(remaining.find((item) => item.name === 'LOCAL_ENV')).toBeUndefined()
    })
  })

  describe('Shared secret names', () => {
    it('defaults sharedSecretNames to false', async () => {
      await expect(store.getSharedSecretNames()).resolves.toBe(false)
    })

    it('setSharedSecretNames persists global flag', async () => {
      await store.setSharedSecretNames(true)
      await expect(store.getSharedSecretNames()).resolves.toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('readDB normalizes legacy spaces when not an array', async () => {
      const corruptedDB = JSON.stringify({
        spaces: 'not-an-array',
        targets: [],
        envs: [],
        extra: []
      })
      await writeFile(dbPath, corruptedDB)

      const freshStore = new BroverStore(dbPath, new MemorySecretStore())
      const targets = await freshStore.listEnvironments()

      expect(targets).toHaveLength(0)
    })

    it('readDB normalizes multiple active environments down to one active environment', async () => {
      await writeFile(dbPath, JSON.stringify({
        envs: [],
        environments: [
          { id: 'env-1', name: 'dev', color: '#111111', isActive: true, updatedAt: '2026-01-01T00:00:00.000Z' },
          { id: 'env-2', name: 'prod', color: '#222222', isActive: true, updatedAt: '2026-01-01T00:00:00.000Z' },
        ],
        sharedSecretNames: false,
      }))

      const freshStore = new BroverStore(dbPath, new MemorySecretStore())
      const targets = await freshStore.listEnvironments()

      expect(targets.filter((target) => target.isActive)).toHaveLength(1)
      expect(targets.find((target) => target.isActive)?.id).toBe('env-1')
    })
  })
})
