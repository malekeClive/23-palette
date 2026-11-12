import { Copy, Download, Pencil, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toHex } from '@/engine/color'
import { generate } from '@/engine/generate'
import type { PaletteConfig } from '@/engine/types'
import {
  loadLibrary,
  newId,
  parseLibrary,
  type SavedPalette,
  saveLibrary,
  serialiseLibrary,
} from '@/state/library'
import { usePaletteStore } from '@/state/store'
import { scoreTone } from '../audit/AuditPanel'

export function saveCurrentToLibrary() {
  const config = usePaletteStore.getState().config
  const items = loadLibrary()
  const name = `Palette #${config.seed} · ${config.harmony}`
  const ok = saveLibrary([{ id: newId(), name, config, createdAt: Date.now() }, ...items])
  if (ok) toast.success('Saved to library', { duration: 2000 })
  else toast.error('Could not save — browser storage is unavailable.')
  window.dispatchEvent(new Event('palette-library'))
}

function Preview5({ config }: { config: PaletteConfig }) {
  const r = generate(config)
  const sw = [
    r.roles.primary,
    r.roles.secondary ?? r.scales.primary?.[300],
    r.roles.accent,
    r.scales.neutral?.[100],
    r.scales.neutral?.[900],
  ]
  return (
    <div className="flex h-8 overflow-hidden rounded-md border">
      {sw.map((c, i) => (
        <span key={i} className="flex-1" style={{ background: c ? toHex(c) : 'transparent' }} />
      ))}
      <span className={`flex items-center px-2 text-xs font-semibold ${scoreTone(r.audit.score)}`}>
        {r.audit.score}
      </span>
    </div>
  )
}

export function LibrarySheet() {
  const open = usePaletteStore((s) => s.libraryOpen)
  const setUi = usePaletteStore((s) => s.setUi)
  const setConfig = usePaletteStore((s) => s.setConfig)
  const [items, setItems] = useState<SavedPalette[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<
    { kind: 'delete'; item: SavedPalette } | { kind: 'import'; items: SavedPalette[] } | null
  >(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const reload = () => setItems(loadLibrary())
    reload()
    window.addEventListener('palette-library', reload)
    return () => window.removeEventListener('palette-library', reload)
  }, [])
  useEffect(() => {
    if (open) setItems(loadLibrary())
  }, [open])

  const persist = (next: SavedPalette[]) => {
    setItems(next)
    if (!saveLibrary(next)) toast.error('Could not save — browser storage is unavailable.')
  }

  const onImport = async (file: File) => {
    try {
      const data = parseLibrary(JSON.parse(await file.text()))
      if (items.length) setConfirm({ kind: 'import', items: data })
      else {
        persist(data)
        toast.success(`Imported ${data.length} palettes`, { duration: 2000 })
      }
    } catch {
      toast.error('That file is not a valid palette library.')
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => setUi({ libraryOpen: o })}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Library</SheetTitle>
            <SheetDescription>
              Palettes saved in this browser. Nothing leaves your device. Press S to save the current one.
            </SheetDescription>
          </SheetHeader>
          <div className="flex gap-2 px-4 pb-3">
            <Button size="sm" onClick={saveCurrentToLibrary}>
              Save current
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Import
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!items.length}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(serialiseLibrary(items), null, 2)], { type: 'application/json' }),
                )
                const a = document.createElement('a')
                a.href = url
                a.download = 'palette-library.json'
                a.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
              }}
            >
              <Download /> Export
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
          </div>
          <ul className="flex-1 space-y-2 overflow-auto px-4 pb-4">
            {!items.length && (
              <li className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No saved palettes yet.
              </li>
            )}
            {items.map((item) => (
              <li key={item.id} className="space-y-2 rounded-md border p-3">
                {editing === item.id ? (
                  <Input
                    autoFocus
                    defaultValue={item.name}
                    aria-label="Palette name"
                    className="h-8"
                    maxLength={80}
                    onBlur={(e) => {
                      persist(
                        items.map((i) =>
                          i.id === item.id ? { ...i, name: e.target.value.trim() || i.name } : i,
                        ),
                      )
                      setEditing(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                ) : (
                  <p className="truncate text-sm font-medium">{item.name}</p>
                )}
                <Preview5 config={item.config} />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => {
                      setConfig(item.config)
                      setUi({ libraryOpen: false })
                      toast(`Loaded “${item.name}”`, { duration: 2000 })
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto size-7"
                    aria-label={`Rename ${item.name}`}
                    onClick={() => setEditing(item.id)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Duplicate ${item.name}`}
                    onClick={() =>
                      persist([
                        { ...item, id: newId(), name: `${item.name} (copy)`, createdAt: Date.now() },
                        ...items,
                      ])
                    }
                  >
                    <Copy />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setConfirm({ kind: 'delete', item })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirm?.kind === 'delete' ? 'Delete palette?' : 'Replace library?'}</DialogTitle>
            <DialogDescription>
              {confirm?.kind === 'delete'
                ? `“${confirm.item.name}” will be removed from this browser. This cannot be undone.`
                : `Importing replaces your ${items.length} saved palettes with ${confirm?.kind === 'import' ? confirm.items.length : 0} from the file.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm?.kind === 'delete') persist(items.filter((i) => i.id !== confirm.item.id))
                if (confirm?.kind === 'import') {
                  persist(confirm.items)
                  toast.success(`Imported ${confirm.items.length} palettes`, { duration: 2000 })
                }
                setConfirm(null)
              }}
            >
              {confirm?.kind === 'delete' ? 'Delete' : 'Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
