import * as React from 'react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

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
  const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const toast = useCallback((
    message: string,
    type: Toast['type'] = 'success',
    undoCallback?: () => void
  ) => {
    const id = `${Date.now()}-${toastId++}`
    setToasts((prev) => [...prev, { id, message, type, undoCallback }])
    const existingTimer = undoTimers.current.get(id)
    if (existingTimer) clearTimeout(existingTimer)
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      undoTimers.current.delete(id)
    }, 5000)
    undoTimers.current.set(id, timer)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = undoTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      undoTimers.current.delete(id)
    }
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
    <div className="fixed bottom-4 right-4 z-50 grid gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${getToastClass(t.type)}`}
        >
          <span className="flex-1">{t.message}</span>
          {t.undoCallback && (
            <button
              className="rounded px-2 py-0.5 text-xs font-medium underline hover:no-underline"
              onClick={() => {
                t.undoCallback?.()
                remove(t.id)
              }}
            >
              Undo
            </button>
          )}
          <button className="ml-1 opacity-70 hover:opacity-100" onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}