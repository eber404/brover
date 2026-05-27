export interface AuthSessionCache {
  isAuthorized(targetId: string, now?: number): boolean
  grant(targetId: string, ttlMs?: number, now?: number): void
  revoke(targetId?: string): void
}

export function createAuthSessionCache(): AuthSessionCache {
  const sessions = new Map<string, { expiresAt: number }>()

  return {
    isAuthorized(targetId: string, now = Date.now()): boolean {
      const session = sessions.get(targetId)
      return session != null && now < session.expiresAt
    },
    grant(targetId: string, ttlMs = 60_000, now = Date.now()): void {
      sessions.set(targetId, { expiresAt: now + ttlMs })
    },
    revoke(targetId?: string): void {
      if (targetId === undefined) {
        sessions.clear()
      } else {
        sessions.delete(targetId)
      }
    },
  }
}
