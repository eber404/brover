import * as React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn('h-10 w-full rounded-lg border border-edge bg-slate-900 px-3 py-2 text-sm outline-none ring-accent focus-visible:ring-2', className)} {...props} />
})
