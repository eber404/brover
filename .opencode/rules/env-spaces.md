# Env Spaces Rules

## Core semantics

- `Global` space always exists and has no directory path.
- `Directory` spaces have a root path.
- Each space contains multiple targets (e.g. dev/qa/uat/prod/custom).

## Target constraints

- Target names must be unique within a space.
- Target name can be renamed inline.
- Target color is user-editable.

## Secret sync behavior

- Each space has `tiedSecrets` (`Tied targets`) toggle, default `true`.
- When `tiedSecrets=true`:
  - Create secret in one target => schema appears in sibling targets.
  - Delete secret in one target => removed from all targets in same space.
  - Create new target => clone env names from peers with empty values.
- When `tiedSecrets=false`:
  - Create/delete secret affect only selected target.
  - New target starts empty.
- Toggle enabled is target-scoped.
- Update value is target-scoped.

## Apply behavior

- Global space apply writes managed export block to `~/.zshrc` and `~/.bashrc` using active global target.
- Directory space apply writes `.env.<target>` under space path.
