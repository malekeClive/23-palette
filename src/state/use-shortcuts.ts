import { useEffect } from 'react'
import { toast } from 'sonner'
import { generateNew, redo, undo } from '@/components/app/TopBar'
import { toggleLock } from '@/components/controls/RoleCards'
import { saveCurrentToLibrary } from '@/components/library/LibrarySheet'
import { CVD_OPTIONS } from '@/components/preview/Preview'
import { HARMONIES } from '@/engine/types'
import { CVD_MODES, PREVIEW_THEMES, usePaletteStore } from './store'

function isTyping(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function isInteractive(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return (
    ['BUTTON', 'A'].includes(el.tagName) ||
    ['radio', 'slider', 'tab', 'switch', 'checkbox', 'menuitem', 'option'].includes(
      el.getAttribute('role') ?? '',
    )
  )
}

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = usePaletteStore.getState()
      const modal = s.exportOpen || s.helpOpen || s.libraryOpen
      const typing = isTyping(e.target)
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z' && !typing && !modal) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y' && !typing && !modal) {
        e.preventDefault()
        redo()
        return
      }
      if (
        mod ||
        e.altKey ||
        typing ||
        modal ||
        document.querySelector('[role="listbox"],[data-slot="popover-content"]')
      )
        return

      if (e.code === 'Space') {
        if (isInteractive(e.target)) return
        e.preventDefault()
        generateNew()
        return
      }
      if (e.key >= '1' && e.key <= '7') {
        const h = HARMONIES[Number(e.key) - 1]
        s.setConfig((c) => ({ ...c, harmony: h, overrides: { light: {}, dark: {} } }))
        return
      }
      switch (e.key) {
        case 'l':
        case 'L':
          if (s.hoveredRole) toggleLock(s.hoveredRole)
          else toast('Hover a brand colour, then press L to lock it', { duration: 2000 })
          break
        case 'd':
        case 'D': {
          const next = PREVIEW_THEMES[(PREVIEW_THEMES.indexOf(s.previewTheme) + 1) % PREVIEW_THEMES.length]
          s.setUi({ previewTheme: next })
          break
        }
        case 'c':
        case 'C': {
          const next = CVD_MODES[(CVD_MODES.indexOf(s.cvd) + 1) % CVD_MODES.length]
          s.setUi({ cvd: next })
          toast(`Preview: ${CVD_OPTIONS.find((o) => o.value === next)?.label}`, { duration: 1500 })
          break
        }
        case 'e':
        case 'E':
          s.setUi({ exportOpen: true })
          break
        case 's':
        case 'S':
          saveCurrentToLibrary()
          break
        case '?':
          s.setUi({ helpOpen: true, helpTab: 'shortcuts' })
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
