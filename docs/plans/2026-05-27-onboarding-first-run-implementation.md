# First-Run Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement first-run onboarding with two modes (`Acesso retroativo` and `Fresh start`), secure retroactive secret migration to Keychain, and completion gating by persisted onboarding status.

**Architecture:** Add a main-process onboarding module for scan/import/state, expose typed IPC endpoints through preload, and add a renderer onboarding wizard shown only when completion flag is missing. Keep all filesystem mutation and secret writes in main process; renderer only handles flow and user selection state.

**Tech Stack:** Electron main/preload, React + TypeScript renderer, existing Keychain adapter, Vitest, Playwright.

---

### Task 1: Add onboarding domain types and IPC contracts

**Files:**
- Modify: `src/shared/models.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`

**Step 1: Write failing type-level tests (if project has contract tests)**

- Add or update shared contract tests to assert onboarding API shape exists.

**Step 2: Run focused tests to confirm failure**

Run: `npm run test -- src/shared`
Expected: contract/type failures for missing onboarding fields.

**Step 3: Add onboarding models in shared layer**

- Add models for:
  - onboarding status (`completed`, `pending`, timestamp)
  - scan result (`files[]`, `variables[]`, `warnings[]`)
  - retroactive selection payload (`selectedSensitiveIds[]`)
  - execution summary (`importedSensitive`, `removedFromDotfiles`, `ignoredNonSensitive`, `ignoredWithReason[]`)

**Step 4: Add IPC contract methods**

- Add typed methods:
  - `onboarding.getStatus()`
  - `onboarding.scanDotfiles()`
  - `onboarding.runRetroactive(selection)`
  - `onboarding.runFreshStart()`
  - `onboarding.complete()`

**Step 5: Wire preload bridge methods**

- Expose typed `window.brover.onboarding.*` methods mapping 1:1 to IPC handlers.

**Step 6: Re-run focused tests and typecheck**

Run: `npm run tsc --noEmit && npm run test -- src/shared`
Expected: PASS.

**Step 7: Commit**

```bash
git add src/shared/models.ts src/shared/ipc.ts src/preload/index.ts
git commit -m "feat: add onboarding IPC contracts"
```

### Task 2: Implement onboarding status persistence in main store

**Files:**
- Modify: `src/main/store.ts`
- Test: `src/main/store.test.ts` (or equivalent)

**Step 1: Write failing tests for onboarding status read/write**

- Test default status is pending.
- Test completion timestamp persists only when explicitly set.
- Test existing DBs migrate safely with default pending status.

**Step 2: Run store tests to confirm failure**

Run: `npm run test -- src/main/store`
Expected: FAIL for missing onboarding state behavior.

**Step 3: Extend DB schema with onboarding metadata**

- Add `onboardingCompletedAt?: string` (or numeric epoch) to non-sensitive metadata area.
- Add migration path for existing config.

**Step 4: Add store methods**

- `getOnboardingStatus()`
- `markOnboardingComplete(timestamp)`

**Step 5: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/main/store`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/main/store.ts src/main/store.test.ts
git commit -m "feat: persist onboarding completion status"
```

### Task 3: Build onboarding scanner for broad `$HOME` dotfile discovery

**Files:**
- Create: `src/main/onboardingScanner.ts`
- Modify: `src/main/index.ts` (temporary direct wiring or exports)
- Test: `src/main/onboardingScanner.test.ts`

**Step 1: Write failing scanner tests**

- Detect dotfiles under mocked `$HOME`.
- Parse env-like assignments.
- Ignore malformed lines with reason.
- Handle file permission errors and continue.

**Step 2: Run scanner tests to confirm failure**

Run: `npm run test -- src/main/onboardingScanner.test.ts`
Expected: FAIL.

**Step 3: Implement scanner**

- Discover candidate dotfiles broadly under `$HOME` (respect practical guardrails: hidden files only, skip huge/binary by heuristics).
- Parse env-like entries per file.
- Return grouped results and warning list.
- Do not log raw values.

