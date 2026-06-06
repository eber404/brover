import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive' | 'success' | 'card'
}

const HOVER_CYAN = '#67d0ff'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', ...props },
  ref
) {
  return (
      <button
        ref={ref}
        className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'default' && 'bg-accent text-slate-950 hover:bg-[#67d0ff]',
        variant === 'outline' && 'border border-edge bg-transparent text-text-base hover:bg-surface-overlay',
        variant === 'destructive' && 'border border-rose-action bg-rose-on text-rose-status hover:bg-rose-hover',
        variant === 'success' && 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
        variant === 'card' && 'border border-edge bg-surface-card text-text-base hover:border-accent/40 hover:shadow-[0_0_18px_rgba(31,182,255,0.15)]',
        className
      )}
      {...props}
    />
  )
})
