import { readFile, writeFile, rename } from 'node:fs/promises'
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ScanResult, RetroactiveSelection, OnboardingSummary } from '../shared/models'
import { BroverStore } from './store'

const ENV_ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/

async function createTargetForFile(store: BroverStore, filePath: string): Promise<string> {
  const existingNames = new Set((await store.listTargets()).map((target) => target.name.toLowerCase()))
  const baseName = filePath === 'default' ? 'default' : basename(filePath)
  let name = baseName
  let suffix = 2

  while (existingNames.has(name.toLowerCase())) {
    name = `${baseName}-${suffix}`
    suffix += 1
  }

  const targets = await store.createTarget({ name })
  const createdTarget = targets.find((target) => target.name === name)
  if (!createdTarget) {
    throw new Error(`Failed to create target for ${filePath}`)
  }

  return createdTarget.id
}

export async function runFreshStartImport(
  store: BroverStore,
  scanResult: ScanResult,
): Promise<OnboardingSummary> {
  const status = await store.getOnboardingStatus()
  if (status.completedAt) {
    throw new Error('Onboarding already completed')
  }

  const createdTargetIds: string[] = []

  try {
    const hasParseableEntries = scanResult.files.some((file) => file.variables.length > 0)
    const existingTargets = await store.listTargets()

    if (hasParseableEntries && existingTargets.length === 0) {
      createdTargetIds.push(await createTargetForFile(store, 'default'))
    }

    return {
      importedSensitive: 0,
      removedFromDotfiles: 0,
      ignoredNonSensitive: 0,
      ignoredWithReason: [],
    }
  } catch (err) {
    for (const targetId of createdTargetIds) {
      try {
        await store.deleteTarget({ targetId })
      } catch {
        // Best-effort cleanup
      }
    }
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
  const createdTargetIds: string[] = []

  try {
    for (const file of scanResult.files) {
      const fileSensitiveVars = file.variables.filter((v) => sensitiveIds.has(v.id))
      const fileNonSensitiveVars = file.variables.filter((v) => !sensitiveIds.has(v.id))

      if (fileSensitiveVars.length === 0) {
        ignoredNonSensitive += fileNonSensitiveVars.length
        continue
      }

      const targetId = await createTargetForFile(store, file.filePath)
      createdTargetIds.push(targetId)

      for (const v of fileSensitiveVars) {
        const existingEnv = (await store.listEnvs()).find(
          (env) => env.profile === targetId && env.name === v.name
        )
        if (existingEnv) {
          await store.updateEnv({
            id: existingEnv.id,
            profile: targetId,
            name: v.name,
            value: v.value,
            description: existingEnv.description,
          })
        } else {
          await store.createEnv({ name: v.name, profile: targetId, value: v.value })
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
    for (const targetId of createdTargetIds) {
      try {
        await store.deleteTarget({ targetId })
      } catch {
        // Best-effort cleanup
      }
    }
    throw err
  }
}
