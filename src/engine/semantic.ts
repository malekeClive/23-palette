import { hueDelta, normHue } from './color'
import type { SemanticKey } from './types'

export const SEMANTIC_ANCHORS: Record<SemanticKey, { hue: number; min: number; max: number }> = {
  success: { hue: 150, min: 135, max: 165 },
  warning: { hue: 80, min: 65, max: 95 },
  destructive: { hue: 27, min: 15, max: 35 },
  info: { hue: 245, min: 230, max: 260 },
}

export interface SemanticHue {
  hue: number
  collision: boolean
}

/** Anchor hue nudged ≤ 8° toward the brand, clamped; pushed to the far edge on collision (§4.5). */
export function semanticHue(key: SemanticKey, primaryHue: number): SemanticHue {
  const { hue, min, max } = SEMANTIC_ANCHORS[key]
  const d = hueDelta(hue, primaryHue)
  if (Math.abs(d) < 20) {
    // push away from the brand to the far edge of the allowed range
    return { hue: d >= 0 ? min : max, collision: true }
  }
  const nudged = hue + Math.sign(d) * Math.min(8, Math.abs(d))
  return { hue: normHue(Math.min(max, Math.max(min, nudged))), collision: false }
}

/** Semantic colours share brand saturation but never drop so low that states lose meaning. */
export function semanticSaturation(brandSaturation: number): number {
  return Math.min(1, Math.max(0.6, brandSaturation))
}
