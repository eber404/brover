// @vitest-environment jsdom
import { useState } from 'react'
import { expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from './confirmDialog'

function ConfirmDialogHarness({ onConfirm }: { onConfirm: () => void | Promise<void> }) {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Confirm mutation"
      description="Mutates a secret."
      confirmLabel="Confirm"
      onConfirm={onConfirm}
    />
  )
}

it('keeps confirmation open when the mutation fails', async () => {
  const failure = Promise.reject(new Error('mutation failed'))
  void failure.catch(() => {})
  render(<ConfirmDialogHarness onConfirm={() => failure} />)

  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

  expect(await screen.findByText('Confirm mutation')).toBeTruthy()
})
