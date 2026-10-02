import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

test.describe('Onboarding First-Run Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let dbDir: string
  let homeDir: string

  test.beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-'))
    homeDir = mkdtempSync(join(tmpdir(), 'brover-e2e-home-'))
    writeFileSync(
      join(homeDir, '.zshrc'),
      'export API_KEY=super-secret\nexport PORT=3000\n',
      'utf8',
    )
    writeFileSync(join(homeDir, '.bashrc'), 'DB_URL=postgres://localhost\n', 'utf8')
  })

  test.afterEach(async () => {
    await electronApp.close()
    rmSync(dbDir, { recursive: true, force: true })
    rmSync(homeDir, { recursive: true, force: true })
  })

  async function launchApp() {
    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
        BROVER_DB_PATH: join(dbDir, 'config.json'),
        BROVER_HOME: homeDir,
      },
    })
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))
    return window
  }

  test('wizard back button stays inside the window at the capped width', async () => {
    const window = await launchApp()

    const width = await window.evaluate(() => window.innerWidth)
    expect(width).toBeLessThanOrEqual(760)

    await window.getByText('Start import →').click()
    const reviewBack = window.getByRole('button', { name: 'back' })
    await expect(reviewBack).toBeVisible()

    const reviewBox = await reviewBack.boundingBox()
    expect(reviewBox).not.toBeNull()
    expect(reviewBox!.x).toBeGreaterThanOrEqual(0)
    expect(reviewBox!.x + reviewBox!.width).toBeLessThanOrEqual(width)
  })

  test('wizard header has clear titlebar clearance and compact text spacing', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    const heading = window.getByRole('heading', { name: 'Choose launch terminals' })
    const subtitle = window.getByText('Pick favorites, set order, and use first item as default.')
    const backButton = window.getByRole('button', { name: 'back' })
    await expect(heading).toBeVisible()
    await expect(subtitle).toBeVisible()
    await expect(backButton).toBeVisible()

    const [headingBox, subtitleBox, backBox] = await Promise.all([
      heading.boundingBox(),
      subtitle.boundingBox(),
      backButton.boundingBox(),
    ])
    expect(headingBox).not.toBeNull()
    expect(subtitleBox).not.toBeNull()
    expect(backBox).not.toBeNull()
    expect(headingBox!.y).toBeGreaterThanOrEqual(48)
    expect(subtitleBox!.y - (headingBox!.y + headingBox!.height)).toBeLessThanOrEqual(16)
    expect(Math.abs((backBox!.y + backBox!.height / 2) - (headingBox!.y + headingBox!.height / 2))).toBeLessThanOrEqual(8)
    expect(headingBox!.x - (backBox!.x + backBox!.width)).toBeLessThanOrEqual(24)
  })

  test('wizard step header keeps title, subtitle, and back button compactly aligned', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    const heading = window.getByRole('heading', { name: 'Choose launch terminals' })
    const subtitle = window.getByText('Pick favorites, set order, and use first item as default.')
    const backButton = window.getByRole('button', { name: 'back' })
    await expect(heading).toBeVisible()
    await expect(subtitle).toBeVisible()

    const [headingBox, subtitleBox, backBox] = await Promise.all([
      heading.boundingBox(),
      subtitle.boundingBox(),
      backButton.boundingBox(),
    ])
    expect(headingBox).not.toBeNull()
    expect(subtitleBox).not.toBeNull()
    expect(backBox).not.toBeNull()
    expect(headingBox!.y).toBeGreaterThanOrEqual(48)
    expect(subtitleBox!.y - (headingBox!.y + headingBox!.height)).toBeLessThanOrEqual(16)
    expect(Math.abs((backBox!.y + backBox!.height / 2) - (headingBox!.y + headingBox!.height / 2))).toBeLessThanOrEqual(8)
    expect(headingBox!.x - (backBox!.x + backBox!.width)).toBeLessThanOrEqual(20)
  })

  test('first run shows onboarding flow', async () => {
    const window = await launchApp()

    const heading = window.locator('h1').first()
    await expect(heading).toBeVisible()
    const text = await heading.textContent()
    expect(text?.toLowerCase()).toContain('welcome')

    const retroactiveBtn = window.getByText('Start import →')
    await expect(retroactiveBtn).toBeVisible()

    const freshStartBtn = window.getByText('Start fresh →')
    await expect(freshStartBtn).toBeVisible()
  })

  test('retroactive path: imports selected sensitive vars into one environment per dotfile and removes from dotfiles', async () => {
    const window = await launchApp()

    await window.getByText('Start import →').click()

    await expect(window.getByText('Review scanned variables')).toBeVisible({ timeout: 10000 })

    await window.getByText('API_KEY').click()

    await window.getByRole('button', { name: /continue/i }).click()
    await expect(window.getByText('Review import plan')).toBeVisible({ timeout: 10000 })
    await window.getByRole('button', { name: /choose launch terminals/i }).click()

    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /start managing secrets/i }).click()

    const searchInput = window.locator(
      'input[placeholder*="Search secrets"]',
    )
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    const zshrc = readFileSync(join(homeDir, '.zshrc'), 'utf8')
    expect(zshrc).not.toContain('API_KEY')
    expect(zshrc).toContain('PORT=3000')

    const bashrc = readFileSync(join(homeDir, '.bashrc'), 'utf8')
    expect(bashrc).toContain('DB_URL=postgres://localhost')

    const environments = await window.evaluate(() => window.brover.listEnvironments())
    const zshrcEnvironment = environments.find((environment) => environment.name === '.zshrc')
    const bashrcEnvironment = environments.find((environment) => environment.name === '.bashrc')
    expect(zshrcEnvironment).toBeDefined()
    expect(bashrcEnvironment).toBeUndefined()

    const envs = await window.evaluate(() => window.brover.listEnvs())
    const importedEnv = envs.find((env) => env.profile === zshrcEnvironment!.id)
    expect(importedEnv?.name).toBe('API_KEY')
  })

  test('fresh start creates a single global environment', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /start managing secrets/i }).click()

    const searchInput = window.locator(
      'input[placeholder*="Search secrets"]',
    )
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    const environments = await window.evaluate(() => window.brover.listEnvironments())
    expect(environments).toHaveLength(1)
    expect(environments[0]?.name).toBe('global')
  })

  test('second launch skips onboarding after completion', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /start managing secrets/i }).click()

    await expect(
      window.locator('input[placeholder*="Search secrets"]'),
    ).toBeVisible({ timeout: 10000 })

    await electronApp.close()

    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
        BROVER_DB_PATH: join(dbDir, 'config.json'),
        BROVER_HOME: homeDir,
      },
    })
    const window2 = await electronApp.firstWindow()
    await window2.waitForFunction(() => Boolean(window.brover))

    await expect(
      window2.locator('input[placeholder*="Search secrets"]'),
    ).toBeVisible({ timeout: 10000 })

    const welcomeText = window2.locator('h1').first()
    await expect(welcomeText).not.toContainText(/welcome/i)
  })
})
