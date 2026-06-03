# Global Auth Session Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let one successful Keychain auth cover all targets until the existing auth TTL expires.

**Architecture:** Simplify `authSessionCache` from per-target storage to one shared in-memory session with the same TTL semantics. Keep the public cache API stable so `secretAuthGate` and main-process handlers need little or no structural change.

**Tech Stack:** TypeScript, Vitest, Electron main process modules

---

### Task 1: Add failing auth cache and gate tests

**Files:**
- Modify: `src/main/authSessionCache.test.ts`
- Modify: `src/main/secretAuthGate.test.ts`

**Step 1: Write the failing test**
- Replace per-target isolation expectation with cross-target authorization within TTL.
- Add gate test showing prompt for target A, then no prompt for target B before expiry.

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/main/authSessionCache.test.ts src/main/secretAuthGate.test.ts`
Expected: FAIL because cache is still target-scoped.

### Task 2: Implement shared auth session

**Files:**
- Modify: `src/main/authSessionCache.ts`

**Step 1: Write minimal implementation**
- Replace target-keyed map with one shared session record.
- Keep API signatures unchanged.
- Ignore `targetId` in `isAuthorized`, `expiresAt`, `grant`, and targeted `revoke`.

**Step 2: Run test to verify it passes**
Run: `npm run test -- src/main/authSessionCache.test.ts src/main/secretAuthGate.test.ts`
Expected: PASS.

### Task 3: Verify broader main-process safety

**Files:**
- Modify: none unless fixes needed

**Step 1: Run typecheck**
Run: `npm run tsc -- --noEmit`
Expected: PASS.

**Step 2: Run main tests**
Run: `npm run test -- src/main`
Expected: PASS.
