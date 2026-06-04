# Targets + Terminals Design

## Summary

Brover should stop modeling `spaces` as a first-class concept.

The current product no longer injects envs into dotfiles during normal usage. That leaves `space` as a mostly historical grouping layer created from onboarding source files, while the real day-to-day workflow centers on:

- selecting a target;
- editing target-scoped env values;
- launching a terminal session with that target's envs.

This design replaces `spaces` with root-level `targets`, renames `tiedSecrets` to `tiedTargets`, keeps the synchronization behavior intact with global app scope, and promotes installed terminals into the first column of the main UI. The existing `Launch` button leaves the secrets panel.

## Goals

- remove `space` from the core domain model and primary UI;
- keep target-scoped secret values and auth behavior unchanged;
- preserve current tied-name synchronization behavior under a clearer name, `tiedTargets`;
- simplify navigation around the concepts users actually act on: targets and terminals;
- update onboarding so imported or selected files create targets instead of spaces.

## Non-Goals

- changing macOS Keychain storage format for secret values;
- changing auth-gated sensitive actions;
- redesigning secrets list/details panels beyond what the model shift requires;
- introducing per-target terminal preference persistence in this change set.

## Product Decisions

### Root entity

`target` becomes the root entity in the app.

There are no user-visible `spaces`. All targets live in one global set.

### Tied targets

The feature currently surfaced as `tiedSecrets` should be renamed to `tiedTargets` in the product and code.

Behavior stays functionally equivalent, but the scope changes from per-space to global:

- when `tiedTargets` is on, adding an env name to one target adds that env name to all targets with empty values where needed;
- when `tiedTargets` is on, deleting an env name from one target deletes that env name from all targets;
- when `tiedTargets` is off, env names are managed only on the selected target;
- values remain target-scoped in all cases.

This keeps the current convenience behavior without preserving a mostly obsolete grouping concept.

### Terminals in column 1

The first column becomes a terminal column.

- show installed terminals only;
- favorite terminals remain first, ordered from saved launch preferences;
- clicking a terminal launches a session for the currently selected target;
- the secrets-panel `Launch` button and its menu leave the UI.

Terminals become the fast action rail. They do not replace the selected target as the primary data context.

## UI Design

### Main layout

Keep the three-column application shell.

#### Column 1: terminals

Purpose:

- fast terminal launch for selected target;
- visibility into installed/favorite launch destinations.

Contents:

- terminal list, favorites first;
- clear selected-target indicator near the top or bottom of the column;
- optional subtle hint when no target is selected yet.

Interaction:

- single click launches selected target in chosen terminal;
- no launch split button elsewhere;
- launch failures remain non-fatal and should surface the same error handling pattern used today.

#### Column 2: targets

Purpose:

- select and manage all targets;
- hold the global `Tied targets` control.

Contents:

- target list;
- add target;
- rename target;
- reorder targets;
- delete target;
- target color selector;
- `Tied targets` toggle.

The current space badge rail disappears. Target management becomes a single coherent column.

#### Column 3: secrets + details

Purpose stays the same.

- selected target drives secrets list and details panel;
- remove launch CTA from this area;
- secret CRUD, reveal, copy, update, delete stay unchanged except for any model references that still mention spaces.

## Data Model

### Remove `Space`

Remove `EnvSpace` from the shared model layer and from the renderer state tree.

Targets should no longer require `spaceId` for identity or grouping.

### Target model

`EnvTarget` should become self-sufficient.

Expected fields:

- `id`
- `name`
- `color`
- `isActive`
- `updatedAt`

Ordering can remain implicit in storage array order or become an explicit stored field. Prefer the smallest change that keeps reorder stable.

### Global settings

Introduce a global settings location for `tiedTargets`.

This can live in the same JSON metadata file already used by the store.

### Env metadata linkage

`EnvMetadata.profile` currently points to a target id. To minimize migration risk, keep this field as-is in the first pass even if the name is legacy. A later cleanup can rename it to `targetId` after the larger model migration lands safely.

## Store and IPC Impact

### Store

Remove or replace store operations centered on spaces:

