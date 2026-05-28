import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTerminalLauncher } from './terminalLauncher'

describe('terminalLauncher', () => {
  const launcher = createTerminalLauncher()

  afterEach(() => {
    vi.restoreAllMocks()
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
    it('throws when no envs provided', async () => {
      await expect(launcher.launch('target-1', 'terminal', [])).rejects.toThrow('No enabled envs')
    })

    it('creates .command file with correct env vars', async () => {
      const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
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
      expect(content).toContain('exec $SHELL')
      rmSync(result.commandPath!)
    })

    it('.command file is executable (mode 0o755)', async () => {
      const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
      const result = await launcher.launch('target-1', 'terminal', [
        { name: 'FOO', value: 'bar' },
      ])
      const { statSync } = require('fs')
      const mode = statSync(result.commandPath!).mode
      // eslint-disable-next-line no-bitwise
      expect(mode & 0o777).toBe(0o755)
      rmSync(result.commandPath!)
    })

    it('escapes single quotes in values', async () => {
      const mockExecSync = vi.spyOn(require('child_process'), 'execSync')
      const result = await launcher.launch('target-1', 'terminal', [
        { name: "PASSWORD", value: "pass'word" },
      ])
      const content = readFileSync(result.commandPath!, 'utf-8')
      expect(content).toContain("export PASSWORD='pass'\\''word'")
      rmSync(result.commandPath!)
    })
  })
})
