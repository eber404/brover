import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Env Toggle Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-env-'))
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

  test('toggle env enabled/disabled', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const secretName = `PW_TOGGLE_${Date.now()}`

    const result = await window.evaluate(
      async ({ secretName }) => {
        const targets = await window.brover.createTarget({
          name: `env-target-${Date.now()}`,
        })
        const target = targets.find((t) => t.isActive) ?? targets[0]
        if (!target) throw new Error('No target available')

        await window.brover.createEnv({
          name: secretName,
          profile: target.id,
          value: 'toggle-test-secret',
        })

        const envs = await window.brover.listEnvs()
        const created = envs.find((item) => item.name === secretName && item.profile === target.id)
        if (!created) throw new Error('Failed to create env')

        const initialEnabled = created.enabled

        const toggled = await window.brover.toggleEnvEnabled(created.id)
        const afterToggle = toggled.find((item) => item.id === created.id)

        const toggledAgain = await window.brover.toggleEnvEnabled(created.id)
        const afterToggleAgain = toggledAgain.find((item) => item.id === created.id)

        await window.brover.deleteEnv({
          id: created.id,
          profile: target.id,
          name: secretName,
        })

        return {
          initialEnabled,
          afterToggleEnabled: afterToggle?.enabled,
          afterToggleAgainEnabled: afterToggleAgain?.enabled,
        }
      },
      { secretName }
    )

    expect(result.initialEnabled).toBe(true)
    expect(result.afterToggleEnabled).toBe(false)
    expect(result.afterToggleAgainEnabled).toBe(true)
  })
})
