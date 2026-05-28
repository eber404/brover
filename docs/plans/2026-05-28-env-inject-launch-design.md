# Env Inject & Launch Design

## Context

Brover manages env secrets in Keychain but has no way to inject them into shells or open a terminal with target envs pre-loaded. Current space model uses `kind: 'global' | 'directory'` — global applies to `~/.zshrc` + `~/.bashrc`, directory writes `.env.<target>`.

## Goals

1. **Refactor space model**: `kind: 'dotfile'`, each space points to one dotfile path. Kill `global` + `directory`.
2. **Inject**: Create temp cache file with target envs from Keychain + add conditional `source` line in space's dotfile so new shells inherit those envs.
3. **Launch**: Open new terminal window (Warp/iTerm2/Terminal.app) with target envs injected via `.command` file.

## Scope

- Space model refactor: `EnvSpace.kind` becomes `'dotfile'`, `path` becomes `dotfilePath`. No more `'global'` special-casing. No more `.env.<target>` apply.
- Update store, apply writers, UI (create space, sidebar), onboarding, tests.
- New: envInjector, terminalLauncher, IPC handlers, renderer UI.

## Architecture

### Space Model Change

```typescript
type SpaceKind = 'dotfile'

interface EnvSpace {
  id: string
  name: string
  kind: SpaceKind
  dotfilePath: string  // ~/.zshrc, ~/.bashrc, etc
  expanded?: boolean
  tiedSecrets: boolean
  updatedAt: string
}
```

- `space-global` becomes normal space with `dotfilePath: '~/.zshrc'`.
- Directory spaces become dotfile spaces pointing to their dotfile.
- Onboarding creates dotfile spaces instead of directory spaces.

### New Files

- `src/main/envInjector.ts` — cache file mgmt, dotfile block mgmt, startup cleanup
- `src/main/envInjector.test.ts`
- `src/main/terminalLauncher.ts` — .command creation, `open` terminal
- `src/main/terminalLauncher.test.ts`
- `src/renderer/src/features/targets/TargetActions.tsx` — Inject + Launch UI

### Modified Files

- `src/shared/models.ts` — SpaceKind → 'dotfile', path → dotfilePath
- `src/shared/ipc.ts` — add inject + launch channels
- `src/main/store.ts` — refactor space CRUD, apply writers, onboarding
- `src/main/envWriters.ts` — kill dotenv writer, keep shell block
- `src/main/index.ts` — IPC handlers
- `src/preload/index.ts` — expose inject + launch API
- `src/renderer/src/features/spaces/SpacesSidebar.tsx` — create space UI
- `src/renderer/src/AppShell.tsx` — wire TargetActions
- `src/main/onboardingScanner.ts` / `onboardingImporter.ts` — directory → dotfile

### Cache File

Path: `~/Library/Application Support/brover/env-cache/<targetId>.sh`

Permissions: `0o600` (owner read/write only)

```bash
# Brover envs — target: staging
export DATABASE_URL='postgres://...'
export API_KEY='sk-xxx'
```

One cache per targetId. Independent.

### Dotfile Block

App manages single block with markers in space's dotfile:

```bash
# >>> BROVER CACHE >>>
[ -f "$HOME/Library/Application Support/brover/env-cache/target-abc.sh" ] && source "$HOME/Library/Application Support/brover/env-cache/target-abc.sh"
[ -f "$HOME/Library/Application Support/brover/env-cache/target-def.sh" ] && source "$HOME/Library/Application Support/brover/env-cache/target-def.sh"
# <<< BROVER CACHE >>>
```

Conditional `[ -f ... ]` ensures no error if cache missing (crash recovery).

### Startup Cleanup

1. Scan `env-cache/` for `.sh` files → delete all
2. If dotfile has `# >>> BROVER CACHE >>>` block → remove
3. Guarantees no stale envs survive crash

### Launch (.command file)

Path: `/tmp/brover-<targetId>-<6char>.command`

```bash
#!/bin/bash
# Brover envs — target: staging
export DATABASE_URL='postgres://...'
export API_KEY='sk-xxx'
echo "Brover — target 'staging' active"
exec $SHELL
```

