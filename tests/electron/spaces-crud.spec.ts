import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Targets Cleanup Flow', () => {
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

  test('create targets with secrets, then delete targets cleans everything', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const defaultTargetName = `pw-target-${Date.now()}`
    const secretName = `PW_SECRET_${Date.now()}`

    const result = await window.evaluate(
      async ({ defaultTargetName, secretName }) => {
        const targets = await window.brover.createEnvironment({ name: defaultTargetName })
        const defaultTarget = targets.find((item) => item.name === defaultTargetName)
        if (!defaultTarget) throw new Error('No default target created')

        const extraTarget = await window.brover.createEnvironment({
          name: 'prod',
        })
        const prodTarget = extraTarget.find((item) => item.name === 'prod')
        if (!prodTarget) throw new Error('Failed to create prod target')

        await window.brover.createEnv({
          name: secretName,
          profile: defaultTarget.id,
          value: 'secret-value-1',
        })

        await window.brover.createEnv({
          name: secretName,
          profile: prodTarget.id,
          value: 'secret-value-2',
        })

        const envsBefore = await window.brover.listEnvs()
        const spaceEnvsBefore = envsBefore.filter(
          (env) => env.profile === defaultTarget.id || env.profile === prodTarget.id
        )

        await window.brover.deleteEnvironment({ environmentId: prodTarget.id })
        await window.brover.deleteEnvironment({ environmentId: defaultTarget.id })

        const targetsAfter = await window.brover.listEnvironments()
        const envsAfter = await window.brover.listEnvs()
        const spaceEnvsAfter = envsAfter.filter(
          (env) => env.profile === defaultTarget.id || env.profile === prodTarget.id
        )

        return {
          targetExists: targetsAfter.some((item) => item.id === defaultTarget.id || item.id === prodTarget.id),
          envCountBefore: spaceEnvsBefore.length,
          envCountAfter: spaceEnvsAfter.length,
        }
      },
      { defaultTargetName, secretName }
    )

    expect(result.targetExists).toBe(false)
    expect(result.envCountBefore).toBe(2)
    expect(result.envCountAfter).toBe(0)
  })
})
