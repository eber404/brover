import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AppAuthorization, EnvMetadata, EnvSpace, EnvTarget, Profile } from '../shared/models'
import { isValidBundleID, isValidEnvName } from '../shared/validators'
import { buildDotenvContent, buildManagedShellBlock, upsertManagedShellBlock } from './envWriters'

export interface SecretStore {
  save(account: string, value: string): Promise<void>
  get(account: string): Promise<string | null>
  delete(account: string): Promise<void>
}

export class UnsupportedSecretStore implements SecretStore {
  async save(): Promise<void> {
    throw new Error('UNSUPPORTED_SECRET_BACKEND')
  }
  async get(): Promise<string | null> {
    throw new Error('UNSUPPORTED_SECRET_BACKEND')
  }
  async delete(): Promise<void> {
    throw new Error('UNSUPPORTED_SECRET_BACKEND')
  }
}

export class MemorySecretStore implements SecretStore {
  private readonly map = new Map<string, string>()
  async save(account: string, value: string): Promise<void> {
    this.map.set(account, value)
  }
  async get(account: string): Promise<string | null> {
    return this.map.get(account) ?? null
  }
  async delete(account: string): Promise<void> {
    this.map.delete(account)
  }
}

export class MacOSKeytarSecretStore implements SecretStore {
  private readonly service = 'com.brover.secret'
  async save(account: string, value: string): Promise<void> {
    const keytar = await import('keytar')
    await keytar.default.setPassword(this.service, account, value)
  }
  async get(account: string): Promise<string | null> {
    const keytar = await import('keytar')
    return keytar.default.getPassword(this.service, account)
  }
  async delete(account: string): Promise<void> {
    const keytar = await import('keytar')
    await keytar.default.deletePassword(this.service, account)
  }
}

interface DBShape {
  apps: AppAuthorization[]
  profiles: Profile[]
  envs: EnvMetadata[]
  spaces: EnvSpace[]
  targets: EnvTarget[]
}

const GLOBAL_SPACE_ID = 'space-global'
const TARGET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

function randomTargetColor(): string {
  const index = Math.floor(Math.random() * TARGET_COLORS.length)
  return TARGET_COLORS[index] ?? '#f59e0b'
}
const GLOBAL_TARGET_ID = 'target-global-default'

function createDefaultGlobalSpace(now: string): EnvSpace {
  return {
    id: GLOBAL_SPACE_ID,
    name: 'Glob',
    kind: 'global',
    expanded: true,
    updatedAt: now,
  }
}

function createDefaultGlobalTarget(now: string): EnvTarget {
  return {
    id: GLOBAL_TARGET_ID,
    spaceId: GLOBAL_SPACE_ID,
    name: 'default',
    color: '#38bdf8',
    isActive: true,
    updatedAt: now,
  }
}

export class BroverStore {
  private readonly dbPath: string
  private readonly secrets: SecretStore

  constructor(dbPath: string, secrets: SecretStore) {
    this.dbPath = dbPath
    this.secrets = secrets
  }

  private async readDB(): Promise<DBShape> {
    try {
      const raw = await readFile(this.dbPath, 'utf8')
      const parsed = JSON.parse(raw) as unknown as DBShape
      return {
        apps: Array.isArray(parsed.apps) ? parsed.apps : [],
        profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [{ id: randomUUID(), name: 'default', isActive: true, updatedAt: new Date().toISOString() }],
        envs: Array.isArray(parsed.envs) ? parsed.envs : [],
        spaces: Array.isArray(parsed.spaces) && parsed.spaces.length > 0 ? parsed.spaces : [createDefaultGlobalSpace(new Date().toISOString())],
        targets: Array.isArray(parsed.targets) && parsed.targets.length > 0 ? parsed.targets : [createDefaultGlobalTarget(new Date().toISOString())]
      }
    } catch {
      return {
        apps: [],
        profiles: [{ id: randomUUID(), name: 'default', isActive: true, updatedAt: new Date().toISOString() }],
        envs: [],
        spaces: [createDefaultGlobalSpace(new Date().toISOString())],
        targets: [createDefaultGlobalTarget(new Date().toISOString())]
      }
    }
  }

