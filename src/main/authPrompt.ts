type MacSystemPreferences = {
  promptTouchID: (reason: string) => Promise<void>
}

export function createMacSecretAuthPrompt(systemPreferences: MacSystemPreferences) {
  return async (reason: string) => {
    await systemPreferences.promptTouchID(reason)
  }
}

const MACOS_USER_CANCELED = -128

function readMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''
  const message = (error as { message?: unknown }).message
  if (typeof message !== 'string') return ''
  return message
}

function readCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  return (error as { code?: unknown }).code
}

export function isAuthCanceledError(error: unknown): boolean {
  if (readCode(error) === MACOS_USER_CANCELED) return true
  return readMessage(error).toLowerCase().includes('cancel')
}
