# Env Inject & Launch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor space model to `kind: 'dotfile'` + add Inject (cache file + conditional dotfile source) + Launch (terminal with target envs).

**Architecture:** All spaces become dotfile-backed (one dotfile per space). Two new main process modules: `envInjector` (cache file lifecycle, dotfile block management, startup cleanup) and `terminalLauncher` (.command file creation, terminal open). Renderer gets TargetActions component for Inject/Eject/Launch buttons.

**Tech Stack:** Electron, Node.js child_process, macOS Keychain (unchanged)

---

### Task 1: Update shared models

**Files:**
- Modify: `src/shared/models.ts:3-44`
- Modify: `src/shared/ipc.ts:19-63`

**Step 1: Update `SpaceKind` and `EnvSpace`**

Change:
```ts
export type SpaceKind = 'dotfile'

export interface EnvSpace {
  id: string
  name: string
  kind: SpaceKind
  dotfilePath: string  // was path?: string
  expanded?: boolean
  tiedSecrets: boolean
  updatedAt: string
}
```

**Step 2: Add `TerminalApp` type**

```ts
export interface TerminalApp {
  id: string
  name: string
  bundlePath: string
  installed: boolean
}
```

**Step 3: Update `BroverAPI` in `ipc.ts`**

Add to interface:
```ts
inject: {
  activate(targetId: string, dotfilePath: string): Promise<{ success: boolean }>
  deactivate(targetId: string, dotfilePath: string): Promise<{ success: boolean }>
  status(targetId: string): Promise<{ active: boolean }>
  listActive(): Promise<{ activeTargetIds: string[] }>
}
launch: {
  terminal(targetId: string, terminalApp: string): Promise<{ success: boolean }>
  listTerminals(): Promise<{ terminals: TerminalApp[] }>
}
```

Update `createSpace` signature: `(params: { name: string; dotfilePath: string }) => Promise<EnvSpace>`

Remove `pickDirectory`. Keep `pickDotfile`.

Remove `applyGlobalShell` and `applyDirectoryTarget`. Replace with `applySpace(spaceId: string): Promise<{ success: boolean }>`.

**Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 5: Commit**

```bash
git add src/shared/models.ts src/shared/ipc.ts
git commit -m "feat: update models for dotfile-only spaces + inject/launch types"
```

---

### Task 2: Refactor store.ts — space model

**Files:**
- Modify: `src/main/store.ts`

**Step 1: Remove `GLOBAL_SPACE_ID` constant and `ensureGlobalSpace`, `createDefaultGlobalSpace`, `createDefaultGlobalTarget`**

Delete lines referencing `GLOBAL_SPACE_ID = 'space-global'` and all helper functions that create it.

**Step 2: Add migration at top of constructor**

In `constructor()` or `loadFromDisk()`, scan existing spaces:
- If `kind === 'global'` → set `kind: 'dotfile'`, `dotfilePath: '~/.zshrc'`
- If `kind === 'directory'` → set `kind: 'dotfile'`, `dotfilePath: '~/.zshrc'`
- If `path` exists → rename to `dotfilePath` (for old onboarding spaces that have path set to dirname)

**Step 3: Update `createSpace`**

```ts
createSpace(params: { name: string; dotfilePath: string }): EnvSpace {
  const now = new Date().toISOString()
  const space: EnvSpace = {
    id: generateId(),
    name: params.name,
    kind: 'dotfile',
    dotfilePath: params.dotfilePath,
    expanded: true,
    tiedSecrets: true,
    updatedAt: now,
  }
  // ... existing push + create default target logic
}
```

**Step 4: Update `listSpaces` — no changes needed (just reads db.spaces)**

**Step 5: Update `deleteSpace` — no logic changes, cascading delete still works**

**Step 6: Remove `applyDirectoryTarget` entirely**

Delete method. Its apply logic moves to `applySpace`.

**Step 7: Update `applyGlobalShell` → rename to `applySpace`**

Signature: `applySpace(spaceId: string): Promise<void>`

