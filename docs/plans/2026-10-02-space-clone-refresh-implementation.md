# Space Clone Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render cloned secret metadata immediately after a space is created with matching names enabled.

**Architecture:** Keep `createEnvironment()` as an environments-only IPC contract. Refresh the renderer's `envs` snapshot after creation so `environmentEnvs` can filter cloned metadata for the selected space. Clones remain value-less and disabled for terminal launch.

**Tech Stack:** Electron, React, TypeScript, Vitest, Playwright.

---

### Task 1: Reproduce The Stale Metadata State

**Files:**
- Modify: `src/renderer/src/App.test.tsx`
- Modify: `src/renderer/src/App.tsx:104-120`

**Step 1: Write the failing test**

Add a test that mocks:
- initial `listEnvs()` with an existing space's `API_KEY` metadata;
- `createEnvironment()` with a newly created space;
- post-create `listEnvs()` with cloned `API_KEY` metadata for that new space.

Click the add-space control, select the created space, and assert `secret-row-API_KEY` is visible.

**Step 2: Run test to verify it fails**

Run: `bun vitest run src/renderer/src/App.test.tsx`

Expected: FAIL because `addEnvironment()` only sets `environments`, leaving `envs` stale.

**Step 3: Write minimal implementation**

After `createEnvironment()` resolves in `addEnvironment()`, call `window.brover.listEnvs()` and pass its result to `setEnvs()`.

**Step 4: Run test to verify it passes**

Run: `bun vitest run src/renderer/src/App.test.tsx`

Expected: PASS.

### Task 2: Verify Regression Coverage

**Files:**
- Verify: `src/main/store.crud.test.ts`
- Verify: `src/renderer/src/App.test.tsx`

**Step 1: Run focused tests**

Run: `bun vitest run src/main/store.crud.test.ts src/renderer/src/App.test.tsx`

Expected: PASS. Store clone behavior and renderer refresh behavior both covered.

**Step 2: Run project verification**

Run: `bun run tsc`

Expected: PASS.

Run: `bun run lint`

Expected: PASS.

Run: `bun run test`

Expected: PASS.

Run: `bun run test:e2e`

Expected: PASS.
