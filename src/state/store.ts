import { temporal } from 'zundo'
import { create, useStore } from 'zustand'
import { DEFAULT_CONFIG } from '@/engine/generate'
import type { PaletteConfig, RoleKey } from '@/engine/types'

export type PreviewTheme = 'light' | 'dark' | 'split'
export type PreviewScene = 'dashboard' | 'marketing' | 'forms' | 'typography'
export type CvdMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'grayscale'

export const PREVIEW_THEMES: PreviewTheme[] = ['light', 'dark', 'split']
export const CVD_MODES: CvdMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'grayscale']

interface UiState {
  previewTheme: PreviewTheme
  scene: PreviewScene
  cvd: CvdMode
  explain: boolean
  /** temporary config shown while hovering an option (not committed, not in history) */
  hoverConfig: PaletteConfig | null
  hoveredRole: RoleKey | null
  highlight: string[]
  exportOpen: boolean
  libraryOpen: boolean
  helpOpen: boolean
  helpTab: 'shortcuts' | 'how' | 'glossary'
  auditOpen: boolean
  tourStep: number | null
}

interface Store extends UiState {
  config: PaletteConfig
  setConfig: (patch: Partial<PaletteConfig> | ((c: PaletteConfig) => PaletteConfig)) => void
  setUi: (patch: Partial<UiState>) => void
}

export const usePaletteStore = create<Store>()(
  temporal(
    (set) => ({
      config: DEFAULT_CONFIG,
      previewTheme: 'light',
      scene: 'dashboard',
      cvd: 'none',
      explain: readFlag('palette.explain.v1'),
      hoverConfig: null,
      hoveredRole: null,
      highlight: [],
      exportOpen: false,
      libraryOpen: false,
      helpOpen: false,
      helpTab: 'shortcuts',
      auditOpen: true,
      tourStep: null,
      setConfig: (patch) =>
        set((s) => ({
          config: typeof patch === 'function' ? patch(s.config) : { ...s.config, ...patch },
          hoverConfig: null,
        })),
      setUi: (patch) => set(patch),
    }),
    {
      limit: 50,
      partialize: (s) => ({ config: s.config }),
      equality: (a, b) => a.config === b.config,
      // Leading-edge throttle: one history entry per burst of changes (e.g. a slider drag).
      handleSet: (handleSet) => {
        let last = 0
        return (...args: Parameters<typeof handleSet>) => {
          const now = Date.now()
          if (now - last > 400) handleSet(...args)
          last = now
        }
      },
    },
  ),
)

export const useTemporal = <T>(selector: (s: ReturnType<typeof usePaletteStore.temporal.getState>) => T) =>
  useStore(usePaletteStore.temporal, selector)

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}
