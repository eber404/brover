import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Profiles CRUD Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-profiles-'))
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

  test('create profile and set active', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const profileName = `pw-profile-${Date.now()}`

    const result = await window.evaluate(
      async ({ profileName }) => {
        const initialProfiles = await window.brover.listProfiles()
        const initialActive = initialProfiles.filter((p) => p.isActive)
        if (initialActive.length !== 1) throw new Error('Expected exactly one active profile initially')

        const created = await window.brover.createProfile(profileName)
        const newProfile = created.find((item) => item.name === profileName)
        if (!newProfile) throw new Error('Failed to create profile')
        if (newProfile.isActive) throw new Error('New profile should not be active')

        await window.brover.setActiveProfile(newProfile.id)
        const updated = await window.brover.listProfiles()
        const activeCount = updated.filter((p) => p.isActive).length

        return {
          profileName: newProfile.name,
          wasInactiveInitially: !newProfile.isActive,
          activeCountAfter: activeCount,
        }
      },
      { profileName }
    )

    expect(result.profileName).toBe(profileName)
    expect(result.wasInactiveInitially).toBe(true)
    expect(result.activeCountAfter).toBe(1)
  })

  test('createProfile rejects empty name', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const result = await window.evaluate(async () => {
      try {
        await window.brover.createProfile('   ')
        return { success: false }
      } catch (e) {
        return { success: true, error: (e as Error).message }
      }
    })

    expect(result.success).toBe(true)
  })
})