Steps: fetch envs from Keychain → write .command → `chmod 755` → `open /tmp/brover-xxx.command`

`/tmp` volatile — reboot cleans up. No crash concern.

## IPC API

| Channel | Payload | Returns | Description |
|---------|---------|---------|-------------|
| `inject:activate` | `{ targetId, dotfilePath }` | `{ success }` | Write cache + add source line |
| `inject:deactivate` | `{ targetId, dotfilePath }` | `{ success }` | Delete cache + remove source line |
| `inject:status` | `{ targetId }` | `{ active }` | Cache exists? |
| `inject:list-active` | `{}` | `{ activeTargetIds[] }` | All targets with cache |
| `launch:terminal` | `{ targetId, terminalApp }` | `{ success }` | Create .command + open |
| `launch:list-terminals` | `{}` | `{ terminals[] }` | Installed terminals |

### TerminalApp

```typescript
interface TerminalApp {
  id: 'warp' | 'iterm2' | 'terminal'
  name: string
  bundlePath: string
  installed: boolean
}
```

Detection: Warp → `/Applications/Warp.app`, iTerm2 → `/Applications/iTerm.app`, Terminal → always available.

Selection persisted in renderer `localStorage('brover-terminal-app')`.

## UI Placement

Actions bar below targets list, visible when target selected.

```
┌──────────────────────────┐
│ TARGETS                  │
│                          │
│  ⬤ env                   │
│  ⬤ staging (selected)    │
│  ⬤ prod                  │
│                          │
│  ┌───────┬────────────┐  │
│  │ Inject │ Launch ▾  │  │
│  │ [Eject]│ [Warp ▼]  │  │
│  └───────┴────────────┘  │
└──────────────────────────┘
```

- Inject toggles state per target (Inject ↔ Eject)
- Launch has dropdown for terminal selection
- Actions apply to selected target (not necessarily active)

## Behavior Rules

| Trigger | Action |
|---------|--------|
| Click "Inject" on target | Fetch enabled envs from Keychain → write cache → inject source line in dotfile |
| Click "Eject" on target | Delete cache → remove source line |
| App startup | Delete all caches → remove dotfile block |
| App quit | Same as startup |
| Click "Launch" on target | Fetch envs → write .command → open with chosen terminal |
| Terminal choice set | Persist in localStorage, use as default |

## Error Handling

- Keychain unreachable → toast, no cache
- Dotfile unwritable → toast, rollback cache
- No enabled envs → toast, no-op
- Launch with no envs → no-op
- Terminal not found → fallback to Terminal.app

## Testing

### Unit: envInjector
- activate creates cache file + adds line
- deactivate deletes cache + removes line (preserves others)
- startupCleanup removes all
- Conditional line survives cache deletion (no-op)

### Unit: terminalLauncher
- .command has correct content + chmod
- No envs → error
- listTerminals detects installed

### Integration: IPC
- activate → deactivate round-trip
- status returns correct state
- launch triggers open (mock exec)

### E2E: Playwright
- UI shows Inject/Eject toggle
- Click Inject toggles to Eject
- Launch terminal dropdown persists
- Skip actual terminal open in CI

## File List

- `src/shared/models.ts` — SpaceKind, EnvSpace, TerminalApp
- `src/shared/ipc.ts` — inject/launch channels
- `src/main/envInjector.ts` — new
- `src/main/envInjector.test.ts` — new
- `src/main/terminalLauncher.ts` — new
- `src/main/terminalLauncher.test.ts` — new
- `src/main/index.ts` — IPC handlers
- `src/main/store.ts` — refactor space model
- `src/main/envWriters.ts` — strip dotenv writer
- `src/main/onboardingScanner.ts` — directory → dotfile
- `src/main/onboardingImporter.ts` — directory → dotfile
- `src/preload/index.ts` — inject + launch API
- `src/renderer/src/features/targets/TargetActions.tsx` — new
- `src/renderer/src/features/spaces/SpacesSidebar.tsx` — create space UI
- `src/renderer/src/AppShell.tsx` — wire TargetActions

## Maintenance

Update `AGENTS.md` with new architecture. Update `README.md` if space model changes documented.
