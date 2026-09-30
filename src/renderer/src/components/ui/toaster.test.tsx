// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ToastProvider, useToast } from './toaster'

function TestHarness() {
  const { toast, remove } = useToast()

  return (
    <div>
      <button onClick={() => toast('Saved')}>toast-success</button>
      <button onClick={() => toast('Broken', 'error')}>toast-error</button>
      <button onClick={() => toast('Undoable', 'success', undoSpy)}>toast-undo</button>
      <button onClick={() => remove('stale-toast-id')}>remove-stale</button>
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
    vi.restoreAllMocks()
  })

  it('places the latest toast at the bottom center and replaces the previous toast', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    expect(await screen.findByText('Saved')).toBeTruthy()

    fireEvent.click(screen.getByText('toast-error'))

    expect(screen.getByTestId('toaster').className).toContain('bottom-4')
    expect(screen.getByTestId('toaster').className).toContain('left-1/2')
    expect(screen.getByTestId('toaster').className).toContain('-translate-x-1/2')
    expect(screen.queryByText('Saved')).toBeNull()
    expect(screen.getAllByTestId('toast')).toHaveLength(1)
    expect(screen.getByText('Broken').parentElement?.className).toContain('border-rose-action')
  })

  it('renders above the dialog overlay layer', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    expect(screen.getByTestId('toaster').className).toContain('z-[100]')
  })

  it('exposes a polite live region so toast messages are announced to screen readers', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    const container = screen.getByTestId('toaster')
    expect(container.getAttribute('role')).toBe('status')
    expect(container.getAttribute('aria-live')).toBe('polite')
    expect(container.getAttribute('aria-atomic')).toBe('true')

    fireEvent.click(screen.getByText('toast-success'))
    const message = await screen.findByText('Saved')
    expect(container.contains(message)).toBe(true)
    expect(within(container).getByText('Saved')).toBeTruthy()
    expect(container.getAttribute('aria-live')).toBe('polite')

    const dismiss = screen.getByRole('button', { name: 'Dismiss toast' })
    expect(dismiss).toBeTruthy()
  })

  it('ignores a stale remove id and keeps the live dismiss timer running', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    expect(screen.getByText('Saved')).toBeTruthy()
    const callsBeforeStaleRemove = clearTimeoutSpy.mock.calls.length

    fireEvent.click(screen.getByText('remove-stale'))
    expect(screen.getByText('Saved')).toBeTruthy()
    expect(clearTimeoutSpy.mock.calls.length).toBe(callsBeforeStaleRemove)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('clears the dismiss timer on unmount so later timer runs never write state', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    expect(screen.getByText('Saved')).toBeTruthy()
    const callsBeforeUnmount = clearTimeoutSpy.mock.calls.length

    unmount()
    expect(clearTimeoutSpy.mock.calls.length).toBe(callsBeforeUnmount + 1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('runs undo callback and removes toast', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-undo'))
    const undo = await screen.findByText('Undo')
    expect(undo.className).toContain('focus-visible:ring-2')
    fireEvent.click(undo)

    expect(undoSpy).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByText('Undoable')).toBeNull()
    })
  })

  it('gives a replacement toast a new five-second lifetime', async () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-success'))
    expect(screen.getByText('Saved')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    fireEvent.click(screen.getByText('toast-error'))
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Broken')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(screen.queryByText('Saved')).toBeNull()
    expect(screen.getByText('Broken')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })

    expect(screen.queryByText('Broken')).toBeNull()
  })

  it('closes toast from dismiss button', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('toast-error'))
    expect(await screen.findByText('Broken')).toBeTruthy()

    const dismiss = screen.getByTestId('toast-dismiss')
    expect(dismiss.className).toContain('focus-visible:ring-2')
    fireEvent.click(dismiss)

    await waitFor(() => {
      expect(screen.queryByText('Broken')).toBeNull()
    })
  })
})
