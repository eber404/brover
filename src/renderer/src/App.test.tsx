// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

const terminalSidebarProps: Array<any> = []
const environmentsSidebarProps: Array<any> = []
const secretsPanelArgs: Array<any> = []

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
  ConfirmDialog: () => null,
}))

vi.mock('./features/onboarding/OnboardingFlow', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button onClick={onComplete}>OnboardingFlow</button>
  ),
}))

vi.mock('./features/secrets/SecretsPanel', () => ({
  useSecretsPanel: (args: unknown) => {
    secretsPanelArgs.push(args)
    return {
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
  },
}))

vi.mock('./features/secrets/SecretsCenterPanel', () => ({
  SecretsCenterPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./features/secrets/SecretsDetailsPanel', () => ({
  SecretsDetailsPanel: () => <div>SecretsDetails</div>,
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
})
