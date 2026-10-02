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
      const targets = await window.brover.createEnvironment({
        name: `secret-target-${Date.now()}`,
      })
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
    const copiedValue = await electronApp.evaluate(async ({ clipboard }) => clipboard.readText())
    expect(copiedValue).toBe('secret-1')

    const updateResult = await window.evaluate(async ({ envId, targetId, secretName }) => {
      const result = await window.brover.updateEnv({
        id: envId,
        profile: targetId,
        name: secretName,
        value: 'secret-2',
        enabled: true,
      })
      if (result.value === 'needs-confirmation') {
        return window.brover.updateEnvConfirmed({
          id: envId,
          profile: targetId,
          name: secretName,
          value: 'secret-2',
        })
      }
      return result
    }, { envId: created.env!.id, targetId: target.id, secretName })
    expect(updateResult.ok).toBe(true)

    const afterUpdateReveal = await window.evaluate(async ({ targetId, secretName }) => {
      return window.brover.revealEnv({ profile: targetId, name: secretName })
    }, { targetId: target.id, secretName })
    expect(afterUpdateReveal.value).toBe('secret-2')

    const deleteResult = await window.evaluate(async ({ envId, targetId, secretName }) => {
      const result = await window.brover.deleteEnv({
        id: envId,
        profile: targetId,
        name: secretName,
      })
      if (result.value === 'needs-confirmation') {
        return window.brover.deleteEnvConfirmed({
          id: envId,
          profile: targetId,
          name: secretName,
        })
      }
      return result
    }, { envId: created.env!.id, targetId: target.id, secretName })
    expect(deleteResult.ok).toBe(true)

    const remaining = await window.evaluate(async ({ secretName }) => {
      return (await window.brover.listEnvs()).filter((item) => item.name === secretName).length
    }, { secretName })
    expect(remaining).toBe(0)
  })

  test('details modal reveals real value and rotates it', async () => {
    const secretName = `PW_MODAL_${Date.now()}`
    const initialValue = 'modal-secret-1'
    const updatedValue = 'modal-secret-2'

    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const target = await window.evaluate(
      async ({ secretName, initialValue }) => {
        await window.brover.onboarding.complete()

        const targets = await window.brover.createEnvironment({
          name: `modal-target-${Date.now()}`,
        })
        const target = targets.find((item) => item.isActive) ?? targets[0]
        if (!target) throw new Error('No target available')

        const createdResult = await window.brover.createEnv({
          name: secretName,
          profile: target.id,
          value: initialValue,
        })

        return { createdOk: createdResult.ok, environmentId: target.id }
      },
      { secretName, initialValue }
    )
    expect(target.createdOk).toBe(true)

    await window.reload()
    await window.waitForFunction(() => Boolean(window.brover))
    await expect(window.locator('[data-testid="environments-list"]')).toBeVisible({ timeout: 10000 })

    await window.locator(`[data-testid="environment-row-${target.environmentId}"]`).click()

    const secretRow = window.locator(`[data-testid="secret-row-${secretName}"]`)
    await expect(secretRow).toBeVisible({ timeout: 10000 })
    await secretRow.click()

    const currentInput = window.getByTestId('secret-current-input')
    await expect(currentInput).toBeVisible({ timeout: 10000 })
    await expect(currentInput).toHaveValue(initialValue)
    await expect(currentInput).not.toHaveValue('••••••••')
    await expect(window.getByTestId('secret-copy-button')).toBeVisible()

    await currentInput.fill(updatedValue)
    await window.getByTestId('secret-update-button').click()

    const confirmUpdate = window.getByRole('button', { name: 'Update', exact: true })
    await expect(confirmUpdate).toBeVisible({ timeout: 10000 })
    await confirmUpdate.click()

    const stored = await window.evaluate(async ({ environmentId, secretName }) => {
      return window.brover.revealEnv({ profile: environmentId, name: secretName })
    }, { environmentId: target.environmentId, secretName })

    expect(stored.ok).toBe(true)
    expect(stored.value).toBe(updatedValue)
  })
})
