import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { usePalette } from '@/state/palette-context'

/** Contextual, dismissible notes that appear only when relevant (§8.10g). */
interface Hint {
  id: string
  text: string
  action?: { label: string; onClick: () => void }
}

export function Hints({ extra = [] }: { extra?: Hint[] }) {
  const { result } = usePalette()
  const [dismissed, setDismissed] = useState<string[]>([])
  const hints: Hint[] = [...result.hints, ...extra].filter((h) => !dismissed.includes(`${h.id}:${h.text}`))
  if (!hints.length) return null
  return (
    <div className="space-y-2" aria-live="polite">
      {hints.map((h) => (
        <div
          key={h.id}
          className="flex items-start gap-2 rounded-md border bg-muted/50 p-2 text-xs text-muted-foreground"
        >
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div className="flex-1">
            {h.text}
            {h.action && (
              <>
                {' · '}
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-2"
                  onClick={h.action.onClick}
                >
                  {h.action.label}
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss hint"
            className="rounded p-0.5 hover:bg-muted"
            onClick={() => setDismissed((d) => [...d, `${h.id}:${h.text}`])}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
