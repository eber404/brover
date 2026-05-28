import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, beforeEach } from 'vitest'
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

  describe('Spaces', () => {
    it('listSpaces returns empty array on empty DB', async () => {
      const spaces = await store.listSpaces()
      expect(spaces).toHaveLength(0)
    })

    it('createSpace adds dotfile space with default target', async () => {
      const spaces = await store.createSpace({ name: 'MyRepo', dotfilePath: '/tmp/repo/.zshrc' })
      expect(spaces).toHaveLength(1)
      const newSpace = spaces.find((s) => s.name === 'MyRepo')!
      expect(newSpace.kind).toBe('dotfile')
      expect(newSpace.tiedSecrets).toBe(true)

      const targets = await store.listTargets(newSpace.id)
      expect(targets).toHaveLength(1)
      expect(targets[0].name).toBe('default')
      expect(targets[0].isActive).toBe(true)
    })

    it('createSpace uses basename as name when name is empty', async () => {
      const spaces = await store.createSpace({ name: '', dotfilePath: '/tmp/my-project/.zshrc' })
      const newSpace = spaces.find((s) => s.dotfilePath === '/tmp/my-project/.zshrc')
      expect(newSpace?.name).toBe('.zshrc')
    })

    it('renameSpace updates space name', async () => {
      const spaces = await store.createSpace({ name: 'Old', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Old')!

      const updated = await store.renameSpace({ spaceId: newSpace.id, name: 'New' })
      expect(updated.find((s) => s.id === newSpace.id)?.name).toBe('New')
    })

    it('renameSpace throws if name empty', async () => {
      const spaces = await store.createSpace({ name: 'Test', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Test')!

      await expect(store.renameSpace({ spaceId: newSpace.id, name: '   ' })).rejects.toThrow('Space name required')
    })

    it('deleteSpace cascades to targets and envs', async () => {
      const spaces = await store.createSpace({ name: 'ToDelete', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'ToDelete')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'SECRET', profile: devTarget.id, value: 'hunter2' })

      const remaining = await store.deleteSpace(newSpace.id)
      expect(remaining.find((s) => s.id === newSpace.id)).toBeUndefined()

      const remainingTargets = await store.listTargets(newSpace.id)
      expect(remainingTargets).toHaveLength(0)
    })

    it('toggleSpaceTiedSecrets flips the flag', async () => {
      const spaces = await store.createSpace({ name: 'Test', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Test')!
      expect(newSpace.tiedSecrets).toBe(true)

      const toggled = await store.toggleSpaceTiedSecrets(newSpace.id)
      expect(toggled.find((s) => s.id === newSpace.id)?.tiedSecrets).toBe(false)
    })

    it('toggleSpaceExpanded flips the flag', async () => {
      const spaces = await store.createSpace({ name: 'Test', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Test')!
      expect(newSpace.expanded).toBe(true)

      const toggled = await store.toggleSpaceExpanded(newSpace.id)
      expect(toggled.find((s) => s.id === newSpace.id)?.expanded).toBe(false)
    })
  })

  describe('Targets', () => {
    it('createTarget adds target to space', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!

      const targets = await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      expect(targets.find((t) => t.name === 'staging')).toBeDefined()
    })

    it('createTarget throws if space not found', async () => {
      await expect(store.createTarget({ spaceId: 'nonexistent', name: 'test' })).rejects.toThrow('Space not found')
    })

    it('createTarget throws if name empty', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!

      await expect(store.createTarget({ spaceId: newSpace.id, name: '   ' })).rejects.toThrow('Target name required')
    })

    it('createTarget throws on duplicate name in space', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!

      await store.createTarget({ spaceId: newSpace.id, name: 'prod' })
      await expect(store.createTarget({ spaceId: newSpace.id, name: 'prod' })).rejects.toThrow('Target name already exists in this space')
    })

    it('createTarget clones envs when space.tiedSecrets is true', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'secret1' })

      const stagingTargets = await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      const stagingTarget = stagingTargets.find((t) => t.name === 'staging')!

      const allEnvs = await store.listEnvs()
      const stagingEnvs = allEnvs.filter((e) => e.profile === stagingTarget.id)
      expect(stagingEnvs.find((e) => e.name === 'API_KEY')).toBeDefined()
    })

    it('createTarget does NOT clone envs when space.tiedSecrets is false', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!

      await store.toggleSpaceTiedSecrets(newSpace.id)

      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'secret1' })

      const prodTargets = await store.createTarget({ spaceId: newSpace.id, name: 'prod' })
      const prodTarget = prodTargets.find((t) => t.name === 'prod')!

      const allEnvs = await store.listEnvs()
      const prodEnvs = allEnvs.filter((e) => e.profile === prodTarget.id)
      expect(prodEnvs).toHaveLength(0)
    })

    it('deleteTarget removes secrets from store', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'SECRET', profile: devTarget.id, value: 'hunter2' })

      await store.deleteTarget({ targetId: devTarget.id })

      const remaining = await store.listTargets(newSpace.id)
      expect(remaining.find((t) => t.id === devTarget.id)).toBeUndefined()
    })

    it('deleteTarget promotes next target if deleted was active', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      await store.setActiveTarget({ spaceId: newSpace.id, targetId: devTarget.id })

      await store.deleteTarget({ targetId: devTarget.id })

      const remaining = await store.listTargets(newSpace.id)
      expect(remaining.find((t) => t.isActive)?.name).toBe('staging')
    })

    it('renameTarget updates target name', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      const updated = await store.renameTarget({ targetId: devTarget.id, name: 'production' })
      expect(updated.find((t) => t.id === devTarget.id)?.name).toBe('production')
    })

    it('renameTarget throws if name empty', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await expect(store.renameTarget({ targetId: devTarget.id, name: '  ' })).rejects.toThrow('Target name required')
    })

    it('renameTarget throws on duplicate name in space', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      await expect(store.renameTarget({ targetId: devTarget.id, name: 'staging' })).rejects.toThrow('Target name already exists in this space')
    })

    it('setTargetColor updates color', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      const updated = await store.setTargetColor({ targetId: devTarget.id, color: '#ff0000' })
      expect(updated.find((t) => t.id === devTarget.id)?.color).toBe('#ff0000')
    })

    it('setActiveTarget marks only one as active per space', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      const stagingTargets = await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      const stagingTarget = stagingTargets.find((t) => t.name === 'staging')!

      await store.setActiveTarget({ spaceId: newSpace.id, targetId: stagingTarget.id })

      const finalTargets = await store.listTargets(newSpace.id)
      expect(finalTargets.filter((t) => t.isActive)).toHaveLength(1)
      expect(finalTargets.find((t) => t.isActive)?.id).toBe(stagingTarget.id)
    })

    it('reorderTargets reorders within space', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!
      const stagingTargets = await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      const stagingTarget = stagingTargets.find((t) => t.name === 'staging')!

      const reordered = await store.reorderTargets({
        spaceId: newSpace.id,
        orderedTargetIds: [stagingTarget.id, devTarget.id],
      })

      expect(reordered[0].id).toBe(stagingTarget.id)
      expect(reordered[1].id).toBe(devTarget.id)
    })
  })

  describe('Envs', () => {
    it('createEnv saves secret to store and creates metadata', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'secret123' })

      const revealed = await store.revealEnv(devTarget.id, 'API_KEY')
      expect(revealed).toBe('secret123')
    })

    it('createEnv propagates to all targets when tiedSecrets true', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      const stagingTargets = await store.listTargets(newSpace.id)
      const stagingTarget = stagingTargets.find((t) => t.name === 'staging')!

      await store.createEnv({ name: 'DATABASE_URL', profile: devTarget.id, value: 'postgres://local' })

      const allEnvs = await store.listEnvs()
      expect(allEnvs.filter((e) => e.name === 'DATABASE_URL')).toHaveLength(2)

      const stagingRevealed = await store.revealEnv(stagingTarget.id, 'DATABASE_URL')
      expect(stagingRevealed).toBeNull()
    })

    it('createEnv throws if invalid env name', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await expect(store.createEnv({ name: '123invalid', profile: devTarget.id, value: 'x' })).rejects.toThrow('Invalid env name')
    })

    it('createEnv throws if empty value', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await expect(store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: '' })).rejects.toThrow('Secret value required')
    })

    it('createEnv throws if duplicate in target', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'secret1' })
      await expect(store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'secret2' })).rejects.toThrow('Secret already exists in this target')
    })

    it('updateEnv updates metadata and optionally value', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'API_KEY', profile: devTarget.id, value: 'old' })
      const envs = await store.listEnvs()
      const env = envs.find((e) => e.name === 'API_KEY')!

      await store.updateEnv({ id: env.id, profile: devTarget.id, name: 'API_KEY', value: 'new', description: 'updated' })

      const revealed = await store.revealEnv(devTarget.id, 'API_KEY')
      expect(revealed).toBe('new')

      const updatedEnvs = await store.listEnvs()
      const updatedEnv = updatedEnvs.find((e) => e.id === env.id)!
      expect(updatedEnv.description).toBe('updated')
    })

    it('deleteEnv removes from store and metadata', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createEnv({ name: 'TO_DELETE', profile: devTarget.id, value: 'secret' })
      const envs = await store.listEnvs()
      const env = envs.find((e) => e.name === 'TO_DELETE')!

      await store.deleteEnv({ id: env.id, profile: devTarget.id, name: 'TO_DELETE' })

      const revealed = await store.revealEnv(devTarget.id, 'TO_DELETE')
      expect(revealed).toBeNull()
    })

    it('deleteEnv removes from all targets when tiedSecrets true', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.createTarget({ spaceId: newSpace.id, name: 'staging' })
      await store.createEnv({ name: 'SHARED', profile: devTarget.id, value: 'secret' })

      const envs = await store.listEnvs()
      const env = envs.find((e) => e.name === 'SHARED')!

      await store.deleteEnv({ id: env.id, profile: devTarget.id, name: 'SHARED' })

      const remaining = await store.listEnvs()
      expect(remaining.find((e) => e.name === 'SHARED')).toBeUndefined()
    })
  })

  describe('Apps', () => {
    it('listApps returns empty array initially', async () => {
      const apps = await store.listApps()
      expect(apps).toEqual([])
    })

    it('createApp adds app with valid bundle ID', async () => {
      const apps = await store.createApp('My App', 'com.example.app')
      expect(apps).toHaveLength(1)
      expect(apps[0].displayName).toBe('My App')
      expect(apps[0].enabled).toBe(true)
    })

    it('createApp throws with invalid bundle ID', async () => {
      await expect(store.createApp('Bad', 'not-a-valid-bundle-id')).rejects.toThrow('Invalid app payload')
    })

    it('createApp throws with empty display name', async () => {
      await expect(store.createApp('', 'com.example.app')).rejects.toThrow('Invalid app payload')
    })

    it('toggleApp flips enabled state', async () => {
      await store.createApp('App', 'com.example.app')
      const apps = await store.listApps()
      const app = apps[0]

      const toggled = await store.toggleApp(app.id)
      expect(toggled[0].enabled).toBe(false)
    })

    it('deleteApp removes app', async () => {
      await store.createApp('ToDelete', 'com.example.delete')
      const apps = await store.listApps()
      const app = apps[0]

      const remaining = await store.deleteApp(app.id)
      expect(remaining).toHaveLength(0)
    })
  })

  describe('Profiles', () => {
    it('listProfiles returns default profile', async () => {
      const profiles = await store.listProfiles()
      expect(profiles).toHaveLength(1)
      expect(profiles[0].isActive).toBe(true)
    })

    it('createProfile adds inactive profile', async () => {
      const profiles = await store.createProfile('work')
      expect(profiles).toHaveLength(2)
      expect(profiles.find((p) => p.name === 'work')?.isActive).toBe(false)
    })

    it('createProfile throws if name empty', async () => {
      await expect(store.createProfile('   ')).rejects.toThrow('Profile required')
    })

    it('setActiveProfile activates only one profile', async () => {
      const profiles = await store.createProfile('work')
      const workProfile = profiles.find((p) => p.name === 'work')!

      await store.setActiveProfile(workProfile.id)

      const updated = await store.listProfiles()
      expect(updated.filter((p) => p.isActive)).toHaveLength(1)
    })
  })

  describe('Edge cases', () => {
    it('readDB normalizes spaces when not an array', async () => {
      const corruptedDB = JSON.stringify({
        spaces: 'not-an-array',
        targets: [],
        envs: [],
        apps: [],
        profiles: []
      })
      await writeFile(dbPath, corruptedDB)

      const freshStore = new BroverStore(dbPath, new MemorySecretStore())
      const spaces = await freshStore.listSpaces()

      expect(spaces).toHaveLength(0)
    })

    it('deleteEnv removes only local env when tiedSecrets false', async () => {
      const spaces = await store.createSpace({ name: 'Repo', dotfilePath: '/tmp/repo/.zshrc' })
      const newSpace = spaces.find((s) => s.name === 'Repo')!
      const targets = await store.listTargets(newSpace.id)
      const devTarget = targets.find((t) => t.name === 'default')!

      await store.toggleSpaceTiedSecrets(newSpace.id)
      await store.createEnv({ name: 'LOCAL_ENV', profile: devTarget.id, value: 'secret1' })

      const envs = await store.listEnvs()
      const env = envs.find((e) => e.name === 'LOCAL_ENV')!

      await store.deleteEnv({ id: env.id, profile: devTarget.id, name: 'LOCAL_ENV' })

      const remaining = await store.listEnvs()
      expect(remaining.find((e) => e.name === 'LOCAL_ENV')).toBeUndefined()
    })
  })
})
