import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TOUR_STEPS } from '@/content/explanations'
import { readFlag, usePaletteStore, writeFlag } from '@/state/store'

export const TOUR_FLAG = 'palette.onboarded.v1'

/** First-run, skippable, non-blocking tour anchored to real UI ([data-tour] targets). */
export function CoachMarks() {
  const step = usePaletteStore((s) => s.tourStep)
  const setUi = usePaletteStore((s) => s.setUi)
  const [pos, setPos] = useState<{ top: number; left: number; arrowLeft: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!readFlag(TOUR_FLAG)) {
      const t = setTimeout(() => setUi({ tourStep: 0 }), 600)
      return () => clearTimeout(t)
    }
  }, [setUi])

  useLayoutEffect(() => {
    if (step === null) return
    const place = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${TOUR_STEPS[step].target}"]`)
      if (!target) return setPos(null)
      const r = target.getBoundingClientRect()
      const w = cardRef.current?.offsetWidth ?? 300
      const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))
      setPos({
        top: r.bottom + 10,
        left,
        arrowLeft: Math.max(16, Math.min(w - 16, r.left + r.width / 2 - left)),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [step])

  if (step === null) return null
  const s = TOUR_STEPS[step]
  const finish = () => {
    writeFlag(TOUR_FLAG, true)
    setUi({ tourStep: null })
  }
  const last = step === TOUR_STEPS.length - 1

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      className="fixed z-50 w-[300px] rounded-lg border bg-popover p-4 text-popover-foreground shadow-xl"
      style={{ top: pos?.top ?? 80, left: pos?.left ?? 16 }}
      onKeyDown={(e) => e.key === 'Escape' && finish()}
    >
      {pos && (
        <span
          className="absolute -top-1.5 size-3 rotate-45 border-t border-l bg-popover"
          style={{ left: pos.arrowLeft - 6 }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            Step {step + 1} of {TOUR_STEPS.length}
          </p>
          <p id="tour-title" className="font-medium">
            {s.title}
          </p>
        </div>
        <button
          type="button"
          aria-label="Skip tour"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={finish}
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={finish}>
          Skip
        </Button>
        {step > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setUi({ tourStep: step - 1 })}
          >
            Back
          </Button>
        )}
        <Button
          size="sm"
          className={step === 0 ? 'ml-auto' : ''}
          onClick={() => (last ? finish() : setUi({ tourStep: step + 1 }))}
          autoFocus
        >
          {last ? 'Done' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
