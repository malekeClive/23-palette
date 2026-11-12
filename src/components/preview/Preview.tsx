import { Moon, Sun, SunMoon } from 'lucide-react'
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatOklch } from '@/engine/color'
import { CVD_MATRICES } from '@/engine/cvd'
import type { ThemeMode } from '@/engine/types'
import { cn } from '@/lib/utils'
import { usePalette } from '@/state/palette-context'
import { type CvdMode, type PreviewScene, type PreviewTheme, usePaletteStore } from '@/state/store'
import { explainId, InfoTip } from '../help/InfoTip'
import { Dashboard } from './scenes/Dashboard'
import { Forms } from './scenes/Forms'
import { Marketing } from './scenes/Marketing'
import { Typography } from './scenes/Typography'

export const CVD_OPTIONS: { value: CvdMode; label: string }[] = [
  { value: 'none', label: 'Normal vision' },
  { value: 'protanopia', label: 'Red-blind (protan)' },
  { value: 'deuteranopia', label: 'Green-blind (deutan)' },
  { value: 'tritanopia', label: 'Blue-blind (tritan)' },
  { value: 'grayscale', label: 'Greyscale' },
]

const SCENES: { value: PreviewScene; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'forms', label: 'Forms & states' },
  { value: 'typography', label: 'Typography' },
]

function SceneView({ scene }: { scene: PreviewScene }) {
  if (scene === 'marketing') return <Marketing />
  if (scene === 'forms') return <Forms />
  if (scene === 'typography') return <Typography />
  return <Dashboard />
}

/**
 * Wrapper that applies generated tokens as CSS variables. Tokens are written imperatively,
 * so slider drags repaint without re-rendering the scene tree.
 */
function PaletteScope({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { shown } = usePalette()
  const cvd = usePaletteStore((s) => s.cvd)
  const explain = usePaletteStore((s) => s.explain)
  const highlight = usePaletteStore((s) => s.highlight)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    for (const [t, c] of Object.entries(shown.tokens[theme])) el.style.setProperty(`--${t}`, formatOklch(c))
  }, [shown, theme])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    for (const n of el.querySelectorAll('[data-hl]')) n.removeAttribute('data-hl')
    if (!highlight.length) return
    for (const n of el.querySelectorAll<HTMLElement>('[data-tokens]')) {
      const ts = n.dataset.tokens!.split(' ')
      if (highlight.some((h) => ts.includes(h))) n.setAttribute('data-hl', 'true')
    }
  }, [highlight])

  const onClickCapture = (e: React.MouseEvent) => {
    if (!explain) return
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-explain]')
    if (!target) return
    e.preventDefault()
    e.stopPropagation()
    const token = target.dataset.explain!.split(' ')[0].replace('…5', '')
    const row = document.getElementById(`token-row-${token}`)
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      row.classList.add('ring-2', 'ring-ring')
      setTimeout(() => row.classList.remove('ring-2', 'ring-ring'), 1400)
    }
  }

  return (
    <div
      ref={ref}
      data-theme-mode={theme}
      className={cn(
        'palette-scope bg-background text-foreground',
        theme === 'dark' && 'dark',
        explain && 'explain',
      )}
      style={{ filter: cvd === 'none' ? undefined : `url(#cvd-${cvd})`, colorScheme: theme }}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  )
}

export function Preview() {
  const previewTheme = usePaletteStore((s) => s.previewTheme)
  const scene = usePaletteStore((s) => s.scene)
  const cvd = usePaletteStore((s) => s.cvd)
  const setUi = usePaletteStore((s) => s.setUi)
  const explain = usePaletteStore((s) => s.explain)

  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-background"
      aria-label="Live preview"
    >
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          {Object.entries(CVD_MATRICES).map(([k, m]) => (
            <filter key={k} id={`cvd-${k}`} colorInterpolationFilters="linearRGB">
              <feColorMatrix type="matrix" values={m} />
            </filter>
          ))}
        </defs>
      </svg>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <Tabs value={scene} onValueChange={(v) => setUi({ scene: v as PreviewScene })}>
          <TabsList className="h-8">
            {SCENES.map((s) => (
              <TabsTrigger key={s.value} value={s.value} className="px-2.5 text-xs">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InfoTip id="preview" />
        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={previewTheme}
            onValueChange={(v) => v && setUi({ previewTheme: v as PreviewTheme })}
            aria-label="Preview theme (D)"
          >
            <ToggleGroupItem value="light" aria-label="Light" title="Light (D)">
              <Sun />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark" title="Dark (D)">
              <Moon />
            </ToggleGroupItem>
            <ToggleGroupItem value="split" aria-label="Light and dark side by side" title="Split (D)">
              <SunMoon />
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center">
            <Select value={cvd} onValueChange={(v) => setUi({ cvd: v as CvdMode })}>
              <SelectTrigger
                size="sm"
                className="w-44 text-xs"
                aria-label="Colour blindness simulation (C)"
                aria-describedby={explainId('cvdSim')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CVD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InfoTip id="cvdSim" />
          </div>
        </div>
      </div>
      {explain && (
        <p className="border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          Explain mode: labels show which role paints each part. Click one to jump to that role below.
        </p>
      )}
      <div className={cn('grid min-h-0 flex-1', previewTheme === 'split' && 'xl:grid-cols-2')}>
        {(previewTheme === 'split' ? (['light', 'dark'] as const) : [previewTheme]).map((t) => (
          <div key={t} className="min-w-0 overflow-auto">
            <PaletteScope theme={t}>
              <SceneView scene={scene} />
            </PaletteScope>
          </div>
        ))}
      </div>
    </section>
  )
}
