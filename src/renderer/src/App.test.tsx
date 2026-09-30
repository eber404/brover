// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

const terminalSidebarProps: Array<any> = []
const environmentsSidebarProps: Array<any> = []
const secretsPanelArgs: Array<any> = []
let secretsPanelState: any = null

vi.mock('./i18n', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useI18n: () => ({ t: (key: string) => key, locale: 'en', setLocale: vi.fn() }),
}))

vi.mock('./components/ui/toaster', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./components/HideSplash', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./components/ui/confirmDialog', () => ({
  ConfirmDialog: (props: any) => (
    <div>
      <div>ConfirmOpen:{String(props.open)}</div>
      <button onClick={() => props.onConfirm()}>Confirm delete</button>
      <button onClick={() => props.onOpenChange(false)}>Close confirm</button>
    </div>
  ),
}))

vi.mock('./features/onboarding/OnboardingFlow', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>OnboardingFlow</button>
  ),
}))

vi.mock('./features/secrets/SecretsPanel', () => ({
  useSecretsPanel: (args: unknown) => {
    secretsPanelArgs.push(args)
    const state = secretsPanelState ?? {
      center: <div>SecretsCenter</div>,
      deleteConfirmOpen: false,
      setDeleteConfirmOpen: vi.fn(),
      selectedEnv: null,
      hasValue: false,
      revealEnv: vi.fn(),
      copyEnv: vi.fn(),
      updateEnvValue: vi.fn(),
      deleteEnv: vi.fn(),
      deleteEnvConfirmed: vi.fn(),
    }
    return state
  },
}))

vi.mock('./features/secrets/SecretsCenterPanel', () => ({
  SecretsCenterPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./features/secrets/SecretsDetailsPanel', () => ({
  SecretsDetailsPanel: (props: any) => (
    <div>
      <div>SecretsDetails</div>
      <div>EnvLabel:{props.environmentName}</div>
      <div>CanDelete:{String(props.canDelete)}</div>
      <button onClick={() => props.onReveal()}>Detail reveal</button>
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

vi.mock('./features/environments/EnvironmentsSidebar', () => ({
  EnvironmentsSidebar: (props: any) => {
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
}))

describe('App', () => {
  beforeEach(() => {
    cleanup()
    terminalSidebarProps.length = 0
    environmentsSidebarProps.length = 0
    secretsPanelArgs.length = 0
    secretsPanelState = null

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

  it('switching environment clears selected secret and revealed value', async () => {
    render(<App />)
    await screen.findByText('Selected:env-1')

    const initialArgs = secretsPanelArgs.at(-1)
    initialArgs.setSelectedEnvId('secret-1')
    initialArgs.setRevealValue('top-secret')

    fireEvent.click(screen.getByText('Select env-2'))

    await waitFor(() => {
      const latestArgs = secretsPanelArgs.at(-1)
      expect(latestArgs.selectedEnvironmentId).toBe('env-2')
      expect(latestArgs.selectedEnvId).toBe('')
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
  })

  it('renders details actions with selected secret and fallback environment label', async () => {
    secretsPanelState = {
      center: <div>SecretsCenter</div>,
      deleteConfirmOpen: true,
      setDeleteConfirmOpen: vi.fn(),
      selectedEnv: { id: 'secret-1', name: 'API_KEY' },
      hasValue: true,
      revealEnv: vi.fn(),
      copyEnv: vi.fn(),
      updateEnvValue: vi.fn(),
      deleteEnv: vi.fn(),
      deleteEnvConfirmed: vi.fn(),
    }

    brover().listEnvironments.mockResolvedValue([])

    render(<App />)
    await screen.findByText('SecretsDetails')

    expect(screen.getByText('EnvLabel:-')).toBeTruthy()
    expect(screen.getByText('CanDelete:true')).toBeTruthy()

    fireEvent.click(screen.getByText('Detail reveal'))
    fireEvent.click(screen.getByText('Detail copy'))
    fireEvent.click(screen.getByText('Detail update'))
    fireEvent.click(screen.getByText('Detail delete'))

    expect(secretsPanelState.revealEnv).toHaveBeenCalledTimes(1)
    expect(secretsPanelState.copyEnv).toHaveBeenCalledWith(true)
    expect(secretsPanelState.updateEnvValue).toHaveBeenCalledWith('changed')
    expect(secretsPanelState.deleteEnv).toHaveBeenCalledTimes(1)
  })

  it('forwards delete confirm callbacks from confirm dialog', async () => {
    const setDeleteConfirmOpen = vi.fn()
    const deleteEnvConfirmed = vi.fn()
    secretsPanelState = {
      center: <div>SecretsCenter</div>,
      deleteConfirmOpen: true,
      setDeleteConfirmOpen,
      selectedEnv: { id: 'secret-1', name: 'API_KEY' },
      hasValue: true,
      revealEnv: vi.fn(),
      copyEnv: vi.fn(),
      updateEnvValue: vi.fn(),
      deleteEnv: vi.fn(),
      deleteEnvConfirmed,
    }

    render(<App />)
    await screen.findByText('ConfirmOpen:true')

    fireEvent.click(screen.getByText('Confirm delete'))
    fireEvent.click(screen.getByText('Close confirm'))

    expect(deleteEnvConfirmed).toHaveBeenCalledTimes(1)
    expect(setDeleteConfirmOpen).toHaveBeenCalledWith(false)
  })
})
