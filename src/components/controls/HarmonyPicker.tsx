import { useRef } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HARMONY_EXPLAIN } from '@/content/explanations'
import { toHex } from '@/engine/color'
import { harmonyOffsets } from '@/engine/harmony'
import { HARMONIES, type Harmony } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { explainId, SectionHeading } from '../help/InfoTip'

function MiniWheel({ harmony, baseHue, l, c }: { harmony: Harmony; baseHue: number; l: number; c: number }) {
  const offsets = harmonyOffsets(harmony)
  return (
    <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="5" />
      {offsets.map((o, i) => {
        const a = ((baseHue + o - 90) * Math.PI) / 180
        return (
          <circle
            key={o}
            cx={20 + 15 * Math.cos(a)}
            cy={20 + 15 * Math.sin(a)}
            r={i === 0 ? 5 : 3.8}
            fill={toHex({ l, c: Math.min(c, 0.15), h: baseHue + o })}
            stroke="white"
            strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
}

export function HarmonyPicker() {
  const harmony = usePaletteStore((s) => s.config.harmony)
  const setConfig = usePaletteStore((s) => s.setConfig)
  const setUi = usePaletteStore((s) => s.setUi)
  const { result } = usePalette()
  const seed = result.roles.primary!
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const preview = (h: Harmony | null) => {
    const cfg = usePaletteStore.getState().config
    setUi({
      hoverConfig: h && h !== cfg.harmony ? { ...cfg, harmony: h, overrides: { light: {}, dark: {} } } : null,
    })
  }
  const choose = (h: Harmony) => setConfig((c) => ({ ...c, harmony: h, overrides: { light: {}, dark: {} } }))

  return (
    <section className="space-y-2" aria-labelledby="harmony-heading">
      <SectionHeading id="harmony">
        <span id="harmony-heading">Colour relationship</span>
      </SectionHeading>
      <div
        role="radiogroup"
        aria-labelledby="harmony-heading"
        aria-describedby={explainId('harmony')}
        className="grid grid-cols-4 gap-1.5"
        onMouseLeave={() => preview(null)}
      >
        {HARMONIES.map((h, i) => {
          const selected = h === harmony
          const ex = HARMONY_EXPLAIN[h]
          return (
            <Tooltip key={h} delayDuration={400}>
              <TooltipTrigger asChild>
                <button
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${ex.label}: ${ex.what}`}
                  tabIndex={selected ? 0 : -1}
                  onMouseEnter={() => preview(h)}
                  onFocus={() => preview(null)}
                  onClick={() => choose(h)}
                  onKeyDown={(e) => {
                    const dir =
                      e.key === 'ArrowRight' || e.key === 'ArrowDown'
                        ? 1
                        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                          ? -1
                          : 0
                    if (!dir) return
                    e.preventDefault()
                    const next = (i + dir + HARMONIES.length) % HARMONIES.length
                    choose(HARMONIES[next])
                    refs.current[next]?.focus()
                  }}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 text-[11px] leading-tight transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    selected && 'border-foreground bg-muted font-medium',
                  )}
                >
                  <MiniWheel
                    harmony={h}
                    baseHue={seed.h}
                    l={Math.min(0.7, Math.max(0.55, seed.l))}
                    c={Math.max(0.08, seed.c)}
                  />
                  {ex.label}
                  <span className="sr-only">(shortcut {i + 1})</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56">
                <p className="font-medium">{ex.label}</p>
                <p>{ex.what}</p>
                <p className="opacity-80">{ex.goodFor}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{HARMONY_EXPLAIN[harmony].goodFor}</p>
    </section>
  )
}
