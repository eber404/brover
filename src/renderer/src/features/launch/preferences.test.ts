// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getLaunchPreferences,
  getPreferredTerminalId,
  promoteLaunchDefault,
  saveLaunchPreferences,
} from './preferences'

describe('launch preferences', () => {
  function installStorage() {
    const storage = new Map<string, string>()
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
      clear: () => {
        storage.clear()
      },
    }

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    })

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    })
  }

  beforeEach(() => {
    installStorage()
  })

  it('saves and reads ordered favorites', () => {
    saveLaunchPreferences({
      favoriteTerminalIds: ['warp', 'iterm2'],
      defaultTerminalId: 'warp',
    })

    expect(getLaunchPreferences(['warp', 'iterm2', 'terminal'])).toEqual({
      favoriteTerminalIds: ['warp', 'iterm2'],
      defaultTerminalId: 'warp',
    })
  })

  it('falls back to legacy terminal key', () => {
    window.localStorage.setItem('brover.terminal', 'iterm2')

    expect(getPreferredTerminalId(['warp', 'iterm2', 'terminal'])).toBe('iterm2')
  })

  it('filters invalid ids and falls back to terminal', () => {
    window.localStorage.setItem(
      'brover.launch-preferences',
      JSON.stringify({
        favoriteTerminalIds: ['ghost', 'warp'],
        defaultTerminalId: 'ghost',
      })
    )

    expect(getLaunchPreferences(['warp', 'terminal'])).toEqual({
      favoriteTerminalIds: ['warp'],
      defaultTerminalId: 'warp',
    })
    expect(getPreferredTerminalId(['terminal'])).toBe('terminal')
  })

  it('promotes chosen favorite to front and makes it default', () => {
    expect(
      promoteLaunchDefault(
        {
          favoriteTerminalIds: ['warp', 'iterm2', 'terminal'],
          defaultTerminalId: 'warp',
        },
        'terminal'
      )
    ).toEqual({
      favoriteTerminalIds: ['terminal', 'warp', 'iterm2'],
      defaultTerminalId: 'terminal',
    })
  })
})
