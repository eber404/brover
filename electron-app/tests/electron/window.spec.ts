import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Electron Window', () => {
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
        BROVER_DB_PATH: join(dbDir, 'config.json'),
      },
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
    rmSync(dbDir, { recursive: true, force: true })
  })

  test('window can be moved', async () => {
    const window = await electronApp.firstWindow()

    const initial = await window.evaluate(() => {
      const { screenX, screenY } = window
      return { x: screenX, y: screenY }
    })

    const initialBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win?.getPosition() ?? [0, 0]
    })

    expect(initialBounds[0]).toBeGreaterThanOrEqual(0)
    expect(initialBounds[1]).toBeGreaterThanOrEqual(0)

    await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.setPosition(200, 200)
    })

    const movedBounds = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win?.getPosition() ?? [0, 0]
    })

    expect(movedBounds[0]).toBe(200)
    expect(movedBounds[1]).toBe(200)
  })

  test('window is not maximized by default', async () => {
    const isMaximized = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win?.isMaximized() ?? false
    })
    expect(isMaximized).toBe(false)
  })
})
