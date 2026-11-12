import { CircleHelp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EXPLAIN } from '@/content/explanations'
import { cn } from '@/lib/utils'

export const explainId = (id: string) => `explain-${id.replace(/\./g, '-')}`

/** `?` icon that opens a short explanation. Also renders a hidden description for aria-describedby. */
export function InfoTip({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children?: ReactNode
}) {
  const e = EXPLAIN[id]
  if (!e) return null
  return (
    <>
      <span id={explainId(id)} className="sr-only">
        {e.what}
      </span>
      <Popover>
        <PopoverTrigger
          aria-label={`About ${e.title}`}
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            className,
          )}
        >
          <CircleHelp className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm" side="right" align="start">
          <p className="font-medium">{e.title}</p>
          <p className="mt-1 text-muted-foreground">{e.what}</p>
          {e.when && <p className="mt-2 text-muted-foreground">{e.when}</p>}
          {children}
        </PopoverContent>
      </Popover>
    </>
  )
}

export function SectionHeading({
  id,
  children,
  action,
  className,
}: {
  id: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>
      <InfoTip id={id} />
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
