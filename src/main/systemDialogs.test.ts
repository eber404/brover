import { describe, expect, it } from 'vitest'
import { buildDotfileOpenDialogOptions } from './systemDialogs'

describe('systemDialogs', () => {
  it('opens dotfile picker in home directory with hidden files visible', () => {
    const options = buildDotfileOpenDialogOptions('/Users/test')

    expect(options.defaultPath).toBe('/Users/test')
    expect(options.properties).toContain('openFile')
    expect(options.properties).toContain('showHiddenFiles')
    expect(options.filters).toBeUndefined()
  })
})