- `listSpaces`
- `createSpace`
- `renameSpace`
- `deleteSpace`
- `toggleSpaceTiedSecrets`
- `toggleSpaceExpanded`
- `listTargets(spaceId)`
- `createTarget({ spaceId, ... })`
- `reorderTargets(spaceId, ...)`
- `setActiveTarget({ spaceId, targetId })`

Replace with target-rooted operations such as:

- `listTargets()`
- `createTarget(name)`
- `renameTarget(targetId, name)`
- `deleteTarget(targetId)`
- `reorderTargets(orderedTargetIds)`
- `setActiveTarget(targetId)`
- `getTiedTargets()` / `setTiedTargets(enabled)`

Exact naming can follow current repo style, but the important shift is removing space parameters and globalizing the tied-targets setting.

### IPC

Preload and `shared/ipc.ts` should mirror the same simplification:

- remove `spaces:*` contracts;
- simplify target contracts to root-level operations;
- replace space-tied toggle IPC with global `tiedTargets` getter/setter.

## Migration Strategy

### Existing local metadata

Migrate existing stored data in place.

Recommended rules:

- preserve all existing targets;
- drop `spaceId` from targets during normalization, or tolerate it as legacy ignored data for one transition if that is safer;
- collapse old per-space `tiedSecrets` values into one global `tiedTargets` flag;
- if any old space had `tiedSecrets === false`, migrate global `tiedTargets` to `false`;
- otherwise migrate global `tiedTargets` to `true`.

This rule is conservative because it avoids unexpectedly broad synchronization for users who had explicitly opted out in any space.

### Onboarding-derived identity

Old space names created from file basenames should become target names after migration only if needed for display continuity. If current stored targets already have distinct names, preserve target names and ignore legacy space labels.

### Safety

No migration step should touch secret values in Keychain.

## Onboarding Changes

Onboarding must align with the target-rooted model.

### Retroactive import

Current behavior:

- scan files;
- user selects sensitive envs;
- app creates a space per file and imports selected values into the default target for that space.

New behavior:

- scan files;
- user selects sensitive envs;
- app creates one target per selected/imported file or per chosen naming rule;
- selected values import into that created target;
- selected source lines are still removed from the file.

### Fresh start

Current behavior creates spaces per selected file.

New behavior should create targets instead.

### Copy and UX language

Onboarding copy must stop describing spaces as the destination.

Prefer wording around:

- importing into Brover targets;
- creating targets from selected files;
- choosing favorite terminals for launch.

### Dotfile path persistence

Because normal product flow no longer depends on dotfile-backed spaces, dotfile paths should not remain primary domain metadata after onboarding unless there is a concrete product use for them. If they are still useful for provenance, keep them only as onboarding/import metadata, not as primary navigation state.

## Error Handling

- launching without a selected target should be prevented in UI and handled defensively in IPC;
- deleting the active target should fall back cleanly to another target or an empty state;
- tied-target synchronization failures should fail the whole create/delete env-name operation rather than partially desync targets;
- onboarding migration/import failures should preserve current rollback expectations.

## Testing Strategy

### Store tests

- migration from legacy spaces data to target-rooted data;
- global `tiedTargets` on/off behavior;
- target CRUD and reorder without space ids;
- active-target fallback after deletion.

### Renderer tests

- terminal column renders installed terminals in preference order;
- launch button/menu removed from secrets panel;
- target column renders without space rail;
- `Tied targets` toggle reflects and updates global setting.

### Launch tests

- launching from terminal column uses selected target id;
- favorite/default terminal ordering still respected;
- missing terminal or launch failure remains gracefully handled.

### Onboarding tests

- retroactive import creates targets instead of spaces;
- fresh start creates targets instead of spaces;
- terminal preferences step remains required before completion;
- onboarding copy and flow remain coherent after space removal.

## Rollout Notes

This should be delivered in two related implementation tracks:

1. core refactor: remove spaces, promote targets, move launch to terminal column;
2. onboarding refactor: rewrite onboarding data/output/copy around targets.

The core refactor should land first or define compatibility shims the onboarding work can target in parallel. If implemented in parallel branches, plan merge order carefully around shared store and model files.
