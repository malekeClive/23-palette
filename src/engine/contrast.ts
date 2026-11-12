import { APCAcontrast, sRGBtoY } from 'apca-w3'
import { wcagContrast } from 'culori'
import { toHex, toRgb255 } from './color'
import type { Oklch } from './types'

/** WCAG 2.x contrast ratio (1..21), computed on the sRGB-mapped colours. */
export function wcag(a: Oklch, b: Oklch): number {
  return wcagContrast(toHex(a), toHex(b))
}

/** APCA lightness contrast |Lc| for text on background. */
export function apca(text: Oklch, bg: Oklch): number {
  const v = Number(APCAcontrast(sRGBtoY(toRgb255(text)), sRGBtoY(toRgb255(bg))))
  return Math.abs(Number.isFinite(v) ? v : 0)
}

/**
 * Pick the foreground for `bg`: among candidates passing WCAG 4.5:1, the one APCA rates most readable
 * (APCA predicts mid-tone readability better); if none passes, the highest WCAG ratio.
 */
export function bestForeground<T extends { color: Oklch }>(bg: Oklch, candidates: T[]): T {
  const passing = candidates.filter((c) => wcag(c.color, bg) >= 4.5)
  if (passing.length > 1) {
    return passing.reduce((a, b) => (apca(b.color, bg) > apca(a.color, bg) ? b : a))
  }
  if (passing.length === 1) return passing[0]
  let best = candidates[0]
  let bestRatio = -1
  for (const c of candidates) {
    const r = wcag(c.color, bg)
    if (r > bestRatio) {
      bestRatio = r
      best = c
    }
  }
  return best
}

export function wcagLevel(ratio: number): 'AAA' | 'AA' | 'AA Large' | 'Fail' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}
