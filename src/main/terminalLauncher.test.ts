import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTerminalLauncher } from './terminalLauncher'

describe('terminalLauncher', () => {
  let launcher: ReturnType<typeof createTerminalLauncher>

  beforeEach(() => {
    launcher = createTerminalLauncher()
  })

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
    it('succeeds even when no envs provided', async () => {
      const result = await launcher.launch('target-1', 'terminal', [])
      expect(result.success).toBe(true)
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

    it('reuses same .command file path for same targetId (no random suffix)', async () => {
      const result1 = await launcher.launch('target-1', 'terminal', [{ name: 'FOO', value: 'bar' }])
      const result2 = await launcher.launch('target-1', 'terminal', [{ name: 'BAZ', value: 'qux' }])
      expect(result1.commandPath).toBe(result2.commandPath)
      expect(result1.commandPath).toContain('brover-target-1.command')
      rmSync(result1.commandPath!)
    })

    it('writes new content when called twice (file is overwritten, not appended)', async () => {
      const l1 = createTerminalLauncher()
      const l2 = createTerminalLauncher()
      await l1.launch('target-B', 'terminal', [{ name: 'INITIAL', value: 'first' }])
      await l2.launch('target-B', 'terminal', [{ name: 'UPDATED', value: 'second' }])
      const path = join(tmpdir(), 'brover-target-B.command')
      const content = readFileSync(path, 'utf8')
      expect(content).toContain('export UPDATED=')
      expect(content).not.toContain('export INITIAL=')
      rmSync(path)
    })
  })
})
