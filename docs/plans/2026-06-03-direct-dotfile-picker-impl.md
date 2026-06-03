# Direct Dotfile Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the add-space `+` button open the dotfile file picker directly instead of first opening a one-item import menu.

**Architecture:** Remove local menu state and menu markup from `SpacesSidebar`, then wire the button directly to existing `onAddSpace`. Cover behavior with a focused sidebar test that proves the click dispatches the add action immediately and the menu label no longer renders.

**Tech Stack:** React, TypeScript, Vitest, Testing Library

---

### Task 1: Add failing sidebar test

**Files:**
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.test.tsx`

**Step 1: Write the failing test**
- Render `SpacesSidebar`
- Click the add-space button
- Expect `onAddSpace` called once immediately
- Expect `Import dotfile` not present

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: FAIL because current button only opens menu.

### Task 2: Remove add menu indirection

**Files:**
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.tsx`

**Step 1: Write minimal implementation**
- Remove `addMenuOpen` state if unused after change
- Change add button click handler to call `onAddSpace` directly
- Delete one-item import menu markup

**Step 2: Run test to verify it passes**
Run: `npm run test -- src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: PASS.

### Task 3: Verify broader safety

**Files:**
- Modify: none unless fixes needed

**Step 1: Run typecheck**
Run: `npm run tsc -- --noEmit`
Expected: PASS.

**Step 2: Run related renderer tests**
Run: `npm run test -- src/renderer/src/features/spaces/SpacesSidebar.test.tsx`
Expected: PASS.
