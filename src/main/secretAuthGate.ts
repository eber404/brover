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
      const targetId = context?.targetId ?? ''
      const grantTargetId = context?.targetId
      const isHiddenCopy = action === 'copy' && !context?.isRevealed

      if (action === 'copy' && context?.isRevealed) return
      if (isHiddenCopy && cache?.isAuthorized(targetId)) return

      if (isHiddenCopy) {
        await prompt('Authenticate to copy hidden secret')
        grantTargetId && cache?.grant(grantTargetId)
        return
      }

      if (cache?.isAuthorized(targetId)) return
      await prompt(reasonByAction[action as Exclude<SecretAction, 'copy'>])
      grantTargetId && cache?.grant(grantTargetId)
    },
  }
}
