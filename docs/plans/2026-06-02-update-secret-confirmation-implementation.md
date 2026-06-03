# Update Secret Confirmation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add confirmation prompt for secret updates when auth session cache already exists, while preserving direct auth-then-save when no cache exists.

**Architecture:** Reuse delete confirmation handshake shape. Main process decides whether cached update needs confirmation, preload/shared contracts expose a confirmed update path, and renderer stores pending edit value until user confirms.

**Tech Stack:** Electron IPC, TypeScript, React, Vitest, Testing Library.

---

### Task 1: Add failing main-process tests for cached update confirmation

**Files:**
- Modify: `src/main/index` tests if present, or add focused handler test if available later
- Modify: `src/main/store.crud.test.ts` if store behavior helper needed

**Step 1: Write the failing test**

- Assert cached update path returns `needs-confirmation` without saving.
- Assert confirmed update path saves new value.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: FAIL because renderer has no confirmation flow yet.

**Step 3: Write minimal implementation**

- Add new IPC path and cache branch.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: PASS.

### Task 2: Add failing renderer tests for update confirmation dialog

**Files:**
- Modify: `src/renderer/src/features/secrets/SecretsPanel.test.tsx`

**Step 1: Write the failing test**

- Assert update response with `needs-confirmation` opens dialog.
- Assert confirming dialog sends stored value through `updateEnvConfirmed`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: FAIL because no dialog/state exists.

**Step 3: Write minimal implementation**

- Add pending update state, dialog, and confirmed handler.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: PASS.

### Task 3: Wire shared contracts and preload bridge

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`

**Step 1: Write the failing test**

- Covered by renderer tests that require `window.brover.updateEnvConfirmed` path.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: FAIL until contract exists.

**Step 3: Write minimal implementation**

- Add `updateEnvConfirmed` typing + preload + IPC handler.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: PASS.

### Task 4: Verify complete change set

**Files:**
- Verify changed files above

**Step 1: Run typecheck**

Run: `npm run tsc --noEmit`
Expected: PASS.

**Step 2: Run focused tests**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx src/renderer/src/features/secrets/SecretsDetail.test.tsx`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-02-update-secret-confirmation-implementation.md`.
