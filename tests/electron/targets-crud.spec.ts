import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Targets CRUD Flow', () => {
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

  test('create, rename, recolor and delete target', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const targetName = `pw-target-${Date.now()}`
    const renamed = `${targetName}-renamed`
    const updatedColor = '#8b5cf6'

    const result = await window.evaluate(
      async ({ targetName, renamed, updatedColor }) => {
        const currentTargets = await window.brover.listTargets()
        const stale = currentTargets.filter(
          (item) => item.name === targetName || item.name === renamed
        )
        for (const item of stale) {
          await window.brover.deleteTarget({ targetId: item.id })
        }

        const createdTargets = await window.brover.createTarget({
          name: targetName,
        })
        const created = createdTargets.find((item) => item.name === targetName)
        if (!created) throw new Error('Target not created')

        const renamedTargets = await window.brover.renameTarget({
          targetId: created.id,
          name: renamed,
        })
        const renamedTarget = renamedTargets.find((item) => item.id === created.id)
        if (!renamedTarget) throw new Error('Target not found after rename')

        const recoloredTargets = await window.brover.setTargetColor({
          targetId: created.id,
          color: updatedColor,
        })
        const recoloredTarget = recoloredTargets.find((item) => item.id === created.id)
        if (!recoloredTarget) throw new Error('Target not found after recolor')

        await window.brover.deleteTarget({ targetId: created.id })
        const finalTargets = await window.brover.listTargets()

        return {
          createdName: created.name,
          renamedName: renamedTarget.name,
          recoloredColor: recoloredTarget.color,
          existsAfterDelete: finalTargets.some((item) => item.id === created.id),
        }
      },
      { targetName, renamed, updatedColor }
    )

    expect(result.createdName).toBe(targetName)
    expect(result.renamedName).toBe(renamed)
    expect(result.recoloredColor).toBe(updatedColor)
    expect(result.existsAfterDelete).toBe(false)
  })

  test('shared secret names defaults off and syncs names when enabled', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const result = await window.evaluate(async () => {
      const sharedByDefault = await window.brover.getSharedSecretNames()

      const environments = await window.brover.listEnvironments()
      let dev = environments.find((item) => item.name === 'dev')
      if (!dev) {
        const created = await window.brover.createEnvironment({ name: 'dev' })
        dev = created.find((item) => item.name === 'dev') ?? null
      }

      let prod = (await window.brover.listEnvironments()).find((item) => item.name === 'prod')
      if (!prod) {
        const created = await window.brover.createEnvironment({ name: 'prod' })
        prod = created.find((item) => item.name === 'prod') ?? null
      }

      if (!dev || !prod) throw new Error('Missing environments')

      await window.brover.createEnv({ name: 'LOCAL_ONLY', profile: dev.id, value: 'secret' })
      const localOnly = await window.brover.listEnvs()
      const localOnlyInProd = localOnly.some((env) => env.profile === prod.id && env.name === 'LOCAL_ONLY')

      await window.brover.setSharedSecretNames(true)
      await window.brover.createEnv({ name: 'SHARED_ENV', profile: dev.id, value: 'secret' })
      const sharedAfterCreate = await window.brover.listEnvs()
      const sharedCount = sharedAfterCreate.filter((env) => env.name === 'SHARED_ENV').length

      return {
        sharedByDefault,
        localOnlyInProd,
        sharedCount,
      }
    })

    expect(result.sharedByDefault).toBe(false)
    expect(result.localOnlyInProd).toBe(false)
    expect(result.sharedCount).toBe(2)
  })
})
