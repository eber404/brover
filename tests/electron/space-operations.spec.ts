import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Target Scope Operations Flow', () => {
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

  test('rename target', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const targetName = `pw-target-${Date.now()}`
    const renamed = `${targetName}-renamed`

    const result = await window.evaluate(
      async ({ targetName, renamed }) => {
        const targets = await window.brover.createTarget({ name: targetName })
        const created = targets.find((item) => item.name === targetName)
        if (!created) throw new Error('Failed to create target')

        const updated = await window.brover.renameTarget({
          targetId: created.id,
          name: renamed,
        })
        const afterRename = updated.find((item) => item.id === created.id)

        return {
          originalName: targetName,
          renamedName: afterRename?.name,
        }
      },
      { targetName, renamed }
    )

    expect(result.originalName).toBe(targetName)
    expect(result.renamedName).toBe(renamed)
  })

  test('toggle tied targets', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const result = await window.evaluate(async () => {
        const initialTied = await window.brover.getTiedTargets()
        const afterToggle = await window.brover.setTiedTargets(!initialTied)
        const afterToggleAgain = await window.brover.setTiedTargets(initialTied)

        return {
          initialTied,
          afterToggleTied: afterToggle,
          afterToggleAgainTied: afterToggleAgain,
        }
      })

    expect(result.initialTied).toBe(true)
    expect(result.afterToggleTied).toBe(false)
    expect(result.afterToggleAgainTied).toBe(true)
  })

  test('renameTarget rejects empty name', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const targetName = `pw-target-${Date.now()}`

    const result = await window.evaluate(async ({ targetName }) => {
      const targets = await window.brover.createTarget({ name: targetName })
      const created = targets.find((item) => item.name === targetName)
      if (!created) throw new Error('Failed to create target')

      try {
        await window.brover.renameTarget({
          targetId: created.id,
          name: '   ',
        })
        return { success: false }
      } catch (e) {
        return { success: true, error: (e as Error).message }
      }
    }, { targetName })

    expect(result.success).toBe(true)
  })
})