Logic:
```ts
applySpace(spaceId: string): Promise<void> {
  const space = db.spaces.find(s => s.id === spaceId)
  if (!space) throw new Error(`Space not found: ${spaceId}`)

  const targets = db.targets.filter(t => t.spaceId === spaceId)
  const activeTarget = targets.find(t => t.isActive) ?? targets[0]
  if (!activeTarget) return // no targets → nothing to apply

  const envs = db.envs.filter(e => e.profile === activeTarget.id && e.enabled)
  const entries: EnvEntry[] = envs.map(e => ({
    name: e.name,
    value: this.secretStore.get(`${activeTarget.id}:${e.name}`) ?? '',
  }))

  const block = buildManagedShellBlock(entries)
  const dotfilePath = space.dotfilePath.replace(/^~/, os.homedir())
  let content = fs.readFileSync(dotfilePath, 'utf-8')
  content = upsertManagedShellBlock(content, block)
  fs.writeFileSync(dotfilePath, content, 'utf-8')
}
```

**Step 8: Update `toggleSpaceTiedSecrets` — no logic changes**

**Step 9: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 10: Commit**

```bash
git add src/main/store.ts
git commit -m "refactor: space model to dotfile-only, kill global/directory, simplify apply"
```

---

### Task 3: Refactor envWriters.ts

**Files:**
- Modify: `src/main/envWriters.ts`

**Step 1: Remove `buildDotenvContent` function**

Delete the function. Dotenv format is no longer needed (no directory spaces).

**Step 2: Export only `buildManagedShellBlock` and `upsertManagedShellBlock`**

Update exports to remove `buildDotenvContent`.

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile (store.ts no longer imports `buildDotenvContent`)

**Step 4: Update tests**

In `envWriters.test.ts`, remove dotenv tests or convert them to shell block tests.

**Step 5: Commit**

```bash
git add src/main/envWriters.ts src/main/envWriters.test.ts
git commit -m "refactor: remove dotenv writer, spaces no longer write .env files"
```

---

### Task 4: Refactor onboarding

**Files:**
- Modify: `src/main/onboardingImporter.ts`
- Modify: `src/main/onboardingScanner.ts`

**Step 1: Update `onboardingImporter.ts`**

In `runFreshStartImport`:
- Change `store.createSpace({ name: basename(filePath), path: dirname(filePath) })` to `store.createSpace({ name: basename(filePath), dotfilePath: filePath })`
- The space points directly to the dotfile it was created from, not the parent directory

In `runRetroactiveImport`:
- Same change: pass `dotfilePath: filePath` instead of `path: dirname(filePath)`

**Step 2: No changes needed in `onboardingScanner.ts`**

Scanner just reads files and returns ScannedVariable[]. No space model dependency.

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 4: Fix tests**

Update test expectations for new space creation signature.

Old test: `createSpace({ name: 'myenv', path: '/home/user' })`
New test: `createSpace({ name: 'myenv', dotfilePath: '/home/user/.env' })`

**Step 5: Commit**

```bash
git add src/main/onboardingImporter.ts
git commit -m "refactor: onboarding creates dotfile spaces, not directory spaces"
```

---

### Task 5: Refactor IPC handlers in index.ts

**Files:**
- Modify: `src/main/index.ts`

**Step 1: Remove old apply channels**

Remove handlers for `apply:global-shell` and `apply:directory-target`.

Add new handler: `apply:space` → calls `store.applySpace(spaceId)`.

**Step 2: Update `system:pick-directory` → make it `system:pick-dotfile`**

If `system:pick-directory` still exists, remove it. Keep `system:pick-dotfile` which uses `dialog.showOpenDialog` with `properties: ['openFile']` and filters for dotfiles.

**Step 3: Update `spaces:create` handler**

Old: receives `{ name, path }`
New: receives `{ name, dotfilePath }`

**Step 4: Add inject + launch IPC handlers**

```ts
ipcMain.handle('inject:activate', async (_, payload: { targetId: string; dotfilePath: string }) => {
  try {
    await envInjector.activate(payload.targetId, payload.dotfilePath)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('inject:deactivate', async (_, payload: { targetId: string; dotfilePath: string }) => {
  try {
    await envInjector.deactivate(payload.targetId, payload.dotfilePath)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('inject:status', async (_, payload: { targetId: string }) => {
  return { active: envInjector.isActive(payload.targetId) }
})

ipcMain.handle('inject:list-active', async () => {
  return { activeTargetIds: envInjector.listActive() }
})

ipcMain.handle('launch:terminal', async (_, payload: { targetId: string; terminalApp: string }) => {
  try {
    await terminalLauncher.launch(payload.targetId, payload.terminalApp)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('launch:list-terminals', async () => {
  return { terminals: terminalLauncher.listTerminals() }
})
```

**Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 6: Commit**

```bash
git add src/main/index.ts
git commit -m "refactor: update IPC handlers for dotfile model + inject/launch channels"
```

---

### Task 6: Update preload bridge

**Files:**
- Modify: `src/preload/index.ts`

**Step 1: Update API to match new BroverAPI**

Add bridge methods:
```ts
inject: {
  activate: (targetId, dotfilePath) => ipcRenderer.invoke('inject:activate', { targetId, dotfilePath }),
  deactivate: (targetId, dotfilePath) => ipcRenderer.invoke('inject:deactivate', { targetId, dotfilePath }),
  status: (targetId) => ipcRenderer.invoke('inject:status', { targetId }),
  listActive: () => ipcRenderer.invoke('inject:list-active'),
},
launch: {
  terminal: (targetId, terminalApp) => ipcRenderer.invoke('launch:terminal', { targetId, terminalApp }),
  listTerminals: () => ipcRenderer.invoke('launch:list-terminals'),
},
```

Remove `apply:global-shell` and `apply:directory-target` bindings. Add `apply:space`.

Update `spaces:create` to pass `dotfilePath` instead of `path`.

Remove `system:pick-directory`.

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 3: Commit**

```bash
git add src/preload/index.ts
git commit -m "refactor: preload bridge for dotfile model + inject/launch API"
```

---

### Task 7: Create envInjector module

**Files:**
- Create: `src/main/envInjector.ts`
- Create: `src/main/envInjector.test.ts`

**Step 1: Write tests first (TDD)**

```ts
// envInjector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createEnvInjector } from './envInjector'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('envInjector', () => {
  let injector: ReturnType<typeof createEnvInjector>
  let cacheDir: string
  let dotfilePath: string

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'brover-cache-'))
    dotfilePath = join(cacheDir, '.zshrc')
    writeFileSync(dotfilePath, '# existing content\n', 'utf-8')
    injector = createEnvInjector({ cacheDir })
  })

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true })
  })

  it('activate creates cache file with env vars', async () => {
    await injector.activate('target-1', dotfilePath, [
      { name: 'FOO', value: 'bar' },
      { name: 'BAZ', value: 'qux' },
    ])
    const cacheContent = readFileSync(join(cacheDir, 'target-1.sh'), 'utf-8')
    expect(cacheContent).toContain("export FOO='bar'")
    expect(cacheContent).toContain("export BAZ='qux'")
  })

  it('activate adds source line to dotfile', async () => {
    await injector.activate('target-1', dotfilePath, [
      { name: 'FOO', value: 'bar' },
    ])
    const dotfileContent = readFileSync(dotfilePath, 'utf-8')
    expect(dotfileContent).toContain('# >>> BROVER CACHE >>>')
    expect(dotfileContent).toContain(`# <<< BROVER CACHE <<<`)
    expect(dotfileContent).toContain('.cache/target-1.sh"')
  })

  it('deactivate removes cache file and source line', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.activate('target-2', dotfilePath, [{ name: 'BAR', value: 'baz' }])
    await injector.deactivate('target-1', dotfilePath)
    expect(existsSync(join(cacheDir, 'target-1.sh'))).toBe(false)
    const dotfileContent = readFileSync(dotfilePath, 'utf-8')
    expect(dotfileContent).not.toContain('target-1')
    expect(dotfileContent).toContain('target-2') // other line preserved
  })

  it('startupCleanup removes all caches and dotfile block', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    injector.startupCleanup(dotfilePath)
    expect(existsSync(join(cacheDir, 'target-1.sh'))).toBe(false)
    const dotfileContent = readFileSync(dotfilePath, 'utf-8')
    expect(dotfileContent).not.toContain('BROVER CACHE')
  })

  it('isActive returns true when cache exists', async () => {
    expect(injector.isActive('target-1')).toBe(false)
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    expect(injector.isActive('target-1')).toBe(true)
  })

  it('deactivate on inactive target is no-op', async () => {
    await injector.deactivate('target-nonexistent', dotfilePath)
    // no error thrown
  })

  it('conditional line has no error if cache file deleted', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    rmSync(join(cacheDir, 'target-1.sh'))
    // sourcing the dotfile should not error — [ -f ... ] guard
    const dotfile = readFileSync(dotfilePath, 'utf-8')
    expect(dotfile).toContain('[ -f ')
  })
})
```

**Step 2: Run failing tests**

Run: `npx vitest run src/main/envInjector.test.ts`
Expected: All fail (module not found)

**Step 3: Write minimal implementation**

```ts
// envInjector.ts
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

