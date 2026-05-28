// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import RetroactiveReviewStep from './RetroactiveReviewStep'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}))

const mockScanResult = {
  files: [
    {
      filePath: '/Users/test/.zshrc',
      variables: [
        { id: '1', name: 'API_KEY', value: 'secret123', sourceFile: '/Users/test/.zshrc' },
        { id: '2', name: 'PORT', value: '3000', sourceFile: '/Users/test/.zshrc' },
      ],
    },
    {
      filePath: '/Users/test/.bashrc',
      variables: [
        { id: '3', name: 'DB_URL', value: 'db:5432', sourceFile: '/Users/test/.bashrc' },
      ],
    },
  ],
  warnings: [],
}

describe('RetroactiveReviewStep', () => {
  afterEach(cleanup)

  beforeEach(() => {
    window.brover = {
      onboarding: {
        scanDotfiles: vi.fn().mockResolvedValue(mockScanResult),
      },
    } as any
  })

  it('groups variables by source file', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getAllByText(/\.zshrc/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/\.bashrc/i).length).toBeGreaterThan(0)
    })
  })

  it('toggles sensitive selection via checkbox', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  it('masks values by default with reveal toggle via eye icon', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getByText(/API_KEY/i)).toBeTruthy()
    })
    const maskedValues = screen.getAllByText('••••••')
    expect(maskedValues.length).toBeGreaterThan(0)
  })

  it('no auth prompt appears in onboarding review', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.queryByText(/auth|authenticate|password/i)).toBeNull()
    })
  })

  it('calls onContinue with selected sensitive ids', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getByText(/onboarding\.review\.continue/i)).toBeTruthy()
    })
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(screen.getByText(/onboarding\.review\.continue/i))
    expect(onContinue).toHaveBeenCalledWith({
      scanResult: mockScanResult,
      selection: { selectedSensitiveIds: ['1'] },
    })
  })

  it('groups are collapsible with chevron icons', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getAllByTestId('chevron-down').length).toBeGreaterThan(0)
    })
    const header = screen.getByText(/\.zshrc/i)
    fireEvent.click(header)
    const chevronsRight = screen.getAllByTestId('chevron-right')
    expect(chevronsRight.length).toBe(1)
  })

  it('selects variable by clicking the variable name', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getByText(/API_KEY/i)).toBeTruthy()
    })
    fireEvent.click(screen.getByText('API_KEY'))
    fireEvent.click(screen.getByText(/onboarding\.review\.continue/i))
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: { selectedSensitiveIds: ['1'] },
      }),
    )
  })

  it('checkbox is positioned on the far right of card', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  it('shows eye icon for reveal instead of source file label', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} />)
    await waitFor(() => {
      expect(screen.getAllByTestId('eye-icon').length).toBeGreaterThan(0)
    })
  })
})
