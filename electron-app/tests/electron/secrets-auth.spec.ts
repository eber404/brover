import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'

const electronAppPath = join(__dirname, '../..')

test.describe('Secrets Auth Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
      },
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('create, reveal, update and delete secret', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const profile = await window.evaluate(async () => {
      const profiles = await window.brover.listProfiles()
      return profiles.find((item) => item.isActive) ?? profiles[0]
    })

    const created = await window.evaluate(async ({ profileName }) => {
      await window.brover.createEnv({
        name: 'PLAYWRIGHT_KEY',
        profile: profileName,
        value: 'secret-1',
      })
      const envs = await window.brover.listEnvs()
      return envs.find((item) => item.name === 'PLAYWRIGHT_KEY')
    }, { profileName: profile.name })

    expect(created?.name).toBe('PLAYWRIGHT_KEY')

    const revealResult = await window.evaluate(async ({ profileName }) => {
      return window.brover.revealEnv({ profile: profileName, name: 'PLAYWRIGHT_KEY' })
    }, { profileName: profile.name })
    expect(revealResult.ok).toBe(true)
    expect(revealResult.value).toBe('secret-1')

    const copyResult = await window.evaluate(async ({ profileName }) => {
      return window.brover.copyEnv({
        profile: profileName,
        name: 'PLAYWRIGHT_KEY',
        isRevealed: false,
      })
    }, { profileName: profile.name })
    expect(copyResult.ok).toBe(true)
    expect(copyResult.value).toBe('secret-1')

    const updateResult = await window.evaluate(async ({ envId, profileName }) => {
      return window.brover.updateEnv({
        id: envId,
        profile: profileName,
        name: 'PLAYWRIGHT_KEY',
        value: 'secret-2',
        enabled: true,
      })
    }, { envId: created!.id, profileName: profile.name })
    expect(updateResult.ok).toBe(true)

    const afterUpdateReveal = await window.evaluate(async ({ profileName }) => {
      return window.brover.revealEnv({ profile: profileName, name: 'PLAYWRIGHT_KEY' })
    }, { profileName: profile.name })
    expect(afterUpdateReveal.value).toBe('secret-2')

    const deleteResult = await window.evaluate(async ({ envId, profileName }) => {
      return window.brover.deleteEnv({
        id: envId,
        profile: profileName,
        name: 'PLAYWRIGHT_KEY',
      })
    }, { envId: created!.id, profileName: profile.name })
    expect(deleteResult.ok).toBe(true)

    const remaining = await window.evaluate(async () => {
      return (await window.brover.listEnvs()).filter((item) => item.name === 'PLAYWRIGHT_KEY').length
    })
    expect(remaining).toBe(0)
  })
})
