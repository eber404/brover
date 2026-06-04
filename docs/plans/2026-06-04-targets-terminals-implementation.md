# Targets + Terminals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove spaces from the core app model, make targets the root entity, move terminal launch into column 1, and remove the secrets-panel Launch UI.

**Architecture:** First simplify shared models, store, preload, and main-process IPC to operate on root-level targets plus one global `tiedTargets` setting. Then replace the current space sidebar with separate terminal and target columns in the renderer, preserving target-scoped secret behavior and launch preference ordering.

**Tech Stack:** Electron, React 19, TypeScript, TailwindCSS, Vitest, Testing Library.

---

### Task 1: Add failing store tests for root-level targets and global tied targets

**Files:**
- Modify: `src/main/store.crud.test.ts`
- Modify: `src/main/store.test.ts`
- Modify: `src/main/store.no-global.test.ts`
- Modify: `src/main/store.ts`

**Step 1: Write the failing tests**

- Add tests that expect `listTargets()` with no `spaceId`.
- Add tests that expect `createTarget({ name })` to create root-level targets.
- Add tests that expect a global `tiedTargets` flag to control env-name sync across all targets.
- Add a migration test that legacy `spaces[].tiedSecrets` collapses into one global `tiedTargets` value.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/store.crud.test.ts src/main/store.test.ts src/main/store.no-global.test.ts`
Expected: FAIL because store still requires spaces and per-space tied state.

**Step 3: Write minimal implementation**

- Update `DBShape` in `src/main/store.ts` to add global `tiedTargets` metadata.
- Normalize legacy DB state so existing targets survive while spaces become migration input only.
- Replace space-rooted target CRUD with root-level target CRUD.
- Move env-name synchronization checks from `space.tiedSecrets` to global `tiedTargets`.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/store.crud.test.ts src/main/store.test.ts src/main/store.no-global.test.ts`
Expected: PASS.

### Task 2: Add failing IPC and shared-model tests for the new target-rooted API

**Files:**
- Modify: `src/shared/models.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`

**Step 1: Write the failing test**

- Add or extend existing store/renderer-facing tests so they expect no `EnvSpace`, no `spaceId` parameter in target handlers, and a root-level `tiedTargets` getter/setter contract.

**Step 2: Run test to verify it fails**

Run: `npm run tsc`
Expected: FAIL because types and callers still reference spaces.

**Step 3: Write minimal implementation**

- Remove `EnvSpace` from `src/shared/models.ts`.
- Update `EnvTarget` to remove `spaceId`.
- Replace `listSpaces`, `createSpace`, `renameSpace`, `deleteSpace`, `toggleSpaceTiedSecrets`, and space-scoped target IPC with root-level target/tied-targets APIs.
- Update main-process launch cleanup path to derive active target ids from `listTargets()`.

**Step 4: Run test to verify it passes**

Run: `npm run tsc`
Expected: PASS.

### Task 3: Add failing renderer tests for terminal column and target-only column

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
- Modify: `src/renderer/src/features/secrets/SecretsPanel.test.tsx`
- Create: `src/renderer/src/features/terminals/TerminalSidebar.tsx`
- Create: `src/renderer/src/features/terminals/TerminalSidebar.test.tsx`

**Step 1: Write the failing tests**

- Assert column 1 renders installed terminals ordered by saved preferences.
- Assert clicking a terminal launches the selected target.
- Assert the old space badge rail no longer renders.
- Assert the secrets panel no longer renders `launch-button` or `launch-menu-button`.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/src/features/spaces/SpacesSidebar.test.tsx src/renderer/src/features/secrets/SecretsPanel.test.tsx src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
Expected: FAIL because terminal column component does not exist and launch UI still lives in `SecretsPanel`.

**Step 3: Write minimal implementation**

- Add `TerminalSidebar` that loads installed terminals and orders them via `getLaunchPreferences()`.
- Refactor `App.tsx` to keep one selected target, render terminal column first, and render a target-management column without spaces.
- Remove launch-menu state and terminal-loading logic from `SecretsPanel.tsx`.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/features/spaces/SpacesSidebar.test.tsx src/renderer/src/features/secrets/SecretsPanel.test.tsx src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
Expected: PASS.

### Task 4: Rename tied-secrets UI and wire global tied-targets control

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.tsx`
- Modify: `src/renderer/src/i18n/locales/en.json`
- Modify: `src/renderer/src/i18n/locales/pt.json`
- Modify: `src/renderer/src/i18n/locales/es.json`

**Step 1: Write the failing test**

- Extend renderer tests to assert `Tied targets` copy renders once as a global target behavior control, not per space.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: FAIL because UI still uses space-scoped `tiedSecrets` naming/state.

**Step 3: Write minimal implementation**

- Rename the control and tooltip copy to `Tied targets`.
- Source the switch from the new global IPC setting.
- Remove any remaining references to selected space metadata from the target-management panel.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: PASS.

### Task 5: Verify complete core refactor change set

**Files:**
- Verify: `src/shared/models.ts`
- Verify: `src/shared/ipc.ts`
- Verify: `src/preload/index.ts`
- Verify: `src/main/index.ts`
- Verify: `src/main/store.ts`
- Verify: `src/renderer/src/App.tsx`
- Verify: `src/renderer/src/features/terminals/TerminalSidebar.tsx`
- Verify: `src/renderer/src/features/spaces/SpacesSidebar.tsx`
- Verify: `src/renderer/src/features/secrets/SecretsPanel.tsx`

**Step 1: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

**Step 2: Run focused tests**

Run: `npx vitest run src/main/store.crud.test.ts src/main/store.test.ts src/main/store.no-global.test.ts src/renderer/src/features/spaces/SpacesSidebar.test.tsx src/renderer/src/features/secrets/SecretsPanel.test.tsx src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
Expected: PASS.

**Step 3: Run broader regression sweep**

Run: `npm run test`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-04-targets-terminals-implementation.md`.
