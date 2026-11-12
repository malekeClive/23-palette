import { BookOpen, CircleHelp, Dices, Download, Library, Redo2, Share2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toHex } from '@/engine/color'
import { shuffle } from '@/engine/random'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore, useTemporal, writeFlag } from '@/state/store'
import { scoreTone } from '../audit/AuditPanel'
import { ColorPicker, ColorTextField } from '../controls/ColorPicker'
import { setRoleColor } from '../controls/RoleCards'
import { explainId, InfoTip } from '../help/InfoTip'
import { copyText } from '../scales/ScalesStrip'

export function generateNew() {
  const { config, setConfig } = usePaletteStore.getState()
  setConfig(shuffle(config))
}

export function undo() {
  usePaletteStore.temporal.getState().undo()
}
export function redo() {
  usePaletteStore.temporal.getState().redo()
}

export function focusFirstIssue() {
  usePaletteStore.getState().setUi({ auditOpen: true })
  requestAnimationFrame(() => {
    const el = document.getElementById('audit-first-issue')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-ring')
      setTimeout(() => el.classList.remove('ring-2', 'ring-ring'), 1400)
    }
  })
}

function IconButton({
  label,
  shortcut,
  onClick,
  children,
  disabled,
  pressed,
}: {
  label: string
  shortcut?: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  pressed?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          disabled={disabled}
          className={cn(pressed && 'bg-muted')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <kbd className="ml-2 rounded bg-white/20 px-1">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

export function TopBar() {
  const { result } = usePalette()
  const seed = result.roles.primary!
  const setUi = usePaletteStore((s) => s.setUi)
  const explain = usePaletteStore((s) => s.explain)
  const canUndo = useTemporal((t) => t.pastStates.length > 0)
  const canRedo = useTemporal((t) => t.futureStates.length > 0)
  const score = result.audit.score
  const worse = result.audit.light.score <= result.audit.dark.score ? result.audit.light : result.audit.dark
  const issues = worse.checks.filter((c) => c.status === 'fail' || c.status === 'warn').length
  const ready = score >= 90

  return (
    <header className="z-30 md:sticky md:top-0 border-b bg-background/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <div className="mr-2 flex items-center gap-2 font-semibold">
          <span className="grid size-7 grid-cols-2 overflow-hidden rounded-md" aria-hidden>
            {[
              result.roles.primary,
              result.roles.accent,
              result.roles.secondary ?? result.scales.primary?.[300],
              result.scales.neutral?.[800],
            ].map((c, i) => (
              <span key={i} style={{ background: c ? toHex(c) : undefined }} />
            ))}
          </span>
          23palette
        </div>

        <div className="flex items-center gap-2" data-tour="seed">
          <ColorPicker
            value={seed}
            label="Brand colour"
            onChange={(h) => setRoleColor('primary', h)}
            size="sm"
          />
          <ColorTextField
            label="Brand colour"
            hideLabel
            value={toHex(seed)}
            describedBy={explainId('seed')}
            onCommit={(c) => setRoleColor('primary', toHex(c).slice(1))}
            className="w-32"
          />
          <InfoTip id="seed" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={generateNew} data-tour="generate">
              <Dices /> Generate{' '}
              <kbd className="hidden rounded border bg-muted px-1 text-[10px] font-normal sm:inline">
                Space
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New palette — locked colours stay</TooltipContent>
        </Tooltip>

        <div className="flex items-center">
          <IconButton label="Undo" shortcut="⌘Z" onClick={undo} disabled={!canUndo}>
            <Undo2 />
          </IconButton>
          <IconButton label="Redo" shortcut="⇧⌘Z" onClick={redo} disabled={!canRedo}>
            <Redo2 />
          </IconButton>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-tour="score"
              onClick={() => (ready ? setUi({ exportOpen: true }) : focusFirstIssue())}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                scoreTone(score),
              )}
              aria-label={
                ready
                  ? `Score ${score}: production ready. Open export.`
                  : `Score ${score}: ${issues} issues. Show the first issue.`
              }
            >
              <span className="font-mono">{score}</span>
              <span className="text-foreground">
                {ready ? 'Production ready ✓' : `${issues} issue${issues === 1 ? '' : 's'}`}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Light {result.audit.light.score} · Dark {result.audit.dark.score} —{' '}
            {ready ? 'click to export' : 'click to see what to fix'}
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label={explain ? 'Turn off explain mode' : 'Explain mode: label which role paints each part'}
            pressed={explain}
            onClick={() => {
              writeFlag('palette.explain.v1', !explain)
              setUi({ explain: !explain })
            }}
          >
            <BookOpen />
          </IconButton>
          <IconButton label="Library" shortcut="S saves" onClick={() => setUi({ libraryOpen: true })}>
            <Library />
          </IconButton>
          <IconButton
            label="Copy share link"
            onClick={() => copyText(window.location.href, 'Link copied — it reproduces this exact palette')}
          >
            <Share2 />
          </IconButton>
          <IconButton
            label="Help & shortcuts"
            shortcut="?"
            onClick={() => setUi({ helpOpen: true, helpTab: 'shortcuts' })}
          >
            <CircleHelp />
          </IconButton>
          <Button
            onClick={() => setUi({ exportOpen: true })}
            data-tour="export"
            className={cn(ready && 'ring-2 ring-emerald-500/40')}
          >
            <Download /> Export
          </Button>
        </div>
      </div>
    </header>
  )
}
