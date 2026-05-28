// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import OnboardingFlow from './OnboardingFlow'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
}))

describe('OnboardingFlow', () => {
  afterEach(cleanup)

  beforeEach(() => {
    window.brover = {
      onboarding: {
        scanDotfiles: vi.fn().mockResolvedValue({ files: [], warnings: [] }),
        runFreshStart: vi.fn().mockResolvedValue({ importedSensitive: 0, removedFromDotfiles: 0, ignoredNonSensitive: 0, ignoredWithReason: [] }),
        complete: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockResolvedValue({}),
      },
    } as any
  })

  it('shows welcome heading', () => {
    render(<OnboardingFlow onComplete={() => {}} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeTruthy()
  })

  it('renders retroactive and fresh start card headings', () => {
    render(<OnboardingFlow onComplete={() => {}} />)
    const subHeadings = screen.getAllByRole('heading', { level: 2 })
    expect(subHeadings).toHaveLength(2)
    expect(subHeadings[0].textContent).toMatch(/retroactive/i)
    expect(subHeadings[1].textContent).toMatch(/fresh/i)
  })

  it('shows back button on non-welcome steps', async () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)
    expect(screen.queryByTestId('arrow-left')).toBeNull()
    const retroBtn = screen.getByText(/onboarding\.mode\.retroactive\.action/i)
    fireEvent.click(retroBtn)
    expect(screen.getByTestId('arrow-left')).toBeTruthy()
  })
})
