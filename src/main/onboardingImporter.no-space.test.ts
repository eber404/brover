import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BroverStore, MemorySecretStore } from './store'
import { runRetroactiveImport } from './onboardingImporter'
import type { ScanResult, RetroactiveSelection } from '../shared/models'

describe('onboardingImporter skip environment', () => {
  it('does not create environment for file with zero selected secrets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-import-skip-'))
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const filePath = join(root, '.env')
    await writeFile(filePath, 'PUBLIC=visible\n', 'utf8')

    const scanResult: ScanResult = {
      files: [{
        filePath,
        variables: [
          { id: 'v1', name: 'PUBLIC', value: 'visible', sourceFile: filePath },
        ],
      }],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: [] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary.importedSensitive).toBe(0)
    expect(summary.ignoredNonSensitive).toBe(1)

    const environments = await store.listEnvironments()
    expect(environments).toHaveLength(0)
  })

  it('creates environment only for files with selected secrets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'brover-import-partial-'))
    const dbPath = join(root, 'config.json')
    const store = new BroverStore(dbPath, new MemorySecretStore())

    const fileSensitive = join(root, '.env')
    const fileSkipped = join(root, '.bashrc')
    await writeFile(fileSensitive, 'SECRET=hidden\n', 'utf8')
    await writeFile(fileSkipped, 'PUBLIC=visible\n', 'utf8')

    const scanResult: ScanResult = {
      files: [
        {
          filePath: fileSensitive,
          variables: [
            { id: 'v1', name: 'SECRET', value: 'hidden', sourceFile: fileSensitive },
          ],
        },
        {
          filePath: fileSkipped,
          variables: [
            { id: 'v2', name: 'PUBLIC', value: 'visible', sourceFile: fileSkipped },
          ],
        },
      ],
      warnings: [],
    }
    const selection: RetroactiveSelection = { selectedSensitiveIds: ['v1'] }

    const summary = await runRetroactiveImport(store, scanResult, selection)
    expect(summary.importedSensitive).toBe(1)
    expect(summary.ignoredNonSensitive).toBe(1)

    const environments = await store.listEnvironments()
    expect(environments).toHaveLength(1)
    expect(environments[0]?.name).toBe('.env')
  })
})
