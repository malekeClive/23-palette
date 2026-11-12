import { ChevronDown, CircleAlert, CircleCheck, CircleX, Info, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GROUP_EXPLAIN, GROUP_LABEL } from '@/content/explanations'
import { applyFix, scoreLabel } from '@/engine/audit'
import { toHex } from '@/engine/color'
import { fixAllDetailed, fixableChecks } from '@/engine/generate'
import type { Check, CheckGroup, CheckStatus, ThemeMode } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { InfoTip, SectionHeading } from '../help/InfoTip'

const STATUS_META: Record<CheckStatus, { icon: typeof Info; label: string; cls: string }> = {
  fail: { icon: CircleX, label: 'Fails', cls: 'text-red-600' },
  warn: { icon: CircleAlert, label: 'Warning', cls: 'text-amber-600' },
  info: { icon: Info, label: 'Note', cls: 'text-sky-600' },
  pass: { icon: CircleCheck, label: 'Passes', cls: 'text-emerald-600' },
}

export function scoreTone(score: number) {
  return score >= 90 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'
}

export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Health score ${score} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={6}
        strokeLinecap="round"
        className={cn('stroke-current transition-[stroke-dashoffset] duration-300', scoreTone(score))}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-foreground text-lg font-semibold"
      >
        {score}
      </text>
    </svg>
  )
}

export function runFixAll() {
  const { config, setConfig } = usePaletteStore.getState()
  const { config: next, applied } = fixAllDetailed(config)
  if (!applied) {
    toast('Nothing to fix automatically', { duration: 2000 })
    return
  }
  setConfig(next)
  toast.success(`Applied ${applied} fix${applied === 1 ? '' : 'es'} · ⌘Z to undo`, { duration: 2000 })
}

function CheckRow({ check, theme, first }: { check: Check; theme: ThemeMode; first: boolean }) {
  const [open, setOpen] = useState(false)
  const setUi = usePaletteStore((s) => s.setUi)
  const setConfig = usePaletteStore((s) => s.setConfig)
  const meta = STATUS_META[check.status]
  const Icon = meta.icon
  return (
    <li
      id={first ? 'audit-first-issue' : undefined}
      className="rounded-md border p-2.5 text-sm"
      onMouseEnter={() => check.tokens && setUi({ highlight: check.tokens })}
      onMouseLeave={() => setUi({ highlight: [] })}
    >
      <div className="flex gap-2">
        <Icon className={cn('mt-0.5 size-4 shrink-0', meta.cls)} aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p>
            <span className="sr-only">{meta.label}: </span>
            {check.title}
          </p>
          {(check.swatches?.length || check.measured) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {check.swatches && (
                <span className="flex -space-x-1">
                  {check.swatches.map((s, i) => (
                    <span
                      key={i}
                      className="size-4 rounded-full border border-background ring-1 ring-border"
                      style={{ background: toHex(s) }}
                    />
                  ))}
                </span>
              )}
              {check.measured && (
                <span className="font-mono">
                  {check.measured}
                  {check.required && check.status !== 'pass' && <> · needs {check.required}</>}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Why it matters{' '}
              <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
            </button>
            {check.fix && check.status !== 'pass' && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7 text-xs"
                onClick={() => {
                  setConfig((c) => applyFix(c, check.fix!))
                  toast.success(
                    `${check.fix!.label}${check.fix!.kind === 'override' ? ` (${theme})` : ''} · ⌘Z to undo`,
                    { duration: 2000 },
                  )
                }}
              >
                <Wand2 className="size-3" /> {check.fix.label}
              </Button>
            )}
          </div>
          {open && <p className="text-xs text-muted-foreground">{check.why}</p>}
          {check.status !== 'pass' && check.status !== 'info' && !check.fix && (
            <p className="text-xs text-muted-foreground">
              No automatic fix: try a different colour relationship, lock a different colour, or adjust
              Vividness.
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

const GROUPS: CheckGroup[] = ['contrast', 'scales', 'cvd', 'harmony']

export function AuditPanel() {
  const { result } = usePalette()
  const { light, dark, score } = result.audit
  const [theme, setTheme] = useState<ThemeMode>(light.score <= dark.score ? 'light' : 'dark')
  const [showPassed, setShowPassed] = useState(false)
  const fixable = fixableChecks(result).length

  // follow the worse theme when it changes
  useEffect(() => {
    setTheme(light.score <= dark.score ? 'light' : 'dark')
  }, [light.score, dark.score])

  const report = theme === 'light' ? light : dark
  const issues = report.checks.filter((c) => c.status !== 'pass')
  const passed = report.checks.filter((c) => c.status === 'pass')
  const firstIssueId = issues.find((c) => c.status === 'fail' || c.status === 'warn')?.id

  return (
    <section className="space-y-4" aria-labelledby="audit-heading">
      <div className="flex items-center gap-3">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h2 id="audit-heading" className={cn('font-semibold', scoreTone(score))}>
              {scoreLabel(score)}
            </h2>
            <InfoTip id="score" />
          </div>
          <p className="text-xs text-muted-foreground">
            Light {light.score} · Dark {dark.score}
          </p>
        </div>
      </div>
      {fixable > 0 && (
        <Button className="w-full" onClick={runFixAll}>
          <Wand2 /> Fix all ({fixable})
        </Button>
      )}
      <Tabs value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
        <TabsList className="grid h-8 w-full grid-cols-2">
          <TabsTrigger value="light" className="text-xs">
            Light · {light.score}
          </TabsTrigger>
          <TabsTrigger value="dark" className="text-xs">
            Dark · {dark.score}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {GROUPS.map((g) => {
        const rows = issues.filter((c) => c.group === g)
        const groupPassed = report.checks.filter((c) => c.group === g && c.status === 'pass').length
        return (
          <div key={g} className="space-y-1.5">
            <SectionHeading id={GROUP_EXPLAIN[g]}>{GROUP_LABEL[g]}</SectionHeading>
            {rows.length ? (
              <ul className="space-y-1.5">
                {rows.map((c) => (
                  <CheckRow key={c.id} check={c} theme={theme} first={c.id === firstIssueId} />
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleCheck className="size-3.5 text-emerald-600" aria-hidden /> All {groupPassed} checks
                pass
              </p>
            )}
          </div>
        )
      })}
      <div>
        <button
          type="button"
          aria-expanded={showPassed}
          onClick={() => setShowPassed(!showPassed)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <CircleCheck className="size-3.5 text-emerald-600" aria-hidden />
          {passed.length} checks passed
          <ChevronDown className={cn('size-3 transition-transform', showPassed && 'rotate-180')} />
        </button>
        {showPassed && (
          <ul className="mt-2 space-y-1.5">
            {passed.map((c) => (
              <CheckRow key={c.id} check={c} theme={theme} first={false} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
