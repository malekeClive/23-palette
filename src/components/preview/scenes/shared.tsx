import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type State = 'success' | 'warning' | 'destructive' | 'info'

const fill: Record<State, string> = {
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
}

const icon: Record<State, typeof Info> = {
  success: CircleCheck,
  warning: TriangleAlert,
  destructive: CircleAlert,
  info: Info,
}

/** State badge: colour + icon, never colour alone. */
export function StateBadge({ state, children }: { state: State; children: ReactNode }) {
  const Icon = icon[state]
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', fill[state])}
      data-tokens={`${state} ${state}-foreground`}
      data-explain={state}
    >
      <Icon className="size-3" aria-hidden />
      {children}
    </span>
  )
}

export function StateAlert({ state, title, children }: { state: State; title: string; children: ReactNode }) {
  const Icon = icon[state]
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border bg-card p-3 text-sm"
      style={{ borderLeft: `4px solid var(--${state})` }}
      data-tokens={`${state} card`}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full',
          fill[state],
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