**Step 4: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/main/onboardingScanner.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/onboardingScanner.ts src/main/onboardingScanner.test.ts src/main/index.ts
git commit -m "feat: add onboarding dotfile scanner"
```

### Task 4: Build onboarding importer for retroactive flow

**Files:**
- Create: `src/main/onboardingImporter.ts`
- Modify: `src/main/store.ts`
- Modify: `src/main/keychain.ts` (only if adapter helper needed)
- Test: `src/main/onboardingImporter.test.ts`

**Step 1: Write failing importer tests**

- Given selected sensitive vars:
  - write to Keychain with target-scoped account key format
  - remove matching lines from source dotfiles
  - create spaces from dotfiles
  - ignore non-sensitive vars
- Duplicate var names across files remain separate spaces.
- Fatal failure path leaves onboarding incomplete.

**Step 2: Run importer tests to confirm failure**

Run: `npm run test -- src/main/onboardingImporter.test.ts`
Expected: FAIL.

**Step 3: Implement retroactive importer minimal path**

- Create spaces for parsed files with at least one parseable env.
- For each selected sensitive variable:
  - write secret value to Keychain backend
  - remove from source file
- Build execution summary counts + ignored list.

**Step 4: Add atomic file write strategy**

- Read snapshot, transform content, write safely.
- Ensure partial file errors captured per file and surfaced as warnings.

**Step 5: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/main/onboardingImporter.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/main/onboardingImporter.ts src/main/onboardingImporter.test.ts src/main/store.ts src/main/keychain.ts
git commit -m "feat: implement retroactive onboarding import"
```

### Task 5: Add fresh-start execution path

**Files:**
- Modify: `src/main/onboardingImporter.ts`
- Test: `src/main/onboardingImporter.test.ts`

**Step 1: Write failing tests for fresh-start behavior**

- Create spaces only for files with parseable env entries.
- Do not import any variable values.
- Return summary counts.

**Step 2: Run targeted tests to confirm failure**

Run: `npm run test -- src/main/onboardingImporter.test.ts -t "fresh start"`
Expected: FAIL.

**Step 3: Implement fresh-start path**

- Reuse scanner output.
- Create spaces only.
- Keep env metadata/value import disabled.

**Step 4: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/main/onboardingImporter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/onboardingImporter.ts src/main/onboardingImporter.test.ts
git commit -m "feat: add fresh-start onboarding mode"
```

### Task 6: Register IPC handlers in main process

**Files:**
- Modify: `src/main/index.ts`
- Test: `src/main/index.test.ts` (if exists) or integration-level IPC test

**Step 1: Write failing IPC handler tests**

- Ensure each onboarding IPC channel responds with expected payload shape.
- Ensure errors from scanner/importer map to renderer-safe errors.

**Step 2: Run tests to confirm failure**

Run: `npm run test -- src/main/index`
Expected: FAIL.

**Step 3: Implement handler wiring**

- Hook `onboarding.*` channels to scanner/importer/store methods.
- Keep auth-gated secret actions unchanged for post-onboarding flows.

**Step 4: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/main/index`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/index.ts src/main/index.test.ts
git commit -m "feat: wire onboarding IPC handlers"
```

### Task 7: Add renderer onboarding flow shell and first-run gate

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`
- Create: `src/renderer/src/features/onboarding/WelcomeStep.tsx`
- Test: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`

**Step 1: Write failing renderer tests**

- If onboarding pending, app renders onboarding flow.
- If completed, app renders dashboard.
- Welcome step shows both mode options.

**Step 2: Run tests to confirm failure**

Run: `npm run test -- src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL.

**Step 3: Implement first-run gate in `App.tsx`**

- Query `onboarding.getStatus()` on boot.
- Branch UI root between onboarding and dashboard.

**Step 4: Implement welcome step UI + animation hooks**

- Keep animation lightweight and deterministic for tests.

