import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { app, nativeImage, type NativeImage } from 'electron'

const execFileAsync = promisify(execFile)

interface TerminalIconLoaderDeps {
  getFileIcon: (bundlePath: string) => Promise<NativeImage | { isEmpty(): boolean; toDataURL(): string }>
  readBundleIconFileName: (bundlePath: string) => Promise<string | null>
  fileExists: (path: string) => boolean
  createImageFromPath: (path: string) => NativeImage | { isEmpty(): boolean; toDataURL(): string }
  convertIcnsToPng: (iconPath: string) => Promise<string | null>
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

async function convertIcnsToPng(iconPath: string): Promise<string | null> {
  try {
    const fileName = basename(iconPath, '.icns').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'icon'
    const pngPath = join(tmpdir(), `brover-terminal-icon-${fileName}.png`)
    await execFileAsync('sips', ['-s', 'format', 'png', iconPath, '--out', pngPath])
    return existsSync(pngPath) ? pngPath : null
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
    convertIcnsToPng,
  }
): Promise<string | undefined> {
  const bundleIconFileName = await deps.readBundleIconFileName(bundlePath)
  if (bundleIconFileName) {
    const bundleIconPath = join(bundlePath, 'Contents', 'Resources', normalizeIconFileName(bundleIconFileName))
    if (deps.fileExists(bundleIconPath)) {
      try {
        const convertedBundleIconPath = await deps.convertIcnsToPng(bundleIconPath)
        if (convertedBundleIconPath) {
          const convertedBundleIcon = deps.createImageFromPath(convertedBundleIconPath)
          if (!convertedBundleIcon.isEmpty()) {
            return convertedBundleIcon.toDataURL()
          }
        }

        const bundleIcon = deps.createImageFromPath(bundleIconPath)
        if (!bundleIcon.isEmpty()) {
          return bundleIcon.toDataURL()
        }
      } catch {
        // Fall through to app bundle file icon.
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
