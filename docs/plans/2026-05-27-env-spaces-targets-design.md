# Env Spaces + Targets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Apps workspace with ENV SPACES tree and introduce per-space target model with schema-sync secrets.

**Architecture:** Keep secret values in Keychain, move UI navigation to space/target hierarchy, and evolve metadata store with `spaces` and `targets` while reusing existing env list and auth-gated secret operations.

**Tech Stack:** Electron, React + TypeScript, Vitest, Playwright, keytar + macOS Touch ID gate.

---

### Task 1: Add data model and IPC for spaces/targets

**Files:**
- Modify: `electron-app/src/shared/models.ts`
- Modify: `electron-app/src/shared/ipc.ts`
- Modify: `electron-app/src/preload/index.ts`

**Steps:**
1. Add `EnvSpace` + `EnvTarget` models.
2. Add IPC contract methods for list/create/toggle space and list/create/rename/recolor/activate target.
3. Wire preload API methods.

### Task 2: Extend store with spaces/targets and default Global

**Files:**
- Modify: `electron-app/src/main/store.ts`

**Steps:**
1. Extend DB shape with `spaces[]` and `targets[]`.
2. Add migration defaults (`Global` space + default target).
3. Implement store methods for spaces/targets CRUD-lite.
4. Enforce target-name uniqueness per space.

### Task 3: Sync secret schema across targets in same space

**Files:**
- Modify: `electron-app/src/main/store.ts`

**Steps:**
1. Update `createEnv` to replicate metadata rows to all targets in a space.
2. Keep value write scoped to selected target only.
3. Update `deleteEnv` to remove metadata rows from all targets in that space.

### Task 4: Add main-process handlers

**Files:**
- Modify: `electron-app/src/main/index.ts`

**Steps:**
1. Register IPC handlers for spaces/targets methods.
2. Keep existing auth-gated handlers for reveal/copy/update/delete.

### Task 5: Replace sidebar UI with ENV SPACES tree

**Files:**
- Modify: `electron-app/src/renderer/src/App.tsx`

**Steps:**
1. Remove Apps workspace controls from UI.
2. Render `ENV SPACES` section with expandable spaces.
3. Render target rows with:
   - double-click rename
   - color dot with system color input
   - per-space active target select
4. Add create space and create target actions.

### Task 6: Connect secrets flow to selected target

**Files:**
- Modify: `electron-app/src/renderer/src/features/secrets/SecretsPanel.tsx`
- Modify: `electron-app/src/renderer/src/features/secrets/SecretsDetail.tsx`

**Steps:**
1. Replace selected profile dependency with selected target id.
2. Keep reveal/copy/update/delete auth flow unchanged.
3. Show selected target name in details.

### Task 7: Tests

**Files:**
- Modify: `electron-app/src/renderer/src/features/secrets/SecretsPanel.test.tsx`
- Modify: `electron-app/src/renderer/src/features/secrets/SecretsDetail.test.tsx`

**Steps:**
1. Update component tests for new props.
2. Run unit tests.
3. Run e2e tests.

### Task 8: Apply pipelines

**Files:**
- `electron-app/src/main/shellWriters.ts`
- `electron-app/src/main/dotenvWriters.ts`

**Steps:**
1. Implement Global target apply to `~/.zshrc` + `~/.bashrc` with managed block.
2. Implement directory space target apply to `.env.<target>`.
3. Add unit/integration tests for writers.
