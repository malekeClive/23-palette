import { buildScale } from './scale'
import type { Gamut, NeutralTemp } from './types'

export function neutralHue(primaryHue: number, temp: NeutralTemp): number {
  if (temp === 'warm') return 70
  if (temp === 'cool') return 255
  return primaryHue
}

export function neutralChroma(tint: number, temp: NeutralTemp): number {
  if (temp === 'pure') return 0
  return Math.max(0, Math.min(1, tint)) * 0.02
}

export function buildNeutral(primaryHue: number, tint: number, temp: NeutralTemp, gamut: Gamut) {
  return buildScale(neutralHue(primaryHue, temp), {
    saturation: 1,
    hueShift: 0,
    gamut,
    constantChroma: neutralChroma(tint, temp),
  })
}
