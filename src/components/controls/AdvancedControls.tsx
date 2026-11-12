import { ChevronDown, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_CONFIG } from '@/engine/generate'
import { harmonyUsesSpread } from '@/engine/harmony'
import type { NeutralTemp, PaletteConfig } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { readFlag, usePaletteStore, writeFlag } from '@/state/store'
import { explainId, InfoTip } from '../help/InfoTip'

const ADV_KEYS = [
  'saturation',
  'hueShift',
  'spread',
  'neutralTint',
  'neutralTemp',
  'pureBackground',
  'gamut',
] as const

export function changedAdvanced(c: PaletteConfig): number {
  return ADV_KEYS.filter((k) => c[k] !== DEFAULT_CONFIG[k]).length
}

export function resetAdvanced() {
  const patch = Object.fromEntries(ADV_KEYS.map((k) => [k, DEFAULT_CONFIG[k]])) as Partial<PaletteConfig>
  usePaletteStore.getState().setConfig(patch)
}

function SliderRow({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  extra,
}: {
  id: string
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label id={`${id}-label`} className="text-sm font-normal">
          {label}
        </Label>
        <InfoTip id={id} />
        <span className="ml-auto font-mono text-xs text-muted-foreground">{display}</span>
        {extra}
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        aria-describedby={explainId(id)}
        aria-valuetext={display}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

export function AdvancedControls() {
  const config = usePaletteStore((s) => s.config)
  const setConfig = usePaletteStore((s) => s.setConfig)
  const { result } = usePalette()
  const [open, setOpen] = useState(() => readFlag('palette.advanced.v1'))
  const changed = changedAdvanced(config)

  const toggle = () => {
    setOpen(!open)
    writeFlag('palette.advanced.v1', !open)
  }

  return (
    <section className="rounded-md border">
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="advanced-panel"
          onClick={toggle}
          className="flex flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
          Fine-tuning
          {changed > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
              {changed} changed
            </span>
          )}
        </button>
        <InfoTip id="advanced" />
      </div>
      {!open && changed > 0 && (
        <p className="px-3 pb-2.5 text-xs text-muted-foreground">
          {changed} fine-tuning setting{changed > 1 ? 's' : ''} changed ·{' '}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={resetAdvanced}
          >
            Reset
          </button>
        </p>
      )}
      {open && (
        <div id="advanced-panel" className="space-y-5 border-t px-3 py-4">
          <SliderRow
            id="vividness"
            label="Vividness"
            value={result.saturation}
            display={
              config.saturation === null
                ? `Auto (${Math.round(result.saturation * 100)}%)`
                : `${Math.round(result.saturation * 100)}%`
            }
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setConfig({ saturation: v })}
            extra={
              config.saturation !== null && (
                <button
                  type="button"
                  className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Reset vividness to auto"
                  title="Back to auto"
                  onClick={() => setConfig({ saturation: null })}
                >
                  <RotateCcw className="size-3" />
                </button>
              )
            }
          />
          <SliderRow
            id="naturalShading"
            label="Natural shading"
            value={config.hueShift}
            display={`${config.hueShift.toFixed(0)}°`}
            min={0}
            max={20}
            step={1}
            onChange={(v) => setConfig({ hueShift: v })}
          />
          {harmonyUsesSpread(config.harmony) && (
            <SliderRow
              id="spread"
              label="Spread"
              value={config.spread}
              display={`${config.spread > 0 ? '+' : ''}${config.spread}°`}
              min={-15}
              max={15}
              step={1}
              onChange={(v) => setConfig({ spread: v })}
            />
          )}
          <SliderRow
            id="greyWarmth"
            label="Grey warmth"
            value={config.neutralTint}
            display={`${Math.round(config.neutralTint * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setConfig({ neutralTint: v })}
          />
          <div className="flex items-center gap-1">
            <Label htmlFor="grey-temp" className="text-sm font-normal">
              Grey tone
            </Label>
            <InfoTip id="greyTemp" />
            <Select
              value={config.neutralTemp}
              onValueChange={(v) => setConfig({ neutralTemp: v as NeutralTemp })}
            >
              <SelectTrigger
                id="grey-temp"
                size="sm"
                className="ml-auto w-32"
                aria-describedby={explainId('greyTemp')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand hue</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="pure">Pure grey</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SwitchRow
            id="pureBackground"
            label="White background"
            checked={config.pureBackground}
            onChange={(v) => setConfig({ pureBackground: v })}
          />
          <SwitchRow
            id="p3"
            label="Wide colour (P3)"
            checked={config.gamut === 'p3'}
            onChange={(v) => setConfig({ gamut: v ? 'p3' : 'srgb' })}
          />
        </div>
      )}
    </section>
  )
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={`sw-${id}`} className="text-sm font-normal">
        {label}
      </Label>
      <InfoTip id={id} />
      <Switch
        id={`sw-${id}`}
        className="ml-auto"
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={explainId(id)}
      />
    </div>
  )
}
