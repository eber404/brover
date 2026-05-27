# Testing Rules

## Required workflow per change set

1. Run type-check first:

```bash
npm --prefix electron-app run tsc
```

2. If compile passes, run unit tests:

```bash
npm --prefix electron-app run test
```

3. For user flows and IPC integration, run targeted e2e:

```bash
npm --prefix electron-app run test:e2e -- tests/electron/window.spec.ts tests/electron/secrets-auth.spec.ts
```

## Coverage expectations

- Store behavior around env-space target sync.
- Auth-gated secret flows.
- Shell and dotenv apply writers.
