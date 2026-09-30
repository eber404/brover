import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
  undoCallback?: () => void
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, type?: 'success' | 'error', undoCallback?: () => void) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toasts: [], toast: () => {}, remove: () => {} })

let toastId = Date.now()

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismissTimer = useRef<{ id: string; handle: ReturnType<typeof setTimeout> } | undefined>(undefined)

  const clearDismissTimer = useCallback(() => {
    const timer = dismissTimer.current
    if (!timer) return
    dismissTimer.current = undefined
    clearTimeout(timer.handle)
  }, [])

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer])

  const toast = useCallback((
    message: string,
    type: Toast['type'] = 'success',
    undoCallback?: () => void
  ) => {
    const id = `${Date.now()}-${toastId++}`
    clearDismissTimer()

    setToasts([{ id, message, type, undoCallback }])
    dismissTimer.current = {
      id,
      handle: setTimeout(() => {
        if (dismissTimer.current?.id !== id) return
        dismissTimer.current = undefined
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    }
  }, [clearDismissTimer])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = dismissTimer.current
    if (!timer || timer.id !== id) return
    dismissTimer.current = undefined
    clearTimeout(timer.handle)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, remove }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

function Toaster() {
  const { toasts, remove } = useToast()

  function getToastClass(type: Toast['type']) {
    if (type === 'error') {
      return 'border-rose-action bg-rose-on text-rose-status'
    }
    return 'border-emerald-status bg-emerald-on text-emerald-status'
  }

  return (
    <div
      data-testid="toaster"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 z-[100] grid max-w-[calc(100%-2rem)] -translate-x-1/2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid="toast"
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${getToastClass(t.type)}`}
        >
          <span className="flex-1">{t.message}</span>
          {t.undoCallback && (
            <button
              className="cursor-pointer rounded px-2 py-0.5 text-xs font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => {
                t.undoCallback?.()
                remove(t.id)
              }}
            >
              Undo
            </button>
          )}
          <button
            data-testid="toast-dismiss"
            aria-label="Dismiss toast"
            className="ml-1 cursor-pointer rounded opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => remove(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
