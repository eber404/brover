// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('adds cursor pointer by default and not-allowed when disabled', () => {
    const { rerender } = render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' }).className).toContain('cursor-pointer')

    rerender(<Button disabled>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' }).className).toContain('disabled:cursor-not-allowed')
  })
})
