import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GLOSSARY, HOW_IT_WORKS } from '@/content/explanations'
import { usePaletteStore } from '@/state/store'

export const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['Space'], action: 'New palette (keeps locked colours)' },
  { keys: ['1', '–', '7'], action: 'Choose colour relationship' },
  { keys: ['L'], action: 'Lock / unlock the hovered brand colour' },
  { keys: ['⌘/Ctrl', 'Z'], action: 'Undo' },
  { keys: ['⇧', '⌘/Ctrl', 'Z'], action: 'Redo' },
  { keys: ['D'], action: 'Cycle preview theme (light / dark / split)' },
  { keys: ['C'], action: 'Cycle colour-blindness simulation' },
  { keys: ['E'], action: 'Open export' },
  { keys: ['S'], action: 'Save to library' },
  { keys: ['?'], action: 'Open this help' },
]

export function HelpDialog() {
  const open = usePaletteStore((s) => s.helpOpen)
  const tab = usePaletteStore((s) => s.helpTab)
  const setUi = usePaletteStore((s) => s.setUi)
  return (
    <Dialog open={open} onOpenChange={(o) => setUi({ helpOpen: o })}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Help</DialogTitle>
          <DialogDescription>Everything runs in your browser. Nothing is uploaded.</DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(v) => setUi({ helpTab: v as typeof tab })}
          className="min-h-0 flex-1"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="how">How it works</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
          </TabsList>
          <TabsContent value="shortcuts" className="overflow-auto">
            <ul className="divide-y text-sm">
              {SHORTCUTS.map((s) => (
                <li key={s.action} className="flex items-center justify-between gap-4 py-2">
                  <span>{s.action}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) =>
                      k === '–' ? (
                        <span key={k} className="text-muted-foreground">
                          –
                        </span>
                      ) : (
                        <kbd key={k} className="rounded border bg-muted px-1.5 py-0.5 text-xs">
                          {k}
                        </kbd>
                      ),
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setUi({ helpOpen: false, tourStep: 0 })
              }}
            >
              Replay the intro tour
            </Button>
          </TabsContent>
          <TabsContent value="how" className="space-y-4 overflow-auto pr-1 text-sm">
            {HOW_IT_WORKS.map((p) => (
              <div key={p.title}>
                <h3 className="font-medium">{p.title}</h3>
                <p className="mt-1 text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="glossary" className="overflow-auto pr-1">
            <dl className="space-y-3 text-sm">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt className="font-medium">{g.term}</dt>
                  <dd className="text-muted-foreground">{g.def}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
