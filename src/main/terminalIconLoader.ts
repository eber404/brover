import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, nativeImage, type NativeImage } from 'electron'

const execFileAsync = promisify(execFile)

interface TerminalIconLoaderDeps {
  getFileIcon: (bundlePath: string) => Promise<NativeImage | { isEmpty(): boolean; toDataURL(): string }>
  readBundleIconFileName: (bundlePath: string) => Promise<string | null>
  fileExists: (path: string) => boolean
  createImageFromPath: (path: string) => NativeImage | { isEmpty(): boolean; toDataURL(): string }
}

function normalizeIconFileName(iconFileName: string): string {
  return iconFileName.endsWith('.icns') ? iconFileName : `${iconFileName}.icns`
}

async function readBundleIconFileName(bundlePath: string): Promise<string | null> {
  try {
    const infoPlistPath = join(bundlePath, 'Contents', 'Info.plist')
    const { stdout } = await execFileAsync('plutil', ['-extract', 'CFBundleIconFile', 'raw', '-o', '-', infoPlistPath])
    const iconFileName = stdout.trim()
    return iconFileName || null
  } catch {
    return null
  }
}

export async function loadTerminalIconDataUrl(
  bundlePath: string,
  deps: TerminalIconLoaderDeps = {
    getFileIcon: (path) => app.getFileIcon(path, { size: 'normal' }),
    readBundleIconFileName,
    fileExists: existsSync,
    createImageFromPath: nativeImage.createFromPath,
  }
): Promise<string | undefined> {
  const bundleIconFileName = await deps.readBundleIconFileName(bundlePath)
  if (bundleIconFileName) {
    const bundleIconPath = join(bundlePath, 'Contents', 'Resources', normalizeIconFileName(bundleIconFileName))
    if (deps.fileExists(bundleIconPath)) {
      try {
        const bundleIconFile = await deps.getFileIcon(bundleIconPath)
        if (!bundleIconFile.isEmpty()) {
          return bundleIconFile.toDataURL()
        }
      } catch {
        // Fall through to createFromPath.
      }

      const bundleIcon = deps.createImageFromPath(bundleIconPath)
      if (!bundleIcon.isEmpty()) {
        return bundleIcon.toDataURL()
      }
    }
  }

  try {
    const fileIcon = await deps.getFileIcon(bundlePath)
    if (!fileIcon.isEmpty()) {
      return fileIcon.toDataURL()
    }
  } catch {
    return undefined
  }

  return undefined
}
