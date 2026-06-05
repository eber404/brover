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
    })

    expect(result).toBe('data:image/png;base64,file-icon')
  })

  it('loads bundle icon files from image contents instead of generic file icons', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,generic-icns-file'))
    const createImageFromPath = vi.fn().mockReturnValue(makeImage('data:image/png;base64,bundle-icon'))

    const result = await loadTerminalIconDataUrl('/Applications/iTerm.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath,
    })

    expect(result).toBe('data:image/png;base64,bundle-icon')
    expect(createImageFromPath).toHaveBeenCalledWith('/Applications/iTerm.app/Contents/Resources/AppIcon.icns')
    expect(getFileIcon).not.toHaveBeenCalled()
  })

  it('prefers bundle icon over generic file icon for app bundles', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon'))

    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath: vi.fn().mockReturnValue(makeImage('data:image/png;base64,bundle-icon')),
    })

    expect(result).toBe('data:image/png;base64,bundle-icon')
    expect(getFileIcon).not.toHaveBeenCalled()
  })

  it('falls back to app file icon when bundle icon image is empty', async () => {
    const getFileIcon = vi.fn().mockResolvedValue(makeImage('data:image/png;base64,file-icon'))

    const result = await loadTerminalIconDataUrl('/Applications/Warp.app', {
      getFileIcon,
      readBundleIconFileName: vi.fn().mockResolvedValue('AppIcon'),
      fileExists: vi.fn().mockReturnValue(true),
      createImageFromPath: vi.fn().mockReturnValue(makeImage()),
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
    })

    expect(result).toBeUndefined()
  })
})
