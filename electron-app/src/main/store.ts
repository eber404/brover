import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AppAuthorization, EnvMetadata, Profile } from '../shared/models'
import { isValidBundleID, isValidEnvName } from '../shared/validators'

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
        envs: Array.isArray(parsed.envs) ? parsed.envs : []
      }
    } catch {
      return {
        apps: [],
        profiles: [{ id: randomUUID(), name: 'default', isActive: true, updatedAt: new Date().toISOString() }],
        envs: []
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
    db.envs.push({
      id: randomUUID(),
      name: envName,
      profile: payload.profile,
      enabled: true,
      description: payload.description?.trim() || undefined,
      updatedAt: new Date().toISOString()
    })
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
    db.envs = db.envs.filter((env) => env.id !== payload.id)
    await this.secrets.delete(`${payload.profile}:${payload.name}`)
    await this.writeDB(db)
  }

  async toggleEnvEnabled(id: string): Promise<EnvMetadata[]> {
    const db = await this.readDB()
    db.envs = db.envs.map((env) => (env.id === id ? { ...env, enabled: !env.enabled, updatedAt: new Date().toISOString() } : env))
    await this.writeDB(db)
    return db.envs
  }
}
