// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { EnvironmentsSidebar } from './EnvironmentsSidebar'
import type { Environment } from '../../../../shared/models'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function makeEnvironment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: 'environment-1',
    name: 'dev',
    color: '#34d399',
    isActive: true,
    updatedAt: '2024-01-01',
    ...overrides,
  }
}

const defaultProps = {
  title: 'Brover',
  subtitle: 'Local secrets manager',
  environments: [makeEnvironment()],
  selectedEnvironmentId: 'environment-1',
  sharedSecretNames: false,
  editingEnvironmentId: null,
  editingName: '',
  onEditNameChange: vi.fn(),
  onAddEnvironment: vi.fn(),
  onStartRenameEnvironment: vi.fn(),
  onSaveRenameEnvironment: vi.fn(),
  onSelectEnvironment: vi.fn(),
  onUpdateEnvironmentColor: vi.fn(),
  onReorderEnvironments: vi.fn(),
  onDeleteEnvironment: vi.fn(),
  onToggleSharedSecretNames: vi.fn(),
}

describe('EnvironmentsSidebar', () => {
  afterEach(cleanup)

  it('renders environments column with matching secret names control', () => {
    render(<EnvironmentsSidebar {...defaultProps} />)

    expect(screen.getByText('ENVIRONMENTS')).toBeTruthy()
    expect(screen.getByText('Matching secret names')).toBeTruthy()
    expect(screen.getByTestId('environment-row-environment-1')).toBeTruthy()
    expect(screen.getByText('Brover · Local secrets manager')).toBeTruthy()
    expect(screen.getByTestId('environments-list').className).toContain('flex-1')
    expect(screen.getByTestId('environments-footer').className).toContain('min-h-[34px]')
  })

  it('does not render old space or target affordances', () => {
    render(<EnvironmentsSidebar {...defaultProps} />)

    expect(screen.queryByTitle('Add space')).toBeNull()
    expect(screen.queryByText('TARGETS')).toBeNull()
    expect(screen.queryByText('Tied targets')).toBeNull()
  })

  it('clicking add environment triggers handler', () => {
    const onAddEnvironment = vi.fn()
    render(<EnvironmentsSidebar {...defaultProps} onAddEnvironment={onAddEnvironment} />)

    fireEvent.click(screen.getByTestId('environment-add'))

    expect(onAddEnvironment).toHaveBeenCalledTimes(1)
  })

  it('adds cursor pointer to clickable affordances', () => {
    render(<EnvironmentsSidebar {...defaultProps} />)

    expect(screen.getByTestId('environment-add').className).toContain('cursor-pointer')
    expect(screen.getByTestId('environment-row-environment-1').className).toContain('cursor-pointer')
    expect(screen.getByTestId('environment-color-environment-1').className).toContain('cursor-pointer')
    expect(screen.getByRole('switch').className).toContain('cursor-pointer')
  })
})
