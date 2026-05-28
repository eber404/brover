# First-Run Onboarding Design

## Goal

Design a first-run onboarding flow that lets users choose between:

- `Acesso retroativo`: import existing sensitive env vars from local dotfiles into Keychain and remove those sensitive entries from source files.
- `Fresh start`: create spaces from detected dotfiles without importing env vars.

The flow must run only on first execution and complete with clear reporting of partial failures.

## Scope

In scope:

- First-run gate and onboarding UI flow.
- Dotfile scan from `$HOME` with broad auto-discovery.
- Retroactive sensitive-selection step.
- Import/write operations for onboarding outcomes.
- Summary reporting and completion flag behavior.

Out of scope:

- Dotfile injection/apply pipeline changes after onboarding.
- New secret management semantics beyond existing auth/security model.

## Product Decisions (Validated)

- Onboarding appears only on first real execution.
- Sensitive in retroactive mode means: move value into Keychain and remove from dotfile.
- Non-sensitive in retroactive mode are ignored (not imported).
- Duplicate env names across dotfiles remain separate per space.
- Retroactive review list shows name + origin + masked value with reveal toggle, no auth in this pre-Keychain step.
- Dotfile discovery uses broad auto-scan under `$HOME`.
- Parse/permission issues do not block completion; flow continues with partial import and summary of ignored entries.
- Completion flag is persisted only after successful finalization/persistence.

## Recommended Approach

Adopt renderer wizard orchestration with main-process execution services.

Why:

- Keeps filesystem and secret writes in main process.
- Preserves current Electron IPC architecture boundaries.
- Supports review UX for sensitive selection before mutation.
- Minimizes security leakage risk in renderer state and logs.

## UX Flow

### Step 1: Welcome (Animated)

- Animated intro and concise explanation.
- Two mode cards:
  - `Acesso retroativo`
  - `Fresh start`
- Continue enters mode-specific path.

### Step 2A: Retroactive Review

- Groups env candidates by dotfile.
- Each row shows:
  - sensitive checkbox
  - env name
  - source file/origin
  - masked value with reveal toggle
- User selects which vars are sensitive.

### Step 2B: Fresh Start

- No variable review step.
- Proceed directly to execution and summary.

### Step 3: Summary + Finish

- Show:
  - scanned files count
  - sensitive imported to Keychain count
  - sensitive removed from dotfiles count
  - non-sensitive ignored count
  - ignored entries grouped by reason (parse/perms/etc)
- `Concluir` finalizes flow.

## Architecture

### Main Process

- `onboardingScanner`
  - scans `$HOME` dotfiles
  - parses env-like entries
  - records warnings/errors per file and line
- `onboardingImporter`
  - retroactive execution from selection
  - writes sensitive values to Keychain
  - removes sensitive lines from source files
  - fresh-start execution that creates spaces only
- `onboardingStateStore`
  - read/write onboarding completion metadata

### Renderer

- `OnboardingFlow` step machine:
  - `welcome -> review? -> summary`
- `WelcomeStep`
- `RetroactiveReviewStep`
- `SummaryStep`

### IPC Contract (proposed)

- `onboarding.getStatus()`
- `onboarding.scanDotfiles()`
- `onboarding.runRetroactive(selection)`
- `onboarding.runFreshStart()`
- `onboarding.complete()`

## Data and Security Rules

- Never persist sensitive values to JSON or logs.
- Sensitive values move directly to Keychain adapter.
- Retroactive non-sensitive values are discarded.
- Fresh start imports no env values.
- Duplicate env names across files are not deduplicated globally.
- Completion flag writes only after successful finalization.

## Error Handling

- Non-fatal parse/permission issues:
  - continue processing
  - record ignored entries with reason
  - display in summary
- Fatal write failures (critical Keychain or file-write stage):
  - fail current run
  - do not set onboarding completion flag
  - allow retry on next launch
- Logging policy:
  - no raw secret values
  - use counts and structural diagnostics only

## Testing Strategy

### Unit (Main)

- scanner coverage for env formats and malformed lines
- retroactive import behavior and sensitive-line removal
- fresh-start behavior (spaces created, vars not imported)
- completion flag gating behavior

### Unit (Renderer)

- step transitions by mode
- sensitive selection interactions
- summary rendering for partial failures

### E2E (Electron)

- first run opens onboarding
- retroactive path end-to-end
- fresh-start path end-to-end
- completion prevents onboarding re-open

### Verification Order

- `npm run tsc --noEmit`
- unit tests
- e2e tests

## Success Criteria

- On first run, user can complete onboarding in either mode.
- Retroactive sensitive selections end in Keychain and are removed from source dotfiles.
- Fresh start creates spaces from parseable dotfiles without importing variables.
- Partial failures are visible and actionable in summary.
- No sensitive value persists outside secure backend.
