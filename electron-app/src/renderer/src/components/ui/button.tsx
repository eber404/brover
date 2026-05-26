import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-accent text-slate-950 hover:bg-cyan-300',
        variant === 'outline' && 'border border-edge bg-slate-900/70 text-slate-100 hover:bg-slate-800',
        variant === 'destructive' && 'border border-rose-400 bg-rose-950/30 text-rose-200 hover:bg-rose-900/40',
        className
      )}
      {...props}
    />
  )
})
