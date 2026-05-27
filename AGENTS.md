# AGENTS.md

## Project

**brover**

Desktop app to manage local environment secrets with secure storage and auth-gated secret actions.

Current implementation uses **Electron + React + TypeScript**.

---

## Main goal (current phase)

Deliver a stable local control plane to:

- manage env secrets by spaces and targets;
- keep sensitive values in secure backend on macOS (Keychain);
- guard reveal/copy/update/delete behind authentication;
- persist only non-sensitive metadata in local JSON;
- apply selected target values to shell/dotenv outputs.

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
  ├── Main process (IPC, auth gate, persistence, apply writers)
  ├── Preload bridge (typed window.brover API)
  └── Renderer (React UI: spaces, targets, secrets, details)

Secure store (macOS)
  └── Keychain service

Local config
  └── JSON metadata (spaces, targets, env metadata)
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
- Metadata JSON path: app data directory `brover-electron/config.json` (or `BROVER_DB_PATH` override in tests).

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

## Testing

- Unit tests: Vitest.
- E2E: Playwright (Electron mode).
- E2E must run in sandboxed temp DB path and clean up after each test.

---

## Maintenance rule

When architecture/scope changes, update this file and `README.md` in the same change set.
