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

  test('retroactive path: imports selected sensitive vars and removes from dotfiles', async () => {
    const window = await launchApp()

    await window.getByText('Start import →').click()

    await expect(window.getByText('Review scanned variables')).toBeVisible({ timeout: 10000 })

    await window.getByText('API_KEY').click()

    await window.getByRole('button', { name: /continue/i }).click()
    await expect(window.getByText('Review import plan')).toBeVisible({ timeout: 10000 })
    await window.getByRole('button', { name: /start managing secrets/i }).click()

    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /save preferences and finish/i }).click()

    const searchInput = window.locator(
      'input[placeholder*="Search secrets"]',
    )
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    const zshrc = readFileSync(join(homeDir, '.zshrc'), 'utf8')
    expect(zshrc).not.toContain('API_KEY')
    expect(zshrc).toContain('PORT=3000')

    const bashrc = readFileSync(join(homeDir, '.bashrc'), 'utf8')
    expect(bashrc).toContain('DB_URL=postgres://localhost')

    const spaces = await window.evaluate(() => window.brover.listSpaces())
    const dotfileSpace = spaces.find((s) => s.name === '.zshrc')
    expect(dotfileSpace).toBeDefined()

    const targets = await window.evaluate(
      (spaceId) => window.brover.listTargets(spaceId),
      dotfileSpace!.id,
    )
    expect(targets).toHaveLength(1)

    const envs = await window.evaluate(
      (targetId) => window.brover.listEnvs(targetId),
      targets[0].id,
    )
    expect(envs).toHaveLength(1)
    expect(envs[0].name).toBe('API_KEY')
  })

  test('fresh start creates spaces without env import', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    await expect(window.getByText('Fresh Start — Select dotfiles')).toBeVisible({ timeout: 10000 })
    await window.getByText('.zshrc', { exact: true }).first().click()
    await window.getByText('.bashrc', { exact: true }).first().click()
    await window.getByRole('button', { name: /start managing secrets/i }).click()

    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /save preferences and finish/i }).click()

    const searchInput = window.locator(
      'input[placeholder*="Search secrets"]',
    )
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    const spaces = await window.evaluate(() => window.brover.listSpaces())
    const zshrcSpace = spaces.find((s) => s.name === '.zshrc')
    expect(zshrcSpace).toBeDefined()
    const bashrcSpace = spaces.find((s) => s.name === '.bashrc')
    expect(bashrcSpace).toBeDefined()
  })

  test('second launch skips onboarding after completion', async () => {
    const window = await launchApp()

    await window.getByText('Start fresh →').click()
    await expect(window.getByText('Fresh Start — Select dotfiles')).toBeVisible({ timeout: 10000 })
    await window.getByText('.zshrc', { exact: true }).first().click()
    await window.getByText('.bashrc', { exact: true }).first().click()
    await window.getByRole('button', { name: /start managing secrets/i }).click()
    await expect(window.getByText('Choose launch terminals')).toBeVisible({ timeout: 10000 })
    await window.getByRole('checkbox', { name: 'Terminal' }).check()
    await window.getByRole('button', { name: /save preferences and finish/i }).click()

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
