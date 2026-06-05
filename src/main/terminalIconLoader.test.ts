import { describe, expect, it, vi } from 'vitest'
import { loadTerminalIconDataUrl } from './terminalIconLoader'

function makeImage(dataUrl?: string) {
  return {
    isEmpty: () => !dataUrl,
    toDataURL: () => dataUrl ?? '',
  }
}

describe('terminalIconLoader', () => {
  it('returns app file icon when available', async () => {
    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon: vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon')),
      readBundleIconFileName: vi.fn().mockResolvedValue(null),
      fileExists: vi.fn(),
      createImageFromPath: vi.fn(),
      convertIcnsToPng: vi.fn(),
    })

    expect(result).toBe('data:image/png;base64,file-icon')
  })

  it('prefers converted png over direct icns image loads for bundle icons', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon'))
    const createImageFromPath = vi
      .fn()
      .mockReturnValueOnce(makeImage('data:image/png;base64,bundle-icon'))
    const convertIcnsToPng = vi.fn().mockReturnValue('/tmp/AppIcon.png')

    const result = await loadTerminalIconDataUrl('/Applications/iTerm.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath,
      convertIcnsToPng,
    })

    expect(result).toBe('data:image/png;base64,bundle-icon')
    expect(convertIcnsToPng).toHaveBeenCalledWith('/Applications/iTerm.app/Contents/Resources/AppIcon.icns')
    expect(createImageFromPath).toHaveBeenCalledWith('/tmp/AppIcon.png')
    expect(getFileIcon).not.toHaveBeenCalled()
  })

  it('prefers bundle icon over generic file icon for app bundles', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon'))

    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath: vi.fn().mockReturnValue(makeImage('data:image/png;base64,bundle-icon')),
      convertIcnsToPng: vi.fn().mockReturnValue('/tmp/AppIcon.png'),
    })

    expect(result).toBe('data:image/png;base64,bundle-icon')
    expect(getFileIcon).not.toHaveBeenCalled()
  })

  it('falls back to direct icns load when converted png is empty', async () => {
    const createImageFromPath = vi
      .fn()
      .mockReturnValueOnce(makeImage())
      .mockReturnValueOnce(makeImage('data:image/png;base64,bundle-icon'))
    const convertIcnsToPng = vi.fn().mockReturnValue('/tmp/Warp.png')

    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon: vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon')),
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath,
      convertIcnsToPng,
    })

    expect(result).toBe('data:image/png;base64,bundle-icon')
    expect(convertIcnsToPng).toHaveBeenCalledWith('/Applications/Warp.app/Contents/Resources/AppIcon.icns')
    expect(createImageFromPath).toHaveBeenNthCalledWith(1, '/tmp/Warp.png')
    expect(createImageFromPath).toHaveBeenNthCalledWith(2, '/Applications/Warp.app/Contents/Resources/AppIcon.icns')
  })

  it('falls back to app file icon when bundle icon conversion still fails', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon'))

    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath: vi.fn().mockReturnValue(makeImage()),
      convertIcnsToPng: vi.fn().mockReturnValue(null),
    })

    expect(result).toBe('data:image/png;base64,file-icon')
    expect(getFileIcon).toHaveBeenCalledWith('/Applications/Warp.app')
  })

  it('returns undefined when both strategies fail', async () => {
    const result = await loadTerminalIconDataUrl('/Applications/Unknown.app', {
      getFileIcon: vi.fn().mockResolvedValue(makeImage()),
      readBundleIconFileName: vi.fn().mockResolvedValue(null),
      fileExists: vi.fn().mockReturnValue(false),
      createImageFromPath: vi.fn().mockReturnValue(makeImage()),
      convertIcnsToPng: vi.fn().mockReturnValue(null),
    })

    expect(result).toBeUndefined()
  })
})
