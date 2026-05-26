# Electron Cross-Platform Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new `electron-app/` desktop app that recreates brover's current workflows with Electron, React, TailwindCSS, and shadcn/ui, using macOS Keychain for secrets and blocking sensitive secret operations on unsupported operating systems.

**Architecture:** Create an isolated Electron app with `main`, `preload`, and `renderer` layers. Reimplement domain services in TypeScript, store non-sensitive metadata in JSON under Electron app data, expose a narrow typed IPC bridge, and keep platform secret behavior behind a `SecretStore` adapter.

**Tech Stack:** Electron, Vite, React, TypeScript, TailwindCSS, shadcn/ui, Vitest, React Testing Library, Playwright or equivalent UI smoke tooling, `keytar` for macOS Keychain access if build-compatible.

---

### Task 1: Scaffold `electron-app`

**Files:**
- Create: `electron-app/package.json`
- Create: `electron-app/tsconfig.json`
- Create: `electron-app/tsconfig.node.json`
- Create: `electron-app/electron.vite.config.ts`
- Create: `electron-app/index.html`
- Create: `electron-app/.gitignore`
- Create: `electron-app/src/main/index.ts`
- Create: `electron-app/src/preload/index.ts`
- Create: `electron-app/src/renderer/src/main.tsx`
- Create: `electron-app/src/renderer/src/App.tsx`

**Step 1: Write the failing bootstrap check**

Create `electron-app/package.json` scripts for `dev`, `build`, and `test`, but do not install all app logic yet.

**Step 2: Run bootstrap install/build to verify it fails before files exist**

Run: `npm --prefix electron-app run build`
Expected: FAIL because scaffold files do not exist yet.

**Step 3: Add minimal Electron + Vite scaffold**

Create minimal window boot code in `src/main/index.ts` and minimal React root in renderer.

**Step 4: Run build to verify scaffold passes**

Run: `npm --prefix electron-app install`
Run: `npm --prefix electron-app run build`
Expected: PASS with bundled main, preload, and renderer output.

**Step 5: Commit**

```bash
git add electron-app
git commit -m "feat: scaffold electron app"
```

### Task 2: Add TailwindCSS and shadcn foundation

**Files:**
- Create: `electron-app/tailwind.config.ts`
- Create: `electron-app/postcss.config.js`
- Create: `electron-app/components.json`
- Create: `electron-app/src/renderer/src/index.css`
- Create: `electron-app/src/renderer/src/lib/utils.ts`
- Create: `electron-app/src/renderer/src/components/ui/*`
- Modify: `electron-app/package.json`

**Step 1: Write failing renderer style test or smoke render**

