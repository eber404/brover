import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function parseLineCoverage(summary) {
  const value = summary?.total?.lines?.pct
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Coverage summary missing total.lines.pct')
  }
  return Number(value.toFixed(2))
}

export function colorForCoverage(coverage) {
  if (coverage >= 90) return '#4c1'
  if (coverage >= 80) return '#97ca00'
  if (coverage >= 70) return '#dfb317'
  if (coverage >= 50) return '#fe7d37'
  return '#e05d44'
}

function textWidth(text) {
  return text.length * 7 + 10
}

function escapeXml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function renderBadge(coverage) {
  const label = 'coverage'
  const message = `${coverage.toFixed(2)}%`
  const labelWidth = textWidth(label)
  const messageWidth = textWidth(message)
  const totalWidth = labelWidth + messageWidth
  const messageX = labelWidth + messageWidth / 2
  const color = colorForCoverage(coverage)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="#555"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/><rect width="${totalWidth}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text x="${labelWidth / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(label.length + 1) * 70}">${escapeXml(label)}</text><text x="${labelWidth / 2}" y="140" transform="scale(.1)" textLength="${(label.length + 1) * 70}">${escapeXml(label)}</text><text x="${messageX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${message.length * 70}">${escapeXml(message)}</text><text x="${messageX}" y="140" transform="scale(.1)" textLength="${message.length * 70}">${escapeXml(message)}</text></g></svg>`
}

export function generateCoverageBadge(summaryPath, outputPath) {
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
  const coverage = parseLineCoverage(summary)
  const svg = renderBadge(coverage)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, svg)
  return coverage
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const summaryPath = process.argv[2]
  const outputPath = process.argv[3]

  if (!summaryPath || !outputPath) {
    throw new Error('Usage: node scripts/generateCoverageBadge.mjs <summary.json> <output.svg>')
  }

  const coverage = generateCoverageBadge(summaryPath, outputPath)
  console.log(`Generated coverage badge: ${coverage.toFixed(2)}%`)
}
