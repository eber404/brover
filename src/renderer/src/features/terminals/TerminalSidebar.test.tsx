// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { TerminalSidebar } from './TerminalSidebar'

const toast = vi.fn()

vi.mock('../../i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'launch.addTerminal') return 'Add terminal'
      if (key === 'launch.removeTerminal') return 'Remove'
      if (key === 'launch.notTerminal') return 'is not a supported terminal.'
      return key
    },
  }),
}))

vi.mock('../../components/ui/toaster', () => ({
  useToast: () => ({ toast }),
}))

describe('TerminalSidebar', () => {
  afterEach(cleanup)

  beforeEach(() => {
    toast.mockReset()
    const storage = new Map<string, string>()
    storage.set(
      'brover.launch-preferences',
      JSON.stringify({
        favoriteTerminalIds: ['iterm2', 'warp'],
        defaultTerminalId: 'iterm2',
      })
    )

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

    // @ts-expect-error mock
    window.brover = {
      launch: {
        listTerminals: vi.fn().mockResolvedValue({
          terminals: [
            { id: 'warp', name: 'Warp', bundlePath: '/Warp.app', installed: true, iconDataUrl: 'data:image/png;base64,warp' },
            { id: 'iterm2', name: 'iTerm2', bundlePath: '/iTerm.app', installed: true, iconDataUrl: 'data:image/png;base64,iterm2' },
            { id: 'terminal', name: 'Terminal', bundlePath: '/Terminal.app', installed: true, iconDataUrl: 'data:image/png;base64,terminal' },
          ],
        }),
        terminal: vi.fn().mockResolvedValue({ success: true }),
        pickTerminalApp: vi.fn().mockResolvedValue({
          canceled: false,
          terminal: {
            id: 'terminal',
            name: 'Terminal',
            bundlePath: '/Terminal.app',
            installed: true,
            iconDataUrl: 'data:image/png;base64,terminal',
          },
        }),
      },
    }
  })

  it('renders installed terminals ordered by saved preferences', async () => {
    const onLocaleChange = vi.fn()
    const { container } = render(
      <TerminalSidebar
        locale="en"
        onLocaleChange={onLocaleChange}
        selectedEnvironmentId="environment-1"
      />
    )

    await waitFor(() => {
      const buttons = Array.from(container.querySelectorAll('[data-testid^="terminal-launch-"]'))
      expect(buttons.map((button) => button.getAttribute('data-testid'))).toEqual([
        'terminal-launch-iterm2',
        'terminal-launch-warp',
      ])
    })

    expect(screen.queryByText('TERMINALS')).toBeNull()
    expect(screen.getByTestId('terminal-launch-iterm2').getAttribute('title')).toBe('iTerm2')
    expect(screen.getByTestId('terminal-icon-iterm2').getAttribute('src')).toBe('data:image/png;base64,iterm2')
    expect(screen.getByTestId('terminal-icon-iterm2').className).toContain('h-8')
    expect(screen.getByTestId('terminal-icon-iterm2').className).toContain('w-8')
    expect(screen.getByTestId('terminal-launch-iterm2').className).toContain('cursor-pointer')
    expect(screen.getByTestId('terminal-add-button').className).toContain('cursor-pointer')
    expect(screen.getByTestId('terminal-footer').className).toContain('min-h-[34px]')
    expect(screen.getByTestId('terminal-footer').className).toContain('items-center')
    expect(screen.getByTestId('terminal-locale-select').className).toContain('cursor-pointer')
    expect(screen.getByTestId('terminal-add-button')).toBeTruthy()
    expect(screen.queryByTestId('terminal-launch-terminal')).toBeNull()
  })

  it('opens picker directly from plus button and adds picked terminal to rail', async () => {
    render(
      <TerminalSidebar
        locale="en"
        onLocaleChange={vi.fn()}
        selectedEnvironmentId="environment-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('terminal-add-button')).toBeTruthy()
    })

    const pickTerminalApp = window.brover.launch.pickTerminalApp as ReturnType<typeof vi.fn>
    fireEvent.click(screen.getByTestId('terminal-add-button'))

    await waitFor(() => {
      expect(pickTerminalApp).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByTestId('terminal-launch-terminal')).toBeTruthy()
    })
  })

  it('clicking terminal launches selected target', async () => {
    render(
      <TerminalSidebar
        locale="en"
        onLocaleChange={vi.fn()}
        selectedEnvironmentId="environment-1"
      />
    )

    const launchTerminal = window.brover.launch.terminal as ReturnType<typeof vi.fn>

    await waitFor(() => {
      expect(screen.getByTestId('terminal-launch-iterm2')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('terminal-launch-iterm2'))

    await waitFor(() => {
      expect(launchTerminal).toHaveBeenCalledWith('environment-1', 'iterm2')
    })
  })

  it('shows remove action on terminal context menu and removes favorite terminal', async () => {
    render(
      <TerminalSidebar
        locale="en"
        onLocaleChange={vi.fn()}
        selectedEnvironmentId="environment-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('terminal-launch-warp')).toBeTruthy()
    })

    fireEvent.contextMenu(screen.getByTestId('terminal-launch-warp'), {
      clientX: 32,
      clientY: 120,
    })

    await waitFor(() => {
      expect(screen.getByTestId('terminal-remove-warp')).toBeTruthy()
      expect(screen.getByText('Remove')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('terminal-remove-warp'))

    await waitFor(() => {
      expect(screen.queryByTestId('terminal-launch-warp')).toBeNull()
    })
  })

  it('shows i18n error toast when picked app is not a terminal', async () => {
    ;(window.brover.launch.pickTerminalApp as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      canceled: false,
      error: 'UNSUPPORTED_TERMINAL_APP',
      appName: 'Notes',
    })

    render(
      <TerminalSidebar
        locale="en"
        onLocaleChange={vi.fn()}
        selectedEnvironmentId="environment-1"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('terminal-add-button')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('terminal-add-button'))

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Notes is not a supported terminal.', 'error')
    })
  })
})
