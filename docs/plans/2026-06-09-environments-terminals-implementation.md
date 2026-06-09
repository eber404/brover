# Environments + Terminals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove `spaces` from Brover, rename `targets` to `environments`, keep terminals as launch destinations, make onboarding create one environment per dotfile, and rename `Tied targets` to `Shared secret names` with default `off`.

**Architecture:** Collapse app domain to three visible concepts: terminals, environments, and secrets. Persist environments as root-level entities with no `spaceId`. Migrate legacy `spaces` and `targets` into root-level environments while preserving existing metadata and secret links. Onboarding still scans multiple dotfiles, but creates one environment per source dotfile instead of using a space layer.

**Tech Stack:** Electron, React, TypeScript, Bun, Vitest, Playwright.

---

### Task 1: Lock new domain vocabulary in shared types and IPC

**Files:**
- Modify: `src/shared/models.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`

**Step 1: Write failing type-level change**

- Rename public `EnvTarget` model to `Environment`.
- Rename preload and IPC methods from `Target*` to `Environment*`.
- Rename tied-state getters/setters to `getSharedSecretNames` / `setSharedSecretNames`.
- Keep payloads/shape minimal.

**Step 2: Run typecheck to verify it fails**

Run: `bun run tsc`
Expected: FAIL with missing renamed symbols across renderer and main process.

**Step 3: Write minimal implementation**

- Update shared model exports.
- Update `window.brover` API names.
- Update IPC contracts to new method names.

**Step 4: Run typecheck to verify progress**

Run: `bun run tsc`
Expected: still FAIL in downstream files, but shared layer compiles.

### Task 2: Add failing migration tests for removing spaces

**Files:**
- Modify: `src/main/store.test.ts`
- Modify: `src/main/store.crud.test.ts`
- Modify: `src/main/store.no-global.test.ts`

**Step 1: Write failing tests**

- Test legacy DB with multiple `spaces` and `targets` migrates to root-level `environments`.
- Test `spaceId` is removed during normalization.
- Test environment names from old default targets inherit dotfile/space names when needed.
- Test tied-state migration defaults to `false` unless explicitly preserved by chosen rule.

**Step 2: Run focused tests to verify failure**

Run: `bun run test src/main/store.test.ts src/main/store.crud.test.ts src/main/store.no-global.test.ts`
Expected: FAIL because store still exposes spaces and target-scoped APIs.

### Task 3: Refactor store to root-level environments only

**Files:**
- Modify: `src/main/store.ts`

**Step 1: Write minimal store implementation**

- Remove `CompatSpace` from active DB shape.
- Remove `spaceId` from stored environment records.
- Rename `StoredTarget` to `StoredEnvironment`.
- Replace scoped helper methods with root-level environment helpers.
- Persist root-level `sharedSecretNames` boolean.
- Default `sharedSecretNames` to `false` for new/empty DBs.

**Step 2: Define migration rules**

- Legacy `spaces` are read only for migration.
- Legacy `targets` become root-level `environments`.
- If old default targets map to space names, rename them accordingly for continuity.
- Legacy `tiedTargets` or per-space `tiedSecrets` migrate to `sharedSecretNames`.
- If no prior tied-state exists, default to `false`.

**Step 3: Run focused store tests**

Run: `bun run test src/main/store.test.ts src/main/store.crud.test.ts src/main/store.no-global.test.ts`
Expected: PASS.

### Task 4: Add failing tests for tied-schema behavior

**Files:**
- Modify: `src/main/store.crud.test.ts`
- Modify: `tests/electron/targets-crud.spec.ts` or rename later

**Step 1: Write failing unit tests**

- Test `sharedSecretNames = false` by default.
- Test creating secret name in one environment stays local when `sharedSecretNames = false`.
- Test creating environment with `sharedSecretNames = true` clones secret names with empty values/disabled state according to current model.
- Test deleting secret name with `sharedSecretNames = true` removes metadata from all environments.
- Test deleting secret name with `sharedSecretNames = false` removes metadata only from selected environment.

**Step 2: Write failing E2E coverage**

- Test UI toggle label is `Shared secret names`.
- Test default state is off on fresh data.
- Test toggling on causes shared name behavior across two environments.

**Step 3: Run focused tests to verify failure**

Run: `bun run test src/main/store.crud.test.ts`
Expected: FAIL before tied-state rename/behavior rewrite.

### Task 5: Rename target operations to environment operations in main process

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Update IPC handlers**

- Rename `targets:*` handlers to `environments:*`.
- Rename tied-state handlers to `environments:get-shared-secret-names` / `environments:set-shared-secret-names` or equivalent repo-consistent names.
- Update auth and launch payload references from `targetId` to `environmentId` where public API changes.

**Step 2: Run typecheck**

Run: `bun run tsc`
Expected: FAIL only in renderer/tests not yet updated.

### Task 6: Add failing onboarding tests for one environment per dotfile

**Files:**
- Modify: `src/main/onboardingImporter.test.ts`
- Modify: `src/main/onboardingImporter.no-space.test.ts`
- Modify: `tests/electron/onboarding.e2e.spec.ts`

