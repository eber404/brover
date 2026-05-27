export interface EnvEntry {
  name: string
  value: string
}

const BEGIN_MARKER = '# >>> BROVER MANAGED START >>>'
const END_MARKER = '# <<< BROVER MANAGED END <<<'

function escapeShellValue(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

export function buildManagedShellBlock(entries: EnvEntry[]): string {
  const lines = entries.map((entry) => `export ${entry.name}=${escapeShellValue(entry.value)}`)
  return [BEGIN_MARKER, ...lines, END_MARKER, ''].join('\n')
}

export function upsertManagedShellBlock(content: string, block: string): string {
  const start = content.indexOf(BEGIN_MARKER)
  const end = content.indexOf(END_MARKER)
  if (start >= 0 && end > start) {
    const afterEnd = end + END_MARKER.length
    const tail = content.slice(afterEnd).replace(/^\n?/, '')
    const head = content.slice(0, start).replace(/\n?$/, '\n')
    return `${head}${block}${tail}`
  }

  const normalized = content.trimEnd()
  if (!normalized) return `${block}`
  return `${normalized}\n\n${block}`
}

export function buildDotenvContent(entries: EnvEntry[]): string {
  const lines = entries.map((entry) => `${entry.name}=${entry.value.replace(/\n/g, '\\n')}`)
  return `${lines.join('\n')}\n`
}
