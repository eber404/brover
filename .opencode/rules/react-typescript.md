# React + TypeScript Rules

## Code style

- Prefer guard clauses and early return.
- Avoid nested `if` blocks.
- Avoid nested ternary expressions.
- Avoid ternary expressions inside JSX trees.

## Component patterns

- Prefer stable handlers (`useCallback`) for frequently passed callbacks.
- Use `useMemo` for repeated derivations and mapping structures.
- Keep heavy lists split into memoized rows/panels.

## Screen split guideline

- New/major screens: use `*-container.tsx` and `*-view.tsx` split.
  - Container: state, side effects, actions.
  - View: presentational tree + props.

## Shared state

- For cross-screen shared state, prefer Zustand.
- Add `immer` and `persist` middleware only when state mutation ergonomics or persistence are needed.
