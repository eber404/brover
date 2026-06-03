import type { OpenDialogOptions } from 'electron'

export function buildDotfileOpenDialogOptions(homePath: string): OpenDialogOptions {
  return {
    defaultPath: homePath,
    properties: ['openFile', 'showHiddenFiles'],
  }
}
