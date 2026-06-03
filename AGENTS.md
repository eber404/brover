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
5. Dotfile spaces apply active target to their dotfile (via `applySpace`).
6. Inject feature: creates temp cache file with target envs from Keychain, adds conditional `source` line to dotfile.
7. Launch feature: creates `.command` file with env vars, opens terminal app (Warp/iTerm2/Terminal).
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
- apply selected target values to shell/dotenv outputs;
- inject target envs into dotfiles via cache file;
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

### Non-auth actions

- list/search metadata;
- switch spaces/targets;
- edit non-sensitive labels/colors;
- toggle tied-target behavior.

---

## Architecture

```txt
Electron App
  ├── Main process (IPC, auth gate, persistence, envInjector, terminalLauncher)
  ├── Preload bridge (typed window.brover API)
  └── Renderer (React UI: spaces, targets, secrets, details, TargetActions)

Secure store (macOS)
  └── Keychain service

Local config
  └── JSON metadata (spaces, targets, env metadata, onboarding flag)
```

### Space model

All spaces are `kind: 'dotfile'`. Each space points to one dotfile (e.g., `~/.zshrc`). No more global/directory distinction.

### Inject feature

- `envInjector` module: manages cache files in `~/Library/Application Support/brover/env-cache/`
- Each target can be "injected" — creates cache file with envs, adds conditional source line to dotfile
- Startup cleanup removes all stale caches
- Dotfile block uses `[ -f path ] && source path` guard so missing cache is silent

### Launch feature

- `terminalLauncher` module: creates `.command` file in `/tmp/`, opens terminal app
- Supports Warp, iTerm2, Terminal.app
- Terminal preferences persist in renderer storage; onboarding collects favorites + order, first favorite becomes default launch terminal

### Onboarding

Core modules:

- `onboardingScanner` — discovers dotfiles (`.zshrc`, `.bashrc`, `.env.*`), parses env names and values, groups results by source file.
- `onboardingImporter` — handles both modes: retroactive import (moves selected sensitive values to Keychain, rewrites source files) and fresh-start space creation (scaffolds spaces/targets from env names, no value import).
- `onboardingStateStore` — persists onboarding completion flag in local config; subsequent launches skip onboarding.

IPC contracts under `onboarding.*` namespace:
- `onboarding:check` — returns whether onboarding has been completed.
- `onboarding:scan` — triggers scanner, returns grouped env vars per file with masked sensitive suggestions.
- `onboarding:import-retroactive` — receives selected sensitive names per file, imports to Keychain, rewrites files to remove those entries.
- `onboarding:import-fresh` — receives space/target names derived from dotfiles, creates metadata-only scaffold.

Security: retroactive sensitive selection shows masked values without auth (pre-Keychain stage, no secrets persisted yet). After user confirms selection, values move directly to Keychain. No plaintext secrets touch local JSON at any point.

Flow: both onboarding modes route through final terminal-preferences step before completion flag is written.

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

- Dotfile spaces apply active target to their dotfile (via `applySpace`).
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
