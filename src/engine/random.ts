import { maxChroma, toHex } from './color'
import { HARMONIES, type Harmony, type PaletteConfig } from './types'

export type Rng = () => number

/** Random seed per §8.8: L ∈ [0.50, 0.68], any hue, 60–95% of max chroma. */
export function randomSeedHex(rng: Rng = Math.random): string {
  const l = 0.5 + rng() * 0.18
  const h = rng() * 360
  const c = maxChroma(l, h, 'srgb') * (0.6 + rng() * 0.35)
  return toHex({ l, c, h }).slice(1)
}

export function randomHarmony(rng: Rng = Math.random, exclude?: Harmony): Harmony {
  const options = HARMONIES.filter((h) => h !== exclude)
  return options[Math.floor(rng() * options.length)]
}

/** `Space`: new seed for unlocked roles; with primary locked, re-roll harmony + spread instead. */
export function shuffle(config: PaletteConfig, rng: Rng = Math.random): PaletteConfig {
  if (config.locks.primary) {
    return {
      ...config,
      harmony: randomHarmony(rng, config.harmony),
      spread: Math.round((rng() * 2 - 1) * 15) || 0,
      overrides: { light: {}, dark: {} },
    }
  }
  return { ...config, seed: randomSeedHex(rng), saturation: null, overrides: { light: {}, dark: {} } }
}

/** Deterministic PRNG for tests. */
export function mulberry32(seed: number): Rng {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
