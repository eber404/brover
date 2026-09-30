# Secret Details Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show secret details in a centered modal after a secret card is selected, and allow authenticated copy from each card.

**Architecture:** `selectedEnvId` remains the single selection state. `App` removes the fixed details column and controls the existing dialog with this state. `SecretsPanel` adds a copy-only control to each secret row; the control invokes the existing copy handler and stops click propagation.

**Tech Stack:** Electron, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, lucide-react.

---

### Task 1: Add authenticated copy action to secret cards

**Files:**
- Modify: `src/renderer/src/features/secrets/SecretsPanel.tsx:34-58,115-120,314-324`
- Test: `src/renderer/src/features/secrets/SecretsPanel.test.tsx:537-549`

**Step 1: Write failing test**

Add a test that renders one secret card, clicks its copy control, and asserts the existing copy flow receives `false` without selecting the card.

**Step 2: Run test to verify it fails**

Run: `bunx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`

Expected: FAIL because the card has no copy control.

**Step 3: Write minimal implementation**

Pass an `onCopy` callback to `SecretRow`. Render a right-aligned icon button using `Copy`. Prevent row selection with `event.stopPropagation()`.

```tsx
onClick={(event) => {
  event.stopPropagation()
  onCopy(item.id)
}}
```

In `useSecretsPanel`, resolve the item by id and use the existing authenticated copy operation with `isRevealed` set to `false`.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run src/renderer/src/features/secrets/SecretsPanel.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/features/secrets/SecretsPanel.tsx src/renderer/src/features/secrets/SecretsPanel.test.tsx
git commit -m "feat: copy secrets from list"
```

### Task 2: Open secret details in a centered modal

**Files:**
- Modify: `src/renderer/src/App.tsx:153-230`
- Test: `src/renderer/src/App.test.tsx:40-75,202-217,263-320`

**Step 1: Write failing tests**

Update the details mock to expose its content from a dialog. Add tests that assert the fixed right column does not render, selecting a card opens a dialog, and overlay, Escape, or close control clear selected secret state.

```tsx
expect(screen.queryByTestId('secret-details-column')).toBeNull()
expect(screen.getByRole('dialog')).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run src/renderer/src/App.test.tsx`

Expected: FAIL because the details column remains fixed and no dialog renders.

**Step 3: Write minimal implementation**

Change main layout from four to three columns. Expand search and secret list to remaining workspace. Wrap details content in existing `Dialog` and `DialogContent` components:

```tsx
<Dialog open={Boolean(selectedEnvId)} onOpenChange={(open) => {
  if (!open) setSelectedEnvId('')
}}>
  <DialogContent>...</DialogContent>
</Dialog>
```

Render a close control in the dialog. Preserve existing secret delete confirmation and environment-change clearing behavior.

**Step 4: Run test to verify it passes**

Run: `bunx vitest run src/renderer/src/App.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/App.test.tsx
git commit -m "feat: show secret details in modal"
```

### Task 3: Run required verification

Run:

```bash
bun run tsc
bun run test
bun run lint
```

Expected: all commands exit with code 0.

**Step 2: Commit**

```bash
git add docs/plans/2026-09-30-collapsible-secret-details-design.md docs/plans/2026-09-30-collapsible-secret-details-implementation.md
git commit -m "docs: update secret details modal plan"
```
