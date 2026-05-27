# Brover Project Memory (opencode)

## Project Overview

Brover is a local environment secret manager.

- Native app: SwiftUI + AppKit (macOS-first)
- Electron app: React + TypeScript + Tailwind + shadcn primitives
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
npm --prefix electron-app run lint
npm --prefix electron-app run tsc
npm --prefix electron-app run test
npm --prefix electron-app run test:e2e -- tests/electron/window.spec.ts tests/electron/secrets-auth.spec.ts
```

## Critical Principles

1. Never persist secret values in JSON or logs.
2. Keep auth gates for reveal/copy(hidden)/update/delete.
3. Use target-scoped value and enabled state.
4. Keep secret name schema synchronized across targets in same space.
5. Global space applies active target to shell files (`.zshrc`, `.bashrc`).
6. Directory spaces apply selected target to `.env.<target>`.
7. Prefer early return and avoid nested conditionals/ternaries.
8. Avoid ternary inside JSX trees.
9. Use stable handlers and `useMemo`/`useCallback` where useful.
10. Run `tsc --noEmit` before tests for every change set.
