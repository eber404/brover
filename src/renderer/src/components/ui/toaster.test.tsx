// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider, useToast } from './toaster'

function TestHarness() {
  const { toast } = useToast()

  return (
    <div>
      <button onClick={() => toast('Saved')}>toast-success</button>
      <button onClick={() => toast('Broken', 'error')}>toast-error</button>
      <button onClick={() => toast('Undoable', 'success', undoSpy)}>toast-undo</button>
    </div>
  )
}

const undoSpy = vi.fn()

describe('toaster', () => {
  beforeEach(() => {
    undoSpy.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders success and error toasts with matching styles', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    fireEvent.click(screen.getByText('toast-error'))

    expect(await screen.findByText('Saved')).toBeTruthy()
    expect(screen.getByText('Broken').parentElement?.className).toContain('border-rose-action')
    expect(screen.getByText('Saved').parentElement?.className).toContain('border-emerald-status')
  })

  it('runs undo callback and removes toast', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-undo'))
    fireEvent.click(await screen.findByText('Undo'))

    expect(undoSpy).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText('Undoable')).toBeNull()
    })
  })

  it('auto dismisses toast after timeout', async () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    expect(screen.getByText('Saved')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('closes toast from dismiss button', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-error'))
    expect(await screen.findByText('Broken')).toBeTruthy()

    const dismissButtons = screen.getAllByRole('button')
    fireEvent.click(dismissButtons[dismissButtons.length - 1]!)

    await waitFor(() => {
      expect(screen.queryByText('Broken')).toBeNull()
    })
  })
})
