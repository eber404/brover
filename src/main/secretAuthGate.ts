import type { AuthSessionCache } from './authSessionCache'

export type SecretAction = 'reveal' | 'copy' | 'update' | 'delete'

export interface SecretActionContext {
  isRevealed?: boolean
  targetId?: string
}

export type AuthPrompt = (reason: string) => Promise<void>

const reasonByAction: Record<Exclude<SecretAction, 'copy'>, string> = {
  reveal: 'Authenticate to reveal secret',
  update: 'Authenticate to update secret',
  delete: 'Authenticate to delete secret',
}

export function createSecretAuthGate(prompt: AuthPrompt, cache?: AuthSessionCache) {
  return {
    async authorize(action: SecretAction, context?: SecretActionContext) {
      if (action === 'copy' && context?.isRevealed) return

      if (action === 'copy' && !context?.isRevealed) {
        if (cache?.isAuthorized(context.targetId ?? '')) return
        await prompt('Authenticate to copy hidden secret')
        if (context.targetId) cache?.grant(context.targetId)
        return
      }

      if (cache?.isAuthorized(context?.targetId ?? '')) return
      await prompt(reasonByAction[action])
      if (context?.targetId) cache?.grant(context.targetId)
    },
  }
}
