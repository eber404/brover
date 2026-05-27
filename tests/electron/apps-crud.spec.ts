import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Apps CRUD Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-apps-'))
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

  test('create, toggle and delete app', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const appName = `pw-app-${Date.now()}`
    const bundleId = `com.test.app-${Date.now()}`

    const result = await window.evaluate(
      async ({ appName, bundleId }) => {
        const apps = await window.brover.listApps()
        for (const app of apps) {
          if (app.displayName.startsWith('pw-app-')) {
            await window.brover.deleteApp(app.id)
          }
        }

        const createdApps = await window.brover.createApp({
          displayName: appName,
          bundleID: bundleId,
        })
        const created = createdApps.find((item) => item.displayName === appName)
        if (!created) throw new Error('Failed to create app')

        const toggledApps = await window.brover.toggleApp(created.id)
        const toggled = toggledApps.find((item) => item.id === created.id)
        if (!toggled) throw new Error('Failed to toggle app')

        await window.brover.deleteApp(created.id)
        const remainingApps = await window.brover.listApps()

        return {
          createdName: created.displayName,
          createdBundle: created.bundleID,
          createdEnabled: created.enabled,
          toggledEnabled: toggled.enabled,
          existsAfterDelete: remainingApps.some((item) => item.id === created.id),
        }
      },
      { appName, bundleId }
    )

    expect(result.createdName).toBe(appName)
    expect(result.createdBundle).toBe(bundleId)
    expect(result.createdEnabled).toBe(true)
    expect(result.toggledEnabled).toBe(false)
    expect(result.existsAfterDelete).toBe(false)
  })

  test('createApp rejects invalid bundle ID', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const result = await window.evaluate(async () => {
      try {
        await window.brover.createApp({
          displayName: 'Invalid App',
          bundleID: 'not-a-valid-bundle-id',
        })
        return { success: false }
      } catch (e) {
        return { success: true, error: (e as Error).message }
      }
    })

    expect(result.success).toBe(true)
  })
})
