import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Space Operations Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-space-'))
    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
        BROVER_DB_PATH: join(dbDir, 'config.json'),
      },
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
    rmSync(dbDir, { recursive: true, force: true })
  })

  test('rename space', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const spaceName = `pw-space-${Date.now()}`
    const renamed = `${spaceName}-renamed`

    const result = await window.evaluate(
      async ({ spaceName, renamed }) => {
        const spaces = await window.brover.createSpace({
          name: spaceName,
          path: `/tmp/${spaceName}`,
        })
        const created = spaces.find((item) => item.name === spaceName)
        if (!created) throw new Error('Failed to create space')

        const updated = await window.brover.renameSpace({
          spaceId: created.id,
          name: renamed,
        })
        const afterRename = updated.find((item) => item.id === created.id)

        return {
          originalName: spaceName,
          renamedName: afterRename?.name,
        }
      },
      { spaceName, renamed }
    )

    expect(result.originalName).toBe(spaceName)
    expect(result.renamedName).toBe(renamed)
  })

  test('toggle space tied secrets', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const spaceName = `pw-space-${Date.now()}`

    const result = await window.evaluate(
      async ({ spaceName }) => {
        const spaces = await window.brover.createSpace({
          name: spaceName,
          path: `/tmp/${spaceName}`,
        })
        const created = spaces.find((item) => item.name === spaceName)
        if (!created) throw new Error('Failed to create space')

        const initialTied = created.tiedSecrets

        const toggled = await window.brover.toggleSpaceTiedSecrets(created.id)
        const afterToggle = toggled.find((item) => item.id === created.id)

        const toggledAgain = await window.brover.toggleSpaceTiedSecrets(created.id)
        const afterToggleAgain = toggledAgain.find((item) => item.id === created.id)

        return {
          initialTied,
          afterToggleTied: afterToggle?.tiedSecrets,
          afterToggleAgainTied: afterToggleAgain?.tiedSecrets,
        }
      },
      { spaceName }
    )

    expect(result.initialTied).toBe(true)
    expect(result.afterToggleTied).toBe(false)
    expect(result.afterToggleAgainTied).toBe(true)
  })

  test('toggle space expanded', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const spaceName = `pw-space-${Date.now()}`

    const result = await window.evaluate(
      async ({ spaceName }) => {
        const spaces = await window.brover.createSpace({
          name: spaceName,
          path: `/tmp/${spaceName}`,
        })
        const created = spaces.find((item) => item.name === spaceName)
        if (!created) throw new Error('Failed to create space')

        const initialExpanded = created.expanded

        const toggled = await window.brover.toggleSpaceExpanded(created.id)
        const afterToggle = toggled.find((item) => item.id === created.id)

        return {
          initialExpanded,
          afterToggleExpanded: afterToggle?.expanded,
        }
      },
      { spaceName }
    )

    expect(result.initialExpanded).toBe(true)
    expect(result.afterToggleExpanded).toBe(false)
  })

  test('renameSpace rejects empty name', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const spaceName = `pw-space-${Date.now()}`

    const result = await window.evaluate(async ({ spaceName }) => {
      const spaces = await window.brover.createSpace({
        name: spaceName,
        path: `/tmp/${spaceName}`,
      })
      const created = spaces.find((item) => item.name === spaceName)
      if (!created) throw new Error('Failed to create space')

      try {
        await window.brover.renameSpace({
          spaceId: created.id,
          name: '   ',
        })
        return { success: false }
      } catch (e) {
        return { success: true, error: (e as Error).message }
      }
    }, { spaceName })

    expect(result.success).toBe(true)
  })
})
