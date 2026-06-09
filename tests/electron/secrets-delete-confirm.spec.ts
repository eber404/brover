import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Secret Delete Confirmation', () => {
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

  test('requires confirmation when auth cache exists', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const target = await window.evaluate(async () => {
      const targets = await window.brover.createEnvironment({
        name: `delete-target-${Date.now()}`,
      })
      return targets.find((t) => t.isActive) ?? targets[0]
    })

    const secretName = `PW_CONFIRM_${Date.now()}`

    await window.evaluate(async ({ targetId, name }) => {
      await window.brover.createEnv({ name, profile: targetId, value: 'v1' })
    }, { targetId: target.id, name: secretName })

    const env = await window.evaluate(async ({ targetId, name }) => {
      const envs = await window.brover.listEnvs()
      return envs.find((e) => e.name === name && e.profile === targetId)!
    }, { targetId: target.id, name: secretName })

    // Grant auth cache by calling reveal
    await window.evaluate(async ({ targetId, name }) => {
      await window.brover.revealEnv({ profile: targetId, name })
    }, { targetId: target.id, name: secretName })

    // Cached auth triggers confirmation flow instead of re-prompting auth.
    const deleteResult = await window.evaluate(async ({ id, targetId, name }) => {
      const result = await window.brover.deleteEnv({ id, profile: targetId, name })
      if (result.value === 'needs-confirmation') {
        return window.brover.deleteEnvConfirmed({ id, profile: targetId, name })
      }
      return result
    }, { id: env.id, targetId: target.id, name: secretName })

    expect(deleteResult.ok).toBe(true)

    // Verify deleted
    const remaining = await window.evaluate(async ({ name }) => {
      return (await window.brover.listEnvs()).filter((e) => e.name === name).length
    }, { name: secretName })
    expect(remaining).toBe(0)
  })

  test('deletes directly when no auth cache', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const target = await window.evaluate(async () => {
      const targets = await window.brover.createEnvironment({
        name: `delete-target-${Date.now()}`,
      })
      return targets.find((t) => t.isActive) ?? targets[0]
    })

    const secretName = `PW_DIRECT_${Date.now()}`

    await window.evaluate(async ({ targetId, name }) => {
      await window.brover.createEnv({ name, profile: targetId, value: 'v1' })
    }, { targetId: target.id, name: secretName })

    const env = await window.evaluate(async ({ targetId, name }) => {
      const envs = await window.brover.listEnvs()
      return envs.find((e) => e.name === name && e.profile === targetId)!
    }, { targetId: target.id, name: secretName })

    // No prior auth-gated call → no cache → authorize + delete in one call
    const result = await window.evaluate(async ({ id, targetId, name }) => {
      return window.brover.deleteEnv({ id, profile: targetId, name })
    }, { id: env.id, targetId: target.id, name: secretName })

    expect(result.ok).toBe(true)
    expect(result.value).toBeUndefined()

    const remaining = await window.evaluate(async ({ name }) => {
      return (await window.brover.listEnvs()).filter((e) => e.name === name).length
    }, { name: secretName })
    expect(remaining).toBe(0)
  })
})
