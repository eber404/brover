# AGENTS.md

## Project Overview

Brover is an Electron desktop app for local environment secret management.

- Stack: Electron + React + TypeScript + TailwindCSS
- Sensitive values: macOS Keychain via Electron main process adapters
- Metadata: local JSON config under app data

## Critical Principles

1. Never persist secret values in JSON or logs.
2. Keep auth gates for reveal/copy(hidden)/update/delete.
3. Use target-scoped value and enabled state.
4. Respect per-space `tiedSecrets` toggle (`Tied targets`) behavior.
5. Launch feature: creates `.command` file with env vars, opens terminal app (Warp/iTerm2/Terminal).
6. Normal app usage must not rewrite dotfiles; only retroactive onboarding import removes selected plaintext entries from source files.
7. Prefer early return and avoid nested conditionals/ternaries.
8. Avoid ternary inside JSX trees.
9. Use stable handlers and `useMemo`/`useCallback` where useful.
10. Run `tsc --noEmit` before tests for every change set.

---

## Main goal (current phase)

Deliver a stable local control plane to:

- manage env secrets by spaces and targets;
- keep sensitive values in secure backend on macOS (Keychain);
- guard reveal/copy/update/delete behind authentication;
- persist only non-sensitive metadata in local JSON;
- launch terminal with target envs pre-loaded.

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

Auth session is shared across targets for the current in-memory TTL window. Re-auth is not required when switching targets until that TTL expires.

### Non-auth actions

- list/search metadata;
- switch spaces/targets;
- edit non-sensitive labels/colors;
- toggle tied-target behavior.

---

## Architecture

```txt
Electron App
  ├── Main process (IPC, auth gate, persistence, terminalLauncher)
  ├── Preload bridge (typed window.brover API)
  └── Renderer (React UI: spaces, targets, secrets, details)

Secure store (macOS)
  └── Keychain service

Local config
  └── JSON metadata (spaces, targets, env metadata, onboarding flag)
```

### Space model

All spaces are `kind: 'dotfile'`. Each space points to one dotfile (e.g., `~/.zshrc`). No more global/directory distinction.

Dotfile paths identify source files for onboarding-derived spaces and file-picked spaces. After onboarding, normal launch flow uses Keychain-backed target values and does not modify those dotfiles.

### Launch feature

- `terminalLauncher` module: creates `.command` file in `/tmp/`, opens terminal app
- launch stays ephemeral and must not edit dotfiles
- Supports Warp, iTerm2, Terminal.app
- Terminal preferences persist in renderer storage; onboarding collects favorites + order, first favorite becomes default launch terminal

### Onboarding

Core modules:

- `onboardingScanner` — scans top-level dotfiles in home directory, parses `NAME=value` and `export NAME=value`, and skips comments, blank lines, subshell expressions, non-assignment lines, binary files, oversized files, and unreadable files.
- `onboardingImporter` — handles both modes: retroactive import (moves selected sensitive values to Keychain, rewrites source files, only creates spaces for files with selected secrets) and fresh-start space creation (creates one space per selected file, no value import, no env scaffolding).
- `onboardingStateStore` — persists onboarding completion flag in local config; subsequent launches skip onboarding.

IPC contracts under `onboarding.*` namespace:

- `onboarding:get-status` — returns whether onboarding has been completed.
- `onboarding:scan-dotfiles` — triggers scanner, returns grouped env vars per file plus scan warnings.
- `onboarding:run-retroactive` — receives selected sensitive ids, imports to Keychain, rewrites files to remove matching entries, and returns summary counts.
- `onboarding:run-fresh-start` — receives selected scan files and creates one metadata-only dotfile space per file.

Security: retroactive review can reveal scanned plaintext values without auth because values still come directly from user dotfiles at pre-Keychain stage. After terminal preferences, selected values move directly to Keychain. No plaintext secrets touch local JSON at any point.

Flow:

- retroactive: welcome -> review -> confirmation -> terminal preferences -> import -> complete flag;
- fresh start: welcome -> file selection -> terminal preferences -> space creation -> complete flag.

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
- Public binary repo: `eber404/brover-releases`.
- Homebrew tap: `eber404/homebrew-brover`.
- Tagging `v*` in private repo builds macOS `arm64` and `x64` DMGs.
- Workflow publishes internal release in private repo and public binary release in `brover-releases`.
- Workflow updates Homebrew cask in `homebrew-brover`.
- Required private repo secrets:
  - `BROVER_RELEASES_TOKEN`
  - `HOMEBREW_TAP_TOKEN`

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

### Spaces and targets

- A space may contain zero or more targets.
- Targets are reorderable and deletable.
- Space deletion removes all targets and all target-scoped secrets.

### Tied targets

- Each space has `tiedSecrets` (default `true`).
- When `true`:
  - new env names sync across all targets in that space;
  - deleting an env name removes it from all targets in that space;
  - creating a target clones env names from peers with empty values.
- When `false`:
  - env names are target-local;
  - delete affects only selected target;
  - new target starts empty.

### Values

- Value storage remains target-scoped always.
- Same env name can hold different values per target.

---

## Storage conventions

- Secret account key format: `targetId:ENV_NAME`.
- Metadata JSON path: app data directory `brover/config.json` (or `BROVER_DB_PATH` override in tests).

---

## Validation

Env names must match:

```regex
^[A-Za-z_][A-Za-z0-9_]*$
```

Reject spaces, shell metacharacters, empty names, and numeric-leading names.

---

## UI conventions

- Three-column layout: spaces/targets, secrets list, secret details.
- Left rail manages spaces; targets panel manages target operations.
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

---

## Maintenance rule

When architecture/scope changes, update this file and `README.md` in the same change set.
