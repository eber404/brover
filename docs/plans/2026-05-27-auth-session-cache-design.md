# Auth Session Cache Design

## Context

Currently every sensitive action (reveal/copy/update/delete) on a secret requires macOS Touch ID authentication via `promptTouchID`. The UX is poor for users who perform multiple operations in quick succession on the same target.

## Goal

Cache authentication per target with a 60-second TTL so successive sensitive operations within that window skip re-authentication.

## Architecture

### SecretAuthSessionCache

Location: `src/main/authSessionCache.ts`

```typescript
interface Session {
  expiresAt: number // Unix ms
}

export function createAuthSessionCache() {
  const sessions = new Map<string, Session>()

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
```

### Integration with secretAuthGate

Update gate to accept `targetId` in context and check the cache before prompting:

```typescript
// authorize signature becomes:
authorize(action: SecretAction, context?: SecretActionContext & { targetId?: string })
```

IPC handlers pass `targetId` via context. Gate logic:

1. If action is `copy` and `isRevealed === true` → allow (no cache check)
2. If action is `copy` and `isRevealed === false` → check cache with `targetId`; if valid skip prompt; otherwise prompt and grant on success
3. For `reveal/update/delete` → check cache with `targetId`; if valid skip prompt; otherwise prompt and grant on success

### Data Flow

```
Renderer  →  IPC (profile=targetId)  →  authGate.authorize(action, { targetId })
                                            ↓
                                    authSessionCache.isAuthorized(targetId)
                                            ↓ (false)
                                      promptTouchID(reason)
                                            ↓ (success)
                                      authSessionCache.grant(targetId)
                                            ↓
                                      store.{revealEnv|copyEnv|updateEnv|deleteEnv}
```

## Behavior Rules

| Action | Condition | Behavior |
|--------|-----------|----------|
| `reveal` | cache valid | skip prompt |
| `reveal` | cache invalid | prompt → grant on success |
| `copy` | `isRevealed=true` | always skip prompt (current rule) |
| `copy` | `isRevealed=false` + cache valid | skip prompt |
| `copy` | `isRevealed=false` + cache invalid | prompt → grant on success |
| `update` | cache valid | skip prompt |
| `update` | cache invalid | prompt → grant on success |
| `delete` | cache valid | skip prompt |
| `delete` | cache invalid | prompt → grant on success |

- Expiration is strict: `now >= expiresAt` requires re-auth.
- Failed/cancelled `promptTouchID` does not create a session; action returns error.
- Switching targets does not leak cache; each `targetId` is isolated.
- App restart clears cache (memory-only, volatile).

## Testing

### Unit: authSessionCache
- grant / isAuthorized before TTL → true
- isAuthorized after TTL → false
- revoke one target / revoke all

### Unit: secretAuthGate with cache
- with valid cache → does not call prompt
- without cache → calls prompt and grants
- cache for `targetA` does not authorize `targetB`
- `copy` with `isRevealed=true` skips cache check (always allowed)

### Integration: IPC handlers (mock prompt)
- two consecutive actions on same target within 60s → 1 prompt
- action after TTL → new prompt required

## Files

- `src/main/authSessionCache.ts` — new cache module
- `src/main/authSessionCache.test.ts` — unit tests
- `src/main/secretAuthGate.ts` — updated to use cache
- `src/main/secretAuthGate.test.ts` — updated tests
- `src/main/index.ts` — pass `targetId` context from IPC handlers to gate

## Maintenance

No changes to `README.md` or `AGENTS.md` required (architecture/scope unchanged at macro level).
