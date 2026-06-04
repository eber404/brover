# Onboarding Targets Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor onboarding so it creates targets instead of spaces, updates onboarding copy to the target-only model, and preserves terminal-preferences and retroactive import behavior.

**Architecture:** Reuse the new root-level target store/IPC contracts from the core refactor. Update importer behavior first, then align onboarding flow copy, summaries, and tests so onboarding remains a file-scan flow but no longer persists dotfile-backed spaces as the app's primary structure.

**Tech Stack:** Electron main process, React 19, TypeScript, Vitest, Testing Library.

---

### Task 1: Add failing importer tests for target creation instead of space creation

**Files:**
- Modify: `src/main/onboardingImporter.test.ts`
- Modify: `src/main/onboardingImporter.no-space.test.ts`
- Modify: `src/main/onboardingImporter.ts`

**Step 1: Write the failing tests**

- Change fresh-start expectations from created spaces to created targets.
- Change retroactive expectations from "space with default target" to direct target creation per selected file.
- Keep assertions that only files with selected secrets create import destinations.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/onboardingImporter.test.ts src/main/onboardingImporter.no-space.test.ts`
Expected: FAIL because importer still calls `createSpace()` and reads targets from created spaces.

**Step 3: Write minimal implementation**

- Refactor `runFreshStartImport()` to create targets directly.
- Refactor `runRetroactiveImport()` to create one target per imported file and import secrets into that target.
- Replace rollback tracking from created space ids to created target ids.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/main/onboardingImporter.test.ts src/main/onboardingImporter.no-space.test.ts`
Expected: PASS.

### Task 2: Add failing onboarding flow tests for target-only language and payloads

**Files:**
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
- Modify: `src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx`
- Modify: `src/renderer/src/features/onboarding/ConfirmationStep.test.tsx`
- Modify: `src/renderer/src/features/onboarding/FreshStartReviewStep.tsx`
- Modify: `src/renderer/src/features/onboarding/ConfirmationStep.tsx`
- Modify: `src/renderer/src/features/onboarding/WelcomeStep.tsx`

**Step 1: Write the failing tests**

- Assert onboarding copy references targets, not spaces, where destination language appears.
- Assert fresh start still filters selected files before final submit.
- Assert retroactive flow still requires terminal preferences before completion.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx src/renderer/src/features/onboarding/ConfirmationStep.test.tsx`
Expected: FAIL because current components still describe spaces/file-backed grouping.

**Step 3: Write minimal implementation**

- Update onboarding step copy to talk about creating/importing targets.
- Keep scan/review/confirmation sequencing intact.
- Leave terminal preferences behavior unchanged.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx src/renderer/src/features/onboarding/ConfirmationStep.test.tsx`
Expected: PASS.

### Task 3: Align onboarding IPC and post-import state with the target-rooted store

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/models.ts`

**Step 1: Write the failing test**

- Use typecheck plus importer/flow tests as the failure signal for onboarding contracts after the core refactor removes spaces.

**Step 2: Run test to verify it fails**

Run: `npm run tsc`
Expected: FAIL until onboarding contracts compile against the new target-rooted APIs.

**Step 3: Write minimal implementation**

- Update onboarding payload and summary types only where needed for target-rooted behavior.
- Remove any onboarding type assumptions that a created destination is a space.
- Keep `onboarding:get-status`, `onboarding:scan-dotfiles`, `onboarding:run-retroactive`, `onboarding:run-fresh-start`, and `onboarding:complete` names unchanged unless the core refactor requires otherwise.

**Step 4: Run test to verify it passes**

Run: `npm run tsc`
Expected: PASS.

### Task 4: Update onboarding localization and docs references

**Files:**
- Modify: `src/renderer/src/i18n/locales/en.json`
- Modify: `src/renderer/src/i18n/locales/pt.json`
- Modify: `src/renderer/src/i18n/locales/es.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write the failing test**

- Use onboarding renderer tests plus manual grep verification to identify stale `space` onboarding copy.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL or remain incomplete until updated copy lands.

**Step 3: Write minimal implementation**

- Update locale strings to talk about targets.
- Update README and AGENTS onboarding sections so they describe target creation rather than space creation.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: PASS.

### Task 5: Verify complete onboarding change set

**Files:**
- Verify: `src/main/onboardingImporter.ts`
- Verify: `src/main/index.ts`
- Verify: `src/renderer/src/features/onboarding/*`
- Verify: locale files and docs above

**Step 1: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

**Step 2: Run focused tests**

Run: `npx vitest run src/main/onboardingImporter.test.ts src/main/onboardingImporter.no-space.test.ts src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/RetroactiveReviewStep.test.tsx src/renderer/src/features/onboarding/ConfirmationStep.test.tsx src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`
Expected: PASS.

**Step 3: Run broader regression sweep**

Run: `npm run test`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-04-onboarding-targets-implementation.md`.
