export type SecretAction = 'reveal' | 'copy' | 'update' | 'delete'

export interface SecretActionContext {
  isRevealed?: boolean
}

export type AuthPrompt = (reason: string) => Promise<void>

const reasonByAction: Record<Exclude<SecretAction, 'copy'>, string> = {
  reveal: 'Authenticate to reveal secret',
  update: 'Authenticate to update secret',
  delete: 'Authenticate to delete secret',
}

export function createSecretAuthGate(prompt: AuthPrompt) {
  return {
    async authorize(action: SecretAction, context?: SecretActionContext) {
      if (action !== 'copy') {
        await prompt(reasonByAction[action])
        return
      }

      if (context?.isRevealed) return
      await prompt('Authenticate to copy hidden secret')
    },
  }
}
