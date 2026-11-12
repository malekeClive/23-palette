import { describe, expect, test } from 'bun:test'
import { formatHex } from 'culori'
import { configToSearch, paletteSearchSchema, searchToConfig } from '../state/search-schema'
import { hexToOklch, hueDistance, inGamut, toHex } from './color'
import { wcag } from './contrast'
import { exportCssHex, exportDtcg, exportFigma, exportShadcn, exportTailwind } from './export'
import { DEFAULT_CONFIG, fixAll, generate } from './generate'
import { harmonyHues } from './harmony'
import { mulberry32, randomSeedHex } from './random'
import { ALL_TOKENS } from './tokens'
import { HARMONIES, type PaletteConfig, type ScaleKey, STEPS } from './types'

const rng = mulberry32(1234)

describe('colour conversions', () => {
  test('hex → OKLCH → hex is lossless for 1,000 random sRGB colours', () => {
    for (let i = 0; i < 1000; i++) {
      const hex = formatHex({ mode: 'rgb', r: rng(), g: rng(), b: rng() })
      expect(toHex(hexToOklch(hex))).toBe(hex)
    }
  })

  test('WCAG contrast matches known values', () => {
    expect(wcag(hexToOklch('000000'), hexToOklch('ffffff'))).toBeCloseTo(21, 1)
    expect(wcag(hexToOklch('767676'), hexToOklch('ffffff'))).toBeCloseTo(4.54, 2)
  })
})

function randomConfig(r: () => number): PaletteConfig {
  return {
    ...DEFAULT_CONFIG,
    seed: randomSeedHex(r),
    harmony: HARMONIES[Math.floor(r() * HARMONIES.length)],
    spread: Math.round((r() * 2 - 1) * 15) || 0,
    saturation: r() < 0.5 ? null : r(),
    hueShift: r() * 20,
    neutralTint: r(),
    gamut: r() < 0.3 ? 'p3' : 'srgb',
  }
}

describe('generation', () => {
  test('every generated colour is in the target gamut (500 random configs)', () => {
    for (let i = 0; i < 500; i++) {
      const config = randomConfig(rng)
      const res = generate(config)
      for (const scale of Object.values(res.scales)) {
        for (const s of STEPS) expect(inGamut(scale![s], config.gamut)).toBe(true)
      }
    }
  })

  test('scales are monotonic in L and the anchor equals the seed exactly', () => {
    for (let i = 0; i < 100; i++) {
      const config = randomConfig(rng)
      const res = generate(config)
      for (const [name, scale] of Object.entries(res.scales) as [
        ScaleKey,
        NonNullable<(typeof res.scales)[ScaleKey]>,
      ][]) {
        for (let j = 1; j < STEPS.length; j++) {
          expect(scale[STEPS[j]].l, `${name} ${STEPS[j]}`).toBeLessThan(scale[STEPS[j - 1]].l)
        }
      }
      const anchor = res.anchors.primary!
      expect(toHex(res.scales.primary![anchor])).toBe(`#${config.seed}`)
    }
  })

  test('harmony hues match §4.2', () => {
    const h = 40
    const expected: Record<string, number[]> = {
      analogous: [10, 70],
      complementary: [220],
      'split-complementary': [190, 250],
      triadic: [160, 280],
      tetradic: [100, 220, 280],
      square: [130, 220, 310],
    }
    for (const [harmony, hues] of Object.entries(expected)) {
      const got = Object.values(harmonyHues(h, harmony as PaletteConfig['harmony'], 0))
      expect(got.length).toBe(hues.length)
      for (const [i, x] of hues.entries()) expect(hueDistance(got[i], x)).toBeLessThan(0.001)
    }
  })

  test('default config scores ≥ 90 in both themes', () => {
    const res = generate(DEFAULT_CONFIG)
    expect(res.audit.light.score).toBeGreaterThanOrEqual(90)
    expect(res.audit.dark.score).toBeGreaterThanOrEqual(90)
  })

  test('200 random Space seeds score ≥ 90 after Fix all', () => {
    const r = mulberry32(99)
    for (let i = 0; i < 200; i++) {
      const config = { ...DEFAULT_CONFIG, seed: randomSeedHex(r) }
      const res = generate(fixAll(config))
      expect(res.audit.score, `seed ${config.seed}`).toBeGreaterThanOrEqual(90)
    }
  })

  test('generate() is deterministic and fast', () => {
    const a = exportShadcn(generate(DEFAULT_CONFIG), { format: 'oklch', hexFallback: false })
    const b = exportShadcn(generate(DEFAULT_CONFIG), { format: 'oklch', hexFallback: false })
    expect(a).toBe(b)
    const t0 = performance.now()
    for (let i = 0; i < 20; i++) generate({ ...DEFAULT_CONFIG, seed: randomSeedHex(rng) })
    expect((performance.now() - t0) / 20).toBeLessThan(25)
  })

  test('every token and role has a reason', () => {
    const res = generate(DEFAULT_CONFIG)
    for (const r of Object.keys(res.roles)) expect(res.reasons[r]).toBeTruthy()
    for (const t of ALL_TOKENS) {
      expect(res.reasons[`light:${t}`], t).toBeTruthy()
      expect(res.reasons[`dark:${t}`], t).toBeTruthy()
    }
  })
})

