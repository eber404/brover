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

  describe('Targets', () => {
    it('listTargets returns empty array on empty DB', async () => {
      const targets = await store.listTargets()
      expect(targets).toHaveLength(0)
    })

    it('createTarget adds root-level target', async () => {
      const targets = await store.createTarget({ name: 'default' })

      expect(targets).toHaveLength(1)
      expect(targets[0]?.name).toBe('default')
      expect(targets[0]?.isActive).toBe(true)
    })

    it('createTarget throws if name empty', async () => {
      await expect(store.createTarget({ name: '   ' })).rejects.toThrow('Target name required')
    })

    it('createTarget throws on duplicate name', async () => {
      await store.createTarget({ name: 'prod' })
      await expect(store.createTarget({ name: 'prod' })).rejects.toThrow('Target name already exists')
    })

    it('createTarget clones envs when tiedTargets is true', async () => {
      const initialTargets = await store.createTarget({ name: 'default' })
      const defaultTarget = initialTargets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })

      const stagingTargets = await store.createTarget({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      const allEnvs = await store.listEnvs()
      const stagingEnvs = allEnvs.filter((env) => env.profile === stagingTarget.id)
      expect(stagingEnvs.find((env) => env.name === 'API_KEY')).toBeDefined()
    })

    it('createTarget does not clone envs when tiedTargets is false', async () => {
      await store.setTiedTargets(false)
      const initialTargets = await store.createTarget({ name: 'default' })
      const defaultTarget = initialTargets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })

      const prodTargets = await store.createTarget({ name: 'prod' })
      const prodTarget = prodTargets.find((target) => target.name === 'prod')!

      const allEnvs = await store.listEnvs()
      const prodEnvs = allEnvs.filter((env) => env.profile === prodTarget.id)
      expect(prodEnvs).toHaveLength(0)
    })

    it('deleteTarget removes secrets from store', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'SECRET', profile: defaultTarget.id, value: 'hunter2' })

      await store.deleteTarget({ targetId: defaultTarget.id })

      const remaining = await store.listTargets()
      expect(remaining.find((target) => target.id === defaultTarget.id)).toBeUndefined()
    })

    it('deleteTarget promotes next target if deleted was active', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createTarget({ name: 'staging' })
      await store.setActiveTarget({ targetId: defaultTarget.id })

      await store.deleteTarget({ targetId: defaultTarget.id })

      const remaining = await store.listTargets()
      expect(remaining.find((target) => target.isActive)?.name).toBe('staging')
    })

    it('renameTarget updates target name', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      const updated = await store.renameTarget({ targetId: defaultTarget.id, name: 'production' })
      expect(updated.find((target) => target.id === defaultTarget.id)?.name).toBe('production')
    })

    it('renameTarget throws if name empty', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.renameTarget({ targetId: defaultTarget.id, name: '  ' })).rejects.toThrow('Target name required')
    })

    it('renameTarget throws on duplicate name', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createTarget({ name: 'staging' })
      await expect(store.renameTarget({ targetId: defaultTarget.id, name: 'staging' })).rejects.toThrow('Target name already exists')
    })

    it('setTargetColor updates color', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      const updated = await store.setTargetColor({ targetId: defaultTarget.id, color: '#ff0000' })
      expect(updated.find((target) => target.id === defaultTarget.id)?.color).toBe('#ff0000')
    })

    it('setActiveTarget marks only one active target', async () => {
      await store.createTarget({ name: 'default' })
      const stagingTargets = await store.createTarget({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      await store.setActiveTarget({ targetId: stagingTarget.id })

      const finalTargets = await store.listTargets()
      expect(finalTargets.filter((target) => target.isActive)).toHaveLength(1)
      expect(finalTargets.find((target) => target.isActive)?.id).toBe(stagingTarget.id)
    })

    it('reorderTargets reorders root-level targets', async () => {
      const defaultTargets = await store.createTarget({ name: 'default' })
      const defaultTarget = defaultTargets.find((target) => target.name === 'default')!
      const stagingTargets = await store.createTarget({ name: 'staging' })
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      const reordered = await store.reorderTargets({
        orderedTargetIds: [stagingTarget.id, defaultTarget.id],
      })

      expect(reordered[0]?.id).toBe(stagingTarget.id)
      expect(reordered[1]?.id).toBe(defaultTarget.id)
    })
  })

  describe('Envs', () => {
    it('createEnv saves secret to store and creates metadata', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret123' })

      const revealed = await store.revealEnv(defaultTarget.id, 'API_KEY')
      expect(revealed).toBe('secret123')
    })

    it('createEnv propagates to all targets when tiedTargets is true', async () => {
      const defaultTargets = await store.createTarget({ name: 'default' })
      const defaultTarget = defaultTargets.find((target) => target.name === 'default')!

      await store.createTarget({ name: 'staging' })
      const stagingTargets = await store.listTargets()
      const stagingTarget = stagingTargets.find((target) => target.name === 'staging')!

      await store.createEnv({ name: 'DATABASE_URL', profile: defaultTarget.id, value: 'postgres://local' })

      const allEnvs = await store.listEnvs()
      expect(allEnvs.filter((env) => env.name === 'DATABASE_URL')).toHaveLength(2)

      const stagingRevealed = await store.revealEnv(stagingTarget.id, 'DATABASE_URL')
      expect(stagingRevealed).toBeNull()
    })

    it('createEnv throws if invalid env name', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.createEnv({ name: '123invalid', profile: defaultTarget.id, value: 'x' })).rejects.toThrow('Invalid env name')
    })

    it('createEnv throws if empty value', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await expect(store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: '' })).rejects.toThrow('Secret value required')
    })

    it('createEnv throws if duplicate in target', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret1' })
      await expect(store.createEnv({ name: 'API_KEY', profile: defaultTarget.id, value: 'secret2' })).rejects.toThrow('Secret already exists in this target')
    })

    it('updateEnv updates metadata and optionally value', async () => {
      const targets = await store.createTarget({ name: 'default' })
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
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'TO_DELETE', profile: defaultTarget.id, value: 'secret' })
      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'TO_DELETE')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'TO_DELETE' })

      const revealed = await store.revealEnv(defaultTarget.id, 'TO_DELETE')
      expect(revealed).toBeNull()
    })

    it('deleteEnv removes from all targets when tiedTargets is true', async () => {
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createTarget({ name: 'staging' })
      await store.createEnv({ name: 'SHARED', profile: defaultTarget.id, value: 'secret' })

      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'SHARED')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'SHARED' })

      const remaining = await store.listEnvs()
      expect(remaining.find((item) => item.name === 'SHARED')).toBeUndefined()
    })

    it('toggleEnvEnabled flips enabled state by id', async () => {
      const targets = await store.createTarget({ name: 'default' })
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

    it('deleteEnv removes only local env when tiedTargets is false', async () => {
      await store.setTiedTargets(false)
      const targets = await store.createTarget({ name: 'default' })
      const defaultTarget = targets.find((target) => target.name === 'default')!

      await store.createEnv({ name: 'LOCAL_ENV', profile: defaultTarget.id, value: 'secret1' })

      const envs = await store.listEnvs()
      const env = envs.find((item) => item.name === 'LOCAL_ENV')!

      await store.deleteEnv({ id: env.id, profile: defaultTarget.id, name: 'LOCAL_ENV' })

      const remaining = await store.listEnvs()
      expect(remaining.find((item) => item.name === 'LOCAL_ENV')).toBeUndefined()
    })
  })

  describe('Tied targets', () => {
    it('defaults tiedTargets to true', async () => {
      await expect(store.getTiedTargets()).resolves.toBe(true)
    })

    it('setTiedTargets persists global flag', async () => {
      await store.setTiedTargets(false)
      await expect(store.getTiedTargets()).resolves.toBe(false)
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
      const targets = await freshStore.listTargets()

      expect(targets).toHaveLength(0)
    })
  })
})
