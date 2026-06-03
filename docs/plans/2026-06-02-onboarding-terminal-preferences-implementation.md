# Onboarding Terminal Preferences Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add final onboarding step for terminal favorites/order, persist launch preferences, and make current launch behavior use new default terminal.

**Architecture:** Keep terminal preference state fully in renderer. Add reusable launch-preferences utility, route both onboarding branches through new terminal step, and make current `SecretsPanel` resolve default terminal from saved preferences with legacy fallback.

**Tech Stack:** React + TypeScript, Electron preload IPC, localStorage, Vitest, Testing Library.

---

### Task 1: Add failing tests for onboarding terminal step flow

**Files:**
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
- Create: `src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`

**Step 1: Write failing test**

- Assert fresh-start path reaches terminal preferences before `onboarding.complete()`.
- Assert retroactive path reaches terminal preferences before `onboarding.complete()`.
- Assert continue stays disabled until one favorite is selected.
- Assert saving writes ordered favorites and default terminal.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`
Expected: FAIL because terminal preferences step does not exist yet.

**Step 3: Write minimal implementation**

- Add new onboarding step component and wire tests to it.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`
Expected: PASS.

### Task 2: Add launch preference utility with tests

**Files:**
- Create: `src/renderer/src/features/launch/preferences.ts`
- Create: `src/renderer/src/features/launch/preferences.test.ts`

**Step 1: Write failing test**

- Assert utility saves `favoriteTerminalIds` and `defaultTerminalId`.
- Assert utility reads valid saved data.
- Assert utility falls back to legacy `brover.terminal` value.
- Assert utility filters invalid IDs and falls back to `terminal`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: FAIL because utility file does not exist yet.

**Step 3: Write minimal implementation**

- Add read/write helpers and normalization logic.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: PASS.

### Task 3: Wire onboarding flow through terminal preferences

**Files:**
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.tsx`
- Create: `src/renderer/src/features/onboarding/TerminalPreferencesStep.tsx`
- Modify: `src/shared/models.ts`

**Step 1: Write failing test**

- Extend onboarding flow tests to assert completion only after terminal preference save.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL because flow completes too early.

**Step 3: Write minimal implementation**

- Add onboarding step state.
- Store pending completion callback payloads until terminal prefs saved.
- Save prefs, call `onboarding.complete()`, then `onComplete()`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: PASS.

### Task 4: Make current launch button respect new default terminal

**Files:**
- Modify: `src/renderer/src/features/secrets/SecretsPanel.tsx`
- Test: `src/renderer/src/features/launch/preferences.test.ts`

**Step 1: Write failing test**

- Assert terminal resolution prefers new launch preferences default over legacy key.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: FAIL for missing resolution behavior.

**Step 3: Write minimal implementation**

- Replace direct `localStorage.getItem('brover.terminal')` read with utility lookup.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: PASS.

### Task 5: Add copy/docs updates and verify whole change set

**Files:**
- Modify: `src/renderer/src/i18n/locales/en.json`
- Modify: `src/renderer/src/i18n/locales/pt.json`
- Modify: `src/renderer/src/i18n/locales/es.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write failing test**

- Covered indirectly by onboarding step rendering tests using new translation keys.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`
Expected: FAIL if keys/component text missing.

**Step 3: Write minimal implementation**

- Add translation keys.
- Update onboarding docs/scope references in README and AGENTS.

**Step 4: Run verification**

Run: `npm run tsc --noEmit && npx vitest run src/renderer/src/features/onboarding/OnboardingFlow.test.tsx src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx src/renderer/src/features/launch/preferences.test.ts`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-02-onboarding-terminal-preferences-implementation.md`.
