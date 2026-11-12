import { hueDistance, maxChroma } from './color'
import { minPairwiseDelta } from './cvd'
import type { Gamut, Oklch, ThemeMode } from './types'

const CHART_MIN_DELTA = 0.08

/** Five hues: given role hues first (deduped), then gap-fillers maximising the minimum hue distance. */
export function chartHues(roleHues: number[]): number[] {
  const hues: number[] = []
  for (const h of roleHues) {
    if (hues.length >= 5) break
    if (hues.every((x) => hueDistance(x, h) >= 20)) hues.push(h)
  }
  while (hues.length < 5) {
    let best = 0
    let bestD = -1
    for (let h = 0; h < 360; h += 1) {
      const d = Math.min(...hues.map((x) => hueDistance(x, h)))
      if (d > bestD) {
        bestD = d
        best = h
      }
    }
    hues.push(best)
  }
  return hues
}

export interface ChartResult {
  colors: Oklch[]
  minDelta: number
  strategy: 'equal' | 'alternate' | 'ramp'
}

export function buildCharts(
  roleHues: number[],
  saturation: number,
  theme: ThemeMode,
  gamut: Gamut,
): ChartResult {
  const hues = chartHues(roleHues)
  const baseL = theme === 'light' ? 0.65 : 0.7
  const make = (ls: number[]): Oklch[] => {
    const c = Math.min(...hues.map((h, i) => maxChroma(ls[i], h, gamut)), 0.2 * Math.max(0.5, saturation))
    return hues.map((h, i) => ({ l: ls[i], c, h }))
  }
  const strategies: { name: ChartResult['strategy']; ls: number[] }[] = [
    { name: 'equal', ls: hues.map(() => baseL) },
    { name: 'alternate', ls: hues.map((_, i) => baseL + (i % 2 === 0 ? 0.1 : -0.1) * (i === 0 ? 0 : 1)) },
    {
      name: 'ramp',
      ls: theme === 'light' ? [0.55, 0.8, 0.45, 0.7, 0.62] : [0.62, 0.85, 0.52, 0.76, 0.68],
    },
  ]
  let best: ChartResult | null = null
  for (const s of strategies) {
    const colors = make(s.ls)
    const { min } = minPairwiseDelta(colors)
    const result: ChartResult = { colors, minDelta: min, strategy: s.name }
    if (min >= CHART_MIN_DELTA) return result
    if (!best || min > best.minDelta) best = result
  }
  // Last resort: try every assignment of a wide lightness ladder to the five hues.
  const ladder = theme === 'light' ? [0.42, 0.52, 0.62, 0.72, 0.84] : [0.5, 0.6, 0.7, 0.8, 0.9]
  for (const perm of permutations(ladder)) {
    const colors = make(perm)
    const { min } = minPairwiseDelta(colors)
    if (min > best!.minDelta) best = { colors, minDelta: min, strategy: 'ramp' }
    if (min >= CHART_MIN_DELTA + 0.02) break
  }
  return best!
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs]
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))
}
