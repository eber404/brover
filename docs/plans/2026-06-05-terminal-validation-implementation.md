# Terminal Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate terminal apps with high confidence for both onboarding and in-app terminal addition, while keeping the terminal rail limited to user favorites plus a persistent `+` picker.

**Architecture:** Introduce a main-process terminal resolver that classifies terminal apps as `known`, `compatible`, or `unsupported` using bundle metadata plus a launch probe. Reuse that resolver in both `launch:list-terminals` and a new `launch:pick-terminal-app` IPC so onboarding and in-app addition share exactly the same validation path.

**Tech Stack:** Electron main process, React 19, TypeScript, Electron `dialog`, macOS bundle metadata (`Info.plist`), Vitest, Testing Library.

---

### Task 1: Add failing tests for terminal resolver confidence rules

**Files:**
- Create: `src/main/terminalResolver.test.ts`
- Create: `src/main/terminalResolver.ts`

**Step 1: Write the failing test**

- Add one test for a `known` terminal matched by bundle id.
- Add one test for a `compatible` terminal matched by heuristics plus successful launch probe.
- Add one test for an `unsupported` app when heuristics fail or the probe fails.
- Add one test proving bundle metadata is preferred over loose file-name matching.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/terminalResolver.test.ts`
Expected: FAIL because resolver module does not exist yet.

**Step 3: Write minimal implementation**

- Create a resolver with an explicit registry for known terminals.
- Read bundle metadata through `Info.plist` helpers.
- Add strong heuristic matching for additional terminals (`ghostty`, `kitty`, `wezterm`, `alacritty`, `hyper`, etc.).
- Require a launch probe to classify unknown-but-compatible terminals as accepted.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/terminalResolver.test.ts`
Expected: PASS.

### Task 2: Reuse resolver in terminal listing and icon loading

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/terminalLauncher.ts`
- Modify: `src/main/terminalIconLoader.ts`
- Modify: `src/main/terminalLauncher.test.ts`
- Modify: `src/main/terminalIconLoader.test.ts`
- Modify: `src/shared/models.ts`

**Step 1: Write the failing test**

- Extend terminal-listing tests so only validated terminals are returned to renderer.
- Assert returned `TerminalApp` records include enough metadata for the rail and onboarding to render correctly.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/terminalLauncher.test.ts src/main/terminalIconLoader.test.ts src/main/terminalResolver.test.ts`
Expected: FAIL because terminal listing still returns static installed terminals without resolver filtering.

**Step 3: Write minimal implementation**

- Make `launch:list-terminals` call the new resolver per candidate terminal.
- Filter out `unsupported` apps.
- Preserve `iconDataUrl` enrichment after validation.
- Keep renderer-facing `TerminalApp` shape minimal but sufficient.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/terminalLauncher.test.ts src/main/terminalIconLoader.test.ts src/main/terminalResolver.test.ts`
Expected: PASS.

### Task 3: Add failing tests for persistent `+` terminal picker in the rail

**Files:**
- Modify: `src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
- Modify: `src/renderer/src/features/terminals/TerminalSidebar.tsx`
- Modify: `src/renderer/src/features/launch/preferences.ts`

**Step 1: Write the failing test**

- Assert the rail renders only favorite terminals, not all installed terminals.
- Assert the `+` button is always visible when the sidebar is rendered.
- Assert clicking `+` calls a picker API instead of opening an inline menu.
- Assert a validated picked terminal is added to the favorites rail without duplication.
- Assert cancel or unsupported selection leaves the rail unchanged.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
Expected: FAIL because the rail still shows non-favorites or uses an inline add menu.

**Step 3: Write minimal implementation**

- Keep `+` always rendered in `TerminalSidebar`.
- Remove the inline “add terminal” menu.
- Call a new preload API that opens the system picker.
- Add a helper path for appending a favorite terminal without changing the default unless it is the first favorite.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/terminals/TerminalSidebar.test.tsx`
Expected: PASS.

### Task 4: Add failing tests for picker IPC and unsupported-terminal handling

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/src/features/terminals/TerminalSidebar.test.tsx`

**Step 1: Write the failing test**

- Assert preload exposes `launch.pickTerminalApp()`.
- Assert picker returns `{ canceled: true }` when dismissed.
- Assert unsupported apps return a distinct error payload the renderer can ignore or surface.

**Step 2: Run test to verify it fails**

Run: `npm run tsc`
Expected: FAIL because the new IPC contract does not exist yet.

**Step 3: Write minimal implementation**

- Add `launch:pick-terminal-app` in main.
- Open `dialog.showOpenDialog` rooted in `/Applications` with `.app` selection.
- Resolve the chosen app through `terminalResolver`.
- Return typed results for `canceled`, `unsupported`, and `accepted`.

**Step 4: Run test to verify it passes**

Run: `npm run tsc`
Expected: PASS.

### Task 5: Align onboarding terminal preferences with validated terminals only

**Files:**
- Modify: `src/renderer/src/features/onboarding/TerminalPreferencesStep.tsx`
- Modify: `src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx`
- Modify: `src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`

**Step 1: Write the failing test**

- Assert onboarding terminal preferences only render validated terminals returned by `launch:list-terminals`.
- Assert onboarding still requires at least one favorite terminal before continuing.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: FAIL if onboarding assumptions still depend on raw installed-terminal lists.

**Step 3: Write minimal implementation**

- Keep onboarding consumption simple: trust validated `launch:list-terminals` output.
- Avoid separate onboarding-only validation logic.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: PASS.

### Task 6: Verify complete change set

**Files:**
- Verify: `src/main/terminalResolver.ts`
- Verify: `src/main/index.ts`
- Verify: `src/main/terminalLauncher.ts`
- Verify: `src/main/terminalIconLoader.ts`
- Verify: `src/shared/ipc.ts`
- Verify: `src/preload/index.ts`
- Verify: `src/renderer/src/features/terminals/TerminalSidebar.tsx`
- Verify: `src/renderer/src/features/onboarding/TerminalPreferencesStep.tsx`

**Step 1: Run typecheck**

Run: `npm run tsc`
Expected: PASS.

**Step 2: Run focused tests**

Run: `npx vitest run src/main/terminalResolver.test.ts src/main/terminalLauncher.test.ts src/main/terminalIconLoader.test.ts src/renderer/src/features/terminals/TerminalSidebar.test.tsx src/renderer/src/features/onboarding/TerminalPreferencesStep.test.tsx src/renderer/src/features/onboarding/OnboardingFlow.test.tsx`
Expected: PASS.

**Step 3: Run full regression suite**

Run: `npm run test`
Expected: PASS.

Plan complete and saved to `docs/plans/2026-06-05-terminal-validation-implementation.md`.
