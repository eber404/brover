// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

const terminalSidebarProps: Array<any> = []
const environmentsSidebarProps: Array<any> = []
const secretsPanelArgs: Array<any> = []
let secretsPanelState: any = null
let runConfirmedUpdate: () => Promise<void>
let runConfirmedDelete: () => Promise<void>
let renderActualSecretsPanel = false
let renderActualEnvironmentsSidebar = false

function createDeferred<T = void>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

vi.mock('./i18n', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({ t: (key: string) => key, locale: 'en', setLocale: vi.fn() }),
}))

vi.mock('./components/ui/toaster', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('./components/HideSplash', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./features/onboarding/OnboardingFlow', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>OnboardingFlow</button>
  ),
}))

vi.mock('./features/secrets/SecretsPanel', async () => {
  const actual = await vi.importActual<typeof import('./features/secrets/SecretsPanel')>('./features/secrets/SecretsPanel')
  const { useState } = await vi.importActual<typeof import('react')>('react')

  return {
    useSecretsPanel: (args: any) => {
      if (renderActualSecretsPanel) return actual.useSecretsPanel(args)
      secretsPanelArgs.push(args)
      const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
      const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false)
      const state = {
        center: (
          <button onClick={() => args.setSelectedEnvId('secret-1')}>Mock secret card</button>
        ),
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        updateConfirmOpen,
        setUpdateConfirmOpen,
        closeUpdateConfirmation: setUpdateConfirmOpen,
        selectedEnv: args.selectedEnvId ? { id: args.selectedEnvId, name: 'API_KEY' } : null,
        hasValue: false,
        revealEnv: async () => {
          args.setRevealValue('secret-value')
          return true
        },
        copyEnv: vi.fn(),
        updateEnvValue: () => setUpdateConfirmOpen(true),
        deleteEnv: () => setDeleteConfirmOpen(true),
        deleteEnvConfirmed: async () => {
          await runConfirmedDelete()
          args.setSelectedEnvId('')
          args.setRevealValue('')
        },
        updateEnvConfirmed: () => runConfirmedUpdate(),
      }
      return { ...state, ...secretsPanelState }
    },
  }
})

vi.mock('./features/secrets/SecretsCenterPanel', () => ({
  SecretsCenterPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./features/secrets/SecretsDetailsPanel', () => ({
  SecretsDetailsPanel: (props: any) => (
    <div>
      <div>SecretsDetails</div>
      <div>EnvLabel:{props.environmentName}</div>
      <div>CanDelete:{String(props.canDelete)}</div>
      <div>RevealValue:{props.revealValue}</div>
      <button onClick={() => props.onCopy(true)}>Detail copy</button>
      <button onClick={() => props.onUpdateValue('changed')}>Detail update</button>
      <button onClick={() => props.onDelete()}>Detail delete</button>
    </div>
  ),
}))

vi.mock('./features/terminals/TerminalSidebar', () => ({
  TerminalSidebar: (props: unknown) => {
    terminalSidebarProps.push(props)
    return <div>TerminalSidebar</div>
  },
}))

vi.mock('./features/environments/EnvironmentsSidebar', async () => {
  const actual = await vi.importActual<typeof import('./features/environments/EnvironmentsSidebar')>('./features/environments/EnvironmentsSidebar')

  return {
    EnvironmentsSidebar: (props: any) => {
      if (renderActualEnvironmentsSidebar) {
        return <actual.EnvironmentsSidebar {...props} />
      }
      environmentsSidebarProps.push(props)
      return (
        <div>
          <button onClick={() => void props.onAddEnvironment()}>Add environment</button>
          <button onClick={() => void props.onSelectEnvironment('env-2')}>Select env-2</button>
          <button onClick={() => void props.onDeleteEnvironment('env-1')}>Delete env-1</button>
          <button onClick={() => props.onStartRenameEnvironment('env-1', 'prod')}>Start rename</button>
          <button onClick={() => void props.onSaveRenameEnvironment('env-1')}>Save rename</button>
          <button onClick={() => void props.onUpdateEnvironmentColor('env-1', '#123456')}>Color env-1</button>
          <button onClick={() => void props.onReorderEnvironments(['env-2', 'env-1'])}>Reorder envs</button>
          <button onClick={() => void props.onToggleSharedSecretNames()}>Toggle shared</button>
          <button onClick={() => props.onEditNameChange(' renamed ') }>Edit rename</button>
          <button onClick={() => props.onEditNameChange('   ')}>Blank rename</button>
          <div>Selected:{props.selectedEnvironmentId ?? 'none'}</div>
        </div>
      )
    },
  }
})

