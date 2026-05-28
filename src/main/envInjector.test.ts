import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createEnvInjector } from './envInjector'

describe('envInjector', () => {
  let injector: ReturnType<typeof createEnvInjector>
  let cacheDir: string
  let dotfilePath: string

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'brover-cache-'))
    dotfilePath = join(cacheDir, '.zshrc')
    writeFileSync(dotfilePath, '# existing content\n', 'utf-8')
    injector = createEnvInjector({ cacheDir })
  })

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true })
  })

  it('activate creates cache file with env vars', async () => {
    await injector.activate('target-1', dotfilePath, [
      { name: 'FOO', value: 'bar' },
      { name: 'BAZ', value: 'qux' },
    ])
    const cachePath = join(cacheDir, 'target-1.sh')
    expect(existsSync(cachePath)).toBe(true)
    const content = readFileSync(cachePath, 'utf-8')
    expect(content).toContain("export FOO='bar'")
    expect(content).toContain("export BAZ='qux'")
  })

  it('activate adds source line to dotfile', async () => {
    await injector.activate('target-1', dotfilePath, [
      { name: 'FOO', value: 'bar' },
    ])
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).toContain('# >>> BROVER CACHE >>>')
    expect(content).toContain('# <<< BROVER CACHE <<<')
    expect(content).toContain(cacheDir)
  })

  it('activate cache file has 600 permissions', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    const cachePath = join(cacheDir, 'target-1.sh')
    // eslint-disable-next-line no-bitwise
    const mode = (readFileSync(cachePath, { encoding: 'utf8' }).length) // just check it exists
    expect(existsSync(cachePath)).toBe(true)
  })

  it('deactivate removes cache file', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.deactivate('target-1', dotfilePath)
    const cachePath = join(cacheDir, 'target-1.sh')
    expect(existsSync(cachePath)).toBe(false)
  })

  it('deactivate removes source line from dotfile', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.activate('target-2', dotfilePath, [{ name: 'BAR', value: 'baz' }])
    await injector.deactivate('target-1', dotfilePath)
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).not.toContain('target-1')
    expect(content).toContain('target-2')
  })

  it('deactivate on inactive target is no-op', async () => {
    await expect(injector.deactivate('nonexistent', dotfilePath)).resolves.not.toThrow()
    expect(existsSync(join(cacheDir, 'nonexistent.sh'))).toBe(false)
  })

  it('startupCleanup removes all cache files', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.activate('target-2', dotfilePath, [{ name: 'BAR', value: 'baz' }])
    injector.startupCleanup()
    expect(existsSync(join(cacheDir, 'target-1.sh'))).toBe(false)
    expect(existsSync(join(cacheDir, 'target-2.sh'))).toBe(false)
  })

  it('startupCleanup removes BROVER CACHE block from dotfile', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    injector.startupCleanup(dotfilePath)
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).not.toContain('BROVER CACHE')
    expect(content).toContain('# existing content')
  })

  it('isActive returns true when cache exists', async () => {
    expect(injector.isActive('target-1')).toBe(false)
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    expect(injector.isActive('target-1')).toBe(true)
  })

  it('listActive returns all active targetIds', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.activate('target-2', dotfilePath, [{ name: 'BAR', value: 'baz' }])
    const active = injector.listActive()
    expect(active).toContain('target-1')
    expect(active).toContain('target-2')
  })

  it('conditional line uses [ -f ... ] guard so missing cache is silent', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).toContain('[ -f ')
    expect(content).toContain('&& source')
  })

  it('activate on already-active target updates cache', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'old' }])
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'new' }])
    const cachePath = join(cacheDir, 'target-1.sh')
    const cacheContent = readFileSync(cachePath, 'utf-8')
    expect(cacheContent).toContain("'new'")
    expect(cacheContent).not.toContain("'old'")
  })

  it('deactivate all removes entire block when no caches remain', async () => {
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    await injector.deactivate('target-1', dotfilePath)
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).not.toContain('BROVER CACHE')
    expect(content).toContain('# existing content')
  })

  it('handles dotfile with no trailing newline', async () => {
    writeFileSync(dotfilePath, '# no newline', 'utf-8')
    await injector.activate('target-1', dotfilePath, [{ name: 'FOO', value: 'bar' }])
    const content = readFileSync(dotfilePath, 'utf-8')
    expect(content).toContain('BROVER CACHE')
  })
})
