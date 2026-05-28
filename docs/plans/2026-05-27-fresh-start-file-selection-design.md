# Fresh Start — Dotfile Selection Step

## Problem

Current fresh-start flow creates spaces from **all** scanned dotfiles with zero user interaction. User wants to select which files to import before spaces are created.

## Design

### Flow

```
Welcome → click "Fresh Start" → FreshStartReviewStep → runFreshStartImport → complete
```

- `FreshStartReviewStep` scans dotfiles, shows flat list with checkboxes
- User selects files, clicks Continue
- Renderer filters `scanResult.files` to only selected files
- Passes filtered result to existing `runFreshStartImport`
- Completes onboarding

### Zero backend changes

`runFreshStartImport` already accepts `ScanResult` and iterates `files`. Renderer filters before calling IPC. No changes to `models.ts`, `main/index.ts`, `preload/index.ts`, `store.ts`.

### Component: `FreshStartReviewStep`

- Props: `onContinue({ scanResult: ScanResult })`, `onBack()`
- On mount: calls `window.brover.onboarding.scanDotfiles()`
- Flat list of `Card` components, one per dotfile
- Each card: filename (bold), filepath (dim), `· N vars`
- Click = toggle selection (blue border when selected)
- Continue button disabled when 0 selected
- Loading / error / empty states (same pattern as `RetroactiveReviewStep`)

### `OnboardingFlow` changes

- New step `'fresh-start-review'`
- `handleModeSelect('fresh-start')` → `setStep('fresh-start-review')` (scan happens in component)
- `handleFreshStartContinue(scanResult)` → `applyFilteredImport(scanResult)` → `complete()` → `onComplete()`

### i18n keys

```
onboarding.freshStartReview.title    = "Fresh Start — Select dotfiles"
onboarding.freshStartReview.subtitle = "Choose which files to scan for creating spaces."
onboarding.freshStartReview.loading  = "Scanning dotfiles..."
onboarding.freshStartReview.error    = "Failed to scan dotfiles"
onboarding.freshStartReview.noFiles  = "No dotfiles found"
onboarding.freshStartReview.continue = "Continue"
```