Create a minimal render test that expects app shell class names or button rendering from a shared UI primitive.

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders app shell', () => {
  render(<App />)
  expect(screen.getByText(/Brover/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix electron-app run test -- App.test.tsx`
Expected: FAIL until test setup and styles are wired.

**Step 3: Add TailwindCSS, shadcn config, base tokens, and minimal primitives**

Create button, dialog trigger base, card, input, badge, switch, and toast foundations only.

**Step 4: Run tests/build again**

Run: `npm --prefix electron-app run test`
Run: `npm --prefix electron-app run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app
git commit -m "feat: add electron ui foundation"
```

### Task 3: Recreate shared domain models and validators in TypeScript

**Files:**
- Create: `electron-app/src/shared/models.ts`
- Create: `electron-app/src/shared/errors.ts`
- Create: `electron-app/src/shared/validators/envName.ts`
- Create: `electron-app/src/shared/validators/bundleId.ts`
- Create: `electron-app/src/shared/contracts.ts`
- Test: `electron-app/src/shared/validators/envName.test.ts`
- Test: `electron-app/src/shared/validators/bundleId.test.ts`

**Step 1: Write failing validator tests**

```ts
import { isValidEnvName } from './envName'

test('accepts OPENAI_API_KEY', () => {
  expect(isValidEnvName('OPENAI_API_KEY')).toBe(true)
})

test('rejects 1PASSWORD', () => {
  expect(isValidEnvName('1PASSWORD')).toBe(false)
})
```

**Step 2: Run tests to verify they fail**

Run: `npm --prefix electron-app run test -- envName.test.ts`
Expected: FAIL because validator module does not exist yet.

**Step 3: Implement minimal shared model and validator modules**

Mirror current Swift rules, not future extras.

**Step 4: Run tests to verify they pass**

Run: `npm --prefix electron-app run test -- src/shared`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/shared
git commit -m "feat: add electron shared domain contracts"
```

### Task 4: Build JSON metadata stores

**Files:**
- Create: `electron-app/src/main/stores/jsonFileStore.ts`
- Create: `electron-app/src/main/stores/profileStore.ts`
- Create: `electron-app/src/main/stores/appStore.ts`
- Create: `electron-app/src/main/stores/envMetadataStore.ts`
- Test: `electron-app/src/main/stores/profileStore.test.ts`
- Test: `electron-app/src/main/stores/appStore.test.ts`
- Test: `electron-app/src/main/stores/envMetadataStore.test.ts`

**Step 1: Write failing store tests with temp directories**

```ts
test('writes profiles without secret values', async () => {
  const store = new ProfileStore(tempFile)
  await store.save([{ name: 'default', isActive: true, updatedAt: iso }])
  expect(await fs.readFile(tempFile, 'utf8')).toContain('default')
})
```

**Step 2: Run tests to verify they fail**

Run: `npm --prefix electron-app run test -- profileStore.test.ts`
Expected: FAIL because stores are missing.

**Step 3: Implement JSON stores with directory creation and safe parse defaults**

Include minimal corruption handling and empty-file fallback.

**Step 4: Run store tests**

Run: `npm --prefix electron-app run test -- src/main/stores`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/main/stores
git commit -m "feat: add electron json metadata stores"
```

### Task 5: Implement secret store adapters

**Files:**
- Create: `electron-app/src/main/security/secretStore.ts`
- Create: `electron-app/src/main/security/macosKeychainStore.ts`
- Create: `electron-app/src/main/security/unsupportedSecretStore.ts`
- Create: `electron-app/src/main/security/createSecretStore.ts`
- Modify: `electron-app/package.json`
- Test: `electron-app/src/main/security/unsupportedSecretStore.test.ts`
- Test: `electron-app/src/main/security/createSecretStore.test.ts`

**Step 1: Write failing adapter tests**

```ts
test('unsupported adapter rejects save', async () => {
  const store = new UnsupportedSecretStore()
  await expect(store.saveSecret('default', 'OPENAI_API_KEY', 'x'))
    .rejects.toMatchObject({ code: 'UNSUPPORTED_SECRET_BACKEND' })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm --prefix electron-app run test -- unsupportedSecretStore.test.ts`
Expected: FAIL.

**Step 3: Implement adapter contract and OS factory**

Use `process.platform` in factory. Add `keytar` integration only in macOS adapter.

**Step 4: Run tests**

Run: `npm --prefix electron-app run test -- src/main/security`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/package.json electron-app/src/main/security
git commit -m "feat: add electron secret store adapters"
```

### Task 6: Reimplement services in main process

**Files:**
- Create: `electron-app/src/main/services/profileService.ts`
- Create: `electron-app/src/main/services/appAuthorizationService.ts`
- Create: `electron-app/src/main/services/envManager.ts`
- Test: `electron-app/src/main/services/profileService.test.ts`
- Test: `electron-app/src/main/services/appAuthorizationService.test.ts`
- Test: `electron-app/src/main/services/envManager.test.ts`

**Step 1: Write failing service tests**

Cover:

- create/select active profile
- add/remove/toggle app authorization
- create env metadata + secret adapter save
- reject invalid env names
- reject unsupported backend on secret operations

**Step 2: Run tests to verify they fail**

Run: `npm --prefix electron-app run test -- src/main/services`
Expected: FAIL.

**Step 3: Implement minimal services**

Keep behavior close to current Swift app. Do not add unused abstractions.

**Step 4: Run tests to verify they pass**

Run: `npm --prefix electron-app run test -- src/main/services`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/main/services
git commit -m "feat: add electron domain services"
```

### Task 7: Add typed IPC and preload bridge

**Files:**
- Create: `electron-app/src/main/ipc/registerHandlers.ts`
- Create: `electron-app/src/shared/ipc.ts`
- Modify: `electron-app/src/preload/index.ts`
- Modify: `electron-app/src/main/index.ts`
- Test: `electron-app/src/main/ipc/registerHandlers.test.ts`

**Step 1: Write failing IPC contract test**

Test that handler registration exposes channels for apps, profiles, and secrets.

**Step 2: Run test to verify it fails**

Run: `npm --prefix electron-app run test -- registerHandlers.test.ts`
Expected: FAIL.

**Step 3: Implement typed invoke handlers and preload bridge**

Expose only necessary methods such as:

- `listApps`
- `createApp`
- `toggleApp`
- `deleteApp`
- `listProfiles`
- `createProfile`
- `setActiveProfile`
- `listEnvs`
- `createEnv`
- `revealEnv`
- `copyEnv`
- `updateEnv`
- `deleteEnv`

**Step 4: Run tests/build**

Run: `npm --prefix electron-app run test -- src/main/ipc`
Run: `npm --prefix electron-app run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/main electron-app/src/preload electron-app/src/shared/ipc.ts
git commit -m "feat: add electron ipc bridge"
```

### Task 8: Build renderer shell and app state wiring

**Files:**
- Create: `electron-app/src/renderer/src/app/layout.tsx`
- Create: `electron-app/src/renderer/src/app/routes.ts`
- Create: `electron-app/src/renderer/src/hooks/useWorkspaceState.ts`
- Modify: `electron-app/src/renderer/src/App.tsx`
- Test: `electron-app/src/renderer/src/App.test.tsx`

**Step 1: Write failing UI shell test**

```tsx
test('renders Apps and Secrets workspaces', () => {
  render(<App />)
  expect(screen.getByRole('button', { name: /Apps/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Secrets/i })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix electron-app run test -- App.test.tsx`
Expected: FAIL.

**Step 3: Implement 3-column desktop shell**

Include:

- fixed sidebar
- persistent search bar
- center list region
- detail pane

**Step 4: Run tests**

Run: `npm --prefix electron-app run test -- App.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/renderer/src
git commit -m "feat: add electron app shell"
```

### Task 9: Implement Apps workspace UI

**Files:**
- Create: `electron-app/src/renderer/src/features/apps/AppsList.tsx`
- Create: `electron-app/src/renderer/src/features/apps/AppsDetail.tsx`
- Create: `electron-app/src/renderer/src/features/apps/AppsForm.tsx`
- Create: `electron-app/src/renderer/src/features/apps/useAppsWorkspace.ts`
- Test: `electron-app/src/renderer/src/features/apps/AppsWorkspace.test.tsx`

**Step 1: Write failing workspace test**

Cover add app flow, list rendering, toggle, and delete.

**Step 2: Run test to verify it fails**

Run: `npm --prefix electron-app run test -- AppsWorkspace.test.tsx`
Expected: FAIL.

**Step 3: Implement apps workspace with shadcn primitives**

Use dialog or card form. Keep center/detail layout consistent with shell.

**Step 4: Run tests**

Run: `npm --prefix electron-app run test -- features/apps`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/renderer/src/features/apps
git commit -m "feat: add electron apps workspace"
```

### Task 10: Implement Secrets workspace UI

**Files:**
- Create: `electron-app/src/renderer/src/features/secrets/SecretsList.tsx`
- Create: `electron-app/src/renderer/src/features/secrets/SecretsDetail.tsx`
- Create: `electron-app/src/renderer/src/features/secrets/SecretDialog.tsx`
- Create: `electron-app/src/renderer/src/features/secrets/useSecretsWorkspace.ts`
- Test: `electron-app/src/renderer/src/features/secrets/SecretsWorkspace.test.tsx`

**Step 1: Write failing workspace tests**

Cover:

- search filtering
- add secret validation
- selecting a secret updates detail pane
- unsupported OS message on reveal or create failure

**Step 2: Run test to verify it fails**

Run: `npm --prefix electron-app run test -- SecretsWorkspace.test.tsx`
Expected: FAIL.

**Step 3: Implement secrets workspace**

Use shadcn dialog for create/edit. Surface `UNSUPPORTED_SECRET_BACKEND` as user-facing banner or toast.

**Step 4: Run tests**

Run: `npm --prefix electron-app run test -- features/secrets`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app/src/renderer/src/features/secrets
git commit -m "feat: add electron secrets workspace"
```

### Task 11: Add desktop polish and smoke coverage

**Files:**
- Modify: `electron-app/src/renderer/src/App.tsx`
- Modify: `electron-app/src/renderer/src/index.css`
- Create: `electron-app/tests/smoke/app.spec.ts`
- Modify: `electron-app/package.json`

**Step 1: Write failing smoke test**

Example smoke coverage:

```ts
test('sidebar shows Apps and Secrets', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Apps')).toBeVisible()
  await expect(page.getByText('Secrets')).toBeVisible()
})
```

**Step 2: Run smoke test to verify it fails**

Run: `npm --prefix electron-app run test:smoke`
Expected: FAIL until harness and app startup are wired.

**Step 3: Add final visual polish and smoke harness**

Keep changes focused on spacing, density, state colors, and actionable empty states.

**Step 4: Run smoke/build/test suite**

Run: `npm --prefix electron-app run test`
Run: `npm --prefix electron-app run build`
Run: `npm --prefix electron-app run test:smoke`
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-app
git commit -m "feat: polish electron desktop experience"
```

### Task 12: Update project docs for architecture shift

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write failing doc checklist**

Create a short checklist in your working notes:

- mention `electron-app/`
- mention cross-platform direction
- mention macOS Keychain behavior
- mention Linux/Windows unsupported secret backend for now
- mention new build/test commands

**Step 2: Review current docs for missing items**

Run: `rtk read README.md`
Run: `rtk read AGENTS.md`
Expected: existing docs still describe only SwiftUI/AppKit MVP.

**Step 3: Update docs minimally but accurately**

Do not remove native app history unless implementation explicitly deprecates it.

**Step 4: Verify docs mention new architecture and commands**

Run: `rtk grep "electron-app|Keychain|Linux|Windows" README.md AGENTS.md`
Expected: matches in both files.

**Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: describe electron rebuild direction"
```

### Task 13: Final verification

**Files:**
- Verify only

**Step 1: Run renderer and main unit tests**

Run: `npm --prefix electron-app run test`
Expected: PASS.

**Step 2: Run production build**

Run: `npm --prefix electron-app run build`
Expected: PASS.

**Step 3: Run smoke tests**

Run: `npm --prefix electron-app run test:smoke`
Expected: PASS.

**Step 4: Run repo-native tests only if touched by implementation**

Run: `swift test`
Expected: PASS or unchanged failures unrelated to Electron work.

**Step 5: Commit release-ready verification state**

```bash
git add -A
git commit -m "test: verify electron rebuild baseline"
```
