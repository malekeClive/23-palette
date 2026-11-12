import { converter, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit } from 'culori'
import { deltaE, fitGamut } from './color'
import type { Oklch } from './types'

export type CvdType = 'protanopia' | 'deuteranopia' | 'tritanopia'
export const CVD_TYPES: CvdType[] = ['protanopia', 'deuteranopia', 'tritanopia']

export const CVD_LABEL: Record<CvdType, string> = {
  protanopia: 'red-blind (protanopia)',
  deuteranopia: 'green-blind (deuteranopia)',
  tritanopia: 'blue-blind (tritanopia)',
}

const filters = {
  protanopia: filterDeficiencyProt(1),
  deuteranopia: filterDeficiencyDeuter(1),
  tritanopia: filterDeficiencyTrit(1),
}

const toOklch = converter('oklch')

export function simulate(c: Oklch, type: CvdType): Oklch {
  const fitted = fitGamut(c, 'srgb')
  const out = toOklch(filters[type]({ mode: 'oklch', l: fitted.l, c: fitted.c, h: fitted.h }))
  return { l: out.l, c: out.c ?? 0, h: out.h ?? 0 }
}

export function cvdDelta(a: Oklch, b: Oklch, type: CvdType): number {
  return deltaE(simulate(a, type), simulate(b, type))
}

/** Smallest pairwise ΔE-OK across all CVD types. */
export function minPairwiseDelta(colors: Oklch[], types: CvdType[] = CVD_TYPES) {
  let min = Number.POSITIVE_INFINITY
  let where: { type: CvdType; i: number; j: number } | null = null
  for (const type of types) {
    const sim = colors.map((c) => simulate(c, type))
    for (let i = 0; i < sim.length; i++) {
      for (let j = i + 1; j < sim.length; j++) {
        const d = deltaE(sim[i], sim[j])
        if (d < min) {
          min = d
          where = { type, i, j }
        }
      }
    }
  }
  return { min, where }
}

/** Colour matrices (approx. Machado 2009, severity 1) used by the preview's SVG filter. */
export const CVD_MATRICES: Record<CvdType | 'grayscale', string> = {
  protanopia: '0.152 1.053 -0.205 0 0  0.115 0.786 0.099 0 0  -0.004 -0.048 1.052 0 0  0 0 0 1 0',
  deuteranopia: '0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0',
  tritanopia: '1.256 -0.077 -0.179 0 0  -0.078 0.931 0.148 0 0  0.005 0.691 0.304 0 0  0 0 0 1 0',
  grayscale: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0',
}
