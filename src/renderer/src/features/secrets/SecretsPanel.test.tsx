// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { I18nProvider } from '../../i18n'
import { ToastProvider } from '../../components/ui/toaster'
import { useSecretsPanel } from './SecretsPanel'
import { UNSUPPORTED_SECRET_BACKEND } from '../../../../shared/models'

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
    selectedTargetId: 'target-1',
    targetName: props.targetName ?? 'dev',
    envs: props.envs ?? [],
    filteredEnvs: props.filteredEnvs ?? [],
    selectedEnvId: props.selectedEnvId ?? '',
    setSelectedEnvId: props.setSelectedEnvId ?? (() => {}),
    setEnvs: props.setEnvs ?? (() => {}),
    setRevealValue: props.setRevealValue ?? (() => {}),
  })

  return (
    <div>
      {panel.center}
      <div data-testid="selected-env">
        {panel.selectedEnv ? panel.selectedEnv.name : 'none'}
      </div>
      <button data-testid="reveal-btn" onClick={() => panel.revealEnv()}>Reveal</button>
      <button data-testid="copy-btn" onClick={() => panel.copyEnv(false)}>Copy</button>
      <button data-testid="update-btn" onClick={() => panel.updateEnvValue('new-val')}>Update</button>
      <button data-testid="delete-btn" onClick={() => panel.deleteEnv()}>Delete</button>
    </div>
  )
}

describe('SecretsPanel', () => {
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
    // @ts-expect-error mock
    window.brover = {}
  })

  it('renders target name in header', () => {
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

  it('renders empty string targetName gracefully', () => {
    render(
      <I18nProvider>
        <ToastProvider>
          <SecretsTestWrapper targetName="" />
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
      expect(screen.getByText('Update "API_KEY"?')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

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

    expect(screen.queryByText('Update "API_KEY"?')).toBeNull()
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
      expect(screen.getByText('Delete "API_KEY"?')).toBeTruthy()
    })

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete', hidden: true })
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!)

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

    expect(screen.queryByText('Delete "API_KEY"?')).toBeNull()
  })

})
