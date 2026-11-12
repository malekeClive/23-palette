import { getRouteApi } from '@tanstack/react-router'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PaletteProvider } from '@/state/palette-context'
import { configToSearch, searchToConfig } from '@/state/search-schema'
import { usePaletteStore } from '@/state/store'
import { useShortcuts } from '@/state/use-shortcuts'
import { AuditPanel } from '../audit/AuditPanel'
import { ControlsPanel } from '../controls/ControlsPanel'
import { ExportDialog } from '../export/ExportDialog'
import { CoachMarks } from '../help/CoachMarks'
import { HelpDialog } from '../help/HelpDialog'
import { LibrarySheet } from '../library/LibrarySheet'
import { Preview } from '../preview/Preview'
import { ScalesStrip } from '../scales/ScalesStrip'
import { TokensGrid } from '../scales/TokensGrid'
import { TopBar } from './TopBar'

const route = getRouteApi('/')

/** URL is the source of truth for sharing: hydrate once, then mirror config → search (debounced, replace). */
function useUrlSync() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const hydrated = useRef(false)

  if (!hydrated.current) {
    hydrated.current = true
    const temporal = usePaletteStore.temporal.getState()
    temporal.pause()
    usePaletteStore.setState({ config: searchToConfig(search) })
    temporal.resume()
  }

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const unsub = usePaletteStore.subscribe((s, prev) => {
      if (s.config === prev.config) return
      clearTimeout(t)
      t = setTimeout(
        () => navigate({ search: configToSearch(usePaletteStore.getState().config), replace: true }),
        300,
      )
    })
    return () => {
      clearTimeout(t)
      unsub()
    }
  }, [navigate])
}

export function PaletteApp() {
  useUrlSync()
  useShortcuts()
  const auditOpen = usePaletteStore((s) => s.auditOpen)
  const setUi = usePaletteStore((s) => s.setUi)

  return (
    <PaletteProvider>
      <div className="min-h-screen bg-background">
        <TopBar />
        <div
          className={cn(
            'grid gap-4 p-4 md:grid-cols-[300px_minmax(0,1fr)]',
            auditOpen
              ? 'xl:grid-cols-[300px_minmax(0,1fr)_340px]'
              : 'xl:grid-cols-[300px_minmax(0,1fr)_44px]',
          )}
        >
          <aside
            aria-label="Controls"
            className="md:sticky md:top-[60px] md:max-h-[calc(100vh-76px)] md:overflow-y-auto md:pr-1"
          >
            <ControlsPanel />
          </aside>
          <main className="min-w-0">
            <Preview />
          </main>
          <aside
            aria-label="Health check"
            className={cn(
              'md:col-span-2 xl:col-span-1 xl:sticky xl:top-[60px] xl:max-h-[calc(100vh-76px)] xl:overflow-y-auto',
              auditOpen && 'xl:pr-1',
            )}
          >
            <div className="mb-2 hidden justify-end xl:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={auditOpen ? 'Collapse health check' : 'Expand health check'}
                aria-expanded={auditOpen}
                onClick={() => setUi({ auditOpen: !auditOpen })}
              >
                {auditOpen ? <PanelRightClose /> : <PanelRightOpen />}
              </Button>
            </div>
            <div className={cn(!auditOpen && 'xl:hidden')}>
              <AuditPanel />
            </div>
          </aside>
        </div>
        <div className="space-y-8 border-t p-4 pb-10">
          <ScalesStrip />
          <TokensGrid />
        </div>
      </div>
      <ExportDialog />
      <LibrarySheet />
      <HelpDialog />
      <CoachMarks />
    </PaletteProvider>
  )
}
