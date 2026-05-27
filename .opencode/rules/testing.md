# Testing Rules

## Required workflow per change set

1. Run type-check first:

```bash
npm run tsc
```

2. If compile passes, run unit tests:

```bash
npm run test
```

3. For user flows and IPC integration, run targeted e2e:

```bash
npm run test:e2e -- tests/electron/window.spec.ts tests/electron/secrets-auth.spec.ts tests/electron/targets-crud.spec.ts tests/electron/targets-delete-all.spec.ts tests/electron/spaces-crud.spec.ts
```

## Coverage expectations

- Store behavior around env-space target sync.
- Auth-gated secret flows.
- Shell and dotenv apply writers.
