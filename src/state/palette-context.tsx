import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { generate } from '@/engine/generate'
import type { PaletteResult } from '@/engine/types'
import { usePaletteStore } from './store'

interface Ctx {
  /** committed palette */
  result: PaletteResult
  /** what to show (hover preview if any, else committed) */
  shown: PaletteResult
}

const PaletteCtx = createContext<Ctx | null>(null)

export function PaletteProvider({ children }: { children: ReactNode }) {
  const config = usePaletteStore((s) => s.config)
  const hoverConfig = usePaletteStore((s) => s.hoverConfig)
  const result = useMemo(() => generate(config), [config])
  const hoverResult = useMemo(() => (hoverConfig ? generate(hoverConfig) : null), [hoverConfig])
  const value = useMemo(() => ({ result, shown: hoverResult ?? result }), [result, hoverResult])
  return <PaletteCtx.Provider value={value}>{children}</PaletteCtx.Provider>
}

export function usePalette(): Ctx {
  const ctx = useContext(PaletteCtx)
  if (!ctx) throw new Error('usePalette must be used inside PaletteProvider')
  return ctx
}
