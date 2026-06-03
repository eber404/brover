import { describe, expect, it } from 'vitest'
import { colorForCoverage, parseLineCoverage, renderBadge } from './generateCoverageBadge.mjs'

describe('generateCoverageBadge', () => {
  it('reads line coverage from summary json', () => {
    const coverage = parseLineCoverage({
      total: {
        lines: {
          pct: 80.56,
        },
      },
    })

    expect(coverage).toBe(80.56)
  })

  it('maps coverage to expected color bands', () => {
    expect(colorForCoverage(95)).toBe('#4c1')
    expect(colorForCoverage(84)).toBe('#97ca00')
    expect(colorForCoverage(72)).toBe('#dfb317')
    expect(colorForCoverage(50)).toBe('#fe7d37')
    expect(colorForCoverage(20)).toBe('#e05d44')
  })

  it('renders svg badge with label and percent', () => {
    const svg = renderBadge(80.56)

    expect(svg).toContain('coverage')
    expect(svg).toContain('80.56%')
    expect(svg).toContain('#97ca00')
    expect(svg).toContain('<svg')
  })

  it('renders scaled text coordinates large enough for badge layout', () => {
    const svg = renderBadge(80.15)

    expect(svg).toContain('x="330"')
    expect(svg).toContain('x="920"')
  })
})
