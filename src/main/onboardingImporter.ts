import { readFile, writeFile, rename } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ScanResult, RetroactiveSelection, OnboardingSummary } from '../shared/models'
import { BroverStore } from './store'

const ENV_ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/

export async function runFreshStartImport(
  store: BroverStore,
  scanResult: ScanResult,
): Promise<OnboardingSummary> {
  const status = await store.getOnboardingStatus()
  if (status.completedAt) {
    throw new Error('Onboarding already completed')
  }

  const createdSpaceIds: string[] = []

  try {
    for (const file of scanResult.files) {
      if (file.variables.length === 0) {
        continue
      }

      const spaces = await store.createSpace({
        name: basename(file.filePath),
        path: dirname(file.filePath),
      })
      const newSpace = spaces[spaces.length - 1]
      if (newSpace) {
        createdSpaceIds.push(newSpace.id)
      }
    }

    return {
      importedSensitive: 0,
      removedFromDotfiles: 0,
      ignoredNonSensitive: 0,
      ignoredWithReason: [],
    }
  } catch (err) {
    for (const spaceId of createdSpaceIds) {
      try {
        await store.deleteSpace(spaceId)
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
  const createdSpaceIds: string[] = []

  try {
    for (const file of scanResult.files) {
    const fileSensitiveVars = file.variables.filter(v => sensitiveIds.has(v.id))
    const fileNonSensitiveVars = file.variables.filter(v => !sensitiveIds.has(v.id))

    if (fileSensitiveVars.length === 0) {
      ignoredNonSensitive += fileNonSensitiveVars.length
      continue
    }

    const spaces = await store.createSpace({
      name: basename(file.filePath),
      path: dirname(file.filePath),
    })
    const newSpace = spaces[spaces.length - 1]
    if (newSpace) createdSpaceIds.push(newSpace.id)
    const targets = await store.listTargets(newSpace.id)
    const target = targets[0]
    if (!target) {
      ignoredWithReason.push({ filePath: file.filePath, reason: 'No target in space' })
      ignoredNonSensitive += fileNonSensitiveVars.length
      continue
    }

    for (const v of fileSensitiveVars) {
      await store.createEnv({ name: v.name, profile: target.id, value: v.value })
      importedSensitive++
    }

    const sensitiveNames = new Set(fileSensitiveVars.map(v => v.name))
    try {
      const content = await readFile(file.filePath, 'utf8')
      const lines = content.split('\n')
      const kept = lines.filter(line => {
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
    for (const spaceId of createdSpaceIds) {
      try {
        await store.deleteSpace(spaceId)
      } catch {
        // Best-effort cleanup
      }
    }
    throw err
  }
}
