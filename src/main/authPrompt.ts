type MacSystemPreferences = {
  promptTouchID: (reason: string) => Promise<void>
}

export function createMacSecretAuthPrompt(systemPreferences: MacSystemPreferences) {
  return async (reason: string) => {
    await systemPreferences.promptTouchID(reason)
  }
}
