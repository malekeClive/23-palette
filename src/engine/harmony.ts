import { normHue } from './color'
import type { Harmony, RoleKey } from './types'

export type HarmonyHues = Partial<Record<Exclude<RoleKey, 'primary'>, number>>

/** Hue angles for non-primary roles, per §4.2. `spread` widens/tightens analogous & split-complementary. */
export function harmonyHues(h: number, harmony: Harmony, spread = 0): HarmonyHues {
  switch (harmony) {
    case 'monochromatic':
      return { secondary: normHue(h), accent: normHue(h) }
    case 'analogous':
      return { secondary: normHue(h - (30 + spread)), accent: normHue(h + 30 + spread) }
    case 'complementary':
      return { accent: normHue(h + 180) }
    case 'split-complementary':
      return { secondary: normHue(h + 150 - spread), accent: normHue(h + 210 + spread) }
    case 'triadic':
      return { secondary: normHue(h + 120), accent: normHue(h + 240) }
    case 'tetradic':
      return { secondary: normHue(h + 60), accent: normHue(h + 180), extra: normHue(h + 240) }
    case 'square':
      return { secondary: normHue(h + 90), accent: normHue(h + 180), extra: normHue(h + 270) }
  }
}

export const harmonyUsesSpread = (h: Harmony) => h === 'analogous' || h === 'split-complementary'

/** Hue offsets (relative to primary) for drawing mini wheels. */
export function harmonyOffsets(harmony: Harmony): number[] {
  const hues = harmonyHues(0, harmony)
  return [0, ...Object.values(hues)].filter((v, i, a) => a.indexOf(v) === i)
}
