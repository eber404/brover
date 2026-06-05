// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { TerminalSidebar } from './TerminalSidebar'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('TerminalSidebar', () => {
  afterEach(cleanup)

  beforeEach(() => {
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
      },
    }
  })

  it('renders installed terminals ordered by saved preferences', async () => {
    const onLocaleChange = vi.fn()
    const { container } = render(
      <TerminalSidebar
        title="Brover"
        subtitle="test"
        locale="en"
        onLocaleChange={onLocaleChange}
        selectedTargetId="target-1"
      />
    )

    await waitFor(() => {
      const buttons = Array.from(container.querySelectorAll('[data-testid^="terminal-launch-"]'))
      expect(buttons.map((button) => button.getAttribute('data-testid'))).toEqual([
        'terminal-launch-iterm2',
        'terminal-launch-warp',
        'terminal-launch-terminal',
      ])
    })

    expect(screen.queryByText('TERMINALS')).toBeNull()
    expect(screen.getByTestId('terminal-launch-iterm2').getAttribute('title')).toBe('iTerm2')
    expect(screen.getByTestId('terminal-icon-iterm2').getAttribute('src')).toBe('data:image/png;base64,iterm2')
  })

  it('clicking terminal launches selected target', async () => {
    render(
      <TerminalSidebar
        title="Brover"
        subtitle="test"
        locale="en"
        onLocaleChange={vi.fn()}
        selectedTargetId="target-1"
      />
    )

    const launchTerminal = window.brover.launch.terminal as ReturnType<typeof vi.fn>

    await waitFor(() => {
      expect(screen.getByTestId('terminal-launch-iterm2')).toBeTruthy()
    })

    fireEvent.click(screen.getByTestId('terminal-launch-iterm2'))

    await waitFor(() => {
      expect(launchTerminal).toHaveBeenCalledWith('target-1', 'iterm2')
    })
  })
})
