import { fitGamut, hueDelta, hueDistance, maxChroma, normHue } from './color'
import { type Gamut, type Oklch, type Scale, STEPS, type Step } from './types'

export const STEP_L: Record<Step, number> = {
  50: 0.977,
  100: 0.946,
  200: 0.89,
  300: 0.815,
  400: 0.72,
  500: 0.63,
  600: 0.54,
  700: 0.455,
  800: 0.38,
  900: 0.31,
  950: 0.23,
}

export const CHROMA_FACTOR: Record<Step, number> = {
  50: 0.55,
  100: 0.65,
  200: 0.75,
  300: 0.85,
  400: 0.95,
  500: 1,
  600: 1,
  700: 0.95,
  800: 0.88,
  900: 0.8,
  950: 0.7,
}

const YELLOW_POLE = 100
const BLUE_POLE = 265

export function stepIndex(step: Step): number {
  return STEPS.indexOf(step)
}

export function nearestStep(l: number): Step {
  let best: Step = 500
  let bestD = Number.POSITIVE_INFINITY
  for (const s of STEPS) {
    const d = Math.abs(STEP_L[s] - l)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** Hue for a step with "natural shading": lights drift toward yellow, darks toward blue. */
export function shiftedHue(h: number, step: Step, shift: number): number {
  if (shift <= 0) return h
  if (hueDistance(h, YELLOW_POLE) < 15 || hueDistance(h, BLUE_POLE) < 15) return h
  const t = (5 - stepIndex(step)) / 5 // +1 at 50, 0 at 500, -1 at 950
  if (t === 0) return h
  const pole = t > 0 ? YELLOW_POLE : BLUE_POLE
  const toward = hueDelta(h, pole)
  const amount = Math.min(shift * Math.abs(t), Math.abs(toward))
  return normHue(h + Math.sign(toward) * amount)
}

export interface ScaleOptions {
  saturation: number
  hueShift: number
  gamut: Gamut
  /** When set, the nearest step is replaced by this exact colour. */
  anchor?: Oklch
  /** Use a constant chroma instead of gamut-relative chroma (neutrals). */
  constantChroma?: number
}

export interface BuiltScale {
  scale: Scale
  anchorStep?: Step
  /** fraction of requested chroma lost to gamut mapping per step */
  reduced: Partial<Record<Step, number>>
}

export function buildScale(h: number, opts: ScaleOptions): BuiltScale {
  const scale = {} as Scale
  const reduced: Partial<Record<Step, number>> = {}
  const anchorStep = opts.anchor ? nearestStep(opts.anchor.l) : undefined
  for (const step of STEPS) {
    if (opts.anchor && step === anchorStep) {
      scale[step] = opts.anchor
      continue
    }
    const l = STEP_L[step]
    const hs = shiftedHue(h, step, opts.hueShift)
    if (opts.constantChroma !== undefined) {
      const wanted = { l, c: opts.constantChroma, h: hs }
      const fitted = fitGamut(wanted, opts.gamut)
      scale[step] = fitted
      if (wanted.c > 0) reduced[step] = 1 - fitted.c / wanted.c
      continue
    }
    const c = maxChroma(l, hs, opts.gamut) * CHROMA_FACTOR[step] * opts.saturation
    scale[step] = { l, c, h: hs }
  }
  return { scale, anchorStep, reduced }
}
