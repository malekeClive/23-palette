import { z } from 'zod'
import { DEFAULT_CONFIG } from '@/engine/generate'
import { HARMONIES, type PaletteConfig, ROLE_KEYS, type RoleKey } from '@/engine/types'

const str = z.preprocess(
  (v) => (v === undefined || v === null ? undefined : String(v)),
  z.string().optional(),
)
const num = (min: number, max: number) =>
  z
    .preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().min(min).max(max).optional())
    .catch(undefined)

export const paletteSearchSchema = z.object({
  s: str
    .pipe(
      z
        .string()
        .regex(/^[0-9a-fA-F]{6}$/)
        .optional(),
    )
    .catch(undefined),
  h: z.enum(HARMONIES).optional().catch(undefined),
  sp: num(-15, 15),
  sat: num(0, 1),
  hs: num(0, 20),
  nt: num(0, 1),
  ntp: z.enum(['brand', 'warm', 'cool', 'pure']).optional().catch(undefined),
  g: z.enum(['srgb', 'p3']).optional().catch(undefined),
  pb: z
    .preprocess((v) => (v === 1 || v === '1' || v === true ? 1 : undefined), z.literal(1).optional())
    .catch(undefined),
  l: str.catch(undefined),
  o: str.catch(undefined),
})

export type PaletteSearch = z.infer<typeof paletteSearchSchema>

function b64urlEncode(s: string) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

const overridesSchema = z.object({
  light: z.record(z.string(), z.string()).default({}),
  dark: z.record(z.string(), z.string()).default({}),
})

const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d

export function searchToConfig(search: PaletteSearch): PaletteConfig {
  const d = DEFAULT_CONFIG
  const locks: PaletteConfig['locks'] = {}
  if (search.l) {
    for (const part of search.l.split(',')) {
      const [role, hex] = part.split(':')
      if (ROLE_KEYS.includes(role as RoleKey) && /^[0-9a-f]{6}$/i.test(hex ?? ''))
        locks[role as RoleKey] = hex.toLowerCase()
    }
  }
  let overrides: PaletteConfig['overrides'] = { light: {}, dark: {} }
  if (search.o) {
    try {
      overrides = overridesSchema.parse(JSON.parse(b64urlDecode(search.o)))
    } catch {
      overrides = { light: {}, dark: {} }
    }
  }
  return {
    seed: search.s?.toLowerCase() ?? d.seed,
    harmony: search.h ?? d.harmony,
    spread: search.sp !== undefined ? Math.round(search.sp) : d.spread,
    saturation: search.sat ?? d.saturation,
    hueShift: search.hs ?? d.hueShift,
    neutralTint: search.nt ?? d.neutralTint,
    neutralTemp: search.ntp ?? d.neutralTemp,
    gamut: search.g ?? d.gamut,
    pureBackground: search.pb === 1,
    locks,
    overrides,
  }
}

/** Config → search params with defaults stripped (clean URL for the default palette). */
export function configToSearch(c: PaletteConfig): PaletteSearch {
  const d = DEFAULT_CONFIG
  const out: PaletteSearch = {}
  if (c.seed !== d.seed) out.s = c.seed
  if (c.harmony !== d.harmony) out.h = c.harmony
  if (c.spread !== d.spread) out.sp = c.spread
  if (c.saturation !== null) out.sat = round(c.saturation)
  if (c.hueShift !== d.hueShift) out.hs = round(c.hueShift, 1)
  if (c.neutralTint !== d.neutralTint) out.nt = round(c.neutralTint)
  if (c.neutralTemp !== d.neutralTemp) out.ntp = c.neutralTemp
  if (c.gamut !== d.gamut) out.g = c.gamut
  if (c.pureBackground) out.pb = 1
  const locks = ROLE_KEYS.filter((r) => c.locks[r]).map((r) => `${r}:${c.locks[r]}`)
  if (locks.length) out.l = locks.join(',')
  if (Object.keys(c.overrides.light).length || Object.keys(c.overrides.dark).length) {
    out.o = b64urlEncode(JSON.stringify(c.overrides))
  }
  return out
}
