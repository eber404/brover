# Command Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `.command` cleanup on startup and quit while preserving scripts for all active targets.

**Architecture:** Extend `terminalLauncher` with explicit cleanup APIs that understand Brover-managed `.command` files and preserve a caller-provided target allowlist. Integrate those APIs in Electron bootstrap and shutdown using active target IDs derived from store state. Drive change with unit tests first.

**Tech Stack:** Electron main process, TypeScript, Vitest, Node fs/path/os APIs

---

### Task 1: Add failing terminalLauncher cleanup tests

**Files:**
- Modify: `src/main/terminalLauncher.test.ts`
- Test: `src/main/terminalLauncher.test.ts`

**Step 1: Write the failing test**

Add tests for:

```ts
it('startup cleanup removes stale Brover command files and preserves active targets', () => {
  // create brover-old.command, brover-active.command, and unrelated file
  // call startupCleanup(['active'])
  // expect old removed, active kept, unrelated kept
})

it('shutdown cleanup removes session-managed files and preserves active targets', async () => {
  // launch two targets, call shutdownCleanup(['target-1'])
  // expect target-2 removed, target-1 kept
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/main/terminalLauncher.test.ts`
Expected: FAIL because cleanup methods do not exist yet.

### Task 2: Implement terminalLauncher cleanup support

**Files:**
- Modify: `src/main/terminalLauncher.ts`
- Test: `src/main/terminalLauncher.test.ts`

**Step 1: Write minimal implementation**

Add:

```ts
function startupCleanup(preserveTargetIds: string[]) {
  // scan tmpdir for brover-*.command and remove non-preserved files
}

function shutdownCleanup(preserveTargetIds: string[]) {
  // remove session-managed files except preserved files
}
```

Track launched file paths in a `Set<string>` for shutdown cleanup.

**Step 2: Run test to verify it passes**

Run: `npm run test -- src/main/terminalLauncher.test.ts`
Expected: PASS.

### Task 3: Integrate startup and quit cleanup in Electron main

**Files:**
- Modify: `src/main/index.ts`
- Test: `src/main/terminalLauncher.test.ts`

**Step 1: Add minimal integration code**

Use existing `store.listSpaces()` results to derive active target IDs:

```ts
const activeTargetIds = spaces
  .map(space => space.activeProfileId)
  .filter((id): id is string => Boolean(id))

terminalLauncher.startupCleanup(activeTargetIds)
app.on('will-quit', () => {
  void store.listSpaces().then(spaces => {
    terminalLauncher.shutdownCleanup(...)
  }).catch(() => {})
})
```

Adjust exact property name to current model.

**Step 2: Run focused tests**

Run: `npm run test -- src/main/terminalLauncher.test.ts`
Expected: PASS.

### Task 4: Verify typecheck and relevant tests

**Files:**
- Modify: none unless fixes needed

**Step 1: Run typecheck**

Run: `npm run tsc -- --noEmit`
Expected: PASS.

**Step 2: Run relevant unit tests**

Run: `npm run test -- src/main/terminalLauncher.test.ts`
Expected: PASS.

**Step 3: Run broader main-process coverage if needed**

Run: `npm run test -- src/main`
Expected: PASS or no regressions in touched area.
