// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import OnboardingFlow from './OnboardingFlow'

vi.mock('../../i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

describe('OnboardingFlow', () => {
  afterEach(cleanup)

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
})
