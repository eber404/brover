export interface AuthSessionCache {
  isAuthorized(targetId: string): boolean
  grant(targetId: string): void
  revoke(targetId?: string): void
}

export function createAuthSessionCache(): AuthSessionCache {
  let granted = false

  return {
    isAuthorized(): boolean {
      return granted
    },
    grant(): void {
      granted = true
    },
    revoke(): void {
      granted = false
    },
  }
}
