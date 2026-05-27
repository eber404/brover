# Auth Session Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cache Touch ID authentication per target for 60 seconds so successive sensitive operations skip re-authentication.

**Architecture:** In-memory `SecretAuthSessionCache` keyed by `targetId`, checked by `secretAuthGate` before calling `promptTouchID`. No persistence; cache is volatile (cleared on app restart).

**Tech Stack:** TypeScript, Vitest, Electron main process.

---

## Task 1: authSessionCache module

**Files:**
- Create: `src/main/authSessionCache.ts`
- Create: `src/main/authSessionCache.test.ts`

**Step 1: Write failing tests**

```typescript
// src/main/authSessionCache.test.ts
import { describe, expect, it, vi } from 'vitest'
import { createAuthSessionCache } from './authSessionCache'

describe('createAuthSessionCache', () => {
  it('isAuthorized returns false when no session exists', () => {
    const cache = createAuthSessionCache()
    expect(cache.isAuthorized('target-1')).toBe(false)
  })

  it('isAuthorized returns true within TTL', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-1', 60_000, now)
    expect(cache.isAuthorized('target-1', now + 30_000)).toBe(true)
  })

  it('isAuthorized returns false after TTL expires', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-1', 60_000, now)
    expect(cache.isAuthorized('target-1', now + 60_001)).toBe(false)
  })

  it('session for targetA does not authorize targetB', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    expect(cache.isAuthorized('target-B', now)).toBe(false)
  })

  it('revoke one target clears only that session', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    cache.grant('target-B', 60_000, now)
    cache.revoke('target-A')
    expect(cache.isAuthorized('target-A', now)).toBe(false)
    expect(cache.isAuthorized('target-B', now)).toBe(true)
  })

  it('revoke all clears all sessions', () => {
    const cache = createAuthSessionCache()
    const now = 1_000_000
    cache.grant('target-A', 60_000, now)
    cache.grant('target-B', 60_000, now)
    cache.revoke()
    expect(cache.isAuthorized('target-A', now)).toBe(false)
    expect(cache.isAuthorized('target-B', now)).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/main/authSessionCache.test.ts
```
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/main/authSessionCache.ts
export function createAuthSessionCache() {
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/main/authSessionCache.test.ts
```
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/main/authSessionCache.ts src/main/authSessionCache.test.ts
git commit -m "feat: add auth session cache module with TTL"
```

---

## Task 2: Integrate cache into secretAuthGate

**Files:**
- Modify: `src/main/secretAuthGate.ts`
- Modify: `src/main/secretAuthGate.test.ts`

**Step 1: Write failing tests (add new cases to existing file)**

Add these cases to the existing `secretAuthGate.test.ts`:

```typescript
it('skips prompt when cache is valid', async () => {
  const cache = createAuthSessionCache()
  cache.grant('target-1')
  const prompt = vi.fn().mockResolvedValue(undefined)
  const gate = createSecretAuthGate(prompt, cache)

  await gate.authorize('reveal', { targetId: 'target-1' })
  expect(prompt).not.toHaveBeenCalled()
})

it('calls prompt and grants session when cache is invalid', async () => {
  const cache = createAuthSessionCache()
  const prompt = vi.fn().mockResolvedValue(undefined)
  const gate = createSecretAuthGate(prompt, cache)

  await gate.authorize('reveal', { targetId: 'target-1' })
  expect(prompt).toHaveBeenCalledTimes(1)
  expect(cache.isAuthorized('target-1')).toBe(true)
})

it('cache for targetA does not authorize targetB', async () => {
  const cache = createAuthSessionCache()
  cache.grant('target-A')
  const prompt = vi.fn().mockResolvedValue(undefined)
  const gate = createSecretAuthGate(prompt, cache)

  await gate.authorize('reveal', { targetId: 'target-B' })
  expect(prompt).toHaveBeenCalledTimes(1)
})

it('copy with isRevealed=true skips cache check', async () => {
  const cache = createAuthSessionCache()
  cache.grant('target-1')
  const prompt = vi.fn().mockResolvedValue(undefined)
  const gate = createSecretAuthGate(prompt, cache)

  await gate.authorize('copy', { isRevealed: true })
  expect(prompt).not.toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- src/main/secretAuthGate.test.ts
```
Expected: FAIL — createSecretAuthGate does not accept cache parameter yet

**Step 3: Update secretAuthGate implementation**

Update `src/main/secretAuthGate.ts` to accept and use the cache:

```typescript
import { createAuthSessionCache, type AuthSessionCache } from './authSessionCache'

export type SecretAction = 'reveal' | 'copy' | 'update' | 'delete'

export interface SecretActionContext {
  isRevealed?: boolean
  targetId?: string
}

type AuthPrompt = (reason: string) => Promise<void>

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
```

Also update `authSessionCache.ts` to export the `AuthSessionCache` type:

```typescript
export interface AuthSessionCache {
  isAuthorized(targetId: string, now?: number): boolean
  grant(targetId: string, ttlMs?: number, now?: number): void
  revoke(targetId?: string): void
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- src/main/secretAuthGate.test.ts
```
Expected: PASS (all 8 tests)

**Step 5: Commit**

```bash
git add src/main/secretAuthGate.ts src/main/authSessionCache.ts src/main/secretAuthGate.test.ts
git commit -m "feat: integrate auth session cache into secretAuthGate"
```

---

## Task 3: Wire cache into main IPC handlers

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Read current index.ts auth gate setup**

Inspect lines around `createSecretAuthGate` call in `src/main/index.ts:47`.

**Step 2: Create cache instance and pass to gate**

Update `src/main/index.ts`:

```typescript
import { createSecretAuthGate } from './secretAuthGate'
import { createAuthSessionCache } from './authSessionCache'

// After store creation, before ipcMain handlers:
const authSessionCache = createAuthSessionCache()

const authGate = createSecretAuthGate(async (reason: string) => {
  if (process.env.BROVER_SKIP_AUTH === '1') return
  if (process.platform !== 'darwin') {
    throw new Error(UNSUPPORTED_SECRET_BACKEND)
  }
  await systemPreferences.promptTouchID(reason)
}, authSessionCache)
```

**Step 3: Update IPC handlers to pass targetId in context**

Update handlers for `envs:reveal`, `envs:copy`, `envs:update`, `envs:delete` to pass `targetId` to `authorize`.

For example, `envs:reveal`:

```typescript
ipcMain.handle(
  'envs:reveal',
  async (_, payload: { profile: string; name: string }) => {
    try {
      await authGate.authorize('reveal', { targetId: payload.profile })
      const value = await store.revealEnv(payload.profile, payload.name)
      return ok(value ?? '')
    } catch (error) {
      return failure(error)
    }
  }
)
```

Apply the same pattern to `envs:copy`, `envs:update`, `envs:delete`.

**Step 4: Verify tsc and tests still pass**

```bash
npm run tsc
npm run test
```
Expected: both pass

**Step 5: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire auth session cache into IPC handlers"
```

---

## Task 4: Verify E2E still passes

**Step 1: Run E2E tests**

```bash
npm run test:e2e
```
Expected: all pass

**Step 2: Final status check**

```bash
git status --short
```

Expected output:
```
M src/main/index.ts
M src/main/secretAuthGate.ts
M src/main/authSessionCache.ts
 M src/main/secretAuthGate.test.ts
 M src/main/authSessionCache.test.ts
```

No untracked `.js` files should appear.
