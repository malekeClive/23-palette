import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BLACK, formatOklch, toHex, WHITE } from '@/engine/color'
import { wcag, wcagLevel } from '@/engine/contrast'
import { SCALE_ORDER } from '@/engine/export/common'
import { type Oklch, type ScaleKey, STEPS, type Step } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { SectionHeading } from '../help/InfoTip'

export async function copyText(text: string, message = `Copied ${text}`) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message, { duration: 2000 })
  } catch {
    toast.error('Could not copy — your browser blocked clipboard access.', { duration: 3000 })
  }
}

const SCALE_LABEL: Record<ScaleKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  extra: 'Extra',
  neutral: 'Neutral',
  success: 'Success',
  warning: 'Warning',
  destructive: 'Error',
  info: 'Info',
}

function Level({ ratio, on }: { ratio: number; on: string }) {
  const level = wcagLevel(ratio)
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        {on} text {ratio.toFixed(2)}:1
      </span>
      <span
        className={cn(
          'rounded px-1 text-[10px] font-semibold',
          level === 'Fail' ? 'bg-white/15' : 'bg-white/30',
        )}
      >
        {level}
      </span>
    </div>
  )
}

function Swatch({
  name,
  step,
  color,
  anchor,
  reduced,
}: {
  name: ScaleKey
  step: Step
  color: Oklch
  anchor: boolean
  reduced: boolean
}) {
  const hex = toHex(color)
  const light = color.l > 0.62
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${name} ${step}, ${hex}${anchor ? ', your exact colour' : ''}. Click to copy hex, Alt+click to copy oklch.`}
          className="group relative flex h-12 min-w-0 flex-1 flex-col items-start justify-end overflow-hidden rounded-md p-1 text-left first:rounded-l-lg last:rounded-r-lg focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{ background: hex, color: light ? '#111' : '#fff' }}
          onClick={(e) => (e.altKey ? copyText(formatOklch(color)) : copyText(hex))}
        >
          {anchor && (
            <span
              className="absolute top-1 right-1 size-2 rounded-full border border-current bg-current"
              aria-hidden
            />
          )}
          {reduced && (
            <span
              className="absolute top-0 left-0 size-0 border-t-[10px] border-r-[10px] border-t-current border-r-transparent opacity-60"
              aria-hidden
            />
          )}
          <span className="text-[10px] font-medium opacity-80">{step}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="space-y-1 font-mono text-[11px]">
        <div className="font-sans font-medium">
          {SCALE_LABEL[name]} {step}
          {anchor && ' · your exact colour'}
        </div>
        <div>{hex}</div>
        <div>{formatOklch(color)}</div>
        <Level ratio={wcag(WHITE, color)} on="White" />
        <Level ratio={wcag(BLACK, color)} on="Black" />
        {reduced && <div className="font-sans">Dulled slightly to fit standard screens.</div>}
        <div className="font-sans opacity-75">Click: copy hex · Alt+click: copy oklch()</div>
      </TooltipContent>
    </Tooltip>
  )
}

export function ScalesStrip() {
  const { shown } = usePalette()
  return (
    <section className="space-y-3" aria-labelledby="shades-heading">
      <SectionHeading id="scales">
        <span id="shades-heading">Shades</span>
      </SectionHeading>
      <div className="space-y-1.5">
        {SCALE_ORDER.filter((k) => shown.scales[k]).map((name) => {
          const scale = shown.scales[name]!
          const anchor = shown.anchors[name as keyof typeof shown.anchors]
          return (
            <div key={name} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                {SCALE_LABEL[name]}
              </div>
              <div className="flex min-w-0 flex-1 gap-0.5">
                {STEPS.map((s) => (
                  <Swatch
                    key={s}
                    name={name}
                    step={s}
                    color={scale[s]}
                    anchor={anchor === s}
                    reduced={(shown.reduced[name]?.[s] ?? 0) > 0.3}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
