import * as React from 'react'
import { cn } from '../../lib/utils'

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { className, checked, onCheckedChange, label, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#020614] disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-slate-700',
        className
      )}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-[#020614] shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
})
