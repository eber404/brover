# Update Secret Confirmation Design

## Goal

Show confirmation prompt before updating secret value when target already has active auth session cache, while keeping current direct auth-then-save flow when no cache exists.

## Scope

In scope:

- Auth-cache-aware update decision in main process.
- New confirmed update IPC path.
- Renderer confirmation dialog for cached update path.
- Pending update value state in secrets panel.

Out of scope:

- Changing update auth semantics when cache is absent.
- New persistence model for auth cache.
- Delete/reveal/copy behavior changes.

## Product Decisions

- If auth cache exists for target, update does not save immediately.
- Main process returns `value: 'needs-confirmation'`.
- Renderer shows confirm dialog.
- Confirmed action saves new secret value without re-prompting auth.
- If auth cache does not exist, current behavior remains: authorize then save directly.

## Recommended Approach

Mirror existing delete confirmation pattern for update.

Why:

- Codebase already uses `needs-confirmation` handshake for delete.
- Main process remains source of truth for auth-session state.
- Renderer stays simple: receive intent token, show confirm, resend payload.

## Flow

### No Auth Cache

- Renderer calls `envs:update`
- Main checks cache, finds none
- Main authorizes `update`
- Main saves immediately
- Renderer shows success toast

### Auth Cache Exists

- Renderer calls `envs:update`
- Main checks cache, finds active session
- Main returns `{ ok: true, value: 'needs-confirmation' }`
- Renderer stores pending edited value and opens confirm dialog
- User confirms
- Renderer calls `envs:update-confirmed`
- Main saves without second auth prompt
- Renderer shows success toast and clears pending state

## Architecture

### Main Process

- `envs:update` becomes auth-cache-aware.
- New `envs:update-confirmed` IPC handler writes update directly.

### Shared / Preload

- Extend typed IPC contract and preload bridge with `updateEnvConfirmed(payload)`.

### Renderer

- `SecretsPanel` adds:
  - `updateConfirmOpen`
  - `pendingUpdateValue`
  - `updateEnvConfirmed()`
- Reuse `ConfirmDialog` for update confirmation.

## UI Copy

- Title: `Update "ENV_NAME"?`
- Description: `This will replace the current secret value.`
- Confirm label: `Update`
- Cancel label: `Cancel`

## Testing Strategy

### Main

- Cached update returns `needs-confirmation` instead of saving.
- Confirmed update saves value.

### Renderer

- `updateEnvValue()` opens confirm when update response requests it.
- Confirm dialog confirm calls `updateEnvConfirmed()` with stored value.
- Success path still clears reveal state and shows toast.

## Success Criteria

- Cached auth session triggers update confirmation.
- Uncached session keeps current one-step auth + update.
- Confirmed update saves without second auth prompt.
