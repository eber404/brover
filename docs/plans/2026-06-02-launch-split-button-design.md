# Launch Split Button Design

## Goal

Replace current single `Launch` button with split button that keeps launch fast while exposing favorite terminal choices as secondary action.

## Scope

In scope:

- Split `Launch` trigger in secrets toolbar.
- Favorite-only terminal menu driven by onboarding launch preferences.
- Installed-terminal filtering against saved favorites.
- Selecting terminal from menu launches immediately and becomes new default.
- Main button launches with current default terminal.

Out of scope:

- Main-process terminal changes.
- Per-target terminal preferences.
- Integrated terminal surface.

## Product Decisions

- Main segment remains primary CTA: `Launch`.
- Secondary chevron opens terminal menu.
- Menu shows only favorite terminals that are currently installed.
- If exactly one favorite installed terminal exists, hide chevron/menu.
- Choosing terminal from menu launches immediately.
- Chosen terminal becomes new default for future primary clicks.
- New default is promoted to top of favorites order to keep `first favorite = default` invariant.

## Recommended Approach

Keep split-button state in `SecretsPanel` and extend launch preference utility with explicit default-update helper.

Why:

- Current launch action already lives in `SecretsPanel`.
- Preference logic already centralized in `features/launch/preferences.ts`.
- No need for new global store or IPC.

## UX Shape

- Left segment:
  - terminal icon
  - `Launch`
  - launches with current default terminal
- Right segment:
  - chevron button
  - toggles menu
- Menu:
  - favorite installed terminals only
  - current default marked with check state
  - clicking item launches in that terminal and closes menu

Visual rules:

- Preserve existing dark toolbar language.
- Keep split seam subtle, not bright accent stripe.
- Menu uses overlay surface and edge border from current system.

## Data Rules

- Read saved favorites via `getLaunchPreferences(installedIds)`.
- Filter out missing/uninstalled favorites.
- On menu selection:
  - move chosen terminal to front
  - set `defaultTerminalId` to chosen terminal
  - persist updated preferences

## Error Handling

- If installed terminal list fails, main button still launches via current default fallback path.
- If no favorite installed terminals resolve, main button falls back to default utility behavior and chevron stays hidden.
- Menu closes after selection or outside click.

## Testing Strategy

### Renderer Unit

- Main launch button uses saved default terminal.
- Chevron opens favorite-only menu.
- Non-favorites do not appear.
- Clicking menu terminal launches with chosen ID.
- Clicking menu terminal updates saved default/favorite order.
- Chevron hidden when <= 1 favorite installed terminal.

### Verification Order

- `npm run tsc --noEmit`
- focused Vitest for `SecretsPanel` and launch preference utility
- onboarding tests to confirm compatibility

## Success Criteria

- Primary `Launch` stays one click.
- User can pick alternate favorite terminal from chevron menu.
- Menu choice updates future default behavior.
- Menu stays limited to onboarding-selected favorites.
