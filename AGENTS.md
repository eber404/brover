# AGENTS.md

## Project Overview

Brover is an Electron desktop app for local environment secret management, organized into spaces.

- Stack: Electron + React + TypeScript + TailwindCSS
- Sensitive values: macOS Keychain via Electron main process adapters
- Metadata: local JSON config under app data

## Critical Principles

1. Never persist secret values in JSON or logs.
2. Keep auth gates for reveal/copy(hidden)/update/delete.
3. Use space-scoped value and enabled state.
4. Respect `Matching secret names` behavior.
5. Launch feature: creates `.command` file with env vars, opens terminal app (Warp/iTerm2/Terminal).
6. Normal app usage must not rewrite dotfiles; only retroactive onboarding import removes selected plaintext entries from source files.
7. Global space identity comes from the earliest `createdAt`, never from name or array position. Rename and drag-and-drop reorder must not change it.
8. Terminal launch always injects the global space's secrets; the launched space wins on name collision.
9. Prefer early return and avoid nested conditionals/ternaries.
10. Avoid ternary inside JSX trees.
11. Use stable handlers and `useMemo`/`useCallback` where useful.
12. Run `tsc --noEmit` before tests for every change set.

---

## Main goal (current phase)

Deliver a stable local control plane to:

- manage env secrets by spaces;
- keep sensitive values in secure backend on macOS (Keychain);
- guard reveal/copy/update/delete behind authentication;
- persist only non-sensitive metadata in local JSON;
- launch terminal with space vars plus global-space vars pre-loaded.

---

## Security decision

### Sensitive data

- Secret values must never be stored in plaintext JSON.
- On macOS, secret values use Keychain-backed adapter.
- On unsupported platforms, sensitive actions must fail explicitly.

### Auth-required actions

- reveal secret value;
- copy hidden secret value;
- update secret value;
- delete secret.

Auth session is app-scoped with no TTL: once `authSessionCache` is granted, every later sensitive action stays authorized until the main process restarts. Re-auth is never prompted again within a running app.

Canceled system authentication returns the `AUTH_CANCELED` sentinel (from `src/shared/models.ts`, detected by `isAuthCanceledError` in `src/main/authPrompt.ts`). Callers must treat it as a silent no-op: no error toast, no state change.

### Revealed values

- Revealed values do not auto-hide. There is no reveal timer.
- A revealed value is cleared only on modal close, space switch, and app quit.

### Non-auth actions

- list/search metadata;
- switch spaces;
- edit non-sensitive labels/colors;
- toggle shared secret-name behavior.

---

## Architecture

```txt
Electron App
  ├── Main process (IPC, auth gate, persistence, terminalLauncher)
  ├── Preload bridge (typed window.brover API)
  └── Renderer (React UI: terminals, spaces, secrets, details modal)

Secure store (macOS)
  └── Keychain service

Local config
  └── JSON metadata (spaces, env metadata, onboarding flag)
```

### Space model

Spaces are the root-level entities the UI shows as `SPACES` / `Space`. A space is named `dev`, `prod`, or after an onboarding-created dotfile like `.zshrc`.

Terminology note: `SPACES` / `Space` is a visible-string rename only. Internal types, components, files, IPC payloads, and store methods still use `Environment` / `Environments` (`Environment` in `src/shared/models.ts`, `EnvironmentsSidebar.tsx`, `store.listEnvironments()`, and friends). Do not rename internals as part of copy work.

The first space ever created is the global space. Its identity is resolved by `resolveGlobalEnvironmentId` in `src/main/store.ts` as the record with the earliest `createdAt`, and `toPublicEnvironment` exposes it to the renderer as `isGlobal: true`. Because identity is derived from `createdAt` and not from name or array index, the global space survives rename and drag-and-drop reorder.

Legacy records written before `createdAt` existed are backfilled on read in `normalizeEnvironments`, using `legacyCreatedAtFor(index)` so array order is preserved as creation order, and the backfilled DB is written back to disk. New records get a strictly increasing `createdAt` from `nextCreatedAt`, so the earliest `createdAt` always belongs to the oldest space.

