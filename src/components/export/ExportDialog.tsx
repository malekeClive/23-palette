import { Copy, Download, TriangleAlert, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EXPLAIN } from '@/content/explanations'
import type { ColorFormat } from '@/engine/color'
import { exportCssHex, exportDtcg, exportFigma, exportShadcn, exportTailwind } from '@/engine/export'
import { usePalette } from '@/state/palette-context'
import { usePaletteStore } from '@/state/store'
import { runFixAll } from '../audit/AuditPanel'
import { copyText } from '../scales/ScalesStrip'

type Tab = 'shadcn' | 'tailwind' | 'css' | 'dtcg' | 'figma'

const TABS: { value: Tab; label: string; file: string; mime: string; formatOption: boolean }[] = [
  { value: 'shadcn', label: 'shadcn CSS', file: 'globals.css', mime: 'text/css', formatOption: true },
  {
    value: 'tailwind',
    label: 'Tailwind scales',
    file: 'palette-scales.css',
    mime: 'text/css',
    formatOption: true,
  },
  { value: 'css', label: 'CSS variables', file: 'palette.css', mime: 'text/css', formatOption: false },
  {
    value: 'dtcg',
    label: 'Design tokens',
    file: 'tokens.json',
    mime: 'application/json',
    formatOption: false,
  },
  {
    value: 'figma',
    label: 'Figma',
    file: 'figma-variables.json',
    mime: 'application/json',
    formatOption: false,
  },
]

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ExportDialog() {
  const open = usePaletteStore((s) => s.exportOpen)
  const setUi = usePaletteStore((s) => s.setUi)
  const { result } = usePalette()
  const [tab, setTab] = useState<Tab>('shadcn')
  const [format, setFormat] = useState<ColorFormat>('oklch')
  const [hexFallback, setHexFallback] = useState(true)
  const meta = TABS.find((t) => t.value === tab)!

  const code = useMemo(() => {
    if (!open) return ''
    const opts = { format, hexFallback }
    switch (tab) {
      case 'shadcn':
        return exportShadcn(result, opts)
      case 'tailwind':
        return exportTailwind(result, opts)
      case 'css':
        return exportCssHex(result)
      case 'dtcg':
        return exportDtcg(result)
      case 'figma':
        return exportFigma(result)
    }
  }, [open, tab, format, hexFallback, result])

  return (
    <Dialog open={open} onOpenChange={(o) => setUi({ exportOpen: o })}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export palette</DialogTitle>
          <DialogDescription>
            Copy or download in the format your project uses. Every format contains light and dark themes.
          </DialogDescription>
        </DialogHeader>

        {result.audit.score < 70 && (
          <div
            className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            role="status"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            <p className="flex-1">
              This palette scores {result.audit.score}/100, so some text may be hard to read. You can still
              export it.
            </p>
            <Button size="sm" variant="outline" onClick={runFixAll}>
              <Wand2 /> Fix all
            </Button>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="flex h-auto w-full flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">{EXPLAIN[`export.${tab}`]?.what}</p>

        <div className="flex flex-wrap items-center gap-4">
          {meta.formatOption && (
            <div className="flex items-center gap-2">
              <Label htmlFor="export-format" className="text-xs">
                Colour format
              </Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ColorFormat)}>
                <SelectTrigger id="export-format" size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oklch">oklch()</SelectItem>
                  <SelectItem value="hex">hex</SelectItem>
                  <SelectItem value="hsl">hsl()</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {meta.formatOption && result.config.gamut === 'p3' && format === 'oklch' && (
            <div className="flex items-center gap-2">
              <Switch id="hex-fallback" checked={hexFallback} onCheckedChange={setHexFallback} />
              <Label htmlFor="hex-fallback" className="text-xs">
                Include hex fallback for older screens
              </Label>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => download(meta.file, code, meta.mime)}>
              <Download /> {meta.file}
            </Button>
            <Button size="sm" onClick={() => copyText(code, `Copied ${meta.label}`)}>
              <Copy /> Copy
            </Button>
          </div>
        </div>

        <pre
          role="region"
          className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed"
          tabIndex={0}
          aria-label={`${meta.label} code`}
        >
          <code>{code}</code>
        </pre>
      </DialogContent>
    </Dialog>
  )
}
