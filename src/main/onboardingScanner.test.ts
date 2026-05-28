import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile, mkdir, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ScanResult } from '../shared/models'
import { scanDotfiles } from './onboardingScanner'

async function fakeHome(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'brover-test-'))
  for (const [name, content] of Object.entries(files)) {
    const fp = join(dir, name)
    const parent = fp.substring(0, fp.lastIndexOf('/'))
    if (parent !== fp) await mkdir(parent, { recursive: true })
    await writeFile(fp, content, 'utf-8')
  }
  return dir
}

describe('onboardingScanner', () => {
  it('detects dotfiles under home dir', async () => {
    const home = await fakeHome({
      '.zshrc': 'export FOO=bar\n',
    })
    const result = await scanDotfiles(home)
    expect(result.files.length).toBeGreaterThanOrEqual(1)
    const zshrc = result.files.find((f) => f.filePath.endsWith('.zshrc'))
    expect(zshrc).toBeDefined()
    expect(zshrc!.variables).toHaveLength(1)
    expect(zshrc!.variables[0].name).toBe('FOO')
  })

  it('parses export FOO=bar', async () => {
    const home = await fakeHome({ '.testrc': 'export FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables[0]).toMatchObject({ name: 'FOO', value: 'bar' })
  })

  it('parses FOO=bar bare', async () => {
    const home = await fakeHome({ '.testrc': 'FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables[0]).toMatchObject({ name: 'FOO', value: 'bar' })
  })

  it('parses export FOO=bar double quotes', async () => {
    const home = await fakeHome({ '.testrc': 'export FOO="bar"\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables[0]).toMatchObject({ name: 'FOO', value: 'bar' })
  })

  it('parses export FOO=bar single quotes', async () => {
    const home = await fakeHome({ ".testrc": "export FOO='bar'\n" })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables[0]).toMatchObject({ name: 'FOO', value: 'bar' })
  })

  it('ignores comment lines with warning', async () => {
    const home = await fakeHome({ '.testrc': '# this is a comment\nexport FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables).toHaveLength(1)
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings[0]).toMatchObject({ line: 1, message: expect.stringContaining('comment') })
  })

  it('ignores blank lines with warning', async () => {
    const home = await fakeHome({ '.testrc': '\n\nexport FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables).toHaveLength(1)
    expect(r.warnings.length).toBeGreaterThanOrEqual(2)
    expect(r.warnings[0]).toMatchObject({ line: 1, message: expect.stringContaining('blank') })
  })

  it('ignores lines without = with warning', async () => {
    const home = await fakeHome({ '.testrc': 'echo hello\nexport FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables).toHaveLength(1)
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings[0]).toMatchObject({ line: 1, message: expect.stringContaining('assignment') })
  })

  it('ignores command/subshell lines with warning', async () => {
    const home = await fakeHome({ '.testrc': '$(echo hi)\nexport FOO=bar\n' })
    const r = await scanDotfiles(home)
    expect(r.files[0].variables).toHaveLength(1)
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('handles file permission errors and continues', async () => {
    const home = await fakeHome({
      '.noread': 'export SECRET=leak\n',
      '.readable': 'export FOO=bar\n',
    })
    await chmod(join(home, '.noread'), 0o000)
    const r = await scanDotfiles(home)
    const readable = r.files.find((f) => f.filePath.endsWith('.readable'))
    expect(readable).toBeDefined()
    expect(readable!.variables).toHaveLength(1)
    expect(r.warnings.length).toBeGreaterThanOrEqual(1)
    expect(r.warnings[0].message).toContain('permission')
    await chmod(join(home, '.noread'), 0o644)
  })

  it('returns grouped ScanResult shape', async () => {
    const home = await fakeHome({
      '.a': 'export A=1\n',
      '.b': 'export B=2\n',
    })
    const r: ScanResult = await scanDotfiles(home)
    expect(r).toHaveProperty('files')
    expect(r).toHaveProperty('warnings')
    expect(Array.isArray(r.files)).toBe(true)
    expect(Array.isArray(r.warnings)).toBe(true)
  })

  it('generates unique id for each variable', async () => {
    const home = await fakeHome({ '.testrc': 'export A=1\nexport B=2\n' })
    const r = await scanDotfiles(home)
    const ids = r.files[0].variables.map((v) => v.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('skips known non-config dotfiles like .DS_Store', async () => {
    const home = await fakeHome({
      '.DS_Store': 'garbage binary content',
      '.zshrc': 'export FOO=bar\n',
    })
    const r = await scanDotfiles(home)
    const dsStore = r.files.find((f) => f.filePath.endsWith('.DS_Store'))
    expect(dsStore).toBeUndefined()
    expect(r.files.some((f) => f.filePath.endsWith('.zshrc'))).toBe(true)
  })

  it('skips binary files with null bytes', async () => {
    const home = await fakeHome({
      '.binary': 'export FOO=bar\x00something',
      '.ok': 'export OK=yes\n',
    })
    const r = await scanDotfiles(home)
    const binary = r.files.find((f) => f.filePath.endsWith('.binary'))
    expect(binary).toBeUndefined()
    const isBinaryWarn = r.warnings.some((w) => w.message.includes('binary'))
    expect(isBinaryWarn).toBe(true)
  })

  it('does not log raw values', async () => {
    const home = await fakeHome({ '.testrc': 'export SECRET=super-sensitive-value\n' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await scanDotfiles(home)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
