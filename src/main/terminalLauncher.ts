import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'

export interface EnvEntry {
  name: string
  value: string
}

export interface TerminalApp {
  id: string
  name: string
  bundlePath: string
  installed: boolean
}

const TERMINAL_APPS: Omit<TerminalApp, 'installed'>[] = [
  { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
  { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
  { id: 'terminal', name: 'Terminal', bundlePath: '/System/Applications/Utilities/Terminal.app' },
]

export function createTerminalLauncher() {
  function listTerminals(): TerminalApp[] {
    return TERMINAL_APPS.map(app => ({
      ...app,
      installed: app.id === 'terminal' || existsSync(app.bundlePath),
    }))
  }

  function escapeShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
  }

  function buildCommandContent(targetId: string, entries: EnvEntry[]): string {
    const exports = entries.map(e => `export ${e.name}=${escapeShellValue(e.value)}`).join('\n')
    return `#!/bin/bash\n# Brover envs — target: ${targetId}\n${exports}\necho "Brover — target '${targetId}' active"\nexec $SHELL\n`
  }

  async function launch(
    targetId: string,
    terminalAppId: string,
    entries: EnvEntry[],
  ): Promise<{ success: boolean; commandPath?: string }> {
    if (entries.length === 0) {
      console.warn('[terminalLauncher] No envs to inject, skipping launch')
      return { success: true }
    }

    const commandPath = join(tmpdir(), `brover-${targetId}.command`)

    const { writeFileSync, chmodSync } = require('fs')
    const content = buildCommandContent(targetId, entries)
    writeFileSync(commandPath, content, { mode: 0o755 })

    const terminal = TERMINAL_APPS.find(t => t.id === terminalAppId) ?? TERMINAL_APPS[2]

    try {
      execSync(`open -a "${terminal.name}" "${commandPath}"`, { timeout: 5000 })
    } catch {
      // open may fail if no terminal installed, but file is created
    }

    return { success: true, commandPath }
  }

  return { listTerminals, launch }
}
