import { applyFix, audit } from './audit'
import { buildCharts } from './charts'
import { hexToOklch, maxChroma, normHue, toHex } from './color'
import { harmonyHues } from './harmony'
import { buildNeutral } from './neutral'
import { buildScale } from './scale'
import { semanticHue, semanticSaturation } from './semantic'
import { describeRef, TOKEN_LABEL, type TokenContext } from './tokens'
import {
  type Check,
  type Oklch,
  type PaletteConfig,
  type PaletteResult,
  type RoleKey,
  type Scale,
  type ScaleKey,
  SEMANTIC_KEYS,
  type Step,
  type ThemeMode,
} from './types'

export const DEFAULT_CONFIG: PaletteConfig = {
  seed: '4f46e5',
  harmony: 'split-complementary',
  spread: 0,
  saturation: null,
  hueShift: 6,
  neutralTint: 0.5,
  neutralTemp: 'brand',
  gamut: 'srgb',
  pureBackground: false,
  locks: {},
  overrides: { light: {}, dark: {} },
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

export function autoSaturation(seed: Oklch, gamut: PaletteConfig['gamut']): number {
  const max = maxChroma(seed.l, seed.h, gamut)
  return clamp(max > 0 ? seed.c / max : 0, 0.35, 1)
}

const HARMONY_NAME: Record<PaletteConfig['harmony'], string> = {
  monochromatic: 'monochromatic',
  analogous: 'analogous',
  complementary: 'complementary',
  'split-complementary': 'split-complementary',
  triadic: 'triadic',
  tetradic: 'tetradic',
  square: 'square',
}

export function generate(config: PaletteConfig): PaletteResult {
  const gamut = config.gamut
  const seed = hexToOklch(config.locks.primary ?? config.seed)
  const saturation = config.saturation ?? autoSaturation(seed, gamut)
  const hues = harmonyHues(seed.h, config.harmony, config.spread)
  const reasons: Record<string, string> = {}
  const hints: PaletteResult['hints'] = []

  const roles: Partial<Record<RoleKey, Oklch>> = { primary: seed }
  const expectedHues: Partial<Record<RoleKey, number>> = { primary: seed.h }
  reasons.primary = 'Your brand colour, used exactly as you entered it.'
  for (const [role, h] of Object.entries(hues) as [RoleKey, number][]) {
    expectedHues[role] = h
    const locked = config.locks[role]
    if (locked) {
      roles[role] = hexToOklch(locked)
      reasons[role] = `Locked by you (${toHex(roles[role]!)}). It stays put while you shuffle.`
      continue
    }
    if (config.harmony === 'monochromatic') {
      if (role === 'secondary') {
        roles[role] = { l: seed.l, c: seed.c * 0.45, h: seed.h }
        reasons[role] = 'Same hue as your brand, at about half the intensity — a quieter supporting tone.'
      } else {
        const l = seed.l > 0.6 ? seed.l - 0.18 : seed.l + 0.18
        roles[role] = { l, c: Math.min(seed.c, maxChroma(l, seed.h, gamut)), h: seed.h }
        reasons[role] =
          `Same hue as your brand, ${seed.l > 0.6 ? 'darker' : 'lighter'} for contrast within one colour family.`
      }
      continue
    }
    roles[role] = { l: seed.l, c: Math.min(seed.c, maxChroma(seed.l, h, gamut)), h }
    const rot = Math.round(normHue(h - seed.h))
    reasons[role] =
      `Your brand colour rotated ${rot}° around the colour wheel (${HARMONY_NAME[config.harmony]}), matched in brightness and intensity so it carries the same visual weight.`
  }

  const scales: Partial<Record<ScaleKey, Scale>> = {}
  const anchors: Partial<Record<RoleKey, Step>> = {}
  const reduced: PaletteResult['reduced'] = {}
  for (const [role, c] of Object.entries(roles) as [RoleKey, Oklch][]) {
    const sat =
      config.harmony === 'monochromatic' && role === 'secondary' && !config.locks.secondary
        ? saturation * 0.5
        : saturation
    const b = buildScale(c.h, { saturation: sat, hueShift: config.hueShift, gamut, anchor: c })
    scales[role] = b.scale
    anchors[role] = b.anchorStep
    reduced[role] = b.reduced
  }

  const neutral = buildNeutral(seed.h, config.neutralTint, config.neutralTemp, gamut)
  scales.neutral = neutral.scale
  reduced.neutral = neutral.reduced
  reasons.neutral =
    config.neutralTemp === 'pure' || config.neutralTint === 0
      ? 'Pure greys with no tint.'
      : config.neutralTemp === 'brand'
        ? 'Greys with a hint of your brand hue so surfaces and text feel like one family.'
        : `Greys tinted ${config.neutralTemp} for a ${config.neutralTemp === 'warm' ? 'softer, friendlier' : 'crisper, more technical'} feel.`

  const collisions: string[] = []
  const semSat = semanticSaturation(saturation)
  for (const key of SEMANTIC_KEYS) {
    const { hue, collision } = semanticHue(key, seed.h)
    if (collision) collisions.push(key)
    const b = buildScale(hue, { saturation: semSat, hueShift: config.hueShift, gamut })
    scales[key] = b.scale
    reduced[key] = b.reduced
    reasons[key] = collision
      ? `Standard ${TOKEN_LABEL[key]} hue, pushed away from your brand hue so the two are never confused.`
      : `Conventional ${TOKEN_LABEL[key]} hue (people already know what it means), nudged slightly toward your brand for cohesion.`
  }

  const roleHues = [roles.primary, roles.accent, roles.secondary, roles.extra]
    .filter(Boolean)
    .map((r) => r!.h)
  const charts = {
    light: buildCharts(roleHues, saturation, 'light', gamut),
    dark: buildCharts(roleHues, saturation, 'dark', gamut),
  }

  const ctx: TokenContext = {
    scales,
    anchors,
    charts: { light: charts.light.colors, dark: charts.dark.colors },
    pureBackground: config.pureBackground,
  }

  const auditInput = { ctx, config, roles, expectedHues, reduced, collisions, saturation }
  const light = audit(auditInput, 'light')
  const dark = audit(auditInput, 'dark')

  // token reasons
  for (const theme of ['light', 'dark'] as ThemeMode[]) {
    const r = theme === 'light' ? light : dark
    for (const [token, ref] of Object.entries(r.refs)) {
      const key = `${theme}:${token}`
      const src = describeRef(ref, r.tokens[token])
      const overridden = config.overrides[theme][token]
      if (overridden) {
        reasons[key] = `Uses ${src}, adjusted from the default to pass a check.`
      } else if (token === 'primary' || token === 'sidebar-primary') {
        const anchor = anchors.primary
        reasons[key] =
          ref === `primary-${anchor}`
            ? `Uses ${src} — your exact brand colour.`
            : `Uses ${src} instead of your brand shade (${anchor}) so its button text stays readable${theme === 'dark' ? ' on dark backgrounds' : ''}.`
      } else if (
        token.endsWith('-foreground') &&
        (ref === 'white' || ref === 'neutral-950') &&
        token.replace('-foreground', '') in r.tokens &&
        ['primary', 'destructive', 'success', 'warning', 'info', 'sidebar-primary'].includes(
          token.replace('-foreground', ''),
        )
      ) {
        reasons[key] =
          `${ref === 'white' ? 'White' : 'Near-black'} text, chosen because it reads better than the alternative on ${TOKEN_LABEL[token.replace('-foreground', '')] ?? 'this colour'}.`
      } else if (token.startsWith('chart-')) {
        const strat = charts[theme].strategy
        reasons[key] =
          strat === 'equal'
            ? 'Hues spread around the wheel from your brand colours, all at the same brightness so no series dominates.'
            : 'Hues spread around the wheel, with alternating brightness so colour-blind users can still tell series apart.'
      } else {
        reasons[key] = `Uses ${src}.`
      }
    }
  }

  // hints
  if (seed.l > 0.8 || seed.l < 0.35) {
    hints.push({
      id: 'seed-extreme',
      text: `Your brand colour is very ${seed.l > 0.8 ? 'light' : 'dark'}, so it sits at shade ${anchors.primary}. Buttons may use a ${seed.l > 0.8 ? 'darker' : 'lighter'} shade to stay readable.`,
    })
  }
  if (seed.c < 0.03) {
    hints.push({
      id: 'seed-grey',
      text: 'Your brand colour is almost grey, so the hue (and the colour relationship) is barely visible.',
    })
  }
  if (collisions.length) {
    hints.push({
      id: 'collision',
      text: `Your brand hue is close to the ${collisions.map((c) => TOKEN_LABEL[c]).join(' and ')}; it was shifted so the two are never confused.`,
    })
  }
  const gamutCheck = light.checks.find((c) => c.id === 'scale-gamut')
  if (gamutCheck?.status === 'warn') hints.push({ id: 'gamut', text: gamutCheck.title })

  return {
    config,
    saturation,
    roles,
    scales,
    anchors,
    reduced,
    tokens: { light: light.tokens, dark: dark.tokens },
    refs: { light: light.refs, dark: dark.refs },
    audit: {
      light: { checks: light.checks, score: light.score },
      dark: { checks: dark.checks, score: dark.score },
      score: Math.min(light.score, dark.score),
    },
    reasons,
    hints,
  }
}

const STATUS_ORDER = { fail: 0, warn: 1, info: 2, pass: 3 } as const

/** Fixable checks across both themes, worst first. */
export function fixableChecks(result: PaletteResult): (Check & { theme: ThemeMode })[] {
  const out: (Check & { theme: ThemeMode })[] = []
  for (const theme of ['light', 'dark'] as ThemeMode[]) {
    for (const c of result.audit[theme].checks)
      if (c.fix && (c.status === 'fail' || c.status === 'warn')) out.push({ ...c, theme })
  }
  return out.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

/** Apply every available fix, re-generating between fixes (they interact). */
export function fixAllDetailed(
  config: PaletteConfig,
  maxRounds = 24,
): { config: PaletteConfig; applied: number } {
  let current = config
  let applied = 0
  const seen = new Set<string>()
  for (let i = 0; i < maxRounds; i++) {
    const result = generate(current)
    const next = fixableChecks(result).find((c) => !seen.has(`${c.theme}:${c.id}:${JSON.stringify(c.fix)}`))
    if (!next?.fix) break
    seen.add(`${next.theme}:${next.id}:${JSON.stringify(next.fix)}`)
    current = applyFix(current, next.fix)
    applied++
  }
  return { config: current, applied }
}

export function fixAll(config: PaletteConfig, maxRounds = 24): PaletteConfig {
  return fixAllDetailed(config, maxRounds).config
}
