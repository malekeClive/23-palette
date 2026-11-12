import { z } from 'zod'
import { DEFAULT_CONFIG } from '@/engine/generate'
import type { PaletteConfig } from '@/engine/types'
import { configToSearch, paletteSearchSchema, searchToConfig } from './search-schema'

export const LIBRARY_KEY = 'palette.library.v1'

export interface SavedPalette {
  id: string
  name: string
  config: PaletteConfig
  createdAt: number
}

// Configs are stored in their compact URL form so the same validation applies everywhere.
const entrySchema = z.object({
  id: z.string(),
  name: z.string().max(80),
  config: z.unknown(),
  createdAt: z.number(),
})
export const libraryFileSchema = z.array(entrySchema)

function normalise(raw: unknown): PaletteConfig {
  if (raw && typeof raw === 'object' && 'seed' in raw) {
    // full config object: round-trip through the URL schema to validate
    return searchToConfig(
      paletteSearchSchema.parse(configToSearch({ ...DEFAULT_CONFIG, ...(raw as PaletteConfig) })),
    )
  }
  return searchToConfig(paletteSearchSchema.parse(raw ?? {}))
}

export function parseLibrary(data: unknown): SavedPalette[] {
  return libraryFileSchema.parse(data).map((e) => ({ ...e, config: normalise(e.config) }))
}

export function loadLibrary(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return []
    return parseLibrary(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveLibrary(items: SavedPalette[]): boolean {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(serialiseLibrary(items)))
    return true
  } catch {
    return false
  }
}

export function serialiseLibrary(items: SavedPalette[]) {
  return items.map((e) => ({ ...e, config: configToSearch(e.config) }))
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
