// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { SpacesSidebar } from './SpacesSidebar'
import type { EnvSpace, EnvTarget } from '../../../../shared/models'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

function makeSpace(overrides: Partial<EnvSpace> = {}): EnvSpace {
  return {
    id: 's1',
    name: 'my-project',
    kind: 'dotfile',
    dotfilePath: '~/.zshrc',
    expanded: true,
    tiedSecrets: true,
    updatedAt: '2024-01-01',
    ...overrides,
  }
}

const defaultProps = {
  title: 'Brover',
  subtitle: 'test',
  spaces: [makeSpace()],
  targetsBySpace: new Map<string, EnvTarget[]>(),
  selectedSpaceId: 's1',
  selectedTargetId: null,
  editingSpaceId: null,
  editingSpaceName: '',
  editingTargetId: null,
  editingName: '',
  locale: 'en' as const,
  onLocaleChange: vi.fn(),
  onEditNameChange: vi.fn(),
  onAddSpace: vi.fn(),
  onStartRenameSpace: vi.fn(),
  onSaveRenameSpace: vi.fn(),
  onEditSpaceNameChange: vi.fn(),
  onSelectSpace: vi.fn(),
  onAddTarget: vi.fn(),
  onStartRenameTarget: vi.fn(),
  onSaveRenameTarget: vi.fn(),
  onSelectTarget: vi.fn(),
  onUpdateTargetColor: vi.fn(),
  onReorderTargets: vi.fn(),
  onDeleteTarget: vi.fn(),
  onDeleteSpace: vi.fn(),
  onToggleSpaceTiedSecrets: vi.fn(),
}

describe('SpacesSidebar', () => {
  afterEach(cleanup)

  it('displays selected space name below TARGETS heading', () => {
    render(<SpacesSidebar {...defaultProps} />)
    const targetsHeading = screen.getByText('TARGETS')
    expect(targetsHeading).toBeTruthy()
    const spaceName = screen.getByText('my-project')
    expect(spaceName).toBeTruthy()
  })

  it('shows dotfile name for dotfile-imported space', () => {
    const dotfileSpace = makeSpace({ name: '.zshrc', dotfilePath: '~/.zshrc' })
    render(<SpacesSidebar {...defaultProps} spaces={[dotfileSpace]} selectedSpaceId="s1" />)
    expect(screen.getByText('.zshrc')).toBeTruthy()
  })

  it('clicking add space triggers import directly without opening menu', () => {
    const onAddSpace = vi.fn()

    render(<SpacesSidebar {...defaultProps} onAddSpace={onAddSpace} />)

    fireEvent.click(screen.getByTitle('Add space'))

    expect(onAddSpace).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Import dotfile')).toBeNull()
  })
})