Fresh start creates the first space named `global` (`runFreshStartImport` in `src/main/onboardingImporter.ts`). Existing installs keep whatever name their first space already had, so the sidebar renders a dimmed `(global)` marker next to the name whenever the global space's name is not exactly `global`.

The global space cannot be deleted. `deleteEnvironment` throws `The global environment cannot be deleted` when the target id resolves to the global space, and the sidebar hides the delete control for it.

Onboarding-derived spaces may come from source dotfiles. After onboarding, normal launch flow uses Keychain-backed space values and does not modify those dotfiles.

### Launch feature

- `terminalLauncher` module: creates `.command` file in `/tmp/`, opens terminal app
- launch stays ephemeral and must not edit dotfiles
- Supports Warp, iTerm2, Terminal.app
- Terminal preferences persist in renderer storage; onboarding collects favorites + order, first favorite becomes default launch terminal
- `launch:terminal` always merges global secrets in: global entries first, then the launched space's entries, with the launched space overwriting a global entry of the same name. Names that exist only in the global space are still injected. Launching from the global space itself contributes no second copy, so entries never duplicate.
- The merge is pure and lives in `src/main/launchEnvMerge.ts` (`pickGlobalEnvironmentId`, `collectLaunchEntries`, `mergeLaunchEntries`); the `launch:terminal` handler in `src/main/index.ts` only reads Keychain values via `LaunchValueLookup` and hands the merged list to the launcher.

### Onboarding

Core modules:

- `onboardingScanner` — scans top-level dotfiles in home directory, parses `NAME=value` and `export NAME=value`, and skips comments, blank lines, subshell expressions, non-assignment lines, binary files, oversized files, and unreadable files.
- `onboardingImporter` — handles both modes: retroactive import (moves selected sensitive values to Keychain, rewrites source files, and creates one space per dotfile with selected secrets) and fresh-start space creation (creates the first space named `global`, no value import, no env scaffolding).
- `onboardingStateStore` — persists onboarding completion flag in local config; subsequent launches skip onboarding.

IPC contracts under `onboarding.*` namespace:

- `onboarding:get-status` — returns whether onboarding has been completed.
- `onboarding:scan-dotfiles` — triggers scanner, returns grouped env vars per file plus scan warnings.
- `onboarding:run-retroactive` — receives selected sensitive ids, imports to Keychain, rewrites files to remove matching entries, and returns summary counts.
- `onboarding:run-fresh-start` — accepts the selected scan files but imports nothing from them; it creates the first space named `global`.

Security: retroactive review can reveal scanned plaintext values without auth because values still come directly from user dotfiles at pre-Keychain stage. After terminal preferences, selected values move directly to Keychain. No plaintext secrets touch local JSON at any point.

Flow:

- retroactive: welcome -> review -> confirmation -> terminal preferences -> import -> complete flag;
- fresh start: welcome -> file selection -> terminal preferences -> global space creation -> complete flag.

---

## Quick Commands

```bash
npm run lint
npm run tsc
npm run test
npm run test:coverage
npm run test:e2e
```

---

## Distribution

- Source repo: private `eber404/brover`.
- Public binary repo + Homebrew tap: `eber404/homebrew-brover`.
- Tagging `v*` in private repo builds macOS `arm64` and `x64` DMGs.
- Workflow publishes internal release in private repo, pushes DMGs to `homebrew-brover`, then updates `Casks/brover.rb` with new SHA256s.
- `brew tap eber404/brover && brew install brover` installs from the same repo.
- Required private repo secret:
  - `BROVER_RELEASES_TOKEN`

Current release state:

- DMGs are unsigned and not notarized.
- For test installs, after copying `Brover.app` into `/Applications`, run:

```sh
xattr -dr com.apple.quarantine "/Applications/Brover.app"
```