**Step 5: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/features/onboarding/OnboardingFlow.tsx src/renderer/src/features/onboarding/WelcomeStep.tsx src/renderer/src/features/onboarding/OnboardingFlow.test.tsx
git commit -m "feat: add first-run onboarding shell"
```

### Task 8: Implement retroactive review step UI

**Files:**
- Create: `src/renderer/src/features/onboarding/RetroactiveReviewStep.tsx`
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`
- Test: `src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx`

**Step 1: Write failing tests for review interactions**

- Group rows by source dotfile.
- Checkbox toggles sensitive selection.
- Value masked by default with reveal toggle.
- No auth prompt appears in onboarding review.

**Step 2: Run tests to confirm failure**

Run: `npm run test -- src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx`
Expected: FAIL.

**Step 3: Implement review step**

- Fetch `onboarding.scanDotfiles()` once.
- Render grouped list and local reveal state.
- Build selection payload for `runRetroactive`.

**Step 4: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/features/onboarding/RetroactiveReviewStep.tsx src/renderer/src/features/onboarding/OnboardingFlow.tsx src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx
git commit -m "feat: add retroactive sensitive-selection step"
```

### Task 9: Implement summary step and completion finalization

**Files:**
- Create: `src/renderer/src/features/onboarding/SummaryStep.tsx`
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`
- Test: `src/renderer/src/features/onboarding/SummaryStep.test.tsx`

**Step 1: Write failing tests**

- Summary shows counts and ignored reasons.
- `Concluir` calls `onboarding.complete()` only after successful run result.
- On completion, app transitions to dashboard.

**Step 2: Run tests to confirm failure**

Run: `npm run test -- src/renderer/src/features/onboarding/SummaryStep.test.tsx`
Expected: FAIL.

**Step 3: Implement summary and complete action**

- Render execution report details.
- Handle retry/recoverable error message if complete fails.

**Step 4: Re-run tests**

Run: `npm run tsc --noEmit && npm run test -- src/renderer/src/features/onboarding/SummaryStep.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/features/onboarding/SummaryStep.tsx src/renderer/src/features/onboarding/OnboardingFlow.tsx src/renderer/src/features/onboarding/SummaryStep.test.tsx
git commit -m "feat: add onboarding summary and completion"
```

### Task 10: Add end-to-end coverage for first-run onboarding

**Files:**
- Create/Modify: `tests/electron/onboarding.e2e.spec.ts`
- Modify test fixtures/helpers for temp HOME + temp DB path

**Step 1: Write failing E2E scenarios**

- First run shows onboarding.
- Retroactive path imports selected sensitive vars and removes from dotfiles.
- Fresh start creates spaces without env import.
- Second launch skips onboarding after completion.

**Step 2: Run E2E subset to confirm failure**

Run: `npm run test:e2e -- onboarding`
Expected: FAIL.

**Step 3: Implement fixture support**

- Isolated temp `$HOME` dotfiles.
- Controlled sample env lines.
- Cleanup guaranteed after test run.

**Step 4: Re-run E2E subset**

Run: `npm run test:e2e -- onboarding`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/electron/onboarding.e2e.spec.ts tests/electron/**
git commit -m "test: cover first-run onboarding modes"
```

### Task 11: Update docs for architecture and onboarding behavior

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write doc updates**

- Add first-run onboarding behavior and mode definitions.
- Document security handling for retroactive sensitive migration.
- Keep architecture section aligned with new onboarding services.

**Step 2: Validate docs consistency**

Run: `npm run tsc --noEmit`
Expected: PASS (no code regressions while docs changed).

**Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: document first-run onboarding architecture"
```

### Task 12: Final verification gate

**Files:**
- No file edits required unless failures appear.

**Step 1: Run required typecheck first**

Run: `npm run tsc --noEmit`
Expected: PASS.

**Step 2: Run unit tests**

Run: `npm run test`
Expected: PASS.

**Step 3: Run E2E tests**

Run: `npm run test:e2e`
Expected: PASS.

**Step 4: If any failure, fix then re-run same command**

- Repeat until all pass.

**Step 5: Final commit (only if verification-related fixes made)**

```bash
git add <fixed-files>
git commit -m "fix: address onboarding verification failures"
```
