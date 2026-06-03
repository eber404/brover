// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import OnboardingFlow from './OnboardingFlow'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const mockScanResult = {
  files: [
    {
      filePath: '/Users/test/.zshrc',
      variables: [
        { id: '1', name: 'API_KEY', value: 'secret123', sourceFile: '/Users/test/.zshrc' },
        { id: '2', name: 'PORT', value: '3000', sourceFile: '/Users/test/.zshrc' },
      ],
    },
  ],
  warnings: [],
}

describe('OnboardingFlow', () => {
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
      onboarding: {
        scanDotfiles: vi.fn().mockResolvedValue(mockScanResult),
        runFreshStart: vi.fn().mockResolvedValue(undefined),
        runRetroactive: vi.fn().mockResolvedValue(undefined),
        complete: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockResolvedValue({}),
      },
    } as any
  })

  it('shows welcome heading', () => {
    render(<OnboardingFlow onComplete={() => {}} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeTruthy()
  })

  it('renders retroactive and fresh start card headings', () => {
    render(<OnboardingFlow onComplete={() => {}} />)
    const subHeadings = screen.getAllByRole('heading', { level: 2 })
    expect(subHeadings).toHaveLength(2)
    expect(subHeadings[0].textContent).toMatch(/retroactive/i)
    expect(subHeadings[1].textContent).toMatch(/fresh/i)
  })

  it('fresh start shows file selection and imports filtered scan result', async () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)
    fireEvent.click(screen.getByText(/onboarding\.mode\.freshStart\.action/i))
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.freshStartReview\.title/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByText(/Users\/test\/\.zshrc/i))
    fireEvent.click(screen.getByText(/onboarding\.freshStartReview\.continue/i))
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.terminalPreferences\.title/i)).toBeTruthy()
    })

    expect(window.brover.onboarding.runFreshStart).not.toHaveBeenCalled()
    expect(window.brover.onboarding.complete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Warp/i }))
    fireEvent.click(screen.getByText(/onboarding\.terminalPreferences\.continue/i))

    await waitFor(() => {
      expect(window.brover.onboarding.runFreshStart).toHaveBeenCalledWith({
        scanResult: expect.objectContaining({
          files: [expect.objectContaining({ filePath: '/Users/test/.zshrc' })],
        }),
      })
      expect(window.brover.onboarding.complete).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalled()
    })

    expect(JSON.parse(window.localStorage.getItem('brover.launch-preferences') ?? '{}')).toEqual({
      favoriteTerminalIds: ['warp'],
      defaultTerminalId: 'warp',
    })
  })

  it('retroactive flow goes from review to confirmation', async () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)
    fireEvent.click(screen.getByText(/onboarding\.mode\.retroactive\.action/i))
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.review\.title/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByText('API_KEY'))
    fireEvent.click(screen.getByText(/onboarding\.review\.continue/i))
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.confirmation\.title/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByText(/onboarding\.confirmation\.action/i))
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.terminalPreferences\.title/i)).toBeTruthy()
    })

    expect(window.brover.onboarding.runRetroactive).not.toHaveBeenCalled()
    expect(window.brover.onboarding.complete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Terminal/i }))
    fireEvent.click(screen.getByText(/onboarding\.terminalPreferences\.continue/i))

    await waitFor(() => {
      expect(window.brover.onboarding.runRetroactive).toHaveBeenCalled()
      expect(window.brover.onboarding.complete).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
