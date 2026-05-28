import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ScanResult, ScanFile, ScannedVariable, ScanWarning } from '../shared/models'

const MAX_FILE_SIZE = 512 * 1024 // 512KB

const SKIP_DOTFILES = new Set([
  '.DS_Store',
  '.git',
  '.svn',
  '.cache',
  '.local',
  '.npm',
  '.nvm',
  '.config',
  '.cargo',
  '.rustup',
  '.gem',
  '.bundle',
  '.Trash',
  '.Trashes',
])

const ENV_ASSIGNMENT = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/

function parseLine(
  line: string,
  lineNumber: number,
  filePath: string,
  warnings: ScanWarning[],
): ScannedVariable | null {
  const trimmed = line.trim()

  if (!trimmed) {
    warnings.push({ filePath, line: lineNumber, message: 'blank line' })
    return null
  }

  if (trimmed.startsWith('#')) {
    warnings.push({ filePath, line: lineNumber, message: 'comment line' })
    return null
  }

  if (trimmed.includes('$(') || trimmed.includes('`')) {
    warnings.push({ filePath, line: lineNumber, message: 'subshell expression' })
    return null
  }

  const match = trimmed.match(ENV_ASSIGNMENT)
  if (!match) {
    warnings.push({ filePath, line: lineNumber, message: 'not an env assignment' })
    return null
  }

  let value = match[2].trim()

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }

  return {
    id: randomUUID(),
    name: match[1],
    value,
    sourceFile: filePath,
  }
}

export async function scanDotfiles(homeDir: string): Promise<ScanResult> {
  const files: ScanFile[] = []
  const warnings: ScanWarning[] = []

  let entries: string[]
  try {
    entries = await readdir(homeDir)
  } catch {
    return { files, warnings }
  }

  const dotfiles = entries.filter(
    (e) => e.startsWith('.') && !SKIP_DOTFILES.has(e),
  )

  for (const entry of dotfiles) {
    const filePath = join(homeDir, entry)

    let st
    try {
      st = await stat(filePath)
    } catch {
      warnings.push({ filePath, message: 'cannot stat file: permission denied' })
      continue
    }

    if (!st.isFile()) continue
    if (st.size > MAX_FILE_SIZE) {
      warnings.push({ filePath, message: 'file too large, skipped' })
      continue
    }

    let content: string
    try {
      content = await readFile(filePath, 'utf-8')
    } catch {
      warnings.push({ filePath, message: 'cannot read file: permission denied' })
      continue
    }

    if (content.includes('\x00')) {
      warnings.push({ filePath, message: 'binary file, skipped' })
      continue
    }

    const variables: ScannedVariable[] = []
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i], i + 1, filePath, warnings)
      if (parsed) variables.push(parsed)
    }

    if (variables.length > 0) {
      files.push({ filePath, variables })
    }
  }

  return { files, warnings }
}