  private async writeDB(data: DBShape): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true })
    await writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf8')
  }

  async listApps(): Promise<AppAuthorization[]> {
    return (await this.readDB()).apps
  }

  async createApp(displayName: string, bundleID: string): Promise<AppAuthorization[]> {
    if (!displayName.trim() || !isValidBundleID(bundleID)) {
      throw new Error('Invalid app payload')
    }
    const db = await this.readDB()
    db.apps.push({ id: randomUUID(), displayName: displayName.trim(), bundleID: bundleID.trim(), enabled: true, updatedAt: new Date().toISOString() })
    await this.writeDB(db)
    return db.apps
  }

  async toggleApp(id: string): Promise<AppAuthorization[]> {
    const db = await this.readDB()
    db.apps = db.apps.map((item) => (item.id === id ? { ...item, enabled: !item.enabled, updatedAt: new Date().toISOString() } : item))
    await this.writeDB(db)
    return db.apps
  }

  async deleteApp(id: string): Promise<AppAuthorization[]> {
    const db = await this.readDB()
    db.apps = db.apps.filter((item) => item.id !== id)
    await this.writeDB(db)
    return db.apps
  }

  async listProfiles(): Promise<Profile[]> {
    return (await this.readDB()).profiles
  }

  async createProfile(name: string): Promise<Profile[]> {
    if (!name.trim()) throw new Error('Profile required')
    const db = await this.readDB()
    db.profiles.push({ id: randomUUID(), name: name.trim(), isActive: false, updatedAt: new Date().toISOString() })
    await this.writeDB(db)
    return db.profiles
  }

  async setActiveProfile(id: string): Promise<Profile[]> {
    const db = await this.readDB()
    db.profiles = db.profiles.map((profile) => ({ ...profile, isActive: profile.id === id, updatedAt: new Date().toISOString() }))
    await this.writeDB(db)
    return db.profiles
  }

  async listEnvs(): Promise<EnvMetadata[]> {
    return (await this.readDB()).envs
  }

  async createEnv(payload: { name: string; profile: string; value: string; description?: string }): Promise<void> {
    const envName = payload.name.trim().toUpperCase()
    if (!isValidEnvName(envName)) throw new Error('Invalid env name')
    if (!payload.value) throw new Error('Secret value required')

    const db = await this.readDB()
    const currentTarget = db.targets.find((target) => target.id === payload.profile)
    if (!currentTarget) throw new Error('Target not found')
    const spaceTargets = db.targets.filter((target) => target.spaceId === currentTarget.spaceId)
    const alreadyExistsInSpace = db.envs.some(
      (env) => env.name === envName && spaceTargets.some((target) => target.id === env.profile)
    )
    if (alreadyExistsInSpace) throw new Error('Secret already exists in this space')

    const now = new Date().toISOString()
    for (const target of spaceTargets) {
      db.envs.push({
        id: randomUUID(),
        name: envName,
        profile: target.id,
        enabled: target.id === payload.profile,
        description: payload.description?.trim() || undefined,
        updatedAt: now
      })
    }

    await this.secrets.save(`${payload.profile}:${envName}`, payload.value)
    await this.writeDB(db)
  }

  async revealEnv(profile: string, name: string): Promise<string | null> {
    return this.secrets.get(`${profile}:${name}`)
  }

  async updateEnv(payload: { id: string; profile: string; name: string; value: string; description?: string; enabled: boolean }): Promise<void> {
    const db = await this.readDB()
    db.envs = db.envs.map((env) =>
      env.id === payload.id
        ? {
            ...env,
            description: payload.description?.trim() || undefined,
            enabled: payload.enabled,
            updatedAt: new Date().toISOString()
          }
        : env
    )
    if (payload.value) {
      await this.secrets.save(`${payload.profile}:${payload.name}`, payload.value)
    }
    await this.writeDB(db)
  }

  async deleteEnv(payload: { id: string; profile: string; name: string }): Promise<void> {
    const db = await this.readDB()
    const currentTarget = db.targets.find((target) => target.id === payload.profile)
    if (!currentTarget) throw new Error('Target not found')
    const targetIds = db.targets.filter((target) => target.spaceId === currentTarget.spaceId).map((target) => target.id)
    db.envs = db.envs.filter((env) => !(env.name === payload.name && targetIds.includes(env.profile)))
    for (const targetId of targetIds) {
      await this.secrets.delete(`${targetId}:${payload.name}`)
    }
    await this.writeDB(db)
  }

  async toggleEnvEnabled(id: string): Promise<EnvMetadata[]> {
    const db = await this.readDB()
    db.envs = db.envs.map((env) => (env.id === id ? { ...env, enabled: !env.enabled, updatedAt: new Date().toISOString() } : env))
    await this.writeDB(db)
    return db.envs
  }

  async listSpaces(): Promise<EnvSpace[]> {
    return (await this.readDB()).spaces
  }

  async createSpace(payload: { name: string; path: string }): Promise<EnvSpace[]> {
    const db = await this.readDB()
    const now = new Date().toISOString()
    const created: EnvSpace = {
      id: randomUUID(),
      name: payload.name.trim() || basename(payload.path.trim()),
      kind: 'directory',
      path: payload.path.trim(),
      expanded: true,
      updatedAt: now,
    }
    db.spaces.push(created)
    db.targets.push({
      id: randomUUID(),
      spaceId: created.id,
      name: 'dev',
      color: '#34d399',
      isActive: true,
      updatedAt: now,
    })
    await this.writeDB(db)
    return db.spaces
  }

  async renameSpace(payload: { spaceId: string; name: string }): Promise<EnvSpace[]> {
    const db = await this.readDB()
    const name = payload.name.trim()
    if (!name) throw new Error('Space name required')
    db.spaces = db.spaces.map((space) =>
      space.id === payload.spaceId
        ? { ...space, name, updatedAt: new Date().toISOString() }
        : space
    )
    await this.writeDB(db)
    return db.spaces
  }

  async deleteSpace(spaceId: string): Promise<EnvSpace[]> {
    const db = await this.readDB()
    if (spaceId === GLOBAL_SPACE_ID) throw new Error('Cannot delete global space')
    const spaceTargets = db.targets.filter((target) => target.spaceId === spaceId)
    const targetIds = spaceTargets.map((target) => target.id)

    const spaceEnvs = db.envs.filter((env) => targetIds.includes(env.profile))
    for (const env of spaceEnvs) {
      for (const targetId of targetIds) {
        await this.secrets.delete(`${targetId}:${env.name}`)
      }
    }

    db.targets = db.targets.filter((target) => target.spaceId !== spaceId)
    db.envs = db.envs.filter((env) => !targetIds.includes(env.profile))
    db.spaces = db.spaces.filter((space) => space.id !== spaceId)
    await this.writeDB(db)
    return db.spaces
  }

  async toggleSpaceExpanded(spaceId: string): Promise<EnvSpace[]> {
    const db = await this.readDB()
    db.spaces = db.spaces.map((space) =>
      space.id === spaceId
        ? { ...space, expanded: !space.expanded, updatedAt: new Date().toISOString() }
        : space
    )
    await this.writeDB(db)
    return db.spaces
  }

  async listTargets(spaceId: string): Promise<EnvTarget[]> {
    return (await this.readDB()).targets.filter((target) => target.spaceId === spaceId)
  }

  async createTarget(payload: { spaceId: string; name: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const name = payload.name.trim()
    if (!name) throw new Error('Target name required')
    const duplicate = db.targets.some(
      (target) => target.spaceId === payload.spaceId && target.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) throw new Error('Target name already exists in this space')
    const now = new Date().toISOString()
    const createdTarget: EnvTarget = {
      id: randomUUID(),
      spaceId: payload.spaceId,
      name,
      color: randomTargetColor(),
      isActive: false,
      updatedAt: now,
    }
    db.targets.push(createdTarget)

    const templateTarget = db.targets.find((target) => target.spaceId === payload.spaceId && target.id !== createdTarget.id)
    if (templateTarget) {
      const templateEnvs = db.envs.filter((env) => env.profile === templateTarget.id)
      for (const env of templateEnvs) {
        db.envs.push({
          ...env,
          id: randomUUID(),
          profile: createdTarget.id,
          enabled: false,
          updatedAt: now,
        })
      }
    }

    await this.writeDB(db)
    return db.targets.filter((target) => target.spaceId === payload.spaceId)
  }

  async deleteTarget(payload: { targetId: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')

    const targetEnvs = db.envs.filter((env) => env.profile === payload.targetId)
    for (const env of targetEnvs) {
      await this.secrets.delete(`${payload.targetId}:${env.name}`)
    }

    db.targets = db.targets.filter((item) => item.id !== payload.targetId)
    db.envs = db.envs.filter((item) => item.profile !== payload.targetId)

    const remaining = db.targets.filter((item) => item.spaceId === target.spaceId)
    const hasActive = remaining.some((item) => item.isActive)
    if (!hasActive && remaining[0]) {
      const replacementId = remaining[0].id
      db.targets = db.targets.map((item) =>
        item.spaceId === target.spaceId
          ? { ...item, isActive: item.id === replacementId, updatedAt: new Date().toISOString() }
          : item
      )
    }

    await this.writeDB(db)
    return db.targets.filter((item) => item.spaceId === target.spaceId)
  }

  async reorderTargets(payload: { spaceId: string; orderedTargetIds: string[] }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const spaceTargets = db.targets.filter((item) => item.spaceId === payload.spaceId)
    const idSet = new Set(spaceTargets.map((item) => item.id))
    const nextOrder = payload.orderedTargetIds.filter((id) => idSet.has(id))
    const missing = spaceTargets.map((item) => item.id).filter((id) => !nextOrder.includes(id))
    const finalOrder = [...nextOrder, ...missing]
    const rank = new Map(finalOrder.map((id, index) => [id, index]))

    db.targets = [
      ...db.targets.filter((item) => item.spaceId !== payload.spaceId),
      ...spaceTargets.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)),
    ]

    await this.writeDB(db)
    return db.targets.filter((item) => item.spaceId === payload.spaceId)
  }

  async renameTarget(payload: { targetId: string; name: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')
    const name = payload.name.trim()
    if (!name) throw new Error('Target name required')
    const duplicate = db.targets.some(
      (item) => item.id !== payload.targetId && item.spaceId === target.spaceId && item.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) throw new Error('Target name already exists in this space')
    db.targets = db.targets.map((item) => item.id === payload.targetId ? { ...item, name, updatedAt: new Date().toISOString() } : item)
    await this.writeDB(db)
    return db.targets.filter((item) => item.spaceId === target.spaceId)
  }

  async setTargetColor(payload: { targetId: string; color: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')
    db.targets = db.targets.map((item) => item.id === payload.targetId ? { ...item, color: payload.color, updatedAt: new Date().toISOString() } : item)
    await this.writeDB(db)
    return db.targets.filter((item) => item.spaceId === target.spaceId)
  }

  async setActiveTarget(payload: { spaceId: string; targetId: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    db.targets = db.targets.map((target) => target.spaceId === payload.spaceId ? { ...target, isActive: target.id === payload.targetId, updatedAt: new Date().toISOString() } : target)
    await this.writeDB(db)
    return db.targets.filter((target) => target.spaceId === payload.spaceId)
  }

  private async readTextFile(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf8')
    } catch {
      return ''
    }
  }

  private getHomeDirectory(): string {
    const home = process.env.BROVER_HOME ?? process.env.HOME
    if (!home) throw new Error('HOME not found')
    return home
  }

  async applyGlobalShell(): Promise<{ applied: number }> {
    const db = await this.readDB()
    const activeGlobalTarget = db.targets.find((target) => target.spaceId === GLOBAL_SPACE_ID && target.isActive)
    if (!activeGlobalTarget) throw new Error('No active global target')

    const envs = db.envs.filter((env) => env.profile === activeGlobalTarget.id && env.enabled)
    const entries: { name: string; value: string }[] = []
    for (const env of envs) {
      const value = await this.secrets.get(`${activeGlobalTarget.id}:${env.name}`)
      if (value != null) {
        entries.push({ name: env.name, value })
      }
    }

    const block = buildManagedShellBlock(entries)
    const home = this.getHomeDirectory()
    const zshrc = `${home}/.zshrc`
    const bashrc = `${home}/.bashrc`

    const zshContent = await this.readTextFile(zshrc)
    const bashContent = await this.readTextFile(bashrc)
    await writeFile(zshrc, upsertManagedShellBlock(zshContent, block), 'utf8')
    await writeFile(bashrc, upsertManagedShellBlock(bashContent, block), 'utf8')
    return { applied: entries.length }
  }

  async applyDirectoryTarget(payload: { targetId: string }): Promise<{ applied: number; path: string }> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')
    const space = db.spaces.find((item) => item.id === target.spaceId)
    if (!space || space.kind !== 'directory' || !space.path) {
      throw new Error('Directory space not found')
    }

    const envs = db.envs.filter((env) => env.profile === target.id && env.enabled)
    const entries: { name: string; value: string }[] = []
    for (const env of envs) {
      const value = await this.secrets.get(`${target.id}:${env.name}`)
      if (value != null) {
        entries.push({ name: env.name, value })
      }
    }

    const outPath = `${space.path}/.env.${target.name}`
    await mkdir(space.path, { recursive: true })
    await writeFile(outPath, buildDotenvContent(entries), 'utf8')
    return { applied: entries.length, path: outPath }
  }
}
