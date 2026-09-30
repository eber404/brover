import { readFile, writeFile, rename } from 'node:fs/promises'
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ScanResult, RetroactiveSelection, OnboardingSummary } from '../shared/models'
import { BroverStore } from './store'

const ENV_ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/

async function createEnvironmentForFile(store: BroverStore, filePath: string): Promise<string> {
  const existingNames = new Set((await store.listEnvironments()).map((environment) => environment.name.toLowerCase()))
  const baseName = filePath === 'default' ? 'default' : basename(filePath)
  let name = baseName
  let suffix = 2

  while (existingNames.has(name.toLowerCase())) {
    name = `${baseName}-${suffix}`
    suffix += 1
  }

  const environments = await store.createEnvironment({ name })
  const createdEnvironment = environments.find((environment) => environment.name === name)
  if (!createdEnvironment) {
    throw new Error(`Failed to create environment for ${filePath}`)
  }

  return createdEnvironment.id
}

export async function runFreshStartImport(
  store: BroverStore,
  _scanResult: ScanResult,
): Promise<OnboardingSummary> {
  const status = await store.getOnboardingStatus()
  if (status.completedAt) {
    throw new Error('Onboarding already completed')
  }

  try {
    const environments = await store.listEnvironments()
    if (environments.length === 0) {
      await store.createEnvironment({ name: 'global' })
    }

    return {
      importedSensitive: 0,
      removedFromDotfiles: 0,
      ignoredNonSensitive: 0,
      ignoredWithReason: [],
    }
  } catch (err) {
    throw err
  }
}

export async function runRetroactiveImport(
  store: BroverStore,
  scanResult: ScanResult,
  selection: RetroactiveSelection,
): Promise<OnboardingSummary> {
  const status = await store.getOnboardingStatus()
  if (status.completedAt) {
    throw new Error('Onboarding already completed')
  }

  const sensitiveIds = new Set(selection.selectedSensitiveIds)
  let importedSensitive = 0
  let removedFromDotfiles = 0
  let ignoredNonSensitive = 0
  const ignoredWithReason: { filePath: string; reason: string }[] = []
  const createdEnvironmentIds: string[] = []

  try {
    for (const file of scanResult.files) {
      const fileSensitiveVars = file.variables.filter((v) => sensitiveIds.has(v.id))
      const fileNonSensitiveVars = file.variables.filter((v) => !sensitiveIds.has(v.id))

      if (fileSensitiveVars.length === 0) {
        ignoredNonSensitive += fileNonSensitiveVars.length
        continue
      }

      const environmentId = await createEnvironmentForFile(store, file.filePath)
      createdEnvironmentIds.push(environmentId)

      for (const v of fileSensitiveVars) {
        const existingEnv = (await store.listEnvs()).find(
          (env) => env.profile === environmentId && env.name === v.name
        )
        if (existingEnv) {
          await store.updateEnv({
            id: existingEnv.id,
            profile: environmentId,
            name: v.name,
            value: v.value,
            description: existingEnv.description,
          })
        } else {
          await store.createEnv({ name: v.name, profile: environmentId, value: v.value })
        }
        importedSensitive++
      }

      const sensitiveNames = new Set(fileSensitiveVars.map((v) => v.name))
      try {
        const content = await readFile(file.filePath, 'utf8')
        const lines = content.split('\n')
        const kept = lines.filter((line) => {
          const m = line.trim().match(ENV_ASSIGNMENT)
          return !(m && sensitiveNames.has(m[1]))
        })
        const removed = lines.length - kept.length
        removedFromDotfiles += removed

        const tmp = `${file.filePath}.tmp.${randomUUID()}`
        await writeFile(tmp, kept.join('\n'), 'utf8')
        await rename(tmp, file.filePath)
      } catch (err) {
        ignoredWithReason.push({
          filePath: file.filePath,
          reason: `Failed to remove sensitive lines: ${err instanceof Error ? err.message : String(err)}`,
        })
      }

      ignoredNonSensitive += fileNonSensitiveVars.length
    }

    return {
      importedSensitive,
      removedFromDotfiles,
      ignoredNonSensitive,
      ignoredWithReason,
    }
  } catch (err) {
    for (const environmentId of createdEnvironmentIds) {
      try {
        await store.deleteEnvironment({ environmentId })
      } catch {
        // Best-effort cleanup
      }
    }
    throw err
  }
}
