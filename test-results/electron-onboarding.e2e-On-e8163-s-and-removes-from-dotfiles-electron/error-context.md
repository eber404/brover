# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: electron/onboarding.e2e.spec.ts >> Onboarding First-Run Flow >> retroactive path: imports selected sensitive vars and removes from dotfiles
- Location: tests/electron/onboarding.e2e.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="checkbox"][aria-label*="API_KEY"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[type="checkbox"][aria-label*="API_KEY"]')

```

```yaml
- button "back"
- heading "Review scanned variables" [level=1]
- paragraph: Select which variables contain sensitive values to import securely
- button ".bashrc"
- text: DB_URL ••••••
- button "Reveal"
- button ".zshrc"
- text: API_KEY ••••••
- button "Reveal"
- text: PORT ••••••
- button "Reveal"
- button "Continue" [disabled]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { _electron as electron } from 'playwright'
  3   | import { join } from 'node:path'
  4   | import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
  5   | import { tmpdir } from 'node:os'
  6   | 
  7   | const electronAppPath = join(__dirname, '../..')
  8   | 
  9   | test.describe('Onboarding First-Run Flow', () => {
  10  |   let electronApp: Awaited<ReturnType<typeof electron.launch>>
  11  |   let dbDir: string
  12  |   let homeDir: string
  13  | 
  14  |   test.beforeEach(async () => {
  15  |     dbDir = mkdtempSync(join(tmpdir(), 'brover-e2e-'))
  16  |     homeDir = mkdtempSync(join(tmpdir(), 'brover-e2e-home-'))
  17  |     writeFileSync(
  18  |       join(homeDir, '.zshrc'),
  19  |       'export API_KEY=super-secret\nexport PORT=3000\n',
  20  |       'utf8',
  21  |     )
  22  |     writeFileSync(join(homeDir, '.bashrc'), 'DB_URL=postgres://localhost\n', 'utf8')
  23  |   })
  24  | 
  25  |   test.afterEach(async () => {
  26  |     await electronApp.close()
  27  |     rmSync(dbDir, { recursive: true, force: true })
  28  |     rmSync(homeDir, { recursive: true, force: true })
  29  |   })
  30  | 
  31  |   async function launchApp() {
  32  |     electronApp = await electron.launch({
  33  |       args: [electronAppPath],
  34  |       env: {
  35  |         ...process.env,
  36  |         NODE_ENV: 'test',
  37  |         BROVER_E2E: '1',
  38  |         BROVER_SKIP_AUTH: '1',
  39  |         BROVER_DB_PATH: join(dbDir, 'config.json'),
  40  |         BROVER_HOME: homeDir,
  41  |       },
  42  |     })
  43  |     const window = await electronApp.firstWindow()
  44  |     await window.waitForFunction(() => Boolean(window.brover))
  45  |     return window
  46  |   }
  47  | 
  48  |   test('first run shows onboarding flow', async () => {
  49  |     const window = await launchApp()
  50  | 
  51  |     const heading = window.locator('h1').first()
  52  |     await expect(heading).toBeVisible()
  53  |     const text = await heading.textContent()
  54  |     expect(text?.toLowerCase()).toContain('welcome')
  55  | 
  56  |     const retroactiveBtn = window.getByRole('button', { name: /start import/i })
  57  |     await expect(retroactiveBtn).toBeVisible()
  58  | 
  59  |     const freshStartBtn = window.getByRole('button', { name: /start fresh/i })
  60  |     await expect(freshStartBtn).toBeVisible()
  61  |   })
  62  | 
  63  |   test('retroactive path: imports selected sensitive vars and removes from dotfiles', async () => {
  64  |     const window = await launchApp()
  65  | 
  66  |     await window.getByRole('button', { name: /start import/i }).click()
  67  | 
  68  |     await expect(window.getByText('Review scanned variables')).toBeVisible({ timeout: 10000 })
  69  | 
  70  |     const apiKeyCheckbox = window.locator(
  71  |       'input[type="checkbox"][aria-label*="API_KEY"]',
  72  |     )
> 73  |     await expect(apiKeyCheckbox).toBeVisible()
      |                                  ^ Error: expect(locator).toBeVisible() failed
  74  |     await apiKeyCheckbox.check()
  75  |     expect(await apiKeyCheckbox.isChecked()).toBe(true)
  76  | 
  77  |     await window.getByRole('button', { name: /continue/i }).click()
  78  | 
  79  |     await expect(window.getByText('Import complete')).toBeVisible({ timeout: 10000 })
  80  | 
  81  |     await window.getByRole('button', { name: /go to dashboard/i }).click()
  82  | 
  83  |     const searchInput = window.locator(
  84  |       'input[placeholder*="Search secrets"]',
  85  |     )
  86  |     await expect(searchInput).toBeVisible({ timeout: 10000 })
  87  | 
  88  |     const zshrc = readFileSync(join(homeDir, '.zshrc'), 'utf8')
  89  |     expect(zshrc).not.toContain('API_KEY')
  90  |     expect(zshrc).toContain('PORT=3000')
  91  | 
  92  |     const bashrc = readFileSync(join(homeDir, '.bashrc'), 'utf8')
  93  |     expect(bashrc).toContain('DB_URL=postgres://localhost')
  94  | 
  95  |     const spaces = await window.evaluate(() => window.brover.listSpaces())
  96  |     const dotfileSpace = spaces.find((s) => s.name === '.zshrc')
  97  |     expect(dotfileSpace).toBeDefined()
  98  | 
  99  |     const targets = await window.evaluate(
  100 |       (spaceId) => window.brover.listTargets(spaceId),
  101 |       dotfileSpace!.id,
  102 |     )
  103 |     expect(targets).toHaveLength(1)
  104 | 
  105 |     const envs = await window.evaluate(
  106 |       (targetId) => window.brover.listEnvs(targetId),
  107 |       targets[0].id,
  108 |     )
  109 |     expect(envs).toHaveLength(1)
  110 |     expect(envs[0].name).toBe('API_KEY')
  111 |   })
  112 | 
  113 |   test('fresh start creates spaces without env import', async () => {
  114 |     const window = await launchApp()
  115 | 
  116 |     await window.getByRole('button', { name: /start fresh/i }).click()
  117 | 
  118 |     await expect(window.getByText('Import complete')).toBeVisible({ timeout: 10000 })
  119 | 
  120 |     await window.getByRole('button', { name: /go to dashboard/i }).click()
  121 | 
  122 |     const searchInput = window.locator(
  123 |       'input[placeholder*="Search secrets"]',
  124 |     )
  125 |     await expect(searchInput).toBeVisible({ timeout: 10000 })
  126 | 
  127 |     const spaces = await window.evaluate(() => window.brover.listSpaces())
  128 |     const zshrcSpace = spaces.find((s) => s.name === '.zshrc')
  129 |     expect(zshrcSpace).toBeDefined()
  130 |     const bashrcSpace = spaces.find((s) => s.name === '.bashrc')
  131 |     expect(bashrcSpace).toBeDefined()
  132 |   })
  133 | 
  134 |   test('second launch skips onboarding after completion', async () => {
  135 |     const window = await launchApp()
  136 | 
  137 |     await window.getByRole('button', { name: /start fresh/i }).click()
  138 |     await expect(window.getByText('Import complete')).toBeVisible({ timeout: 10000 })
  139 |     await window.getByRole('button', { name: /go to dashboard/i }).click()
  140 | 
  141 |     await expect(
  142 |       window.locator('input[placeholder*="Search secrets"]'),
  143 |     ).toBeVisible({ timeout: 10000 })
  144 | 
  145 |     await electronApp.close()
  146 | 
  147 |     electronApp = await electron.launch({
  148 |       args: [electronAppPath],
  149 |       env: {
  150 |         ...process.env,
  151 |         NODE_ENV: 'test',
  152 |         BROVER_E2E: '1',
  153 |         BROVER_SKIP_AUTH: '1',
  154 |         BROVER_DB_PATH: join(dbDir, 'config.json'),
  155 |         BROVER_HOME: homeDir,
  156 |       },
  157 |     })
  158 |     const window2 = await electronApp.firstWindow()
  159 |     await window2.waitForFunction(() => Boolean(window.brover))
  160 | 
  161 |     await expect(
  162 |       window2.locator('input[placeholder*="Search secrets"]'),
  163 |     ).toBeVisible({ timeout: 10000 })
  164 | 
  165 |     const welcomeText = window2.locator('h1').first()
  166 |     await expect(welcomeText).not.toContainText(/welcome/i)
  167 |   })
  168 | })
  169 | 
```