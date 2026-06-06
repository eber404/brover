// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { SpacesSidebar } from './SpacesSidebar'
import type { EnvTarget } from '../../../../shared/models'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function makeTarget(overrides: Partial<EnvTarget> = {}): EnvTarget {
  return {
    id: 'target-1',
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
  targets: [makeTarget()],
  selectedTargetId: 'target-1',
  tiedTargets: true,
  editingTargetId: null,
  editingName: '',
  onEditNameChange: vi.fn(),
  onAddTarget: vi.fn(),
  onStartRenameTarget: vi.fn(),
  onSaveRenameTarget: vi.fn(),
  onSelectTarget: vi.fn(),
  onUpdateTargetColor: vi.fn(),
  onReorderTargets: vi.fn(),
  onDeleteTarget: vi.fn(),
  onToggleTiedTargets: vi.fn(),
}

describe('SpacesSidebar', () => {
  afterEach(cleanup)

  it('renders target-only column with tied targets control', () => {
    render(<SpacesSidebar {...defaultProps} />)

    expect(screen.getByText('TARGETS')).toBeTruthy()
    expect(screen.getByText('Tied targets')).toBeTruthy()
    expect(screen.getByTestId('target-row-target-1')).toBeTruthy()
    expect(screen.getByText('Brover · Local secrets manager')).toBeTruthy()
    expect(screen.getByTestId('targets-list').className).toContain('flex-1')
    expect(screen.getByTestId('targets-footer').className).toContain('min-h-[34px]')
    expect(screen.getByTestId('targets-footer').className).toContain('items-center')
  })

  it('does not render old space rail affordances', () => {
    render(<SpacesSidebar {...defaultProps} />)

    expect(screen.queryByTitle('Add space')).toBeNull()
    expect(screen.queryByText('my-project')).toBeNull()
  })

  it('clicking add target triggers handler', () => {
    const onAddTarget = vi.fn()
    render(<SpacesSidebar {...defaultProps} onAddTarget={onAddTarget} />)

    fireEvent.click(screen.getByTestId('target-add'))

    expect(onAddTarget).toHaveBeenCalledTimes(1)
  })

  it('adds cursor pointer to clickable affordances', () => {
    render(<SpacesSidebar {...defaultProps} />)

    expect(screen.getByTestId('target-add').className).toContain('cursor-pointer')
    expect(screen.getByTestId('target-row-target-1').className).toContain('cursor-pointer')
    expect(screen.getByTestId('target-color-target-1').className).toContain('cursor-pointer')
    expect(screen.getByRole('switch').className).toContain('cursor-pointer')
  })
})
