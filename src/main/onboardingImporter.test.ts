import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BroverStore, MemorySecretStore } from './store'
import type { ScanResult, RetroactiveSelection } from '../shared/models'
import { runRetroactiveImport } from './onboardingImporter'

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'brover-importer-'))
}

describe('runRetroactiveImport', () => {
  it('creates spaces from dotfiles', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'SECRET=supersecret\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [{ id: 'v1', name: 'SECRET', value: 'supersecret', sourceFile: filePath }],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary.importedSensitive).toBe(1)

    const spaces = await store.listSpaces()
    const space = spaces.find(s => s.name === '.env')
    expect(space).toBeDefined()
    expect(space!.path).toBe(root)

    const targets = await store.listTargets(space!.id)
    expect(targets).toHaveLength(1)
    expect(targets[0].name).toBe('dev')
  })

  it('writes sensitive values to SecretStore', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'API_KEY=abc123\nDB_URL=postgres://db\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [
          { id: 'v1', name: 'API_KEY', value: 'abc123', sourceFile: filePath },
          { id: 'v2', name: 'DB_URL', value: 'postgres://db', sourceFile: filePath },
        ],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1', 'v2'] }

    await runRetroactiveImport(store, scanResult, selection)

    const spaces = await store.listSpaces()
    const space = spaces.find(s => s.name === '.env')!
    const targets = await store.listTargets(space.id)
    const target = targets[0]

    const apiKey = await store.revealEnv(target.id, 'API_KEY')
    expect(apiKey).toBe('abc123')

    const dbUrl = await store.revealEnv(target.id, 'DB_URL')
    expect(dbUrl).toBe('postgres://db')
  })

  it('removes sensitive lines from source dotfiles', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'API_KEY=abc123\n# comment\nUSER=me\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [
          { id: 'v1', name: 'API_KEY', value: 'abc123', sourceFile: filePath },
          { id: 'v2', name: 'USER', value: 'me', sourceFile: filePath },
        ],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    await runRetroactiveImport(store, scanResult, selection)

    const content = await readFile(filePath, 'utf8')
    expect(content).not.toContain('API_KEY=abc123')
    expect(content).toContain('# comment')
    expect(content).toContain('USER=me')
  })

  it('ignores non-sensitive vars', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'SECRET=hidden\nPUBLIC=visible\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [
          { id: 'v1', name: 'SECRET', value: 'hidden', sourceFile: filePath },
          { id: 'v2', name: 'PUBLIC', value: 'visible', sourceFile: filePath },
        ],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary.importedSensitive).toBe(1)
    expect(summary.ignoredNonSensitive).toBe(1)

    const spaces = await store.listSpaces()
    const space = spaces.find(s => s.name === '.env')!
    const targets = await store.listTargets(space.id)
    const target = targets[0]

    const revealed = await store.revealEnv(target.id, 'PUBLIC')
    expect(revealed).toBeNull()
  })

  it('keeps duplicate names as separate spaces', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const dir1 = await tempDir()
    const dir2 = await tempDir()
    const file1 = join(dir1, '.zshrc')
    const file2 = join(dir2, '.bashrc')

    await writeFile(file1, 'TOKEN=secret1\n', 'utf8')
    await writeFile(file2, 'TOKEN=secret2\n', 'utf8')

    const scanResult: ScanResult = {
      files: [
        {
          filePath: file1,
          variables: [{ id: 'v1', name: 'TOKEN', value: 'secret1', sourceFile: file1 }],
        },
        {
          filePath: file2,
          variables: [{ id: 'v2', name: 'TOKEN', value: 'secret2', sourceFile: file2 }],
        },
      ],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1', 'v2'] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary.importedSensitive).toBe(2)

    const spaces = await store.listSpaces()
    const directorySpaces = spaces.filter(s => s.kind === 'directory')
    expect(directorySpaces).toHaveLength(2)

    const zshrcSpace = directorySpaces.find(s => s.name === '.zshrc')!
    const bashrcSpace = directorySpaces.find(s => s.name === '.bashrc')!

    const zshrcTargets = await store.listTargets(zshrcSpace.id)
    const bashrcTargets = await store.listTargets(bashrcSpace.id)

    const zshValue = await store.revealEnv(zshrcTargets[0].id, 'TOKEN')
    expect(zshValue).toBe('secret1')

    const bashValue = await store.revealEnv(bashrcTargets[0].id, 'TOKEN')
    expect(bashValue).toBe('secret2')
  })

  it('fails on Keychain write error', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')

    class ThrowingSecretStore extends MemorySecretStore {
      override async save(): Promise<void> {
        throw new Error('Keychain unavailable')
      }
    }

    const store = new BroverStore(dbPath, new ThrowingSecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'SECRET=value\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [{ id: 'v1', name: 'SECRET', value: 'value', sourceFile: filePath }],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    await expect(runRetroactiveImport(store, scanResult, selection)).rejects.toThrow()

    const status = await store.getOnboardingStatus()
    expect(status.completedAt).toBeUndefined()
  })

  it('returns correct OnboardingSummary counts', async () => {
    const root = await tempDir()
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'SECRET=hidden\nPUBLIC=visible\nOTHER=stuff\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [
          { id: 'v1', name: 'SECRET', value: 'hidden', sourceFile: filePath },
          { id: 'v2', name: 'PUBLIC', value: 'visible', sourceFile: filePath },
          { id: 'v3', name: 'OTHER', value: 'stuff', sourceFile: filePath },
        ],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary).toEqual({
      importedSensitive: 1,
      removedFromDotfiles: 1,
      ignoredNonSensitive: 2,
      ignoredWithReason: [],
    })
  })
})
