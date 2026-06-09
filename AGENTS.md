# AGENTS.md

## Project Overview

Brover is an Electron desktop app for local environment secret management.

- Stack: Electron + React + TypeScript + TailwindCSS
- Sensitive values: macOS Keychain via Electron main process adapters
- Metadata: local JSON config under app data

## Critical Principles

1. Never persist secret values in JSON or logs.
2. Keep auth gates for reveal/copy(hidden)/update/delete.
3. Use environment-scoped value and enabled state.
4. Respect `Matching secret names` behavior.
5. Launch feature: creates `.command` file with env vars, opens terminal app (Warp/iTerm2/Terminal).
6. Normal app usage must not rewrite dotfiles; only retroactive onboarding import removes selected plaintext entries from source files.
7. Prefer early return and avoid nested conditionals/ternaries.
8. Avoid ternary inside JSX trees.
9. Use stable handlers and `useMemo`/`useCallback` where useful.
10. Run `tsc --noEmit` before tests for every change set.

---

## Main goal (current phase)

Deliver a stable local control plane to:

- manage env secrets by environments;
- keep sensitive values in secure backend on macOS (Keychain);
- guard reveal/copy/update/delete behind authentication;
- persist only non-sensitive metadata in local JSON;
- launch terminal with environment vars pre-loaded.

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

Auth session is shared across environments for the current in-memory TTL window. Re-auth is not required when switching environments until that TTL expires.

### Non-auth actions

- list/search metadata;
- switch environments;
- edit non-sensitive labels/colors;
- toggle shared secret-name behavior.

---

## Architecture

```txt
Electron App
  ├── Main process (IPC, auth gate, persistence, terminalLauncher)
  ├── Preload bridge (typed window.brover API)
  └── Renderer (React UI: terminals, environments, secrets, details)

Secure store (macOS)
  └── Keychain service

Local config
  └── JSON metadata (environments, env metadata, onboarding flag)
```

### Environment model

Environments are root-level entities such as `dev`, `prod`, or onboarding-created dotfile names like `.zshrc`.

Onboarding-derived environments may come from source dotfiles. After onboarding, normal launch flow uses Keychain-backed environment values and does not modify those dotfiles.

### Launch feature

- `terminalLauncher` module: creates `.command` file in `/tmp/`, opens terminal app
- launch stays ephemeral and must not edit dotfiles
- Supports Warp, iTerm2, Terminal.app
- Terminal preferences persist in renderer storage; onboarding collects favorites + order, first favorite becomes default launch terminal

### Onboarding

Core modules:

- `onboardingScanner` — scans top-level dotfiles in home directory, parses `NAME=value` and `export NAME=value`, and skips comments, blank lines, subshell expressions, non-assignment lines, binary files, oversized files, and unreadable files.
- `onboardingImporter` — handles both modes: retroactive import (moves selected sensitive values to Keychain, rewrites source files, and creates one environment per dotfile with selected secrets) and fresh-start environment creation (creates one environment per selected file, no value import, no env scaffolding).
- `onboardingStateStore` — persists onboarding completion flag in local config; subsequent launches skip onboarding.

IPC contracts under `onboarding.*` namespace:

- `onboarding:get-status` — returns whether onboarding has been completed.
- `onboarding:scan-dotfiles` — triggers scanner, returns grouped env vars per file plus scan warnings.
- `onboarding:run-retroactive` — receives selected sensitive ids, imports to Keychain, rewrites files to remove matching entries, and returns summary counts.
- `onboarding:run-fresh-start` — receives selected scan files and creates one metadata-only dotfile environment per file.

Security: retroactive review can reveal scanned plaintext values without auth because values still come directly from user dotfiles at pre-Keychain stage. After terminal preferences, selected values move directly to Keychain. No plaintext secrets touch local JSON at any point.

Flow:

- retroactive: welcome -> review -> confirmation -> terminal preferences -> import -> complete flag;
- fresh start: welcome -> file selection -> terminal preferences -> environment creation -> complete flag.

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

### Environments

- An environment may contain zero or more secrets.
- Environments are reorderable and deletable.
- Environment deletion removes its environment-scoped secrets.

### Matching secret names

- Global toggle label: `Matching secret names`.
- Default: `false`.
- When `true`:
  - new env names sync across all environments;
  - deleting an env name removes it from all environments;
  - creating an environment clones env names from peers with empty values.
- When `false`:
  - env names are environment-local;
  - delete affects only selected environment;
  - new environment starts empty.

### Values

- Value storage remains environment-scoped always.
- Same env name can hold different values per environment.

---

## Storage conventions

- Secret account key format: `environmentId:ENV_NAME`.
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

- Three-column layout: terminals, environments, secrets/details.
- Left rail manages terminals; middle panel manages environments.
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
