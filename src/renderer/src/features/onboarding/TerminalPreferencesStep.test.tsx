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

  it('makes the whole terminal card clickable', async () => {
    const onContinue = vi.fn()
    render(<TerminalPreferencesStep onBack={() => {}} onContinue={onContinue} />)

    await waitFor(() => {
      expect(screen.getByTestId('favorite-terminal-warp')).toBeTruthy()
    })

    const continueButton = screen.getByText(/onboarding\.terminalPreferences\.continue/i)
    expect(continueButton.hasAttribute('disabled')).toBe(true)

    fireEvent.click(screen.getByTestId('favorite-terminal-warp'))

    expect(continueButton.hasAttribute('disabled')).toBe(false)
  })

  it('keeps the back button inside the content column instead of a negative offset', async () => {
    render(<TerminalPreferencesStep onBack={vi.fn()} onContinue={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })

    const backButton = screen.getByRole('button', { name: 'back' })
    expect(backButton.closest('[class*="absolute"]')).toBeNull()
    expect(backButton.className).not.toContain('-left-')
    expect(backButton.className).not.toContain('-ml-')
  })

  it('calls onBack from back button', async () => {
    const onBack = vi.fn()
    render(<TerminalPreferencesStep onBack={onBack} onContinue={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders refresh state when terminal load fails', async () => {
    window.brover.launch.listTerminals = vi.fn().mockRejectedValue(new Error('Load failed')) as any
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })

    render(<TerminalPreferencesStep onBack={() => {}} onContinue={() => {}} />)

    expect(await screen.findByText('Load failed')).toBeTruthy()
    fireEvent.click(screen.getByText(/common\.refresh/i))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('renders refresh state when no installed terminals exist', async () => {
    window.brover.launch.listTerminals = vi.fn().mockResolvedValue({
      terminals: [{ id: 'ghost', name: 'Ghost', bundlePath: '/Ghost.app', installed: false }],
    }) as any

    render(<TerminalPreferencesStep onBack={() => {}} onContinue={() => {}} />)

    expect(await screen.findByText(/onboarding\.terminalPreferences\.error/i)).toBeTruthy()
  })

  it('move controls stop at bounds and unchecking favorite disables continue again', async () => {
    const onContinue = vi.fn()
    render(<TerminalPreferencesStep onBack={() => {}} onContinue={onContinue} />)

    await waitFor(() => {
      expect(screen.getByTestId('favorite-terminal-warp')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /iTerm2/i }))

    const moveWarpDown = screen.getByRole('button', { name: 'move Warp down' }) as HTMLButtonElement
    expect(moveWarpDown.disabled).toBe(false)

    fireEvent.click(moveWarpDown)
    const moveItermUpAfter = screen.getByRole('button', { name: 'move iTerm2 up' }) as HTMLButtonElement
    const moveWarpDownAfter = screen.getByRole('button', { name: 'move Warp down' }) as HTMLButtonElement
    expect(moveItermUpAfter.disabled).toBe(true)
    expect(moveWarpDownAfter.disabled).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /iTerm2/i }))

    expect((screen.getByText(/onboarding\.terminalPreferences\.continue/i) as HTMLButtonElement).disabled).toBe(true)
  })

  it('ignores dropping non-favorite terminal on favorite card', async () => {
    const onContinue = vi.fn()
    render(<TerminalPreferencesStep onBack={() => {}} onContinue={onContinue} />)

    await waitFor(() => {
      expect(screen.getByTestId('favorite-terminal-warp')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))

    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'terminal'),
    }

    fireEvent.drop(screen.getByTestId('favorite-terminal-warp'), { dataTransfer: transfer })
    fireEvent.click(screen.getByText(/onboarding\.terminalPreferences\.continue/i))

    expect(onContinue).toHaveBeenCalledWith({
      favoriteTerminalIds: ['warp'],
      defaultTerminalId: 'warp',
    })
  })

  it('resets dragging state on drag end and ignores drag over non-favorite card', async () => {
    render(<TerminalPreferencesStep onBack={() => {}} onContinue={() => {}} />)

    await waitFor(() => {
      expect(screen.getByTestId('favorite-terminal-warp')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))

    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'warp'),
    }

    fireEvent.dragStart(screen.getByTestId('favorite-terminal-warp'), { dataTransfer: transfer })
    expect(screen.getByTestId('favorite-terminal-warp').className).toContain('opacity-50')

    fireEvent.dragOver(screen.getByTestId('favorite-terminal-terminal'), { dataTransfer: transfer })
    fireEvent.dragEnd(screen.getByTestId('favorite-terminal-warp'))
    expect(screen.getByTestId('favorite-terminal-warp').className).not.toContain('opacity-50')
  })
})
