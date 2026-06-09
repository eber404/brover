export interface LaunchPreferences {
  favoriteTerminalIds: string[]
  defaultTerminalId: string
}

const STORAGE_KEY = 'brover.launch-preferences'
const LEGACY_STORAGE_KEY = 'brover.terminal'
const DEFAULT_TERMINAL_IDS = ['warp', 'iterm2', 'terminal']

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)))
}

export function promoteLaunchDefault(
  preferences: LaunchPreferences,
  terminalId: string
): LaunchPreferences {
  if (!preferences.favoriteTerminalIds.includes(terminalId)) {
    return preferences
  }

  return {
    favoriteTerminalIds: [
      terminalId,
      ...preferences.favoriteTerminalIds.filter((id) => id !== terminalId),
    ],
    defaultTerminalId: terminalId,
  }
}

function getTerminalFallback(validTerminalIds: string[]): string {
  if (validTerminalIds.includes('terminal')) return 'terminal'
  return validTerminalIds[0] ?? 'terminal'
}

function normalizeLaunchPreferences(
  value: unknown,
  validTerminalIds: string[]
): LaunchPreferences | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as { favoriteTerminalIds?: unknown; defaultTerminalId?: unknown }
  if (!Array.isArray(raw.favoriteTerminalIds) || typeof raw.defaultTerminalId !== 'string') {
    return null
  }

  const favoriteTerminalIds = dedupe(
    raw.favoriteTerminalIds.filter((id): id is string => typeof id === 'string')
  ).filter((id) => validTerminalIds.includes(id))

  if (favoriteTerminalIds.length === 0) return null

  const defaultTerminalId = favoriteTerminalIds.includes(raw.defaultTerminalId)
    ? raw.defaultTerminalId
    : favoriteTerminalIds[0]

  return {
    favoriteTerminalIds,
    defaultTerminalId,
  }
}

export function saveLaunchPreferences(preferences: LaunchPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    localStorage.setItem(LEGACY_STORAGE_KEY, preferences.defaultTerminalId)
  } catch {
    // localStorage unavailable
  }
}

export function getLaunchPreferences(
  validTerminalIds: string[] = DEFAULT_TERMINAL_IDS
): LaunchPreferences {
  const fallbackTerminalId = getTerminalFallback(validTerminalIds)

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const normalized = stored
      ? normalizeLaunchPreferences(JSON.parse(stored), validTerminalIds)
      : null
    if (normalized) return normalized

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy && validTerminalIds.includes(legacy)) {
      return {
        favoriteTerminalIds: [legacy],
        defaultTerminalId: legacy,
      }
    }
  } catch {
    // localStorage unavailable or invalid JSON
  }

  return {
    favoriteTerminalIds: [fallbackTerminalId],
    defaultTerminalId: fallbackTerminalId,
  }
}

export function getPreferredTerminalId(validTerminalIds: string[] = DEFAULT_TERMINAL_IDS) {
  return getLaunchPreferences(validTerminalIds).defaultTerminalId
}
