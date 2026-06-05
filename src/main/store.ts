import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { EnvMetadata, EnvTarget, OnboardingStatus } from '../shared/models'
import { isValidEnvName } from '../shared/validators'

interface CompatSpace {
  id: string
  name: string
  kind: 'dotfile'
  dotfilePath: string
  tiedSecrets: boolean
  updatedAt: string
}

interface StoredTarget extends EnvTarget {
  spaceId?: string
}

interface PersistedDBShape {
  envs?: unknown
  spaces?: unknown
  targets?: unknown
  tiedTargets?: unknown
  onboardingCompletedAt?: unknown
}

interface DBShape {
  envs: EnvMetadata[]
  spaces: CompatSpace[]
  targets: StoredTarget[]
  tiedTargets: boolean
  onboardingCompletedAt?: string
}

export interface SecretStore {
  save(account: string, value: string): Promise<void>
  get(account: string): Promise<string | null>
  delete(account: string): Promise<void>
  exists(account: string): Promise<boolean>
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

  async exists(): Promise<boolean> {
    return false
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

  async exists(account: string): Promise<boolean> {
    return this.map.has(account)
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

  async exists(account: string): Promise<boolean> {
    const val = await this.get(account)
    return val !== null
  }
}

const TARGET_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

function randomTargetColor(): string {
  const index = Math.floor(Math.random() * TARGET_COLORS.length)
  return TARGET_COLORS[index] ?? '#f59e0b'
}

export class BroverStore {
  private readonly dbPath: string
  readonly secrets: SecretStore

  constructor(dbPath: string, secrets: SecretStore) {
    this.dbPath = dbPath
    this.secrets = secrets
  }

  private normalizeSpaces(parsed: PersistedDBShape): CompatSpace[] {
    if (!Array.isArray(parsed.spaces)) {
      return []
    }

    const now = new Date().toISOString()
    return (parsed.spaces as CompatSpace[]).map((space) => {
      let normalized: CompatSpace = {
        ...space,
        kind: 'dotfile',
        dotfilePath: space.dotfilePath,
        tiedSecrets: typeof space.tiedSecrets === 'boolean' ? space.tiedSecrets : true,
        updatedAt: space.updatedAt ?? now,
      }

      if ((space as { kind?: string }).kind === 'global' || (space as { kind?: string }).kind === 'directory') {
        normalized = {
          ...normalized,
          kind: 'dotfile',
          dotfilePath: '~/.zshrc',
        }
      }

      if ('path' in space && !('dotfilePath' in space)) {
        normalized = { ...normalized, dotfilePath: (space as { path: string }).path }
      }

      return normalized
    })
  }

  private normalizeTargets(parsed: PersistedDBShape): StoredTarget[] {
    if (!Array.isArray(parsed.targets)) {
      return []
    }

    const now = new Date().toISOString()
    return (parsed.targets as StoredTarget[]).map((target) => ({
      ...target,
      isActive: Boolean(target.isActive),
      updatedAt: target.updatedAt ?? now,
    }))
  }

  private async readDB(): Promise<DBShape> {
    try {
      const raw = await readFile(this.dbPath, 'utf8')
      const parsed = JSON.parse(raw) as PersistedDBShape
      const spaces = this.normalizeSpaces(parsed)
      const targets = this.normalizeTargets(parsed)
      const activeRootTargetId = targets.find((target) => !target.spaceId && target.isActive)?.id ?? targets.find((target) => !target.spaceId)?.id
      const normalizedTargets = targets.map((target) => {
        if (target.spaceId) {
          return target
        }

        return {
          ...target,
          isActive: activeRootTargetId ? target.id === activeRootTargetId : target.isActive,
        }
      })

      return {
        envs: Array.isArray(parsed.envs) ? (parsed.envs as EnvMetadata[]) : [],
        spaces,
        targets: normalizedTargets,
        tiedTargets: typeof parsed.tiedTargets === 'boolean'
          ? parsed.tiedTargets
          : spaces.every((space) => space.tiedSecrets !== false),
        onboardingCompletedAt: typeof parsed.onboardingCompletedAt === 'string' ? parsed.onboardingCompletedAt : undefined,
      }
    } catch {
      return {
        envs: [],
        spaces: [],
        targets: [],
        tiedTargets: true,
        onboardingCompletedAt: undefined,
      }
    }
  }

  private async writeDB(data: DBShape): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true })
    await writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf8')
  }

  private toPublicTarget(target: StoredTarget): EnvTarget {
    return {
      id: target.id,
      name: target.name,
      color: target.color,
      isActive: target.isActive,
      updatedAt: target.updatedAt,
    }
  }

  private listScopedTargets(db: DBShape, spaceId?: string): StoredTarget[] {
    if (spaceId) {
      return db.targets.filter((target) => target.spaceId === spaceId)
    }

    return db.targets
  }

  private getTargetScope(db: DBShape, profile: string): { targetIds: string[]; tied: boolean } {
    const currentTarget = db.targets.find((target) => target.id === profile)
    if (!currentTarget) throw new Error('Target not found')

    if (!currentTarget.spaceId) {
      return {
        targetIds: db.targets.filter((target) => !target.spaceId).map((target) => target.id),
        tied: db.tiedTargets,
      }
    }

    const space = db.spaces.find((item) => item.id === currentTarget.spaceId)
    if (!space) {
      return {
        targetIds: [currentTarget.id],
        tied: false,
      }
    }

    return {
      targetIds: db.targets.filter((target) => target.spaceId === space.id).map((target) => target.id),
      tied: space.tiedSecrets,
    }
  }

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    const db = await this.readDB()
    return { completedAt: db.onboardingCompletedAt }
  }

  async markOnboardingComplete(): Promise<void> {
    const db = await this.readDB()
    db.onboardingCompletedAt = new Date().toISOString()
    await this.writeDB(db)
  }

  async listEnvs(): Promise<EnvMetadata[]> {
    return (await this.readDB()).envs
  }

  async createEnv(payload: { name: string; profile: string; value: string; description?: string }): Promise<void> {
    const envName = payload.name.trim().toUpperCase()
    if (!isValidEnvName(envName)) throw new Error('Invalid env name')
    if (!payload.value) throw new Error('Secret value required')

    const db = await this.readDB()
    const scope = this.getTargetScope(db, payload.profile)
    const alreadyExists = scope.tied
      ? db.envs.some((env) => env.name === envName && scope.targetIds.includes(env.profile))
      : db.envs.some((env) => env.name === envName && env.profile === payload.profile)
    if (alreadyExists) throw new Error('Secret already exists in this target')

    const now = new Date().toISOString()
    if (scope.tied) {
      for (const targetId of scope.targetIds) {
        db.envs.push({
          id: randomUUID(),
          name: envName,
          profile: targetId,
          enabled: targetId === payload.profile,
          description: payload.description?.trim() || undefined,
          updatedAt: now,
        })
      }
    } else {
      db.envs.push({
        id: randomUUID(),
        name: envName,
        profile: payload.profile,
        enabled: true,
        description: payload.description?.trim() || undefined,
        updatedAt: now,
      })
    }

    await this.secrets.save(`${payload.profile}:${envName}`, payload.value)
    await this.writeDB(db)
  }

  async revealEnv(profile: string, name: string): Promise<string | null> {
    return this.secrets.get(`${profile}:${name}`)
  }

  async secretExists(profile: string, name: string): Promise<boolean> {
    return this.secrets.exists(`${profile}:${name}`)
  }

  async updateEnv(payload: { id: string; profile: string; name: string; value: string; description?: string }): Promise<void> {
    const db = await this.readDB()
    db.envs = db.envs.map((env) =>
      env.id === payload.id
        ? {
            ...env,
            description: payload.description?.trim() || undefined,
            updatedAt: new Date().toISOString(),
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
    const scope = this.getTargetScope(db, payload.profile)

    if (scope.tied) {
      db.envs = db.envs.filter((env) => !(env.name === payload.name && scope.targetIds.includes(env.profile)))
      for (const targetId of scope.targetIds) {
        await this.secrets.delete(`${targetId}:${payload.name}`)
      }
    } else {
      db.envs = db.envs.filter((env) => !(env.name === payload.name && env.profile === payload.profile))
      await this.secrets.delete(`${payload.profile}:${payload.name}`)
    }

    await this.writeDB(db)
  }

  async toggleEnvEnabled(id: string): Promise<EnvMetadata[]> {
    const db = await this.readDB()
    const now = new Date().toISOString()
    db.envs = db.envs.map((env) =>
      env.id === id
        ? { ...env, enabled: !env.enabled, updatedAt: now }
        : env
    )
    await this.writeDB(db)
    return db.envs
  }

  async listSpaces(): Promise<CompatSpace[]> {
    return (await this.readDB()).spaces
  }

  async createSpace(payload: { name: string; dotfilePath: string }): Promise<CompatSpace[]> {
    const db = await this.readDB()
    const now = new Date().toISOString()
    const created: CompatSpace = {
      id: randomUUID(),
      name: payload.name.trim() || basename(payload.dotfilePath.trim()),
      kind: 'dotfile',
      dotfilePath: payload.dotfilePath.trim(),
      tiedSecrets: true,
      updatedAt: now,
    }

    db.spaces.push(created)
    db.targets.push({
      id: randomUUID(),
      spaceId: created.id,
      name: 'default',
      color: '#34d399',
      isActive: true,
      updatedAt: now,
    })
    await this.writeDB(db)
    return db.spaces
  }

  async renameSpace(payload: { spaceId: string; name: string }): Promise<CompatSpace[]> {
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

  async deleteSpace(spaceId: string): Promise<CompatSpace[]> {
    const db = await this.readDB()
    const targetIds = db.targets.filter((target) => target.spaceId === spaceId).map((target) => target.id)

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

  async toggleSpaceTiedSecrets(spaceId: string): Promise<CompatSpace[]> {
    const db = await this.readDB()
    db.spaces = db.spaces.map((space) =>
      space.id === spaceId
        ? { ...space, tiedSecrets: !space.tiedSecrets, updatedAt: new Date().toISOString() }
        : space
    )
    await this.writeDB(db)
    return db.spaces
  }

  async getTiedTargets(): Promise<boolean> {
    return (await this.readDB()).tiedTargets
  }

  async setTiedTargets(tiedTargets: boolean): Promise<boolean> {
    const db = await this.readDB()
    db.tiedTargets = tiedTargets
    await this.writeDB(db)
    return db.tiedTargets
  }

  async listTargets(spaceId?: string): Promise<EnvTarget[]> {
    const db = await this.readDB()
    return this.listScopedTargets(db, spaceId).map((target) => this.toPublicTarget(target))
  }

  async createTarget(payload: { name: string; spaceId?: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const name = payload.name.trim()
    if (!name) throw new Error('Target name required')

    if (payload.spaceId && !db.spaces.some((space) => space.id === payload.spaceId)) {
      throw new Error('Space not found')
    }

    const scopedTargets = this.listScopedTargets(db, payload.spaceId)
    const duplicate = scopedTargets.some((target) => target.name.toLowerCase() === name.toLowerCase())
    if (duplicate) {
      throw new Error(payload.spaceId ? 'Target name already exists in this space' : 'Target name already exists')
    }

    const now = new Date().toISOString()
    const createdTarget: StoredTarget = {
      id: randomUUID(),
      spaceId: payload.spaceId,
      name,
      color: randomTargetColor(),
      isActive: scopedTargets.length === 0,
      updatedAt: now,
    }
    db.targets.push(createdTarget)

    const scopeTargetIds = this.listScopedTargets(db, payload.spaceId).map((target) => target.id)
    const tied = payload.spaceId
      ? db.spaces.find((space) => space.id === payload.spaceId)?.tiedSecrets ?? false
      : db.tiedTargets
    const templateTarget = this.listScopedTargets(db, payload.spaceId).find((target) => target.id !== createdTarget.id)

    if (tied && templateTarget) {
      const templateEnvs = db.envs.filter((env) => env.profile === templateTarget.id && scopeTargetIds.includes(env.profile))
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
    return this.listScopedTargets(db, payload.spaceId).map((target) => this.toPublicTarget(target))
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

    const remaining = this.listScopedTargets(db, target.spaceId)
    const hasActive = remaining.some((item) => item.isActive)
    if (!hasActive && remaining[0]) {
      const replacementId = remaining[0].id
      db.targets = db.targets.map((item) => {
        if (item.spaceId !== target.spaceId) {
          return item
        }

        return {
          ...item,
          isActive: item.id === replacementId,
          updatedAt: new Date().toISOString(),
        }
      })
    }

    await this.writeDB(db)
    return this.listScopedTargets(db, target.spaceId).map((item) => this.toPublicTarget(item))
  }

  async reorderTargets(payload: { orderedTargetIds: string[]; spaceId?: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const scopedTargets = this.listScopedTargets(db, payload.spaceId)
    const idSet = new Set(scopedTargets.map((item) => item.id))
    const nextOrder = payload.orderedTargetIds.filter((id) => idSet.has(id))
    const missing = scopedTargets.map((item) => item.id).filter((id) => !nextOrder.includes(id))
    const finalOrder = [...nextOrder, ...missing]
    const rank = new Map(finalOrder.map((id, index) => [id, index]))

    db.targets = [
      ...db.targets.filter((item) => item.spaceId !== payload.spaceId),
      ...scopedTargets.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)),
    ]

    await this.writeDB(db)
    return this.listScopedTargets(db, payload.spaceId).map((item) => this.toPublicTarget(item))
  }

  async renameTarget(payload: { targetId: string; name: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')

    const name = payload.name.trim()
    if (!name) throw new Error('Target name required')

    const duplicate = this.listScopedTargets(db, target.spaceId).some(
      (item) => item.id !== payload.targetId && item.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) {
      throw new Error(target.spaceId ? 'Target name already exists in this space' : 'Target name already exists')
    }

    db.targets = db.targets.map((item) =>
      item.id === payload.targetId
        ? { ...item, name, updatedAt: new Date().toISOString() }
        : item
    )
    await this.writeDB(db)
    return this.listScopedTargets(db, target.spaceId).map((item) => this.toPublicTarget(item))
  }

  async setTargetColor(payload: { targetId: string; color: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const target = db.targets.find((item) => item.id === payload.targetId)
    if (!target) throw new Error('Target not found')

    db.targets = db.targets.map((item) =>
      item.id === payload.targetId
        ? { ...item, color: payload.color, updatedAt: new Date().toISOString() }
        : item
    )
    await this.writeDB(db)
    return this.listScopedTargets(db, target.spaceId).map((item) => this.toPublicTarget(item))
  }

  async setActiveTarget(payload: { targetId: string; spaceId?: string }): Promise<EnvTarget[]> {
    const db = await this.readDB()
    const scopeId = payload.spaceId ?? db.targets.find((target) => target.id === payload.targetId)?.spaceId
    db.targets = db.targets.map((target) => {
      if (target.spaceId !== scopeId) {
        return target
      }

      return {
        ...target,
        isActive: target.id === payload.targetId,
        updatedAt: new Date().toISOString(),
      }
    })
    await this.writeDB(db)
    return this.listScopedTargets(db, scopeId).map((target) => this.toPublicTarget(target))
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
}
