import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Targets Delete All Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-'))
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

  test('can delete all root targets', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const result = await window.evaluate(
      async () => {
        await window.brover.createTarget({ name: `delete-all-${Date.now()}` })
        await window.brover.createTarget({ name: `delete-all-${Date.now()}-2` })

        let targets = await window.brover.listTargets()
        while (targets.length > 0) {
          await window.brover.deleteTarget({ targetId: targets[0].id })
          targets = await window.brover.listTargets()
        }
        return {
          targetCount: targets.length,
        }
      }
    )

    expect(result.targetCount).toBe(0)
  })
})
