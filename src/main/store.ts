import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { EnvMetadata, Environment, OnboardingStatus } from '../shared/models'
import { isValidEnvName } from '../shared/validators'

interface CompatSpace {
  id: string
  name: string
  kind: 'dotfile'
  dotfilePath: string
  tiedSecrets: boolean
  updatedAt: string
}

interface StoredEnvironment extends Environment {
  spaceId?: string
}

interface PersistedDBShape {
  envs?: unknown
  spaces?: unknown
  targets?: unknown
  environments?: unknown
  tiedTargets?: unknown
  sharedSecretNames?: unknown
  onboardingCompletedAt?: unknown
}

interface DBShape {
  envs: EnvMetadata[]
  environments: StoredEnvironment[]
  sharedSecretNames: boolean
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

const ENVIRONMENT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

const LEGACY_CREATED_AT_BASE_MS = Date.UTC(2000, 0, 1)

function legacyCreatedAtFor(index: number): string {
  return new Date(LEGACY_CREATED_AT_BASE_MS + index).toISOString()
}

function randomEnvironmentColor(): string {
  const index = Math.floor(Math.random() * ENVIRONMENT_COLORS.length)
  return ENVIRONMENT_COLORS[index] ?? '#f59e0b'
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

  private makeUniqueEnvironmentName(name: string, usedNames: Set<string>): string {
    const trimmed = name.trim() || 'environment'
    const normalized = trimmed.toLowerCase()
    if (!usedNames.has(normalized)) {
      usedNames.add(normalized)
      return trimmed
    }

    let suffix = 2
    let candidate = `${trimmed}-${suffix}`
    while (usedNames.has(candidate.toLowerCase())) {
      suffix += 1
      candidate = `${trimmed}-${suffix}`
    }

    usedNames.add(candidate.toLowerCase())
    return candidate
  }

  private normalizeEnvironments(
    parsed: PersistedDBShape,
    spaces: CompatSpace[]
  ): { environments: StoredEnvironment[]; backfilledCreatedAt: boolean } {
    let persistedEnvironments: StoredEnvironment[] | null = null
    if (Array.isArray(parsed.environments)) {
      persistedEnvironments = parsed.environments as StoredEnvironment[]
    }
    if (!persistedEnvironments && Array.isArray(parsed.targets)) {
      persistedEnvironments = parsed.targets as StoredEnvironment[]
    }

    if (!persistedEnvironments) {
      return { environments: [], backfilledCreatedAt: false }
    }

    const now = new Date().toISOString()
    const spaceNames = new Map(spaces.map((space) => [space.id, space.name]))
    const usedNames = new Set<string>()
    let backfilledCreatedAt = false

    const normalizedEnvironments = persistedEnvironments.map((environment, index) => {
      const legacySpaceName = environment.spaceId ? spaceNames.get(environment.spaceId) : null
      const migratedName =
        environment.spaceId && environment.name.trim().toLowerCase() === 'default' && legacySpaceName
          ? legacySpaceName
          : environment.name

      if (typeof environment.createdAt !== 'string' || !environment.createdAt) {
        backfilledCreatedAt = true
      }

      return {
        ...environment,
        spaceId: undefined,
        name: this.makeUniqueEnvironmentName(migratedName, usedNames),
        isActive: Boolean(environment.isActive),
        createdAt: environment.createdAt ?? legacyCreatedAtFor(index),
        updatedAt: environment.updatedAt ?? now,
      }
    })

    return { environments: normalizedEnvironments, backfilledCreatedAt }
  }

  private async loadDB(): Promise<{ db: DBShape; needsCreatedAtBackfill: boolean }> {
    try {
      const raw = await readFile(this.dbPath, 'utf8')
      const parsed = JSON.parse(raw) as PersistedDBShape
      const spaces = this.normalizeSpaces(parsed)
      const normalized = this.normalizeEnvironments(parsed, spaces)
      const environments = normalized.environments
      const activeEnvironmentId = environments.find((environment) => environment.isActive)?.id ?? environments[0]?.id
      const normalizedEnvironments = environments.map((environment) => ({
        ...environment,
        isActive: activeEnvironmentId ? environment.id === activeEnvironmentId : environment.isActive,
      }))

      return {
        db: {
          envs: Array.isArray(parsed.envs) ? (parsed.envs as EnvMetadata[]) : [],
          environments: normalizedEnvironments,
          sharedSecretNames: this.normalizeSharedSecretNames(parsed, spaces),
          onboardingCompletedAt: typeof parsed.onboardingCompletedAt === 'string' ? parsed.onboardingCompletedAt : undefined,
        },
        needsCreatedAtBackfill: normalized.backfilledCreatedAt,
      }
    } catch {
      return {
        db: {
          envs: [],
          environments: [],
          sharedSecretNames: false,
          onboardingCompletedAt: undefined,
        },
        needsCreatedAtBackfill: false,
      }
    }
  }

  private async readDB(): Promise<DBShape> {
    const { db, needsCreatedAtBackfill } = await this.loadDB()
    if (needsCreatedAtBackfill) {
      await this.writeDB(db)
    }
    return db
  }

  private nextCreatedAt(environments: StoredEnvironment[], now: string): string {
    let latestCreatedAt: string | null = null

    for (const environment of environments) {
      const createdAt = environment.createdAt
      if (!createdAt) continue
      if (latestCreatedAt === null || createdAt > latestCreatedAt) {
        latestCreatedAt = createdAt
      }
    }

    if (latestCreatedAt === null || now > latestCreatedAt) return now
    return new Date(new Date(latestCreatedAt).getTime() + 1).toISOString()
  }

  private resolveGlobalEnvironmentId(environments: StoredEnvironment[]): string | null {
    let globalId: string | null = null
    let earliestCreatedAt = ''

    for (const environment of environments) {
      const createdAt = environment.createdAt
      if (!createdAt) continue
      if (globalId === null || createdAt < earliestCreatedAt) {
        globalId = environment.id
        earliestCreatedAt = createdAt
      }
    }

    return globalId
  }

  private normalizeSharedSecretNames(parsed: PersistedDBShape, spaces: CompatSpace[]): boolean {
    if (typeof parsed.sharedSecretNames === 'boolean') {
      return parsed.sharedSecretNames
    }

    if (typeof parsed.tiedTargets === 'boolean') {
      return parsed.tiedTargets
    }

    return spaces.every((space) => space.tiedSecrets !== false)
  }

  private async writeDB(data: DBShape): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true })
    await writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf8')
  }

  private toPublicEnvironment(environment: StoredEnvironment, globalEnvironmentId: string | null): Environment {
    return {
      id: environment.id,
      name: environment.name,
      color: environment.color,
      isActive: environment.isActive,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
      isGlobal: environment.id === globalEnvironmentId,
    }
  }

  private toPublicEnvironments(db: DBShape): Environment[] {
    const globalEnvironmentId = this.resolveGlobalEnvironmentId(db.environments)
    return db.environments.map((environment) => this.toPublicEnvironment(environment, globalEnvironmentId))
  }

  private getEnvironmentScope(db: DBShape, profile: string): { environmentIds: string[]; shared: boolean } {
    const currentEnvironment = db.environments.find((environment) => environment.id === profile)
    if (!currentEnvironment) throw new Error('Environment not found')

    return {
      environmentIds: db.environments.map((environment) => environment.id),
      shared: db.sharedSecretNames,
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
    const scope = this.getEnvironmentScope(db, payload.profile)
    const alreadyExists = scope.shared
      ? db.envs.some((env) => env.name === envName && scope.environmentIds.includes(env.profile))
      : db.envs.some((env) => env.name === envName && env.profile === payload.profile)
    if (alreadyExists) throw new Error('Secret already exists in this environment')

    const now = new Date().toISOString()
    if (scope.shared) {
      for (const environmentId of scope.environmentIds) {
        db.envs.push({
          id: randomUUID(),
          name: envName,
          profile: environmentId,
          enabled: environmentId === payload.profile,
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
    const scope = this.getEnvironmentScope(db, payload.profile)

    if (scope.shared) {
      db.envs = db.envs.filter((env) => !(env.name === payload.name && scope.environmentIds.includes(env.profile)))
      for (const environmentId of scope.environmentIds) {
        await this.secrets.delete(`${environmentId}:${payload.name}`)
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

  async getSharedSecretNames(): Promise<boolean> {
    return (await this.readDB()).sharedSecretNames
  }

  async setSharedSecretNames(sharedSecretNames: boolean): Promise<boolean> {
    const db = await this.readDB()
    db.sharedSecretNames = sharedSecretNames
    await this.writeDB(db)
    return db.sharedSecretNames
  }

  async listEnvironments(): Promise<Environment[]> {
    const db = await this.readDB()
    return this.toPublicEnvironments(db)
  }

  async createEnvironment(payload: { name: string }): Promise<Environment[]> {
    const db = await this.readDB()
    const name = payload.name.trim()
    if (!name) throw new Error('Environment name required')

    const duplicate = db.environments.some((environment) => environment.name.toLowerCase() === name.toLowerCase())
    if (duplicate) throw new Error('Environment name already exists')

    const now = new Date().toISOString()
    const createdAt = this.nextCreatedAt(db.environments, now)
    const createdEnvironment: StoredEnvironment = {
      id: randomUUID(),
      name,
      color: randomEnvironmentColor(),
      isActive: db.environments.length === 0,
      createdAt,
      updatedAt: now,
    }
    db.environments.push(createdEnvironment)

    const environmentIds = db.environments.map((environment) => environment.id)
    const templateEnvironment = db.environments.find((environment) => environment.id !== createdEnvironment.id)

    if (db.sharedSecretNames && templateEnvironment) {
      const templateEnvs = db.envs.filter((env) => env.profile === templateEnvironment.id && environmentIds.includes(env.profile))
      for (const env of templateEnvs) {
        db.envs.push({
          ...env,
          id: randomUUID(),
          profile: createdEnvironment.id,
          enabled: false,
          updatedAt: now,
        })
      }
    }

    await this.writeDB(db)
    return this.toPublicEnvironments(db)
  }

  async deleteEnvironment(payload: { environmentId: string }): Promise<Environment[]> {
    const db = await this.readDB()
    const environment = db.environments.find((item) => item.id === payload.environmentId)
    if (!environment) throw new Error('Environment not found')

    if (this.resolveGlobalEnvironmentId(db.environments) === payload.environmentId) {
      throw new Error('The global environment cannot be deleted')
    }

    const environmentEnvs = db.envs.filter((env) => env.profile === payload.environmentId)
    for (const env of environmentEnvs) {
      await this.secrets.delete(`${payload.environmentId}:${env.name}`)
    }

    db.environments = db.environments.filter((item) => item.id !== payload.environmentId)
    db.envs = db.envs.filter((item) => item.profile !== payload.environmentId)

    const remaining = db.environments
    const hasActive = remaining.some((item) => item.isActive)
    if (!hasActive && remaining[0]) {
      const replacementId = remaining[0].id
      db.environments = db.environments.map((item) => {
        return {
          ...item,
          isActive: item.id === replacementId,
          updatedAt: new Date().toISOString(),
        }
      })
    }

    await this.writeDB(db)
    return this.toPublicEnvironments(db)
  }

  async reorderEnvironments(payload: { orderedEnvironmentIds: string[] }): Promise<Environment[]> {
    const db = await this.readDB()
    const idSet = new Set(db.environments.map((item) => item.id))
    const nextOrder = payload.orderedEnvironmentIds.filter((id) => idSet.has(id))
    const missing = db.environments.map((item) => item.id).filter((id) => !nextOrder.includes(id))
    const finalOrder = [...nextOrder, ...missing]
    const rank = new Map(finalOrder.map((id, index) => [id, index]))

    db.environments = [...db.environments].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))

    await this.writeDB(db)
    return this.toPublicEnvironments(db)
  }

  async renameEnvironment(payload: { environmentId: string; name: string }): Promise<Environment[]> {
    const db = await this.readDB()
    const environment = db.environments.find((item) => item.id === payload.environmentId)
    if (!environment) throw new Error('Environment not found')

    const name = payload.name.trim()
    if (!name) throw new Error('Environment name required')

    const duplicate = db.environments.some(
      (item) => item.id !== payload.environmentId && item.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) throw new Error('Environment name already exists')

    db.environments = db.environments.map((item) =>
      item.id === payload.environmentId
        ? { ...item, name, updatedAt: new Date().toISOString() }
        : item
    )
    await this.writeDB(db)
    return this.toPublicEnvironments(db)
  }

  async setEnvironmentColor(payload: { environmentId: string; color: string }): Promise<Environment[]> {
    const db = await this.readDB()
    const environment = db.environments.find((item) => item.id === payload.environmentId)
    if (!environment) throw new Error('Environment not found')

    db.environments = db.environments.map((item) =>
      item.id === payload.environmentId
        ? { ...item, color: payload.color, updatedAt: new Date().toISOString() }
        : item
    )
    await this.writeDB(db)
    return this.toPublicEnvironments(db)
  }

  async setActiveEnvironment(payload: { environmentId: string }): Promise<Environment[]> {
    const db = await this.readDB()
    const environment = db.environments.find((item) => item.id === payload.environmentId)
    if (!environment) throw new Error('Environment not found')

    db.environments = db.environments.map((environment) => {
      return {
        ...environment,
        isActive: environment.id === payload.environmentId,
        updatedAt: new Date().toISOString(),
      }
    })
    await this.writeDB(db)
    return this.toPublicEnvironments(db)
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