describe('App', () => {
  beforeEach(() => {
    cleanup()
    terminalSidebarProps.length = 0
    environmentsSidebarProps.length = 0
    secretsPanelArgs.length = 0
    secretsPanelState = null
    runConfirmedUpdate = async () => {}
    runConfirmedDelete = async () => {}
    renderActualSecretsPanel = false
    renderActualEnvironmentsSidebar = false

    window.brover = {
      onboarding: {
        getStatus: vi.fn().mockResolvedValue({ completedAt: '2024-01-01T00:00:00.000Z' }),
      },
      listEnvironments: vi.fn().mockResolvedValue([
        { id: 'env-1', name: 'prod', color: '#111', isActive: true, updatedAt: '1' },
        { id: 'env-2', name: 'dev', color: '#222', isActive: false, updatedAt: '1' },
      ]),
      listEnvs: vi.fn().mockResolvedValue([]),
      getSharedSecretNames: vi.fn().mockResolvedValue(false),
      createEnvironment: vi.fn(),
      deleteEnvironment: vi.fn(),
      renameEnvironment: vi.fn().mockResolvedValue([
        { id: 'env-1', name: 'renamed', color: '#111', isActive: true, updatedAt: '1' },
        { id: 'env-2', name: 'dev', color: '#222', isActive: false, updatedAt: '1' },
      ]),
      setEnvironmentColor: vi.fn().mockResolvedValue([
        { id: 'env-1', name: 'prod', color: '#123456', isActive: true, updatedAt: '1' },
        { id: 'env-2', name: 'dev', color: '#222', isActive: false, updatedAt: '1' },
      ]),
      reorderEnvironments: vi.fn().mockResolvedValue([
        { id: 'env-2', name: 'dev', color: '#222', isActive: false, updatedAt: '1' },
        { id: 'env-1', name: 'prod', color: '#111', isActive: true, updatedAt: '1' },
      ]),
      setSharedSecretNames: vi.fn().mockResolvedValue(true),
      setActiveEnvironment: vi.fn().mockResolvedValue([
        { id: 'env-1', name: 'prod', color: '#111', isActive: false, updatedAt: '1' },
        { id: 'env-2', name: 'dev', color: '#222', isActive: true, updatedAt: '1' },
      ]),
    } as any
  })

  function brover() {
    return window.brover as any
  }

  it('renders onboarding flow when onboarding is pending', async () => {
    brover().onboarding.getStatus.mockResolvedValue({ completedAt: undefined })

    render(<App />)

    expect(await screen.findByText('OnboardingFlow')).toBeTruthy()
    expect(screen.queryByText('TerminalSidebar')).toBeNull()

    fireEvent.click(screen.getByText('OnboardingFlow'))
    expect(await screen.findByText('TerminalSidebar')).toBeTruthy()
  })

  it('renders shell when onboarding is complete', async () => {
    render(<App />)

    expect(await screen.findByText('TerminalSidebar')).toBeTruthy()
    expect(screen.queryByText('OnboardingFlow')).toBeNull()
  })

  it('uses a compact terminal rail and wider spaces panel', async () => {
    render(<App />)

    await screen.findByText('TerminalSidebar')
    const appShell = screen.getAllByTestId('drag-bar')[0]?.parentElement
    expect(appShell?.className).toContain('grid-cols-[72px_440px_1fr]')
  })

  it('adds unique environment names env, env-1, env-2', async () => {
    brover().listEnvironments.mockResolvedValue([
      { id: 'env-1', name: 'env', color: '#111', isActive: true, updatedAt: '1' },
      { id: 'env-2', name: 'env-1', color: '#222', isActive: false, updatedAt: '1' },
    ])
    brover().createEnvironment.mockResolvedValue([
      { id: 'env-1', name: 'env', color: '#111', isActive: true, updatedAt: '1' },
      { id: 'env-2', name: 'env-1', color: '#222', isActive: false, updatedAt: '1' },
      { id: 'env-3', name: 'env-2', color: '#333', isActive: false, updatedAt: '1' },
    ])

    render(<App />)
    await screen.findByText('Selected:env-1')
    fireEvent.click(screen.getByText('Add environment'))

    await waitFor(() => {
      expect(brover().createEnvironment).toHaveBeenCalledWith({ name: 'env-2' })
    })
  })

  it('shows cloned secret metadata after creating and selecting a space', async () => {
    renderActualSecretsPanel = true
    renderActualEnvironmentsSidebar = true
    brover().getSharedSecretNames.mockResolvedValue(true)

    const existingApiKey = { id: 'secret-1', name: 'API_KEY', profile: 'env-1', enabled: true }
    const clonedApiKey = { id: 'secret-2', name: 'API_KEY', profile: 'env-3', enabled: false }
    const updatedEnvironments = [
      { id: 'env-1', name: 'prod', color: '#111', isActive: true, updatedAt: '1' },
      { id: 'env-2', name: 'dev', color: '#222', isActive: false, updatedAt: '1' },
      { id: 'env-3', name: 'env', color: '#333', isActive: false, updatedAt: '1' },
    ]

    brover().listEnvs
      .mockResolvedValueOnce([existingApiKey])
      .mockResolvedValueOnce([existingApiKey, clonedApiKey])
    brover().createEnvironment.mockResolvedValue(updatedEnvironments)
    brover().setActiveEnvironment.mockImplementation(async ({ environmentId }: { environmentId: string }) =>
      updatedEnvironments.map((environment) => ({
        ...environment,
        isActive: environment.id === environmentId,
      }))
    )

    render(<App />)
    await screen.findByTestId('environment-row-env-1')

    fireEvent.click(screen.getByTestId('environment-add'))
    const createdEnvironment = await screen.findByTestId('environment-row-env-3')
    fireEvent.click(createdEnvironment)

    await screen.findByRole('heading', { name: 'env' })
    expect(await screen.findByTestId('secret-row-API_KEY')).toBeTruthy()
  })

  it('deleting selected environment falls back to active environment', async () => {
    brover().deleteEnvironment.mockResolvedValue([
      { id: 'env-2', name: 'dev', color: '#222', isActive: true, updatedAt: '1' },
    ])

    render(<App />)
    await screen.findByText('Selected:env-1')
    fireEvent.click(screen.getByText('Delete env-1'))

    await waitFor(() => {
      expect(screen.getByText('Selected:env-2')).toBeTruthy()
    })
  })

  it('keeps a secret selected when the environment resolves after the click', async () => {
    const environments = createDeferred<unknown[]>()
    brover().listEnvironments.mockReturnValue(environments.promise as never)

    render(<App />)
    await screen.findByText('Mock secret card')

    fireEvent.click(screen.getByText('Mock secret card'))
    expect(await screen.findByRole('dialog')).toBeTruthy()

    environments.resolve([
      { id: 'env-1', name: 'prod', color: '#111', isActive: true, updatedAt: '1' },
    ])

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('SecretsDetails')).toBeTruthy()
  })

  it('switching environment clears selected secret and revealed value', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')

    const initialArgs = secretsPanelArgs.at(-1)
    initialArgs.setRevealValue('top-secret')

    fireEvent.click(screen.getByText('Select env-2'))

    await waitFor(() => {
      const latestArgs = secretsPanelArgs.at(-1)
      expect(latestArgs.selectedEnvironmentId).toBe('env-2')
      expect(latestArgs.selectedEnvId).toBe('')
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('renames environment when edited name is not blank', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Start rename'))
    fireEvent.click(screen.getByText('Edit rename'))
    fireEvent.click(screen.getByText('Save rename'))

    await waitFor(() => {
      expect(brover().renameEnvironment).toHaveBeenCalledWith({ environmentId: 'env-1', name: 'renamed' })
    })
  })

  it('skips rename call when edited name is blank', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Start rename'))
    fireEvent.click(screen.getByText('Blank rename'))
    fireEvent.click(screen.getByText('Save rename'))

    expect(brover().renameEnvironment).not.toHaveBeenCalled()
  })

  it('updates color, reorders environments, toggles shared names, and forwards search text', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Color env-1'))
    fireEvent.click(screen.getByText('Reorder envs'))
    fireEvent.click(screen.getByText('Toggle shared'))
    fireEvent.change(screen.getByPlaceholderText('search.secretsPlaceholder'), {
      target: { value: 'api' },
    })

    await waitFor(() => {
      expect(brover().setEnvironmentColor).toHaveBeenCalledWith({ environmentId: 'env-1', color: '#123456' })
      expect(brover().reorderEnvironments).toHaveBeenCalledWith({ orderedEnvironmentIds: ['env-2', 'env-1'] })
      expect(brover().setSharedSecretNames).toHaveBeenCalledWith(true)
    })

    expect(secretsPanelArgs.at(-1)?.searchQuery).toBe('api')
    expect(screen.getByPlaceholderText('search.secretsPlaceholder').className).toContain('focus-visible:ring-2')
  })

  it('does not render secret details until a secret is selected', async () => {
    render(<App />)

    await screen.findByText('Selected:env-1')

    expect(screen.queryByText('SecretsDetails')).toBeNull()
  })

  it('keeps details closed while authentication is pending', async () => {
    secretsPanelState = {
      revealEnv: () => new Promise(() => {}),
    }

    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('SecretsDetails')).toBeNull()
  })

  it('keeps details closed when authentication fails', async () => {
    const revealEnv = vi.fn().mockResolvedValue(false)
    secretsPanelState = { revealEnv }

    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))

    await waitFor(() => {
      expect(revealEnv).toHaveBeenCalled()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens details only after authentication succeeds', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('SecretsDetails')).toBeTruthy()
  })

  it('shows the revealed value inside the modal once authentication is granted', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))

    await screen.findByRole('dialog')

    expect(screen.getByText('RevealValue:secret-value')).toBeTruthy()
  })

  it('opens selected secret details in a dialog and close clears the selection', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('SecretsDetails')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(secretsPanelArgs.at(-1)?.selectedEnvId).toBe('')
    })
  })

  it('Escape closes selected secret details and clears the selection', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(secretsPanelArgs.at(-1)?.selectedEnvId).toBe('')
    })
  })

  it('hides details behind one delete confirmation and restores them after cancel', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Detail delete'))

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByText('Delete "API_KEY"?')).toBeTruthy()
      expect(screen.queryByText('SecretsDetails')).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByText('SecretsDetails')).toBeTruthy()
    })
  })

  it('hides details behind one update confirmation and restores them after Escape', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Detail update'))

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByText('Update "API_KEY"?')).toBeTruthy()
      expect(screen.queryByText('SecretsDetails')).toBeNull()
    })

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByText('SecretsDetails')).toBeTruthy()
    })
  })

  it('keeps update confirmation open until its mutation succeeds', async () => {
    const deferred = createDeferred()
    runConfirmedUpdate = vi.fn(() => deferred.promise)
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Detail update'))
    await screen.findByText('Update "API_KEY"?')

    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

    expect(runConfirmedUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Update "API_KEY"?')).toBeTruthy()

    deferred.resolve()

    await waitFor(() => {
      expect(screen.getByText('SecretsDetails')).toBeTruthy()
    })
  })

  it('keeps delete confirmation open until its mutation clears selected secret state', async () => {
    const deferred = createDeferred()
    runConfirmedDelete = vi.fn(() => deferred.promise)
    render(<App />)
    await screen.findByText('Selected:env-1')

    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Detail delete'))
    await screen.findByText('Delete "API_KEY"?')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(runConfirmedDelete).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Delete "API_KEY"?')).toBeTruthy()

    deferred.resolve()

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByText('SecretsDetails')).toBeNull()
      expect(secretsPanelArgs.at(-1)?.selectedEnvId).toBe('')
    })
  })

  it('renders details actions with selected secret and fallback environment label', async () => {
    const revealEnv = vi.fn().mockResolvedValue(true)
    secretsPanelState = {
      selectedEnv: { id: 'secret-1', name: 'API_KEY' },
      hasValue: true,
      revealEnv,
      copyEnv: vi.fn(),
      updateEnvValue: vi.fn(),
      deleteEnv: vi.fn(),
      deleteEnvConfirmed: vi.fn(),
    }

    brover().listEnvironments.mockResolvedValue([])

    render(<App />)
    await screen.findByText('Selected:none')
    fireEvent.click(screen.getByText('Mock secret card'))
    await screen.findByText('SecretsDetails')

    expect(screen.getByText('EnvLabel:-')).toBeTruthy()
    expect(screen.getByText('CanDelete:true')).toBeTruthy()

    expect(revealEnv).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Detail copy'))
    fireEvent.click(screen.getByText('Detail update'))
    fireEvent.click(screen.getByText('Detail delete'))

    expect(secretsPanelState.copyEnv).toHaveBeenCalledWith(true)
    expect(secretsPanelState.updateEnvValue).toHaveBeenCalledWith('changed')
    expect(secretsPanelState.deleteEnv).toHaveBeenCalledTimes(1)
  })
})
