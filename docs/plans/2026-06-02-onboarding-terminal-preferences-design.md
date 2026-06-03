# Onboarding Terminal Preferences Design

## Goal

Add final onboarding step where user chooses favorite terminal apps and their order before onboarding completes.

## Scope

In scope:

- New onboarding step shared by retroactive and fresh-start paths.
- Installed terminal discovery in renderer via existing `launch:list-terminals` IPC.
- Favorite terminal persistence in renderer storage.
- Default launch terminal derived from first favorite.
- Backward-compatible read path for current `Launch` button.

Out of scope:

- Split-button `Launch` menu redesign.
- Main-process config persistence for terminal preferences.
- Per-target terminal preferences.

## Product Decisions

- Terminal preference selection happens after onboarding review/confirmation steps, before import finalization and completion.
- User chooses one or more favorite terminals.
- User defines favorite order.
- First favorite becomes default launch terminal.
- Non-favorite terminals are hidden from future `Launch` menu.
- Preferences are global, not per-space or per-target.

## Recommended Approach

Add renderer-only `TerminalPreferencesStep` and persist preferences to `localStorage`.

Why:

- Existing onboarding flow is already renderer-driven.
- Terminal inventory already exists in renderer through `window.brover.launch.listTerminals()`.
- No sensitive data involved.
- Smallest change that makes onboarding useful immediately.

## UX Flow

### Retroactive Path

- `welcome -> review -> confirmation -> terminal-preferences -> complete`

### Fresh Start Path

- `welcome -> fresh-start-review -> terminal-preferences -> complete`

### Terminal Preferences Step

- Title explains terminal launch setup.
- Subtitle explains: select favorites, order favorites, first item becomes default.
- Show installed terminals only.
- Each row supports:
  - favorite toggle
  - move up/down controls when favorited
- Continue disabled until at least one favorite exists.
- Back returns to previous onboarding step.

## Persistence

Store shape:

```ts
interface LaunchPreferences {
  favoriteTerminalIds: string[]
  defaultTerminalId: string
}
```

Storage key:

- New: `brover.launch-preferences`
- Legacy read fallback: `brover.terminal`

Rules:

- Save favorite IDs in display order.
- Save `defaultTerminalId` as first favorite.
- Ignore unknown terminal IDs on read.
- If saved prefs become invalid, fall back to first installed favorite or `terminal`.

## Architecture

### Renderer

- Add launch preference utility for read/write/normalize logic.
- Add `TerminalPreferencesStep` component.
- Extend `OnboardingFlow` step machine to defer `onboarding.complete()` until preferences saved.
- Update current `SecretsPanel` launch path to read new default terminal preference.

### Main / IPC

- No new main-process handlers.
- Reuse `launch:list-terminals` only.

## Error Handling

- Terminal list load failure: show retry/error state, do not complete onboarding.
- No installed terminals returned: fall back to showing Terminal if API includes it, otherwise block with retry state.
- Storage write failure: catch and continue with in-memory completion only if browser storage unavailable in test env.

## Testing Strategy

### Renderer Unit

- `OnboardingFlow` routes both paths through terminal step before completion.
- Terminal step loads installed terminals.
- Continue disabled until favorite exists.
- Reordering favorites changes persisted order.
- Saving preferences writes expected storage payload.
- Current launch path resolves default terminal from new preferences and legacy fallback.

### Verification Order

- `npm run tsc --noEmit`
- focused Vitest for onboarding + launch preference files
- full relevant unit test slice if needed

## Success Criteria

- Onboarding does not complete until terminal preferences saved.
- User can pick 1+ favorite terminals and order them.
- First favorite becomes default for current `Launch` behavior.
- Future `Launch` menu can consume favorites without extra migration.
