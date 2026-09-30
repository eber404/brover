import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const electronAppPath = join(__dirname, '../..')

interface LaunchExport {
  name: string
  value: string
}

function parseCommandExports(content: string): LaunchExport[] {
  return content
    .split('\n')
    .filter(line => line.startsWith('export '))
    .map(line => {
      const match = /^export ([A-Za-z_][A-Za-z0-9_]*)='(.*)'$/.exec(line)
      if (!match) throw new Error(`Unparsable export line: ${line}`)
      return { name: match[1], value: match[2].replace(/'\\''/g, "'") }
    })
}

function readOpenLog(openLogPath: string): string[] {
  if (!existsSync(openLogPath)) return []
  return readFileSync(openLogPath, 'utf8').split('\n').filter(line => line.length > 0)
}

test.describe('Launch env merge', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>
  let sandboxDir: string
  let commandDir: string
  let openLogPath: string

  test.beforeEach(async () => {
    sandboxDir = mkdtempSync(join(tmpdir(), 'brover-e2e-'))
    commandDir = join(sandboxDir, 'commands')
    mkdirSync(commandDir, { recursive: true })

    // Stub `open` so the real terminal app is never spawned, but the exact
    // argv the launcher hands to the OS is still recorded for assertions.
    const fakeBinDir = join(sandboxDir, 'bin')
    mkdirSync(fakeBinDir, { recursive: true })
    openLogPath = join(sandboxDir, 'open.log')
    const openStub = join(fakeBinDir, 'open')
    writeFileSync(openStub, `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(openLogPath)}\nexit 0\n`)
    chmodSync(openStub, 0o755)

    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
        BROVER_DB_PATH: join(sandboxDir, 'config.json'),
        TMPDIR: commandDir,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ''}`,
      },
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
    rmSync(sandboxDir, { recursive: true, force: true })
  })

  test('launching a non-global environment injects global secrets and local values win on collision', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const setup = await window.evaluate(async () => {
      const afterGlobal = await window.brover.createEnvironment({ name: 'launch-global' })
      await window.brover.createEnvironment({ name: 'launch-local' })

      const environments = await window.brover.listEnvironments()
      const globalEnvironment = environments.find(item => item.isGlobal)
      const localEnvironment = environments.find(item => item.name === 'launch-local')
      if (!globalEnvironment) throw new Error('No global environment resolved')
      if (!localEnvironment) throw new Error('No local environment created')

      await window.brover.createEnv({
        name: 'MERGE_GLOBAL_ONLY',
        profile: globalEnvironment.id,
        value: 'global-only-value',
      })
      await window.brover.createEnv({
        name: 'MERGE_SHARED_NAME',
        profile: globalEnvironment.id,
        value: 'global-shared-value',
      })
      await window.brover.createEnv({
        name: 'MERGE_LOCAL_ONLY',
        profile: localEnvironment.id,
        value: "local-only-va'lue",
      })
      await window.brover.createEnv({
        name: 'MERGE_SHARED_NAME',
        profile: localEnvironment.id,
        value: 'local-shared-value',
      })

      const launchResult = await window.brover.launch.terminal(localEnvironment.id, 'terminal')

      return {
        globalEnvironmentId: globalEnvironment.id,
        globalEnvironmentName: globalEnvironment.name,
        localEnvironmentId: localEnvironment.id,
        launchResult,
      }
    })

    expect(setup.globalEnvironmentName).toBe('launch-global')
    expect(setup.launchResult.success).toBe(true)

    const commandPath = join(commandDir, `brover-${setup.localEnvironmentId}.command`)
    expect(existsSync(commandPath)).toBe(true)

    const exports = parseCommandExports(readFileSync(commandPath, 'utf8'))
    const values = Object.fromEntries(exports.map(entry => [entry.name, entry.value]))

    expect(exports).toHaveLength(3)
    expect(new Set(exports.map(entry => entry.name)).size).toBe(3)
    expect(Object.keys(values).sort()).toEqual([
      'MERGE_GLOBAL_ONLY',
      'MERGE_LOCAL_ONLY',
      'MERGE_SHARED_NAME',
    ])

    expect(values.MERGE_GLOBAL_ONLY).toBe('global-only-value')
    expect(values.MERGE_LOCAL_ONLY).toBe("local-only-va'lue")
    expect(values.MERGE_SHARED_NAME).toBe('local-shared-value')

    const commandContent = readFileSync(commandPath, 'utf8')
    expect(commandContent).toContain('# Brover envs — target: ' + setup.localEnvironmentId)
    expect(commandContent).not.toContain('global-shared-value')

    expect(readOpenLog(openLogPath)).toContain(`-a Terminal ${commandPath}`)
  })

  test('launching the global environment injects each global secret exactly once', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const setup = await window.evaluate(async () => {
      await window.brover.createEnvironment({ name: 'launch-global-only-env' })
      await window.brover.createEnvironment({ name: 'launch-other-env' })

      const environments = await window.brover.listEnvironments()
      const globalEnvironment = environments.find(item => item.isGlobal)
      if (!globalEnvironment) throw new Error('No global environment resolved')

      await window.brover.createEnv({
        name: 'SELF_GLOBAL_ONLY',
        profile: globalEnvironment.id,
        value: 'self-global-only-value',
      })
      await window.brover.createEnv({
        name: 'SELF_SHARED_NAME',
        profile: globalEnvironment.id,
        value: 'self-shared-value',
      })

      const launchResult = await window.brover.launch.terminal(globalEnvironment.id, 'terminal')

      return {
        globalEnvironmentId: globalEnvironment.id,
        globalEnvironmentName: globalEnvironment.name,
        launchResult,
      }
    })

    expect(setup.globalEnvironmentName).toBe('launch-global-only-env')
    expect(setup.launchResult.success).toBe(true)

    const commandPath = join(commandDir, `brover-${setup.globalEnvironmentId}.command`)
    expect(existsSync(commandPath)).toBe(true)

    const exports = parseCommandExports(readFileSync(commandPath, 'utf8'))
    const values = Object.fromEntries(exports.map(entry => [entry.name, entry.value]))

    expect(exports).toHaveLength(2)
    expect(new Set(exports.map(entry => entry.name)).size).toBe(2)
    expect(Object.keys(values).sort()).toEqual(['SELF_GLOBAL_ONLY', 'SELF_SHARED_NAME'])

    expect(values.SELF_GLOBAL_ONLY).toBe('self-global-only-value')
    expect(values.SELF_SHARED_NAME).toBe('self-shared-value')

    expect(readOpenLog(openLogPath)).toContain(`-a Terminal ${commandPath}`)
  })
})
