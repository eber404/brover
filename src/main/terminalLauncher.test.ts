import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTerminalLauncher } from './terminalLauncher'

describe('terminalLauncher', () => {
  let launcher: ReturnType<typeof createTerminalLauncher>
  let openTerminal: ReturnType<typeof vi.fn<(terminalName: string, commandPath: string) => void>>
  let commandDir: string

  beforeEach(() => {
    commandDir = mkdtempSync(join(tmpdir(), 'brover-command-'))
    openTerminal = vi.fn<(terminalName: string, commandPath: string) => void>()
    launcher = createTerminalLauncher({ openTerminal, commandDir })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(commandDir, { recursive: true, force: true })
  })

  describe('listTerminals', () => {
    it('returns terminal.app as installed', () => {
      const terminals = launcher.listTerminals()
      const terminal = terminals.find(t => t.id === 'terminal')
      expect(terminal).toBeDefined()
      expect(terminal!.installed).toBe(true)
      expect(terminal!.name).toBe('Terminal')
    })

    it('returns TerminalApp objects with correct shape', () => {
      const terminals = launcher.listTerminals()
      terminals.forEach(t => {
        expect(t).toHaveProperty('id')
        expect(t).toHaveProperty('name')
        expect(t).toHaveProperty('bundlePath')
        expect(t).toHaveProperty('installed')
      })
    })
  })

  describe('launch', () => {
    it('creates launch script even when no envs provided', async () => {
      const result = await launcher.launch('target-1', 'terminal', [])

      expect(result.success).toBe(true)
      expect(result.commandPath).toBeDefined()
      expect(existsSync(result.commandPath!)).toBe(true)

      const content = readFileSync(result.commandPath!, 'utf-8')
      expect(content).toContain('# Brover envs — target: target-1')
      expect(content).not.toContain('export ')
      expect(content).toContain('cd "$HOME"')
      expect(content).toContain('exec "$SHELL"')
      expect(openTerminal).toHaveBeenCalledWith('Terminal', result.commandPath!)

      rmSync(result.commandPath!)
    })

    it('creates .command file with correct env vars', async () => {
      const envs = [
        { name: 'FOO', value: 'bar' },
        { name: 'BAZ', value: 'qux' },
      ]
      const result = await launcher.launch('target-1', 'terminal', envs)
      expect(result.success).toBe(true)
      expect(result.commandPath).toBeDefined()
      expect(existsSync(result.commandPath!)).toBe(true)
      const content = readFileSync(result.commandPath!, 'utf-8')
      expect(content).toContain("export FOO='bar'")
      expect(content).toContain("export BAZ='qux'")
      expect(content).toContain('# Brover envs — target: target-1')
      expect(content).toContain('cd "$HOME"')
      expect(content).toContain('exec "$SHELL"')
      expect(openTerminal).toHaveBeenCalledWith('Terminal', result.commandPath!)
      rmSync(result.commandPath!)
    })

    it('.command file is executable (mode 0o755)', async () => {
      const result = await launcher.launch('target-1', 'terminal', [
        { name: 'FOO', value: 'bar' },
      ])
      const { statSync } = require('fs')
      const mode = statSync(result.commandPath!).mode
      expect(mode & 0o777).toBe(0o755)
      rmSync(result.commandPath!)
    })

    it('reuses same .command file path for same targetId (no random suffix)', async () => {
      const result1 = await launcher.launch('target-1', 'terminal', [{ name: 'FOO', value: 'bar' }])
      const result2 = await launcher.launch('target-1', 'terminal', [{ name: 'BAZ', value: 'qux' }])
      expect(result1.commandPath).toBe(result2.commandPath)
      expect(result1.commandPath).toContain('brover-target-1.command')
    })

    it('writes new content when called twice (file is overwritten, not appended)', async () => {
      const l1 = createTerminalLauncher({ openTerminal, commandDir })
      const l2 = createTerminalLauncher({ openTerminal, commandDir })
      await l1.launch('target-B', 'terminal', [{ name: 'INITIAL', value: 'first' }])
      await l2.launch('target-B', 'terminal', [{ name: 'UPDATED', value: 'second' }])
      const path = join(commandDir, 'brover-target-B.command')
      const content = readFileSync(path, 'utf8')
      expect(content).toContain('export UPDATED=')
      expect(content).not.toContain('export INITIAL=')
    })

    it('startupCleanup removes stale Brover command files and preserves active targets', () => {
      const stalePath = join(commandDir, 'brover-stale.command')
      const activePath = join(commandDir, 'brover-active.command')
      const otherPath = join(commandDir, 'not-brover.command')

      writeFileSync(stalePath, '# stale\n', 'utf8')
      writeFileSync(activePath, '# active\n', 'utf8')
      writeFileSync(otherPath, '# keep\n', 'utf8')

      launcher.startupCleanup(['active'])

      expect(existsSync(stalePath)).toBe(false)
      expect(existsSync(activePath)).toBe(true)
      expect(existsSync(otherPath)).toBe(true)
    })

    it('shutdownCleanup removes session-managed files and preserves active targets', async () => {
      const keepResult = await launcher.launch('target-1', 'terminal', [{ name: 'KEEP', value: 'yes' }])
      const removeResult = await launcher.launch('target-2', 'terminal', [{ name: 'DROP', value: 'no' }])
      const unrelatedPath = join(commandDir, 'manual.command')

      writeFileSync(unrelatedPath, '# keep\n', 'utf8')

      launcher.shutdownCleanup(['target-1'])

      expect(existsSync(keepResult.commandPath!)).toBe(true)
      expect(existsSync(removeResult.commandPath!)).toBe(false)
      expect(existsSync(unrelatedPath)).toBe(true)
    })
  })
})
