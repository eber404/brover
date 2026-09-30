// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input'

it('adds focus-visible styles without dropping caller classes', () => {
  render(<Input aria-label="Secret value" className="custom-input" />)

  const input = screen.getByRole('textbox', { name: 'Secret value' })
  expect(input.className).toContain('focus-visible:ring-2')
  expect(input.className).toContain('custom-input')
})
