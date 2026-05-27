# Brover Project Memory (opencode)

## Project Overview

Brover is an Electron desktop app for local environment secret management.

- Stack: Electron + React + TypeScript + TailwindCSS
- Sensitive values: macOS Keychain via Electron main process adapters
- Metadata: local JSON config under app data

Use this file as entry point. Read rule files on demand.

Rule files:

- `.opencode/rules/architecture.md`
- `.opencode/rules/security.md`
- `.opencode/rules/react-typescript.md`
- `.opencode/rules/testing.md`
- `.opencode/rules/env-spaces.md`

## Quick Commands

```bash
npm run lint
npm run tsc
npm run test
npm run test:e2e
```

## Critical Principles

1. Never persist secret values in JSON or logs.
2. Keep auth gates for reveal/copy(hidden)/update/delete.
3. Use target-scoped value and enabled state.
4. Respect per-space `tiedSecrets` toggle (`Tied targets`) behavior.
5. Global space applies active target to shell files (`.zshrc`, `.bashrc`).
6. Directory spaces apply selected target to `.env.<target>`.
7. Prefer early return and avoid nested conditionals/ternaries.
8. Avoid ternary inside JSX trees.
9. Use stable handlers and `useMemo`/`useCallback` where useful.
10. Run `tsc --noEmit` before tests for every change set.
