import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = join(import.meta.dirname, '..')
const electronAppPath = root
const outputDir = join(root, 'docs', 'screenshots')

mkdirSync(outputDir, { recursive: true })

const dbDir = mkdtempSync(join(tmpdir(), 'brover-readme-db-'))
const homeDir = mkdtempSync(join(tmpdir(), 'brover-readme-home-'))

writeFileSync(
  join(homeDir, '.zshrc'),
  'export API_KEY=super-secret\nexport PORT=3000\n',
  'utf8',
)
writeFileSync(join(homeDir, '.bashrc'), 'DB_URL=postgres://localhost\n', 'utf8')

let electronApp

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

  await electronApp.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.setSize(1680, 1040)
  })

  const window = await electronApp.firstWindow()
  await window.waitForFunction(() => Boolean(window.brover))
  return window
}

async function main() {
  try {
    const onboardingWindow = await launchApp()
    await onboardingWindow.screenshot({
      path: join(outputDir, 'onboarding.png'),
      fullPage: true,
    })

    await onboardingWindow.getByText('Start fresh →').click()
    await onboardingWindow.getByRole('checkbox', { name: 'Terminal' }).check()
    await onboardingWindow.getByRole('button', { name: /start managing secrets/i }).click()
    await onboardingWindow.locator('input[placeholder*="Search secrets"]').waitFor({ state: 'visible' })

    await onboardingWindow.evaluate(async () => {
      const environments = await window.brover.listEnvironments()
      const defaultEnvironment = environments[0]
      if (!defaultEnvironment) return null

      await window.brover.renameEnvironment({
        environmentId: defaultEnvironment.id,
        name: 'dev',
      })
      await window.brover.setActiveEnvironment({ environmentId: defaultEnvironment.id })

      const createUserResult = await window.brover.createEnv({
        name: 'POSTGRES_USER',
        profile: defaultEnvironment.id,
        value: 'postgres',
      })
      const createPassResult = await window.brover.createEnv({
        name: 'POSTGRES_PASS',
        profile: defaultEnvironment.id,
        value: 'super-secret',
      })
      await window.brover.setEnvironmentColor({ environmentId: defaultEnvironment.id, color: '#f97316' })
      await window.brover.createEnvironment({ name: 'prod' })
      const nextEnvironments = await window.brover.listEnvironments()
      const prodEnvironment = nextEnvironments.find((environment) => environment.name === 'prod')
      if (prodEnvironment) {
        await window.brover.setEnvironmentColor({ environmentId: prodEnvironment.id, color: '#ff4d5a' })
      }
    })

    await electronApp.close()

    const mainWindow = await launchApp()
    await mainWindow.locator('input[placeholder*="Search secrets"]').waitFor({ state: 'visible' })
    await mainWindow.getByText('dev').first().click()
    await mainWindow.getByText('POSTGRES_USER').first().click()
    await mainWindow.waitForTimeout(500)
    await mainWindow.screenshot({
      path: join(outputDir, 'main-ui.png'),
      fullPage: true,
    })
    await electronApp.close()
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => {})
    }
    rmSync(dbDir, { recursive: true, force: true })
    rmSync(homeDir, { recursive: true, force: true })
  }
}

await main()
