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
  ArrowLeft: () => <span data-testid="arrow-left" />,
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
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getAllByText(/\.zshrc/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/\.bashrc/i).length).toBeGreaterThan(0)
    })
  })

  it('masks values by default with reveal toggle via eye icon', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/API_KEY/i)).toBeTruthy()
    })

    const maskedValues = screen.getAllByText('••••••')
    expect(maskedValues.length).toBeGreaterThan(0)
  })

  it('no auth prompt appears in onboarding review', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText(/auth|authenticate|password/i)).toBeNull()
    })
  })

  it('selects variable by clicking the card and passes to onContinue', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)
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

  it('groups are collapsible with chevron icons', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getAllByTestId('chevron-down').length).toBeGreaterThan(0)
    })
    const header = screen.getByText(/\.zshrc/i)
    fireEvent.click(header)
    const chevronsRight = screen.getAllByTestId('chevron-right')
    expect(chevronsRight.length).toBe(1)
  })

  it('shows eye icon and no checkboxes in card', async () => {
    const onContinue = vi.fn()
    render(<RetroactiveReviewStep onContinue={onContinue} onBack={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getAllByTestId('eye-icon').length).toBeGreaterThan(0)
    })
    const checkboxes = screen.queryAllByRole('checkbox')
    expect(checkboxes.length).toBe(0)
  })

  it('keeps the back button inside the content column instead of a negative offset', async () => {
    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })

    const backButton = screen.getByRole('button', { name: 'back' })
    expect(backButton.closest('[class*="absolute"]')).toBeNull()
    expect(backButton.className).not.toContain('-left-')
    expect(backButton.className).not.toContain('-ml-')
  })

  it('shows back button inline with title', async () => {
    const onBack = vi.fn()
    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={onBack} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'back' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('reveals and hides variable values from eye toggle', async () => {
    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByLabelText(/onboarding\.review\.reveal/i).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByLabelText(/onboarding\.review\.reveal/i)[0]!)
    expect(screen.getByText('secret123')).toBeTruthy()
    expect(screen.getAllByTestId('eye-off-icon').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByLabelText(/onboarding\.review\.hide/i))
    expect(screen.queryByText('secret123')).toBeNull()
  })

  it('disables continue until at least one variable is selected', async () => {
    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={vi.fn()} />)

    const continueButton = await screen.findByText(/onboarding\.review\.continue/i)
    expect((continueButton as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByText('API_KEY'))
    expect((continueButton as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows refresh state when scan fails', async () => {
    window.brover.onboarding.scanDotfiles = vi.fn().mockRejectedValue(new Error('Scan failed')) as any
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })

    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={vi.fn()} />)

    expect(await screen.findByText('Scan failed')).toBeTruthy()
    fireEvent.click(screen.getByText(/common\.refresh/i))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('renders no variables state when scan result is empty', async () => {
    window.brover.onboarding.scanDotfiles = vi.fn().mockResolvedValue({ files: [], warnings: [] }) as any

    render(<RetroactiveReviewStep onContinue={vi.fn()} onBack={vi.fn()} />)

    expect(await screen.findByText(/onboarding\.review\.noVariables/i)).toBeTruthy()
  })
})
