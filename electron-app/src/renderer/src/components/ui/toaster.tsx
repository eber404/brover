import * as React from 'react'
import { createContext, useCallback, useContext, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, type?: 'success' | 'error') => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toasts: [], toast: () => {}, remove: () => {} })

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `${Date.now()}-${toastId++}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
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

  return (
    <div className="fixed bottom-4 right-4 z-50 grid gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            t.type === 'error'
              ? 'border-rose-300/40 bg-rose-950/80 text-rose-200'
              : 'border-emerald-300/40 bg-emerald-950/80 text-emerald-200'
          }`}
        >
          {t.message}
          <button className="ml-1 opacity-70 hover:opacity-100" onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
