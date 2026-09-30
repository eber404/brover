// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { afterEach } from 'vitest'
import { I18nProvider } from '../../i18n'
import { ToastProvider } from '../../components/ui/toaster'
import { useSecretsPanel } from './SecretsPanel'
import { AUTH_CANCELED, UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'

const mockEnv = {
  id: 'env-1',
  name: 'API_KEY',
  profile: 'target-1',
  enabled: true,
  description: undefined,
  updatedAt: new Date().toISOString(),
}

function SecretsTestWrapper(props: Partial<Parameters<typeof useSecretsPanel>[0]> = {}) {
  const panel = useSecretsPanel({
    selectedEnvironmentId: 'target-1',
    environmentName: props.environmentName ?? 'dev',
    envs: props.envs ?? [],
    filteredEnvs: props.filteredEnvs ?? [],
    selectedEnvId: props.selectedEnvId ?? '',
    searchQuery: props.searchQuery,
    setSelectedEnvId: props.setSelectedEnvId ?? (() => {}),
    setEnvs: props.setEnvs ?? (() => {}),
    setRevealValue: props.setRevealValue ?? (() => {}),
  })

  const selectedEnvName = panel.selectedEnv ? panel.selectedEnv.name : 'none'

  return (
    <div>
      {panel.center}
      <div data-testid="selected-env">{selectedEnvName}</div>
      <div data-testid="update-confirm-open">{String(panel.updateConfirmOpen)}</div>
      <div data-testid="delete-confirm-open">{String(panel.deleteConfirmOpen)}</div>
      <button data-testid="reveal-btn" onClick={() => panel.revealEnv()}>Reveal</button>
      <button data-testid="copy-btn" onClick={() => panel.copyEnv(false)}>Copy</button>
      <button data-testid="update-btn" onClick={() => panel.updateEnvValue('new-val')}>Update</button>
      <button data-testid="confirm-update-btn" onClick={() => void panel.updateEnvConfirmed().catch(() => {})}>Confirm update</button>
      <button data-testid="close-update-confirm-btn" onClick={() => panel.closeUpdateConfirmation?.(false)}>Close update confirmation</button>
      <button data-testid="delete-btn" onClick={() => panel.deleteEnv()}>Delete</button>
      <button data-testid="confirm-delete-btn" onClick={() => void panel.deleteEnvConfirmed().catch(() => {})}>Confirm delete</button>
    </div>
  )
}

describe('SecretsPanel', () => {
  afterEach(cleanup)
  afterEach(() => {
    vi.useRealTimers()
  })

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
    // @ts-expect-error mock
    window.brover = {}
  })

  it('renders environment name in header', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('dev')
  })

  it('does not render launch controls in secrets panel', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    expect(screen.queryByTestId('launch-button')).toBeNull()
    expect(screen.queryByTestId('launch-menu-button')).toBeNull()
  })

  it('renders empty string environmentName gracefully', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper environmentName="" />
        </ToastProvider>
      </I18nProvider>
    )

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('')
  })

  it('opens Add Secret dialog', async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Add Secret/i }))
    expect(screen.getByText(/Create metadata \+ store secret value in secure backend/i)).toBeTruthy()
  })

  it('calls createEnv with correct payload', async () => {
    const createEnv = vi.fn().mockResolvedValue({ ok: true })
    const listEnvs = vi.fn().mockResolvedValue([])
    // @ts-expect-error mock
    window.brover = { createEnv, listEnvs }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Add Secret/i }))
    fireEvent.change(screen.getByPlaceholderText('Env name (OPENAI_API_KEY)'), { target: { value: 'API_KEY' } })
    fireEvent.change(screen.getByPlaceholderText('Secret value'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }))

    await waitFor(() => {
      expect(createEnv).toHaveBeenCalledWith(expect.objectContaining({ name: 'API_KEY', value: 'secret123' }))
    })
  })

  it('shows toast when createEnv fails', async () => {
    const createEnv = vi.fn().mockResolvedValue({ ok: false, error: 'Invalid env name' })
    const listEnvs = vi.fn().mockResolvedValue([])
    // @ts-expect-error mock
    window.brover = { createEnv, listEnvs }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Add Secret/i }))
    fireEvent.change(screen.getByPlaceholderText('Env name (OPENAI_API_KEY)'), { target: { value: 'BAD NAME' } })
    fireEvent.change(screen.getByPlaceholderText('Secret value'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }))

    await waitFor(() => {
      expect(createEnv).toHaveBeenCalled()
    })
  })

  it('shows toast when createEnv fails with unsupported backend', async () => {
    const createEnv = vi.fn().mockResolvedValue({ ok: false, error: UNSUPPORTED_SECRET_BACKEND })
    const listEnvs = vi.fn().mockResolvedValue([])
    // @ts-expect-error mock
    window.brover = { createEnv, listEnvs }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Add Secret/i }))
    fireEvent.change(screen.getByPlaceholderText('Env name (OPENAI_API_KEY)'), { target: { value: 'API_KEY' } })
    fireEvent.change(screen.getByPlaceholderText('Secret value'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }))

    await waitFor(() => {
      expect(createEnv).toHaveBeenCalled()
    })
  })

  it('shows toast when revealEnv fails', async () => {
    const revealEnv = vi.fn().mockResolvedValue({ ok: false, error: 'Failed to reveal' })
    const setRevealValue = vi.fn()
    // @ts-expect-error mock
    window.brover = { revealEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setRevealValue={setRevealValue}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('reveal-btn'))

    await waitFor(() => {
      expect(setRevealValue).toHaveBeenCalledWith('')
    })
  })

  it('does not toast when the user cancels authentication', async () => {
    const revealEnv = vi.fn().mockResolvedValue({ ok: false, error: AUTH_CANCELED })
    const copyEnv = vi.fn().mockResolvedValue({ ok: false, error: AUTH_CANCELED })
    const updateEnv = vi.fn().mockResolvedValue({ ok: false, error: AUTH_CANCELED })
    const deleteEnv = vi.fn().mockResolvedValue({ ok: false, error: AUTH_CANCELED })
    // @ts-expect-error mock
    window.brover = { revealEnv, copyEnv, updateEnv, deleteEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('reveal-btn'))
    fireEvent.click(screen.getByTestId('copy-btn'))
    fireEvent.click(screen.getByTestId('update-btn'))
    fireEvent.click(screen.getByTestId('delete-btn'))

    await waitFor(() => {
      expect(revealEnv).toHaveBeenCalled()
      expect(copyEnv).toHaveBeenCalled()
      expect(updateEnv).toHaveBeenCalled()
      expect(deleteEnv).toHaveBeenCalled()
    })

    expect(screen.queryByText('AUTH_CANCELED')).toBeNull()
    expect(screen.queryByText('Failed to reveal secret')).toBeNull()
    expect(document.querySelector('[role="status"]')?.textContent ?? '').toBe('')
  })

  it('reveals secret value and keeps it available for copy', async () => {
    const revealEnv = vi.fn().mockResolvedValue({ ok: true, value: 'plain-secret' })
    const setRevealValue = vi.fn()
    // @ts-expect-error mock
    window.brover = { revealEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setRevealValue={setRevealValue}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('reveal-btn'))

    await waitFor(() => {
      expect(setRevealValue).toHaveBeenCalledWith('plain-secret')
    })
  })

  it('keeps the revealed value visible while the auth session lasts', async () => {
    vi.useFakeTimers()
    const revealEnv = vi.fn().mockResolvedValue({
      ok: true,
      value: 'secret123',
      expiresAt: Date.now() + 5000,
    })
    const setRevealValue = vi.fn()
    // @ts-expect-error mock
    window.brover = { revealEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setRevealValue={setRevealValue}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('reveal-btn'))

    await Promise.resolve()
    expect(setRevealValue).toHaveBeenCalledWith('secret123')

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)

    expect(setRevealValue).not.toHaveBeenLastCalledWith('')
  })

  it('shows toast when copyEnv fails', async () => {
    const copyEnv = vi.fn().mockResolvedValue({ ok: false, error: 'Failed to copy' })
    // @ts-expect-error mock
    window.brover = { copyEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('copy-btn'))

    await waitFor(() => {
      expect(copyEnv).toHaveBeenCalled()
    })
  })

  it('copies revealed secret value to clipboard on success', async () => {
    const copyEnv = vi.fn().mockResolvedValue({ ok: true, value: 'secret-copy' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    // @ts-expect-error mock
    window.brover = { copyEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('copy-btn'))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('secret-copy')
    })
  })

  it('shows toast when updateEnv fails', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: false, error: 'Failed to update' })
    // @ts-expect-error mock
    window.brover = { updateEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))

    await waitFor(() => {
      expect(updateEnv).toHaveBeenCalled()
    })
  })

  it('shows toast when confirmed update fails', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const updateEnvConfirmed = vi.fn().mockResolvedValue({ ok: false, error: UNSUPPORTED_SECRET_BACKEND })
    // @ts-expect-error mock
    window.brover = { updateEnv, updateEnvConfirmed, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} selectedEnvId={mockEnv.id} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('update-confirm-open').textContent).toBe('true')
    })
    fireEvent.click(screen.getByTestId('confirm-update-btn'))

    await waitFor(() => {
      expect(updateEnvConfirmed).toHaveBeenCalled()
    })
  })

  it('opens update confirmation when auth cache already exists', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const updateEnvConfirmed = vi.fn().mockResolvedValue({ ok: true })
    const secretExists = vi.fn().mockResolvedValue(true)
    // @ts-expect-error mock
    window.brover = { updateEnv, updateEnvConfirmed, secretExists }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('update-confirm-open').textContent).toBe('true')
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByTestId('confirm-update-btn'))

    await waitFor(() => {
      expect(updateEnvConfirmed).toHaveBeenCalledWith({
        id: mockEnv.id,
        profile: mockEnv.profile,
        name: mockEnv.name,
        value: 'new-val',
        description: mockEnv.description,
      })
    })
  })

  it('clears the pending update value when update confirmation closes', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const updateEnvConfirmed = vi.fn().mockResolvedValue({ ok: true })
    // @ts-expect-error mock
    window.brover = { updateEnv, updateEnvConfirmed, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} selectedEnvId={mockEnv.id} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('update-confirm-open').textContent).toBe('true')
    })

    fireEvent.click(screen.getByTestId('close-update-confirm-btn'))
    expect(screen.getByTestId('update-confirm-open').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('confirm-update-btn'))
    expect(updateEnvConfirmed).not.toHaveBeenCalled()
  })

  it('keeps the new value visible after a direct update', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true })
    const setRevealValue = vi.fn()
    // @ts-expect-error mock
    window.brover = { updateEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setRevealValue={setRevealValue}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))

    await waitFor(() => {
      expect(setRevealValue).toHaveBeenLastCalledWith('new-val')
    })
  })

  it('keeps the new value visible after a confirmed update', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const updateEnvConfirmed = vi.fn().mockResolvedValue({ ok: true })
    const setRevealValue = vi.fn()
    // @ts-expect-error mock
    window.brover = { updateEnv, updateEnvConfirmed, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setRevealValue={setRevealValue}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))
    await screen.findByText('true')

    fireEvent.click(screen.getByTestId('confirm-update-btn'))

    await waitFor(() => {
      expect(setRevealValue).toHaveBeenLastCalledWith('new-val')
    })
  })

  it('does not open update confirmation when auth cache is absent', async () => {
    const updateEnv = vi.fn().mockResolvedValue({ ok: true })
    // @ts-expect-error mock
    window.brover = { updateEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('update-btn'))

    await waitFor(() => {
      expect(updateEnv).toHaveBeenCalled()
    })

    expect(screen.getByTestId('update-confirm-open').textContent).toBe('false')
  })

  it('normalizes new secret name input', async () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Add Secret/i }))
    fireEvent.change(screen.getByTestId('add-secret-name'), {
      target: { value: 'open ai-key name' },
    })

    expect((screen.getByTestId('add-secret-name') as HTMLInputElement).value).toBe('OPEN_AI_KEY_NAME')
    expect(screen.getByTestId('add-secret-description').className).toContain('focus-visible:ring-2')
  })

  it('shows no results empty state when search query has no matches', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[]}
            searchQuery="api"
          />
        </ToastProvider>
      </I18nProvider>
    )

    expect(screen.getByText('No secrets match your search')).toBeTruthy()
  })

  it('shows no secrets empty state when environment has no secrets and no search query', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[]} filteredEnvs={[]} />
        </ToastProvider>
      </I18nProvider>
    )

    expect(screen.getByText('No secrets yet')).toBeTruthy()
  })

  it('selects secret row through list content', async () => {
    const setSelectedEnvId = vi.fn()
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} setSelectedEnvId={setSelectedEnvId} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-row-API_KEY'))
    expect(setSelectedEnvId).toHaveBeenCalledWith('env-1')
  })

  it('selects secret when clicking anywhere on the card', async () => {
    const setSelectedEnvId = vi.fn()
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} setSelectedEnvId={setSelectedEnvId} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByText('No description'))
    expect(setSelectedEnvId).toHaveBeenCalledWith('env-1')
  })

  it('copies a row secret without selecting the row', async () => {
    const copyEnv = vi.fn().mockResolvedValue({ ok: true, value: 'secret-copy' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    const setSelectedEnvId = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    // @ts-expect-error mock
    window.brover = { copyEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            setSelectedEnvId={setSelectedEnvId}
          />
        </ToastProvider>
      </I18nProvider>
    )

    const copyButton = screen.getByTestId('secret-copy-API_KEY')
    expect(copyButton.getAttribute('aria-label')).toBe('Copy Secret: API_KEY')
    expect(copyButton.getAttribute('title')).toBe('Copy Secret: API_KEY')
    expect(copyButton.className).toContain('focus-visible:ring-2')

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(copyEnv).toHaveBeenCalledWith({
        profile: mockEnv.profile,
        name: mockEnv.name,
        isRevealed: false,
      })
      expect(writeText).toHaveBeenCalledWith('secret-copy')
    })
    expect(setSelectedEnvId).not.toHaveBeenCalled()
  })

  it('copies a variable name without selecting the row or using the authenticated copy bridge', async () => {
    const copyEnv = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    const setSelectedEnvId = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    // @ts-expect-error mock
    window.brover = { copyEnv }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            setSelectedEnvId={setSelectedEnvId}
          />
        </ToastProvider>
      </I18nProvider>
    )

    const copyNameButton = screen.getByTestId('secret-copy-name-API_KEY')
    expect(copyNameButton.getAttribute('aria-label')).toBe('Copy variable name: API_KEY')
    expect(copyNameButton.getAttribute('title')).toBe('Copy variable name: API_KEY')
    expect(copyNameButton.className).toContain('group-hover:opacity-100')
    expect(copyNameButton.className).toContain('group-focus-within:opacity-100')
    expect(copyNameButton.className).toContain('focus-visible:ring-2')

    fireEvent.click(copyNameButton)

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(mockEnv.name)
      expect(screen.getByText('Variable name copied')).toBeTruthy()
    })
    expect(copyEnv).not.toHaveBeenCalled()
    expect(setSelectedEnvId).not.toHaveBeenCalled()
  })

  it('shows an error toast when variable name copy cannot write to the clipboard', async () => {
    const copyEnv = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard unavailable')) },
    })
    // @ts-expect-error mock
    window.brover = { copyEnv }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-copy-name-API_KEY'))

    await waitFor(() => {
      expect(screen.getByText('Failed to copy variable name')).toBeTruthy()
    })
    expect(copyEnv).not.toHaveBeenCalled()
  })

  it('shows an error toast when row copy cannot write to the clipboard', async () => {
    const copyEnv = vi.fn().mockResolvedValue({ ok: true, value: 'secret-copy' })
    const setSelectedEnvId = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard unavailable')) },
    })
    // @ts-expect-error mock
    window.brover = { copyEnv, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            setSelectedEnvId={setSelectedEnvId}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('secret-copy-API_KEY'))

    await waitFor(() => {
      expect(screen.getByText('Failed to copy secret')).toBeTruthy()
    })
    expect(setSelectedEnvId).not.toHaveBeenCalled()
  })

  it('shows toast when deleteEnv fails', async () => {
    const deleteEnv = vi.fn().mockResolvedValue({ ok: false, error: 'Failed to delete' })
    const listEnvs = vi.fn().mockResolvedValue([])
    const setSelectedEnvId = vi.fn()
    // @ts-expect-error mock
    window.brover = { deleteEnv, listEnvs, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setSelectedEnvId={setSelectedEnvId}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('delete-btn'))

    await waitFor(() => {
      expect(deleteEnv).toHaveBeenCalled()
    })
  })

  it('shows toast when confirmed delete fails', async () => {
    const deleteEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const deleteEnvConfirmed = vi.fn().mockResolvedValue({ ok: false, error: UNSUPPORTED_SECRET_BACKEND })
    // @ts-expect-error mock
    window.brover = { deleteEnv, deleteEnvConfirmed, secretExists: vi.fn().mockResolvedValue(true), listEnvs: vi.fn().mockResolvedValue([]) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[mockEnv]} filteredEnvs={[mockEnv]} selectedEnvId={mockEnv.id} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('delete-btn'))
    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-open').textContent).toBe('true')
    })
    fireEvent.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(deleteEnvConfirmed).toHaveBeenCalled()
    })
  })

  it('no-ops action handlers when no secret is selected', () => {
    const revealEnv = vi.fn()
    const copyEnv = vi.fn()
    const updateEnv = vi.fn()
    const deleteEnv = vi.fn()
    // @ts-expect-error mock
    window.brover = { revealEnv, copyEnv, updateEnv, deleteEnv, secretExists: vi.fn().mockResolvedValue(false) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper envs={[]} filteredEnvs={[]} />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('reveal-btn'))
    fireEvent.click(screen.getByTestId('copy-btn'))
    fireEvent.click(screen.getByTestId('update-btn'))
    fireEvent.click(screen.getByTestId('delete-btn'))

    expect(revealEnv).not.toHaveBeenCalled()
    expect(copyEnv).not.toHaveBeenCalled()
    expect(updateEnv).not.toHaveBeenCalled()
    expect(deleteEnv).not.toHaveBeenCalled()
  })

  it('clears selected env after successful delete', async () => {
    const deleteEnv = vi.fn().mockResolvedValue({ ok: true })
    const listEnvs = vi.fn().mockResolvedValue([])
    const setSelectedEnvId = vi.fn()
    // @ts-expect-error mock
    window.brover = { deleteEnv, listEnvs, secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
            setSelectedEnvId={setSelectedEnvId}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('delete-btn'))

    await waitFor(() => {
      expect(setSelectedEnvId).toHaveBeenCalledWith('')
    })
  })

  it('opens delete confirmation when auth cache already exists', async () => {
    const deleteEnv = vi.fn().mockResolvedValue({ ok: true, value: 'needs-confirmation' })
    const deleteEnvConfirmed = vi.fn().mockResolvedValue({ ok: true })
    // @ts-expect-error mock
    window.brover = { deleteEnv, deleteEnvConfirmed, secretExists: vi.fn().mockResolvedValue(true), listEnvs: vi.fn().mockResolvedValue([]) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('delete-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-open').textContent).toBe('true')
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(deleteEnvConfirmed).toHaveBeenCalledWith({
        id: mockEnv.id,
        profile: mockEnv.profile,
        name: mockEnv.name,
      })
    })
  })

  it('does not open delete confirmation when auth cache is absent', async () => {
    const deleteEnv = vi.fn().mockResolvedValue({ ok: true })
    // @ts-expect-error mock
    window.brover = { deleteEnv, listEnvs: vi.fn().mockResolvedValue([]), secretExists: vi.fn().mockResolvedValue(true) }

    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper
            envs={[mockEnv]}
            filteredEnvs={[mockEnv]}
            selectedEnvId={mockEnv.id}
          />
        </ToastProvider>
      </I18nProvider>
    )

    fireEvent.click(screen.getByTestId('delete-btn'))

    await waitFor(() => {
      expect(deleteEnv).toHaveBeenCalled()
    })

    expect(screen.getByTestId('delete-confirm-open').textContent).toBe('false')
  })

})
