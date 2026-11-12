import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatOklch, toHex } from '@/engine/color'
import { describeRef, TOKEN_LABEL } from '@/engine/tokens'
import type { ThemeMode } from '@/engine/types'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { SectionHeading } from '../help/InfoTip'
import { copyText } from './ScalesStrip'

const GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Surfaces', tokens: ['background', 'card', 'popover', 'muted', 'secondary', 'accent', 'sidebar'] },
  {
    title: 'Text',
    tokens: [
      'foreground',
      'muted-foreground',
      'card-foreground',
      'secondary-foreground',
      'accent-foreground',
    ],
  },
  {
    title: 'Brand & states',
    tokens: ['primary', 'primary-foreground', 'destructive', 'success', 'warning', 'info'],
  },
  {
    title: 'Lines & charts',
    tokens: ['border', 'input', 'ring', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },
]

function Cell({ token, theme }: { token: string; theme: ThemeMode }) {
  const { shown } = usePalette()
  const c = shown.tokens[theme][token]
  if (!c) return <span />
  const hex = toHex(c)
  const ref = shown.refs[theme][token]
  const reason = shown.reasons[`${theme}:${token}`]
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`${token} (${theme}): ${hex}, from ${describeRef(ref, c)}. ${reason ?? ''} Click to copy.`}
          onClick={(e) => (e.altKey ? copyText(formatOklch(c)) : copyText(hex))}
        >
          <span className="size-5 shrink-0 rounded border" style={{ background: hex }} />
          <span className="truncate font-mono text-[11px] text-muted-foreground">{describeRef(ref, c)}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        <p className="font-medium">
          Why this colour? <span className="font-normal opacity-75">({theme})</span>
        </p>
        <p>{reason}</p>
        <p className="mt-1 font-mono opacity-75">{hex}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function TokensGrid() {
  const setUi = usePaletteStore((s) => s.setUi)
  return (
    <section className="space-y-3" aria-labelledby="roles-heading">
      <SectionHeading id="tokens">
        <span id="roles-heading">Roles (tokens)</span>
      </SectionHeading>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 2xl:grid-cols-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-[11px] font-medium text-muted-foreground">
              <span>{g.title}</span>
              <span>Light</span>
              <span>Dark</span>
            </div>
            <ul>
              {g.tokens.map((t) => (
                <li
                  key={t}
                  id={`token-row-${t}`}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-md transition-shadow"
                  onMouseEnter={() => setUi({ highlight: [t] })}
                  onMouseLeave={() => setUi({ highlight: [] })}
                >
                  <span className="min-w-0 truncate text-xs" title={TOKEN_LABEL[t] ?? t}>
                    <span className="font-mono">{t}</span>
                  </span>
                  <Cell token={t} theme="light" />
                  <Cell token={t} theme="dark" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
