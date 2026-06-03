import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Spaces CRUD Flow', () => {
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

  test('create space with targets and secrets, then delete space cleans everything', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const spaceName = `pw-space-${Date.now()}`
    const secretName = `PW_SECRET_${Date.now()}`

    const result = await window.evaluate(
      async ({ spaceName, secretName }) => {
        const spaces = await window.brover.createSpace({
          name: spaceName,
          dotfilePath: `/tmp/${spaceName}.zshrc`,
        })
        const createdSpace = spaces.find((item) => item.name === spaceName)
        if (!createdSpace) throw new Error('Failed to create space')

        const targets = await window.brover.listTargets(createdSpace.id)
        const defaultTarget = targets[0]
        if (!defaultTarget) throw new Error('No default target created')

        const extraTarget = await window.brover.createTarget({
          spaceId: createdSpace.id,
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

        await window.brover.deleteSpace(createdSpace.id)

        const spacesAfter = await window.brover.listSpaces()
        const targetsAfter = await window.brover.listTargets(createdSpace.id)
        const envsAfter = await window.brover.listEnvs()
        const spaceEnvsAfter = envsAfter.filter(
          (env) => env.profile === defaultTarget.id || env.profile === prodTarget.id
        )

        return {
          spaceExists: spacesAfter.some((item) => item.id === createdSpace.id),
          targetCount: targetsAfter.length,
          envCountBefore: spaceEnvsBefore.length,
          envCountAfter: spaceEnvsAfter.length,
        }
      },
      { spaceName, secretName }
    )

    expect(result.spaceExists).toBe(false)
    expect(result.targetCount).toBe(0)
    expect(result.envCountBefore).toBe(2)
    expect(result.envCountAfter).toBe(0)
  })
})
