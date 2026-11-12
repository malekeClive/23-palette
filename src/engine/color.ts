import { converter, formatHex, parse } from 'culori'
import type { Gamut, Oklch } from './types'

const toOklchRaw = converter('oklch')
const toRgb = converter('rgb')
const toP3 = converter('p3')
const toOklab = converter('oklab')

const EPS = 1e-4

export function normHue(h: number): number {
  const r = h % 360
  return r < 0 ? r + 360 : r
}

/** Signed shortest angular distance from a to b, in (-180, 180]. */
export function hueDelta(a: number, b: number): number {
  let d = normHue(b) - normHue(a)
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export function hueDistance(a: number, b: number): number {
  return Math.abs(hueDelta(a, b))
}

/** Parse any CSS colour (hex with or without '#', rgb(), hsl(), oklch(), named). */
export function parseColor(input: string): Oklch | null {
  const s = input.trim()
  if (!s) return null
  const candidate = /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) ? `#${s}` : s
  const parsed = parse(candidate)
  if (!parsed) return null
  const o = toOklchRaw(parsed)
  if (!o) return null
  return { l: o.l, c: o.c ?? 0, h: normHue(o.h ?? 0) }
}

export function hexToOklch(hex: string): Oklch {
  const o = parseColor(hex)
  if (!o) throw new Error(`Invalid hex: ${hex}`)
  return o
}

function culoriColor(c: Oklch) {
  return { mode: 'oklch' as const, l: c.l, c: c.c, h: c.h }
}

export function inGamut(c: Oklch, gamut: Gamut): boolean {
  const v = gamut === 'p3' ? toP3(culoriColor(c)) : toRgb(culoriColor(c))
  return [v.r, v.g, v.b].every((x) => x >= -EPS && x <= 1 + EPS)
}

const maxChromaCache = new Map<string, number>()

/** Highest in-gamut chroma for (L, h). Binary search, 16 iterations, memoised. */
function searchMaxChroma(l: number, h: number, gamut: Gamut): number {
  if (l <= 0 || l >= 1) return 0
  let lo = 0
  let hi = 0.4
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (inGamut({ l, c: mid, h }, gamut)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Highest in-gamut chroma for (L, h). Binary search, 16 iterations, memoised on rounded (L, h).
 * A 0.5% safety margin keeps neighbouring (rounded) inputs in gamut too.
 */
export function maxChroma(l: number, h: number, gamut: Gamut): number {
  const key = `${gamut}:${l.toFixed(4)}:${normHue(h).toFixed(2)}`
  const cached = maxChromaCache.get(key)
  if (cached !== undefined) return cached
  const v = searchMaxChroma(l, h, gamut) * 0.995
  maxChromaCache.set(key, v)
  return v
}

/** Map into gamut by reducing chroma at constant L and h. */
export function fitGamut(c: Oklch, gamut: Gamut): Oklch {
  if (inGamut(c, gamut)) return c
  return { l: c.l, c: Math.min(c.c, searchMaxChroma(c.l, c.h, gamut)), h: c.h }
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

/** sRGB hex (with '#'), gamut-mapped by chroma reduction. */
export function toHex(c: Oklch): string {
  const fitted = fitGamut(c, 'srgb')
  const rgb = toRgb(culoriColor(fitted))
  return formatHex({ mode: 'rgb', r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) })
}

export function toRgb255(c: Oklch): [number, number, number] {
  const rgb = toRgb(culoriColor(fitGamut(c, 'srgb')))
  return [rgb.r, rgb.g, rgb.b].map((x) => Math.round(clamp01(x) * 255)) as [number, number, number]
}

const r3 = (x: number) => (Math.round(x * 1000) / 1000).toFixed(3)
const r1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1)

export function formatOklch(c: Oklch): string {
  return `oklch(${r3(c.l)} ${r3(c.c)} ${r1(c.c < 0.0005 ? 0 : c.h)})`
}

export function formatHsl(c: Oklch): string {
  const [r, g, b] = toRgb255(c).map((x) => x / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return `hsl(${r1(h)} ${r1(s * 100)}% ${r1(l * 100)}%)`
}

export type ColorFormat = 'oklch' | 'hex' | 'hsl'

export function formatColor(c: Oklch, format: ColorFormat): string {
  if (format === 'hex') return toHex(c)
  if (format === 'hsl') return formatHsl(c)
  return formatOklch(c)
}

/** Euclidean distance in OKLab (ΔE-OK). */
export function deltaE(a: Oklch, b: Oklch): number {
  const x = toOklab(culoriColor(a))
  const y = toOklab(culoriColor(b))
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const o = toOklchRaw({ mode: 'rgb', r, g, b })
  return { l: o.l, c: o.c ?? 0, h: normHue(o.h ?? 0) }
}

export const WHITE: Oklch = { l: 1, c: 0, h: 0 }
export const BLACK: Oklch = { l: 0, c: 0, h: 0 }
