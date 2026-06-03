import { execSync } from 'child_process'
import { existsSync } from 'fs'
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

interface TerminalLauncherDeps {
  openTerminal?: (terminalName: string, commandPath: string) => void
}

const TERMINAL_APPS: Omit<TerminalApp, 'installed'>[] = [
  { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
  { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
  { id: 'terminal', name: 'Terminal', bundlePath: '/System/Applications/Utilities/Terminal.app' },
]

export function createTerminalLauncher(deps: TerminalLauncherDeps = {}) {
  const openTerminal = deps.openTerminal ?? ((terminalName: string, commandPath: string) => {
    execSync(`open -a "${terminalName}" "${commandPath}"`, { timeout: 5000 })
  })

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
    const exportBlock = exports ? `${exports}\n` : ''
    return `#!/bin/bash\n# Brover envs — target: ${targetId}\n${exportBlock}exec $SHELL\n`
  }

  async function launch(
    targetId: string,
    terminalAppId: string,
    entries: EnvEntry[],
  ): Promise<{ success: boolean; commandPath?: string }> {
    const commandPath = join(tmpdir(), `brover-${targetId}.command`)

    const { writeFileSync, chmodSync } = require('fs')
    const content = buildCommandContent(targetId, entries)
    writeFileSync(commandPath, content, { mode: 0o755 })

    const terminal = TERMINAL_APPS.find(t => t.id === terminalAppId) ?? TERMINAL_APPS[2]

    try {
      openTerminal(terminal.name, commandPath)
    } catch {
      // open may fail if no terminal installed, but file is created
    }

    return { success: true, commandPath }
  }

  return { listTerminals, launch }
}
