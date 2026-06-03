## Goal

Add `.command` cleanup for terminal launch scripts on app startup and app quit.

Preserve scripts for all active targets from the store.

## Current State

- `terminalLauncher` writes stable files to `/tmp/brover-<targetId>.command`.
- No `.command` cleanup exists today.
- `envInjector` already performs startup cleanup for cache files.
- Active target state already lives in store per space.

## Design

### Cleanup API

Extend `terminalLauncher` with two methods:

- `startupCleanup(preserveTargetIds: string[])`
- `shutdownCleanup(preserveTargetIds: string[])`

Both methods scan `/tmp` for `brover-*.command`, remove only Brover-managed files, and preserve files whose target IDs are in `preserveTargetIds`.

`launch()` continues to overwrite the stable per-target file path and records session-created paths so quit cleanup can stay narrowly scoped to files this app session touched when appropriate.

### App Integration

At bootstrap:

- list spaces
- derive active target IDs from store
- call `terminalLauncher.startupCleanup(activeTargetIds)`

At app quit:

- derive active target IDs again from store
- call `terminalLauncher.shutdownCleanup(activeTargetIds)` from `will-quit`

### Preserve Rule

Preserve all active targets, not only the most recently launched one.

This matches current app model where each space has its own active target and avoids deleting scripts for targets the user still considers current.

## Testing

Add unit tests first in `src/main/terminalLauncher.test.ts`:

- startup cleanup removes stale Brover `.command` files
- startup cleanup preserves active target files
- shutdown cleanup removes session-managed files
- shutdown cleanup preserves active target files
- cleanup ignores non-Brover files

Then implement minimal code to pass.

## Risks

- If a terminal still depends on a deleted non-active script, cleanup may remove it. This is accepted by scope because requested preservation rule is active targets only.
- Store lookup during quit must not throw through Electron shutdown path.