**Step 1: Write failing tests**

- Retroactive import with `.zshrc` and `.bashrc` creates two environments named from dotfiles.
- Fresh start with selected files creates two environments named from dotfiles.
- No space records are created.
- Duplicate secret names across different files remain separate because each dotfile gets its own environment.

**Step 2: Run focused tests to verify failure**

Run: `bun run test src/main/onboardingImporter.test.ts src/main/onboardingImporter.no-space.test.ts tests/electron/onboarding.e2e.spec.ts`
Expected: FAIL because onboarding still speaks in spaces/targets.

### Task 7: Refactor onboarding importers and flow

**Files:**
- Modify: `src/main/onboardingImporter.ts`
- Modify: `src/main/onboardingScanner.ts` only if consumer contract needs change
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`
- Modify: `src/renderer/src/features/onboarding/TerminalPreferencesStep.tsx`
- Modify other onboarding UI/tests as needed

**Step 1: Backend changes**

- Retroactive import: create one environment per source dotfile that has selected secrets.
- Fresh start: create one environment per selected file.
- Remove remaining space terminology and space creation logic.

**Step 2: UI copy changes**

- Replace `targets` language with `environments` where user-facing.
- Keep onboarding concise; no mention of spaces.

**Step 3: Run focused onboarding tests**

Run: `bun run test src/main/onboardingImporter.test.ts src/main/onboardingImporter.no-space.test.ts tests/electron/onboarding.e2e.spec.ts`
Expected: PASS.

### Task 8: Replace `SpacesSidebar` with `EnvironmentsSidebar`

**Files:**
- Rename: `src/renderer/src/features/spaces/SpacesSidebar.tsx` -> `src/renderer/src/features/environments/EnvironmentsSidebar.tsx`
- Modify: related tests
- Modify: `src/renderer/src/App.tsx`
- Modify: locale files / string tables

**Step 1: Write failing renderer tests**

- Existing sidebar tests should be renamed and updated to assert `Environments` title.
- Assert no visible `space` or `target` copy remains.
- Assert toggle label is `Shared secret names`.

**Step 2: Run focused renderer tests to verify failure**

Run: `bun run test src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: FAIL after rename intentions are introduced.

**Step 3: Write minimal implementation**

- Rename component and folder if practical.
- Update `App.tsx` state names from `targets` to `environments`.
- Rename handlers: `addEnvironment`, `deleteEnvironment`, `renameEnvironment`, `setActiveEnvironment`, etc.
- Keep terminal rail as leftmost column; keep add/remove terminal behavior.

**Step 4: Run focused renderer tests**

Run: `bun run test src/renderer/src/features/environments/EnvironmentsSidebar.test.tsx`
Expected: PASS.

### Task 9: Clean remaining target/space references from secrets flow

**Files:**
- Modify: `src/renderer/src/features/secrets/*`
- Modify: `src/main/envMutationFlow.ts` if needed
- Modify: any tests using `targetName`, `targetId`, `profile` in public-facing contexts

**Step 1: Public terminology cleanup**

- `targetName` props become `environmentName`.
- headers and labels show `Environment: <name>`.
- auth context and secret action payloads can keep storage keys stable internally if needed, but UI/public API should use environment wording.

**Step 2: Run renderer/unit tests**

Run: `bun run test`
Expected: failing tests identify remaining text/API references.

### Task 10: Update docs and screenshots

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `scripts/capture-readme-screenshots.mjs`
- Update: `docs/screenshots/*.png`

**Step 1: Docs**

- README talks about environments, terminals, secrets.
- AGENTS updates domain model and onboarding rules.

**Step 2: Screenshot script**

- ensure generated screenshots show `Environments` and `Shared secret names`.

**Step 3: Regenerate screenshots**

Run: `bun run build && node scripts/capture-readme-screenshots.mjs`
Expected: updated images saved in `docs/screenshots/`.

### Task 11: Full verification

**Files:**
- Verify all touched files

**Step 1: Lint**

Run: `bun run lint`
Expected: PASS.

**Step 2: Typecheck**

Run: `bun run tsc`
Expected: PASS.

**Step 3: Unit tests**

Run: `bun run test`
Expected: PASS.

**Step 4: E2E tests**

Run: `bun run test:e2e`
Expected: PASS.

**Step 5: Build screenshots and packages**

Run: `bun run build && node scripts/capture-readme-screenshots.mjs && bun run dist:mac:arm64 && bun run dist:mac:x64`
Expected: PASS.

### Task 12: Release verification after merge

**Files:**
- Verify release workflow outputs

**Step 1: Publish next tag**

Run: `git tag vX.Y.Z && git push origin vX.Y.Z`
Expected: release workflow starts.

**Step 2: Verify public binary repo**

Run: `gh release view vX.Y.Z -R eber404/brover-releases`
Expected: both DMGs present.

**Step 3: Verify Homebrew**

Run: `brew update && brew fetch --cask eber404/brover/brover`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-09-environments-terminals-implementation.md`.