describe('exports', () => {
  const res = generate({ ...DEFAULT_CONFIG, seed: '0ea5e9', harmony: 'triadic' })
  const opts = { format: 'oklch' as const, hexFallback: false }

  test('shadcn CSS contains every token for light and dark', () => {
    const css = exportShadcn(res, opts)
    const [root, dark] = css.split('.dark {')
    for (const t of ALL_TOKENS) {
      expect(root).toContain(`--${t}:`)
      expect(dark).toContain(`--${t}:`)
      expect(css).toContain(`--color-${t}: var(--${t});`)
    }
  })

  test('snapshots', () => {
    expect(exportShadcn(res, opts)).toMatchSnapshot()
    expect(exportTailwind(res, opts)).toMatchSnapshot()
    expect(exportCssHex(res)).toMatchSnapshot()
    expect(exportDtcg(res)).toMatchSnapshot()
    expect(exportFigma(res)).toMatchSnapshot()
  })

  test('JSON exports parse', () => {
    expect(() => JSON.parse(exportDtcg(res))).not.toThrow()
    expect(JSON.parse(exportFigma(res)).collections).toHaveLength(2)
  })
})

describe('URL search schema', () => {
  test('config → params → config is identity', () => {
    for (let i = 0; i < 100; i++) {
      const base = randomConfig(rng)
      const config: PaletteConfig = {
        ...base,
        saturation: base.saturation === null ? null : Math.round(base.saturation * 1000) / 1000,
        hueShift: Math.round(base.hueShift * 10) / 10,
        neutralTint: Math.round(base.neutralTint * 1000) / 1000,
        locks: i % 3 === 0 ? { accent: 'ff8800' } : {},
        overrides: i % 4 === 0 ? { light: { primary: 'primary-700' }, dark: {} } : { light: {}, dark: {} },
      }
      const params = configToSearch(config)
      // simulate the router's JSON-ish parsing of values
      const parsed = paletteSearchSchema.parse(JSON.parse(JSON.stringify(params)))
      expect(searchToConfig(parsed)).toEqual(config)
    }
  })

  test('garbage params yield defaults', () => {
    const parsed = paletteSearchSchema.parse({
      s: 'zzz',
      h: 'nope',
      sp: 'x',
      sat: 9,
      g: 1,
      l: 'foo:bar',
      o: '!!',
    })
    expect(searchToConfig(parsed)).toEqual(DEFAULT_CONFIG)
  })

  test('numeric-looking seeds survive', () => {
    const parsed = paletteSearchSchema.parse({ s: 123456 })
    expect(searchToConfig(parsed).seed).toBe('123456')
  })
})
