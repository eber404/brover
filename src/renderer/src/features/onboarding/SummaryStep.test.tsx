// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import SummaryStep from './SummaryStep'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
}))

const mockSummary = {
  importedSensitive: 3,
  removedFromDotfiles: 3,
  ignoredNonSensitive: 5,
  ignoredWithReason: [
    { filePath: '/Users/test/.zshrc', reason: 'permission denied' },
  ],
}

describe('SummaryStep', () => {
  afterEach(cleanup)

  it('shows counts for imported, removed, ignored', () => {
    render(<SummaryStep summary={mockSummary} onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getAllByText('3')).toHaveLength(2)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows ignored reasons when present', () => {
    render(<SummaryStep summary={mockSummary} onComplete={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/permission denied/i)).toBeTruthy()
  })

  it('calls onComplete when Concluir is clicked', async () => {
    window.brover = { onboarding: { complete: vi.fn().mockResolvedValue(undefined) } } as any
    const onComplete = vi.fn()
    render(<SummaryStep summary={mockSummary} onComplete={onComplete} onBack={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /onboarding.summary.action/i }))
    await waitFor(() => {
      expect(window.brover.onboarding.complete).toHaveBeenCalled()
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('shows back button inline with title', () => {
    const onBack = vi.fn()
    render(<SummaryStep summary={mockSummary} onComplete={vi.fn()} onBack={onBack} />)
    expect(screen.getByTestId('arrow-left')).toBeTruthy()
    fireEvent.click(screen.getByTestId('arrow-left'))
    expect(onBack).toHaveBeenCalled()
  })
})
