import { type ReactNode, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { fitGamut, formatOklch, maxChroma, parseColor, toHex } from '@/engine/color'
import type { Oklch } from '@/engine/types'
import { cn } from '@/lib/utils'

interface Props {
  value: Oklch
  onChange: (hex: string) => void
  label: string
  children?: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

/** Swatch that opens an OKLCH picker (L/C/H sliders + any-CSS-colour field). */
export function ColorPicker({ value, onChange, label, className, size = 'md' }: Props) {
  const [draft, setDraft] = useState<Oklch>(value)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  const commit = (c: Oklch) => {
    const fitted = fitGamut(c, 'srgb')
    setDraft(fitted)
    onChange(toHex(fitted).slice(1))
  }
  const hex = toHex(value)
  const max = maxChroma(draft.l, draft.h, 'srgb')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}: ${hex}. Open colour picker`}
        className={cn(
          'shrink-0 rounded-md border shadow-sm ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          size === 'sm' ? 'size-8' : 'size-10',
          className,
        )}
        style={{ background: hex }}
      />
      <PopoverContent className="w-72 space-y-4" align="start">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-md border" style={{ background: toHex(draft) }} />
          <div className="min-w-0 text-xs">
            <div className="font-medium">{label}</div>
            <div className="font-mono text-muted-foreground">{toHex(draft)}</div>
            <div className="truncate font-mono text-muted-foreground">{formatOklch(draft)}</div>
          </div>
        </div>
        <ChannelSlider
          label="Lightness"
          value={draft.l}
          min={0.05}
          max={0.98}
          step={0.005}
          onChange={(l) => commit({ ...draft, l })}
          track={`linear-gradient(to right, ${[0.05, 0.3, 0.5, 0.7, 0.98].map((l) => toHex({ ...draft, l })).join(',')})`}
        />
        <ChannelSlider
          label="Vividness (chroma)"
          value={Math.min(draft.c, max)}
          min={0}
          max={Math.max(0.01, max)}
          step={0.001}
          onChange={(c) => commit({ ...draft, c })}
          track={`linear-gradient(to right, ${toHex({ ...draft, c: 0 })}, ${toHex({ ...draft, c: max })})`}
        />
        <ChannelSlider
          label="Hue"
          value={draft.h}
          min={0}
          max={359.9}
          step={0.5}
          onChange={(h) => commit({ ...draft, h, c: Math.min(draft.c, maxChroma(draft.l, h, 'srgb')) })}
          track={`linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => toHex({ l: draft.l, c: Math.min(0.12, draft.c || 0.12), h: i * 30 })).join(',')})`}
        />
        <ColorTextField label="Any CSS colour" value={hex} onCommit={(c) => commit(c)} />
      </PopoverContent>
    </Popover>
  )
}

function ChannelSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  track,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  track: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value.toFixed(step < 0.01 ? 3 : 1)}</span>
      </div>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ background: track }}
        />
        <Slider
          aria-label={label}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
          className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-transparent"
        />
      </div>
    </div>
  )
}

/** Text field accepting hex, rgb(), hsl(), oklch() or named colours. Invalid input shows an inline error and keeps the old value. */
export function ColorTextField({
  label,
  value,
  onCommit,
  id,
  describedBy,
  className,
  hideLabel,
}: {
  label: string
  value: string
  onCommit: (c: Oklch) => void
  id?: string
  describedBy?: string
  className?: string
  hideLabel?: boolean
}) {
  const [text, setText] = useState(value)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setText(value)
    setError(null)
  }, [value])
  const fieldId = id ?? `color-${label.replace(/\W+/g, '-').toLowerCase()}`
  const submit = () => {
    if (text.trim() === value) return
    const c = parseColor(text)
    if (!c) {
      setError('Not a colour. Try #4f46e5, rgb(79 70 229) or "tomato".')
      return
    }
    setError(null)
    onCommit(c)
  }
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={fieldId} className={cn('text-xs', hideLabel && 'sr-only')}>
        {label}
      </Label>
      <Input
        id={fieldId}
        value={text}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={
          [describedBy, error ? `${fieldId}-error` : null].filter(Boolean).join(' ') || undefined
        }
        className="h-8 font-mono text-sm"
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError(null)
        }}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            setText(value)
            setError(null)
          }
        }}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