Reason:

- macOS quarantine + Gatekeeper can block unsigned internet-downloaded apps and show a damaged-app warning.

---

## Code context

For broad/multi-file discovery, consult the auto-generated symbol map:

- TOON snapshot: `.tscontext/code-context.toon` (regenerate with `tscontext extract`).
- Human summary: `.tscontext/code-context.md`.
- Use for metadata-friendly questions (imports/exports/types/components).
- For literal-sensitive answers, verify in source. Treat snapshot as potentially stale until regenerated.

---

## Domain rules

### Spaces

- A space may contain zero or more secrets.
- Spaces are reorderable. Order is presentation only and never affects global identity.
- Every space is deletable except the global space, whose deletion throws.
- Space deletion removes its space-scoped secrets.
- The global space is an ordinary secret container too: its secrets can be created, rotated, revealed, and deleted like any other space's.

### Matching secret names

- Global toggle label: `Matching secret names`.
- Default: `false`.
- When `true`:
  - new env names sync across all spaces;
  - deleting an env name removes it from all spaces;
  - creating a space clones env names from peers with empty values.
- When `false`:
  - env names are space-local;
  - delete affects only the selected space;
  - new space starts empty.

### Values

- Value storage remains space-scoped always.
- Same env name can hold different values per space.

---

## Storage conventions

- Secret account key format: `environmentId:ENV_NAME` (the `environmentId` prefix is the space id; the storage format was not renamed).
- Metadata JSON path: app data directory `brover/config.json` (or `brover-dev/config.json` in dev mode). Override with `BROVER_DB_PATH` env var.

---

## Validation

Env names must match:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

Reject spaces, shell metacharacters, empty names, and numeric-leading names.

---

## UI conventions

- Three-column layout: terminal rail, spaces sidebar, secrets list.
- Left rail manages terminals; middle panel manages spaces; secrets list fills the remaining column.
- Visible terminology is `SPACES` for the sidebar heading and `Space` for the singular label (`common.environment` in `src/renderer/src/i18n/locales/en.json` renders `Space`). This is a visible-string rename only; internals stay `Environment`/`Environments`.
- The spaces sidebar renders a dimmed `(global)` marker next to the global space's name when that name is not exactly `global`, and hides the delete control for it.
- There is no fixed right-hand details column. Secret details render in a centered `Dialog` (wired in `App.tsx`).
- The details modal opens only after authentication succeeds: a card click triggers the authenticated reveal, and a canceled prompt leaves the modal closed.
- Each secret card has two copy controls: a value copy (authenticated, right side) and a variable-name copy (metadata only, no auth, beside the name). The modal header repeats the name-copy control.
- The modal exposes a single editable `Current Secret` field. Its action button reads `Rotate` when a value already exists and `Save` when it does not. There is no separate `Rotate Secret` field.
- Window is capped at 760px width (`src/main/index.ts`: width 760, maxWidth 760, minWidth 640, center true).
- Toasts render bottom-center, only one at a time, and above dialog overlays.
- Prevent text selection for static UI labels.
- Show destructive actions with confirmation.

---

## Code Standards

- Prefer early return and avoid nested conditionals/ternaries.
- Avoid ternary inside JSX trees.
- Use stable handlers and `useMemo`/`useCallback` where useful.
- Run `tsc --noEmit` before tests for every change set.

---

## Testing

- Unit tests: Vitest.
- E2E: Playwright (Electron mode).
- E2E must run in sandboxed temp DB path and clean up after each test.
- `vitest.config.ts` raises `test.asyncUtilTimeout` to 5000ms. Do not lower it. Radix dialogs mount through `requestAnimationFrame` plus animation frames, and under parallel workers the default 1s budget for `findBy*`/`waitFor` starves and produces flaky dialog tests. The per-test `testTimeout` stays at the default on purpose so real hangs are still caught.

---

## Maintenance rule

When architecture/scope changes, update this file and `README.md` in the same change set.
