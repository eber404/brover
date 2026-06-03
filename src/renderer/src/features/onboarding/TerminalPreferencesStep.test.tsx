// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TerminalPreferencesStep from './TerminalPreferencesStep'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('TerminalPreferencesStep', () => {
  afterEach(cleanup)

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
    window.brover = {
      launch: {
        listTerminals: vi.fn().mockResolvedValue({
          terminals: [
            { id: 'warp', name: 'Warp', bundlePath: '/Applications/Warp.app', installed: true },
            { id: 'iterm2', name: 'iTerm2', bundlePath: '/Applications/iTerm.app', installed: true },
            { id: 'terminal', name: 'Terminal', bundlePath: '/System/Applications/Utilities/Terminal.app', installed: true },
          ],
        }),
      },
    } as any
  })

  it('requires favorite before continue and saves drag-reordered favorites', async () => {
    const onContinue = vi.fn()
    render(<TerminalPreferencesStep onBack={() => {}} onContinue={onContinue} />)

    await waitFor(() => {
      expect(screen.getByText(/onboarding\.terminalPreferences\.title/i)).toBeTruthy()
    })

    const continueButton = screen.getByText(/onboarding\.terminalPreferences\.continue/i)
    expect(continueButton.hasAttribute('disabled')).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /iTerm2/i }))
    expect(continueButton.hasAttribute('disabled')).toBe(false)

    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'iterm2'),
    }

    fireEvent.dragStart(screen.getByTestId('favorite-terminal-iterm2'), {
      dataTransfer: transfer,
    })
    fireEvent.dragOver(screen.getByTestId('favorite-terminal-warp'), {
      dataTransfer: transfer,
    })
    fireEvent.drop(screen.getByTestId('favorite-terminal-warp'), {
      dataTransfer: transfer,
    })

    fireEvent.click(continueButton)

    expect(onContinue).toHaveBeenCalledWith({
      favoriteTerminalIds: ['iterm2', 'warp'],
      defaultTerminalId: 'iterm2',
    })
  })
})