const CACHE_DIR_NAME = 'env-cache'
const BEGIN_MARKER = '# >>> BROVER CACHE >>>'
const END_MARKER = '# <<< BROVER CACHE <<<'

export interface EnvEntry {
  name: string
  value: string
}

export function createEnvInjector(opts?: { cacheDir?: string }) {
  const cacheDir = opts?.cacheDir ?? join(homedir(), 'Library', 'Application Support', 'brover', CACHE_DIR_NAME)

  function ensureCacheDir() {
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 })
  }

  function cacheFilePath(targetId: string): string {
    return join(cacheDir, `${targetId}.sh`)
  }

  function escapeShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
  }

  function buildCacheContent(targetId: string, entries: EnvEntry[]): string {
    const lines = entries.map(e => `export ${e.name}=${escapeShellValue(e.value)}`)
    return `# Brover envs — target: ${targetId}\n${lines.join('\n')}\n`
  }

  function parseDotfileBlock(content: string): { preamble: string; lines: string[]; postamble: string } | null {
    const startIdx = content.indexOf(BEGIN_MARKER)
    const endIdx = content.indexOf(END_MARKER)
    if (startIdx === -1 || endIdx === -1) return null
    return {
      preamble: content.slice(0, startIdx),
      lines: content.slice(startIdx + BEGIN_MARKER.length, endIdx).trim().split('\n').filter(Boolean),
      postamble: content.slice(endIdx + END_MARKER.length),
    }
  }

  function addSourceLine(dotfilePath: string, targetId: string) {
    let content = existsSync(dotfilePath) ? readFileSync(dotfilePath, 'utf-8') : ''
    const resolvedPath = dotfilePath.replace(/^~/, homedir())
    const line = `[ -f ${cacheFilePath(targetId)} ] && source ${cacheFilePath(targetId)}`

    const block = parseDotfileBlock(content)
    if (block) {
      // Add to existing block if not already present
      if (!block.lines.some(l => l.includes(targetId))) {
        block.lines.push(line)
      }
      content = block.preamble + BEGIN_MARKER + '\n' + block.lines.join('\n') + '\n' + END_MARKER + block.postamble
    } else {
      // Create new block
      content = content.trimEnd() + '\n\n' + BEGIN_MARKER + '\n' + line + '\n' + END_MARKER + '\n'
    }
    writeFileSync(resolvedPath, content, { mode: 0o644 })
  }

  function removeSourceLine(dotfilePath: string, targetId: string) {
    if (!existsSync(dotfilePath)) return
    const content = readFileSync(dotfilePath, 'utf-8')
    const block = parseDotfileBlock(content)
    if (!block) return

    const filtered = block.lines.filter(l => !l.includes(targetId))
    if (filtered.length === 0) {
      // Remove entire block
      const newContent = block.preamble.trimEnd() + '\n' + block.postamble.trimStart()
      writeFileSync(dotfilePath, newContent, { mode: 0o644 })
    } else {
      const newContent = block.preamble + BEGIN_MARKER + '\n' + filtered.join('\n') + '\n' + END_MARKER + block.postamble
      writeFileSync(dotfilePath, newContent, { mode: 0o644 })
    }
  }

  return {
    async activate(targetId: string, dotfilePath: string, entries: EnvEntry[]): Promise<void> {
      ensureCacheDir()
      const cacheContent = buildCacheContent(targetId, entries)
      writeFileSync(cacheFilePath(targetId), cacheContent, { mode: 0o600 })
      addSourceLine(dotfilePath, targetId)
    },

    async deactivate(targetId: string, dotfilePath: string): Promise<void> {
      const cachePath = cacheFilePath(targetId)
      if (existsSync(cachePath)) unlinkSync(cachePath)
      removeSourceLine(dotfilePath, targetId)
    },

    isActive(targetId: string): boolean {
      return existsSync(cacheFilePath(targetId))
    },

    listActive(): string[] {
      if (!existsSync(cacheDir)) return []
      return readdirSync(cacheDir).filter(f => f.endsWith('.sh')).map(f => f.replace('.sh', ''))
    },

    startupCleanup(dotfilePath?: string): void {
      // Delete all cache files
      if (existsSync(cacheDir)) {
        const files = readdirSync(cacheDir).filter(f => f.endsWith('.sh'))
        files.forEach(f => unlinkSync(join(cacheDir, f)))
      }
      // Remove dotfile block if path provided
      if (dotfilePath && existsSync(dotfilePath)) {
        removeSourceLine(dotfilePath, '*') // remove all lines
        const content = readFileSync(dotfilePath, 'utf-8')
        const result = content.replace(new RegExp(`\n*${BEGIN_MARKER}.*?\n${END_MARKER}`, 's'), '')
        if (result !== content) writeFileSync(dotfilePath, result, { mode: 0o644 })
      }
    },
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/main/envInjector.test.ts`
Expected: All pass

**Step 5: Add envInjector to store startup**

In `store.ts` constructor, after loading DB, call:
```ts
this.envInjector = createEnvInjector()
// Clean up any stale caches on startup
const globalDotfile = db.spaces.find(s => s.id === 'space-global')?.dotfilePath
this.envInjector.startupCleanup(globalDotfile ? globalDotfile.replace(/^~/, homedir()) : undefined)
```

**Step 6: Commit**

```bash
git add src/main/envInjector.ts src/main/envInjector.test.ts src/main/store.ts
git commit -m "feat: add envInjector module for cache file + dotfile source management"
```

---

### Task 8: Create terminalLauncher module

**Files:**
- Create: `src/main/terminalLauncher.ts`
- Create: `src/main/terminalLauncher.test.ts`

**Step 1: Write tests**

```ts
// terminalLauncher.test.ts
import { describe, it, expect } from 'vitest'
import { createTerminalLauncher } from './terminalLauncher'

describe('terminalLauncher', () => {
  const launcher = createTerminalLauncher()

  it('listTerminals includes terminal.app', () => {
    const terminals = launcher.listTerminals()
    expect(terminals.some(t => t.id === 'terminal')).toBe(true)
  })

  it('listTerminals returns TerminalApp objects with correct shape', () => {
    const terminals = launcher.listTerminals()
    terminals.forEach(t => {
      expect(t).toHaveProperty('id')
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('bundlePath')
      expect(t).toHaveProperty('installed')
    })
  })

  it('launch throws on empty envs', async () => {
    await expect(launcher.launch('target-1', 'terminal', []))
      .rejects.toThrow('No enabled envs')
  })

  it('launch creates .command file with env vars', async () => {
    const envs = [{ name: 'FOO', value: 'bar' }]
    const result = await launcher.launch('target-1', 'terminal', envs)
    expect(result).toHaveProperty('commandPath')
    expect(result.success).toBe(true)
  })
})
```

**Step 2: Run failing tests**

Run: `npx vitest run src/main/terminalLauncher.test.ts`
Expected: All fail

**Step 3: Write implementation**

```ts
// terminalLauncher.ts
import { writeFileSync, chmodSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

export interface EnvEntry {
  name: string
  value: string
}

export interface TerminalApp {
  id: string
  name: string
  bundlePath: string
  installed: boolean
}

const TERMINAL_APPS: Omit<TerminalApp, 'installed'>[] = [
  { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
  { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
  { id: 'terminal', name: 'Terminal', bundlePath: '/System/Applications/Utilities/Terminal.app' },
]

export function createTerminalLauncher() {
  function listTerminals(): TerminalApp[] {
    return TERMINAL_APPS.map(app => ({
      ...app,
      installed: app.id === 'terminal' || existsSync(app.bundlePath),
    }))
  }

  function escapeShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
  }

  function buildCommandContent(targetId: string, entries: EnvEntry[]): string {
    const exports = entries.map(e => `export ${e.name}=${escapeShellValue(e.value)}`).join('\n')
    return `#!/bin/bash\n# Brover envs — target: ${targetId}\n${exports}\necho "Brover — target '${targetId}' active"\nexec $SHELL\n`
  }

  async function launch(targetId: string, terminalAppId: string, entries: EnvEntry[]): Promise<{ success: boolean; commandPath?: string }> {
    if (entries.length === 0) throw new Error('No enabled envs')

    const randomSuffix = randomBytes(3).toString('hex')
    const commandPath = join(tmpdir(), `brover-${targetId}-${randomSuffix}.command`)

    const content = buildCommandContent(targetId, entries)
    writeFileSync(commandPath, content, { mode: 0o755 })

    // Open with terminal app
    const terminal = TERMINAL_APPS.find(t => t.id === terminalAppId) ?? TERMINAL_APPS[2]
    execSync(`open -a "${terminal.name}" "${commandPath}"`, { timeout: 5000 })

    return { success: true, commandPath }
  }

  return { listTerminals, launch }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/main/terminalLauncher.test.ts`
Expected: All pass (launch test may skip open in CI)

**Step 5: Commit**

```bash
git add src/main/terminalLauncher.ts src/main/terminalLauncher.test.ts
git commit -m "feat: add terminalLauncher module for .command file + spawning terminal"
```

---

### Task 9: Update renderer SpacesSidebar

**Files:**
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.tsx`
- Modify: `src/renderer/src/App.tsx`

**Step 1: Merge `shellSpaces` and `dirSpaces` into `spaces`**

In `App.tsx`, remove the split between shellSpaces and dirSpaces. All spaces are now the same kind.

```tsx
const spaces = data?.spaces ?? []
```

Pass single `spaces` prop to `SpacesSidebar`.

**Step 2: Update SpacesSidebar props**

```tsx
interface SpacesSidebarProps {
  spaces: EnvSpace[]
  targetsBySpace: Map<string, EnvTarget[]>
  selectedTargetId: string | null
  onSelectTarget: (targetId: string) => void
  onAddSpace: () => void
  onRenameSpace: (spaceId: string, name: string) => void
  onDeleteSpace: (spaceId: string) => void
  onToggleTiedSecrets: (spaceId: string) => void
  onRenameTarget: (targetId: string, name: string) => void
  onDeleteTarget: (targetId: string) => void
  onReorderTargets: (spaceId: string, targetIds: string[]) => void
  onSetTargetColor: (targetId: string, color: string) => void
  onSetActiveTarget: (targetId: string) => void
  selectedSpace: EnvSpace | null
  onSelectSpace: (spaceId: string) => void
}
```

**Step 3: Update "Add space" button**

Old: dropdown with "Import directory" / "Import dotfile"
New: single "Import dotfile" option → calls `window.brover.system.pickDotfile()` → `window.brover.spaces.create({ name, dotfilePath })`

**Step 4: Add TargetActions component**

New file `src/renderer/src/features/targets/TargetActions.tsx`:

```tsx
import { memo, useState, useEffect, useCallback } from 'react'
import { Button } from '../../components/ui/button'

interface TargetActionsProps {
  targetId: string | null
  dotfilePath: string
  onInject: (targetId: string) => void
  onEject: (targetId: string) => void
  onLaunch: (targetId: string, terminalApp: string) => void
}

export const TargetActions = memo(function TargetActions({
  targetId,
  dotfilePath,
  onInject,
  onEject,
  onLaunch,
}: TargetActionsProps) {
  const [isActive, setIsActive] = useState(false)
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState('terminal')

  useEffect(() => {
    if (!targetId) return
    window.brover.inject.status(targetId).then(({ active }) => setIsActive(active))
    window.brover.launch.listTerminals().then(({ terminals }) => {
      const installed = terminals.filter(t => t.installed)
      setTerminals(installed)
    })
    const stored = localStorage.getItem('brover-terminal-app')
    if (stored) setSelectedTerminal(stored)
  }, [targetId])

  const handleInjectToggle = useCallback(() => {
    if (!targetId) return
    if (isActive) {
      onEject(targetId)
      setIsActive(false)
    } else {
      onInject(targetId)
      setIsActive(true)
    }
  }, [targetId, isActive, onInject, onEject])

  const handleLaunch = useCallback(() => {
    if (!targetId) return
    onLaunch(targetId, selectedTerminal)
  }, [targetId, selectedTerminal, onLaunch])

  const handleTerminalChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedTerminal(val)
    localStorage.setItem('brover-terminal-app', val)
  }, [])

  if (!targetId) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
      <Button
        onClick={handleInjectToggle}
        variant={isActive ? 'destructive' : 'default'}
        size="sm"
      >
        {isActive ? 'Eject' : 'Inject'}
      </Button>
      <div className="flex items-center gap-1">
        <Button onClick={handleLaunch} size="sm">
          Launch
        </Button>
        <select
          value={selectedTerminal}
          onChange={handleTerminalChange}
          className="text-xs bg-transparent border border-white/10 rounded px-1 py-0.5"
        >
          {terminals.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
})
```

**Step 5: Wire TargetActions in SpacesSidebar**

Below the targets list, render:
```tsx
<TargetActions
  targetId={selectedTargetId}
  dotfilePath={selectedSpace?.dotfilePath ?? ''}
  onInject={(targetId) => window.brover.inject.activate(targetId, selectedSpace!.dotfilePath)}
  onEject={(targetId) => window.brover.inject.deactivate(targetId, selectedSpace!.dotfilePath)}
  onLaunch={(targetId, terminalApp) => window.brover.launch.terminal(targetId, terminalApp)}
/>
```

**Step 6: Wire callbacks in App.tsx**

Add handlers for inject/launch that call window.brover API methods and show toasts on success/error.

**Step 7: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 8: Commit**

```bash
git add src/renderer/src/features/targets/TargetActions.tsx src/renderer/src/features/spaces/SpacesSidebar.tsx src/renderer/src/App.tsx
git commit -m "feat: add TargetActions UI for Inject/Eject/Launch per target"
```

---

### Task 10: Update UI create space + pick dotfile

**Files:**
- Modify: `src/renderer/src/features/spaces/SpacesSidebar.tsx`
- Modify: `src/renderer/src/App.tsx`

**Step 1: Update "Add space" flow**

Old: dropdown with "Import directory" / "Import dotfile"
New: "Add dotfile space" button → calls `window.brover.system.pickDotfile()` → prompts for name → calls `window.brover.spaces.create({ name, dotfilePath })`

```tsx
const handleAddSpace = useCallback(async () => {
  const result = await window.brover.system.pickDotfile()
  if (!result.canceled && result.filePath) {
    const name = result.filePath.split('/').pop() ?? 'env'
    await window.brover.spaces.create({ name, dotfilePath: result.filePath })
    await refreshAll()
  }
}, [refreshAll])
```

**Step 2: Show dotfile path in sidebar**

Next to space name, show `~/.zshrc` etc:
```tsx
<span className="text-[10px] text-white/40 truncate">
  {space.dotfilePath.replace(homedir, '~')}
</span>
```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 4: Commit**

```bash
git add src/renderer/src/features/spaces/SpacesSidebar.tsx src/renderer/src/App.tsx
git commit -m "feat: update create space UI for dotfile-only model, show dotfile path"
```

---

### Task 11: Store migration — migrate existing config on startup

**Files:**
- Modify: `src/main/store.ts`

**Step 1: Add migration method**

In `Store` class, add `migrateSpaceModel()` called at end of constructor:

```ts
private migrateSpaceModel() {
  let changed = false
  this.db.spaces = this.db.spaces.map(space => {
    if (space.kind === 'global') {
      changed = true
      return {
        ...space,
        kind: 'dotfile' as const,
        dotfilePath: space.path ?? '~/.zshrc',
      }
    }
    if (space.kind === 'directory') {
      changed = true
      return {
        ...space,
        kind: 'dotfile' as const,
        dotfilePath: '~/.zshrc',
      }
    }
    // If path is set but kind isn't migrated yet
    if ('path' in space && !space.dotfilePath) {
      changed = true
      return {
        ...space,
        dotfilePath: space.path ?? '~/.zshrc',
      }
    }
    return space
  })
  if (changed) this.persist()
}
```

**Step 2: Update getSpaceBadge or equivalent in renderer**

Remove any `kind === 'global'` special cases. All spaces just show `kind === 'dotfile'`.

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 4: Commit**

```bash
git add src/main/store.ts
git commit -m "feat: migrate existing spaces to dotfile model on startup"
```

---

### Task 12: Test all together

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean compile

**Step 2: Run all unit tests**

Run: `npx vitest run`
Expected: All pass (fix any failures)

**Step 3: Run lint**

Run: `npm run lint`
Expected: Clean

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint and test issues after space model refactor"
```

---

### Task 13: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

Update architecture description:
- Space model: `kind: 'dotfile'`, `dotfilePath` instead of `kind: 'global' | 'directory'`
- Add `envInjector` and `terminalLauncher` to module list
- Add inject + launch IPC channels
- Remove directory space and global space documentation
- Remove `.env.<target>` apply documentation, keep shell block apply

Commit:
```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for dotfile-only space model + inject/launch"
```
