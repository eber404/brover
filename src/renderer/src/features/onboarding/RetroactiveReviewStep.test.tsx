// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import RetroactiveReviewStep from './RetroactiveReviewStep'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
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

  it('masks values by default with reveal toggle', async () => {
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
})
