# Launch Split Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert secrets-toolbar `Launch` button into split button with favorite-terminal menu and persistent default updates.

**Architecture:** Extend launch preference utility with helper for promoting selected default terminal, then wire a small split-button menu inside `SecretsPanel`. Keep installed-terminal fetching local to renderer and reuse onboarding-generated favorites as source of truth.

**Tech Stack:** React + TypeScript, localStorage, Electron preload IPC, Vitest, Testing Library.

---

### Task 1: Add failing tests for launch preference default promotion

**Files:**
- Modify: `src/renderer/src/features/launch/preferences.test.ts`
- Modify: `src/renderer/src/features/launch/preferences.ts`

**Step 1: Write the failing test**

- Assert helper promotes chosen favorite to front and updates `defaultTerminalId`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: FAIL because helper does not exist yet.

**Step 3: Write minimal implementation**

- Add helper that rewrites saved preferences with chosen terminal first.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/launch/preferences.test.ts`
Expected: PASS.

### Task 2: Add failing tests for split Launch button UI

**Files:**
- Modify: `src/renderer/src/features/secrets/SecretsPanel.test.tsx`

**Step 1: Write the failing test**

- Assert primary button launches with saved default terminal.
- Assert chevron opens menu with favorite terminals only.
- Assert clicking alternate favorite launches with chosen terminal and updates saved preferences.
- Assert chevron hidden when only one favorite installed terminal remains.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: FAIL because split menu UI does not exist yet.

**Step 3: Write minimal implementation**

- Add local menu state, installed-terminal load, menu rendering, and click handlers.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: PASS.

### Task 3: Add split-button copy and finish implementation

**Files:**
- Modify: `src/renderer/src/features/secrets/SecretsPanel.tsx`
- Modify: `src/renderer/src/i18n/locales/en.json`
- Modify: `src/renderer/src/i18n/locales/pt.json`
- Modify: `src/renderer/src/i18n/locales/es.json`

**Step 1: Write the failing test**

- Covered by Task 2 UI assertions for menu labels and button behavior.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: FAIL until copy/state exists.

**Step 3: Write minimal implementation**

- Add chevron trigger, menu label, terminal item state, outside-close path, and favorite filtering.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`
Expected: PASS.

### Task 4: Verify complete change set

**Files:**
- Verify: `src/renderer/src/features/launch/preferences.ts`
- Verify: `src/renderer/src/features/secrets/SecretsPanel.tsx`
- Verify: tests above

**Step 1: Run typecheck**

Run: `npm run tsc --noEmit`
Expected: PASS.

**Step 2: Run focused tests**

Run: `npx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx src/renderer/src/features/launch/preferences.test.ts src/renderer/src/features/onboarding`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-02-launch-split-button-implementation.md`.
