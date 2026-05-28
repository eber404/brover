// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import ConfirmationStep from './ConfirmationStep'

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

describe('ConfirmationStep', () => {
  afterEach(cleanup)

  it('shows counts for to-store, to-remove, ignored', () => {
    render(<ConfirmationStep summary={mockSummary} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getAllByText('3')).toHaveLength(2)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows ignored reasons when present', () => {
    render(<ConfirmationStep summary={mockSummary} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/permission denied/i)).toBeTruthy()
  })

  it('calls onConfirm when Confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmationStep summary={mockSummary} onConfirm={onConfirm} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /onboarding.confirmation.action/i }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('shows back button inline with title', () => {
    const onBack = vi.fn()
    render(<ConfirmationStep summary={mockSummary} onConfirm={vi.fn()} onBack={onBack} />)
    expect(screen.getByTestId('arrow-left')).toBeTruthy()
    fireEvent.click(screen.getByTestId('arrow-left'))
    expect(onBack).toHaveBeenCalled()
  })
})
