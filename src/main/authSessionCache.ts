export interface AuthSessionCache {
  isAuthorized(targetId: string, now?: number): boolean
  expiresAt(targetId: string): number | null
  grant(targetId: string, ttlMs?: number, now?: number): void
  revoke(targetId?: string): void
}

export function createAuthSessionCache(): AuthSessionCache {
  let session: { expiresAt: number } | null = null

  return {
    isAuthorized(targetId: string, now = Date.now()): boolean {
      return session != null && now < session.expiresAt
    },
    expiresAt(targetId: string): number | null {
      return session?.expiresAt ?? null
    },
    grant(targetId: string, ttlMs = 60_000, now = Date.now()): void {
      session = { expiresAt: now + ttlMs }
    },
    revoke(targetId?: string): void {
      session = null
    },
  }
}
