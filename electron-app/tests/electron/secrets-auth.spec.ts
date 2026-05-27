import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Secrets Auth Flow', () => {
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

  test('create, reveal, update and delete secret', async () => {
    const secretName = `PW_KEY_${Date.now()}`
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const target = await window.evaluate(async () => {
      const spaces = await window.brover.listSpaces()
      const globalSpace = spaces.find((space) => space.id === 'space-global') ?? spaces[0]
      const targets = await window.brover.listTargets(globalSpace.id)
      return targets.find((item) => item.isActive) ?? targets[0]
    })

    await window.evaluate(async ({ secretName }) => {
      const envs = await window.brover.listEnvs()
      const matches = envs.filter((item) => item.name === secretName)
      for (const item of matches) {
        await window.brover.deleteEnv({ id: item.id, profile: item.profile, name: item.name })
      }
    }, { secretName })

    const created = await window.evaluate(async ({ targetId, secretName }) => {
      const createdResult = await window.brover.createEnv({
        name: secretName,
        profile: targetId,
        value: 'secret-1',
      })
      const envs = await window.brover.listEnvs()
      return {
        createdResult,
        env: envs.find((item) => item.name === secretName && item.profile === targetId)
      }
    }, { targetId: target.id, secretName })

    expect(created.createdResult.ok).toBe(true)
    expect(created.env?.name).toBe(secretName)

    const revealResult = await window.evaluate(async ({ targetId, secretName }) => {
      return window.brover.revealEnv({ profile: targetId, name: secretName })
    }, { targetId: target.id, secretName })
    expect(revealResult.ok).toBe(true)
    expect(revealResult.value).toBe('secret-1')

    const copyResult = await window.evaluate(async ({ targetId, secretName }) => {
      return window.brover.copyEnv({
        profile: targetId,
        name: secretName,
        isRevealed: false,
      })
    }, { targetId: target.id, secretName })
    expect(copyResult.ok).toBe(true)
    expect(copyResult.value).toBe('secret-1')

    const updateResult = await window.evaluate(async ({ envId, targetId, secretName }) => {
      return window.brover.updateEnv({
        id: envId,
        profile: targetId,
        name: secretName,
        value: 'secret-2',
        enabled: true,
      })
    }, { envId: created.env!.id, targetId: target.id, secretName })
    expect(updateResult.ok).toBe(true)

    const afterUpdateReveal = await window.evaluate(async ({ targetId, secretName }) => {
      return window.brover.revealEnv({ profile: targetId, name: secretName })
    }, { targetId: target.id, secretName })
    expect(afterUpdateReveal.value).toBe('secret-2')

    const deleteResult = await window.evaluate(async ({ envId, targetId, secretName }) => {
      return window.brover.deleteEnv({
        id: envId,
        profile: targetId,
        name: secretName,
      })
    }, { envId: created.env!.id, targetId: target.id, secretName })
    expect(deleteResult.ok).toBe(true)

    const remaining = await window.evaluate(async ({ secretName }) => {
      return (await window.brover.listEnvs()).filter((item) => item.name === secretName).length
    }, { secretName })
    expect(remaining).toBe(0)
  })
})
