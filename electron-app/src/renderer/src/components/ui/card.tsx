import * as React from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-edge bg-slate-950/40 p-3', className)} {...props} />
}
