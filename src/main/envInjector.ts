import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'

const CACHE_DIR = 'env-cache'
const BEGIN_MARKER = '# >>> BROVER CACHE >>>'
const END_MARKER = '# <<< BROVER CACHE <<<'

export interface EnvEntry {
  name: string
  value: string
}

export function createEnvInjector(opts?: { cacheDir?: string }) {
  const baseDir = opts?.cacheDir ?? join(homedir(), 'Library', 'Application Support', 'brover')
  const cacheDir = opts?.cacheDir ?? join(baseDir, CACHE_DIR)

  function ensureCacheDir() {
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 })
  }

  function cachePath(targetId: string): string {
    return join(cacheDir, `${targetId}.sh`)
  }

  function escapeShellValue(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`
  }

  function buildCacheContent(targetId: string, entries: EnvEntry[]): string {
    const lines = entries.map(e => `export ${e.name}=${escapeShellValue(e.value)}`)
    return `# Brover envs — target: ${targetId}\n${lines.join('\n')}\n`
  }

  function resolvePath(dotfilePath: string): string {
    return dotfilePath.replace(/^~/, homedir())
  }

  function readDotfile(path: string): string {
    const resolved = resolvePath(path)
    if (!existsSync(resolved)) return ''
    try {
      if (!statSync(resolved).isFile()) return ''
    } catch {
      return ''
    }
    return readFileSync(resolved, 'utf-8')
  }

  function writeDotfile(path: string, content: string) {
    const resolved = resolvePath(path)
    try {
      if (existsSync(resolved) && !statSync(resolved).isFile()) return
    } catch {
      return
    }
    const dir = dirname(resolved)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(resolved, content, { mode: 0o644 })
  }

  function parseBlock(content: string): { preamble: string; lines: string[]; postamble: string } | null {
    const start = content.indexOf(BEGIN_MARKER)
    const end = content.indexOf(END_MARKER)
    if (start === -1 || end === -1) return null
    return {
      preamble: content.slice(0, start),
      lines: content.slice(start + BEGIN_MARKER.length, end).trim().split('\n').filter(Boolean),
      postamble: content.slice(end + END_MARKER.length),
    }
  }

  function injectSourceLine(dotfilePath: string, targetId: string) {
    const content = readDotfile(dotfilePath)
    const cp = cachePath(targetId)
    const line = `[ -f "${cp}" ] && source "${cp}"`

    const block = parseBlock(content)
    if (block) {
      const existingIdx = block.lines.findIndex(l => l.includes(`"${targetId}.sh"`))
      if (existingIdx >= 0) {
        block.lines[existingIdx] = line
      } else {
        block.lines.push(line)
      }
      const newContent = block.preamble + BEGIN_MARKER + '\n' + block.lines.join('\n') + '\n' + END_MARKER + block.postamble
      writeDotfile(dotfilePath, newContent)
    } else {
      const newContent = content.trimEnd() + '\n\n' + BEGIN_MARKER + '\n' + line + '\n' + END_MARKER + '\n'
      writeDotfile(dotfilePath, newContent)
    }
  }

  function removeSourceLine(dotfilePath: string, targetId: string) {
    const content = readDotfile(dotfilePath)
    const block = parseBlock(content)
    if (!block) return

    const filtered = block.lines.filter(l => !l.includes(targetId))
    let newContent: string
    if (filtered.length === 0) {
      newContent = block.preamble.trimEnd() + '\n' + block.postamble.trimStart()
    } else {
      newContent = block.preamble + BEGIN_MARKER + '\n' + filtered.join('\n') + '\n' + END_MARKER + block.postamble
    }
    writeDotfile(dotfilePath, newContent)
  }

  function removeAllSourceLines(dotfilePath: string) {
    const content = readDotfile(dotfilePath)
    const block = parseBlock(content)
    if (!block) return
    const newContent = block.preamble.trimEnd() + '\n' + block.postamble.trimStart()
    writeDotfile(dotfilePath, newContent)
  }

  return {
    async activate(targetId: string, dotfilePath: string, entries: EnvEntry[]): Promise<void> {
      ensureCacheDir()
      const cacheContent = buildCacheContent(targetId, entries)
      writeFileSync(cachePath(targetId), cacheContent, { mode: 0o600 })
      injectSourceLine(dotfilePath, targetId)
    },

    async deactivate(targetId: string, dotfilePath: string): Promise<void> {
      const cp = cachePath(targetId)
      if (existsSync(cp)) {
        unlinkSync(cp)
      }
      removeSourceLine(dotfilePath, targetId)
    },

    isActive(targetId: string): boolean {
      return existsSync(cachePath(targetId))
    },

    listActive(): string[] {
      if (!existsSync(cacheDir)) return []
      return readdirSync(cacheDir).filter(f => f.endsWith('.sh')).map(f => f.replace('.sh', ''))
    },

    startupCleanup(dotfilePath?: string): void {
      if (existsSync(cacheDir)) {
        for (const f of readdirSync(cacheDir).filter(f => f.endsWith('.sh'))) {
          unlinkSync(join(cacheDir, f))
        }
      }
      if (dotfilePath) {
        removeAllSourceLines(dotfilePath)
      }
    },
  }
}
