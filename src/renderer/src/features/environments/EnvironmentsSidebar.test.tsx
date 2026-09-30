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

  it('starts rename on double click and saves on enter', () => {
    const onStartRenameEnvironment = vi.fn()
    const onSaveRenameEnvironment = vi.fn()
    const onEditNameChange = vi.fn()

    const { rerender } = render(
      <EnvironmentsSidebar
        {...defaultProps}
        onStartRenameEnvironment={onStartRenameEnvironment}
        onSaveRenameEnvironment={onSaveRenameEnvironment}
        onEditNameChange={onEditNameChange}
      />
    )

    fireEvent.doubleClick(screen.getByTestId('environment-row-environment-1'))
    expect(onStartRenameEnvironment).toHaveBeenCalledWith('environment-1', 'dev')

    rerender(
      <EnvironmentsSidebar
        {...defaultProps}
        editingEnvironmentId="environment-1"
        editingName="staging"
        onStartRenameEnvironment={onStartRenameEnvironment}
        onSaveRenameEnvironment={onSaveRenameEnvironment}
        onEditNameChange={onEditNameChange}
      />
    )

    fireEvent.change(screen.getByTestId('environment-rename-environment-1'), {
      target: { value: 'prod' },
    })
    fireEvent.keyDown(screen.getByTestId('environment-rename-environment-1'), {
      key: 'Enter',
    })

    expect(onEditNameChange).toHaveBeenCalledWith('prod')
    expect(onSaveRenameEnvironment).toHaveBeenCalledWith('environment-1')
  })

  it('toggles matching secret names and selects custom color', () => {
    const onToggleSharedSecretNames = vi.fn()
    const onUpdateEnvironmentColor = vi.fn()

    render(
      <EnvironmentsSidebar
        {...defaultProps}
        onToggleSharedSecretNames={onToggleSharedSecretNames}
        onUpdateEnvironmentColor={onUpdateEnvironmentColor}
      />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Matching secret names' }))
    expect(onToggleSharedSecretNames).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('environment-color-environment-1'))
    expect(screen.getByTestId('environment-color-menu')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('#34d399'), {
      target: { value: '#123456' },
    })
    expect(onUpdateEnvironmentColor).toHaveBeenCalledWith('environment-1', '#123456')
  })

  it('confirms environment deletion from dialog', () => {
    const onDeleteEnvironment = vi.fn()

    render(<EnvironmentsSidebar {...defaultProps} onDeleteEnvironment={onDeleteEnvironment} />)

    fireEvent.click(screen.getByTestId('environment-delete-environment-1'))
    expect(screen.getByText('Delete environment?')).toBeTruthy()
    expect(screen.getByText('Remove dev and environment-scoped values.')).toBeTruthy()

    fireEvent.click(screen.getByText('Delete'))

    expect(onDeleteEnvironment).toHaveBeenCalledWith('environment-1')
  })

  it('reorders environments on drop', () => {
    const onReorderEnvironments = vi.fn()
    const environments = [
      makeEnvironment(),
      makeEnvironment({ id: 'environment-2', name: 'prod', isActive: false }),
    ]

    render(
      <EnvironmentsSidebar
        {...defaultProps}
        environments={environments}
        onReorderEnvironments={onReorderEnvironments}
      />
    )

    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'environment-1'),
    }

    fireEvent.dragStart(screen.getByTestId('environment-row-environment-1'), {
      dataTransfer: transfer,
    })
    fireEvent.dragOver(screen.getByTestId('environment-row-environment-2'), {
      dataTransfer: transfer,
    })
    fireEvent.drop(screen.getByTestId('environment-row-environment-2'), {
      dataTransfer: transfer,
    })

    expect(onReorderEnvironments).toHaveBeenCalledWith(['environment-2', 'environment-1'])
  })

  it('closes color menu from overlay click and shows tooltip on hover', () => {
    render(<EnvironmentsSidebar {...defaultProps} />)

    fireEvent.click(screen.getByTestId('environment-color-environment-1'))
    expect(screen.getByTestId('environment-color-menu')).toBeTruthy()

    fireEvent.mouseEnter(screen.getByTestId('environment-name-environment-1'))
    expect(screen.getAllByText('dev').length).toBeGreaterThan(0)

    const overlay = document.querySelector('button.absolute.inset-0') as HTMLButtonElement | null
    if (!overlay) {
      throw new Error('Expected color menu overlay')
    }
    fireEvent.click(overlay)
    expect(screen.queryByTestId('environment-color-menu')).toBeNull()

    fireEvent.mouseLeave(screen.getByTestId('environment-name-environment-1'))
  })

  it('ignores drop when dragged environment is same as target', () => {
    const onReorderEnvironments = vi.fn()
    render(<EnvironmentsSidebar {...defaultProps} onReorderEnvironments={onReorderEnvironments} />)

    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'environment-1'),
    }

    fireEvent.drop(screen.getByTestId('environment-row-environment-1'), {
      dataTransfer: transfer,
    })

    expect(onReorderEnvironments).not.toHaveBeenCalled()
  })

  it('saves rename on blur and clears drag opacity on drag end', () => {
    const onSaveRenameEnvironment = vi.fn()
    const { rerender } = render(
      <EnvironmentsSidebar
        {...defaultProps}
        editingEnvironmentId="environment-1"
        editingName="prod"
        onSaveRenameEnvironment={onSaveRenameEnvironment}
      />
    )

    fireEvent.blur(screen.getByTestId('environment-rename-environment-1'))
    expect(onSaveRenameEnvironment).toHaveBeenCalledWith('environment-1')

    rerender(<EnvironmentsSidebar {...defaultProps} />)
    const transfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
      getData: vi.fn(() => 'environment-1'),
    }
    fireEvent.dragStart(screen.getByTestId('environment-row-environment-1'), { dataTransfer: transfer })
    expect(screen.getByTestId('environment-row-environment-1').className).toContain('opacity-50')
    fireEvent.dragEnd(screen.getByTestId('environment-row-environment-1'))
    expect(screen.getByTestId('environment-row-environment-1').className).not.toContain('opacity-50')
  })

  it('closes delete dialog through onOpenChange false path', () => {
    render(<EnvironmentsSidebar {...defaultProps} />)

    fireEvent.click(screen.getByTestId('environment-delete-environment-1'))
    expect(screen.getByText('Delete environment?')).toBeTruthy()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Delete environment?')).toBeNull()
  })
})
