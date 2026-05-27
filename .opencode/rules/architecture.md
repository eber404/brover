# Architecture Rules

## Electron split

- `src/main/*`: persistence, keychain access, auth gate, IPC handlers.
- `src/preload/*`: typed API bridge only.
- `src/renderer/*`: UI/state orchestration only.

## Data ownership

- Main process owns filesystem writes and keychain reads/writes.
- Renderer never touches secret storage directly.

## Env spaces model

- Space types: `global` and `directory`.
- Targets live under a space and have unique names per space.
- Secret schema sync is controlled by per-space `tiedSecrets`.
  - `true`: names sync across targets in space.
  - `false`: names are target-local.
- Secret value/enabled remain target-scoped always.
