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

    const result = await window.evaluate(async () => {
      const scaffoldTargets = await window.brover.createEnvironment({ name: 'global' })
      const globalTarget = scaffoldTargets.find((item) => item.name === 'global')
      if (!globalTarget) throw new Error('No global target created')

      await window.brover.createEnvironment({ name: `delete-all-${Date.now()}` })
      await window.brover.createEnvironment({ name: `delete-all-${Date.now()}-2` })

      const initialTargets = await window.brover.listEnvironments()
      if (!initialTargets.some((item) => item.isGlobal)) throw new Error('Global target not flagged')

      let attempts = 0
      let pending = initialTargets.find((item) => !item.isGlobal)
      while (pending) {
        await window.brover.deleteEnvironment({ environmentId: pending.id })
        attempts += 1
        if (attempts > 10) throw new Error('Delete loop did not converge')
        pending = (await window.brover.listEnvironments()).find((item) => !item.isGlobal)
      }

      let deleteGlobalError = ''
      try {
        await window.brover.deleteEnvironment({ environmentId: globalTarget.id })
      } catch (e) {
        deleteGlobalError = (e as Error).message
      }

      const finalTargets = await window.brover.listEnvironments()

      return {
        attempts,
        targetCount: finalTargets.length,
        globalSurvived: finalTargets.some((item) => item.id === globalTarget.id),
        globalDeleteRefused: deleteGlobalError.includes('cannot be deleted'),
      }
    })

    expect(result.attempts).toBe(2)
    expect(result.targetCount).toBe(1)
    expect(result.globalSurvived).toBe(true)
    expect(result.globalDeleteRefused).toBe(true)
  })
})
