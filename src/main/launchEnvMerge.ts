import type { EnvMetadata, Environment } from '../shared/models'

export interface LaunchEnvEntry {
  name: string
  value: string
}

export type LaunchValueLookup = (
  environmentId: string,
  name: string
) => Promise<string | null | undefined>

export function pickGlobalEnvironmentId(environments: Pick<Environment, 'id' | 'isGlobal'>[]): string | null {
  const global = environments.find(environment => environment.isGlobal)
  if (!global) return null
  return global.id
}

export async function collectLaunchEntries(
  envs: EnvMetadata[],
  environmentId: string,
  readValue: LaunchValueLookup
): Promise<LaunchEnvEntry[]> {
  const scoped = envs.filter(env => env.profile === environmentId)
  const entries: LaunchEnvEntry[] = []

  for (const env of scoped) {
    const value = await readValue(environmentId, env.name)
    if (value == null) continue
    entries.push({ name: env.name, value })
  }

  return entries
}

export function mergeLaunchEntries(
  globalEntries: LaunchEnvEntry[],
  launchedEntries: LaunchEnvEntry[]
): LaunchEnvEntry[] {
  const merged: LaunchEnvEntry[] = []
  const indexByName = new Map<string, number>()

  for (const entry of [...globalEntries, ...launchedEntries]) {
    const existingIndex = indexByName.get(entry.name)
    if (existingIndex === undefined) {
      indexByName.set(entry.name, merged.length)
      merged.push(entry)
      continue
    }
    merged[existingIndex] = entry
  }

  return merged
}