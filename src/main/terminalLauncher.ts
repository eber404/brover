import { execSync } from 'child_process'
import { existsSync, readdirSync, rmSync, writeFileSync } from 'fs'
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
  commandDir?: string
}

const TERMINAL_APPS: Omit<TerminalApp, 'installed'>[] = [
  { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app' },
  { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app' },
  { id: 'terminal', name: 'Terminal', bundlePath: '/System/Applications/Utilities/Terminal.app' },
]

export function createTerminalLauncher(deps: TerminalLauncherDeps = {}) {
  const commandDir = deps.commandDir ?? tmpdir()
  const openTerminal = deps.openTerminal ?? ((terminalName: string, commandPath: string) => {
    execSync(`open -a "${terminalName}" "${commandPath}"`, { timeout: 5000 })
  })
  const sessionCommandPaths = new Set<string>()

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
    return `#!/bin/bash\n# Brover envs — target: ${targetId}\n${exportBlock}cd "$HOME"\nexec "$SHELL"\n`
  }

  function commandPathForTarget(targetId: string): string {
    return join(commandDir, `brover-${targetId}.command`)
  }

  function preservedCommandPaths(preserveTargetIds: string[]): Set<string> {
    return new Set(preserveTargetIds.map(commandPathForTarget))
  }

  function startupCleanup(preserveTargetIds: string[]): void {
    const preservedPaths = preservedCommandPaths(preserveTargetIds)
    for (const entry of readdirSync(commandDir)) {
      if (!entry.startsWith('brover-') || !entry.endsWith('.command')) {
        continue
      }

      const commandPath = join(commandDir, entry)
      if (preservedPaths.has(commandPath)) {
        continue
      }

      rmSync(commandPath, { force: true })
    }
  }

  function shutdownCleanup(preserveTargetIds: string[]): void {
    const preservedPaths = preservedCommandPaths(preserveTargetIds)
    for (const commandPath of sessionCommandPaths) {
      if (preservedPaths.has(commandPath)) {
        continue
      }

      rmSync(commandPath, { force: true })
      sessionCommandPaths.delete(commandPath)
    }
  }

  async function launch(
    targetId: string,
    terminalAppId: string,
    entries: EnvEntry[],
  ): Promise<{ success: boolean; commandPath?: string }> {
    const commandPath = commandPathForTarget(targetId)

    const content = buildCommandContent(targetId, entries)
    writeFileSync(commandPath, content, { mode: 0o755 })
    sessionCommandPaths.add(commandPath)

    const terminal = TERMINAL_APPS.find(t => t.id === terminalAppId) ?? TERMINAL_APPS[2]

    try {
      openTerminal(terminal.name, commandPath)
    } catch {
      // open may fail if no terminal installed, but file is created
    }

    return { success: true, commandPath }
  }

  return { listTerminals, launch, startupCleanup, shutdownCleanup }
}
