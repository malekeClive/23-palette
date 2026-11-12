import { deltaE, hueDistance, toHex } from './color'
import { apca, wcag } from './contrast'
import { CVD_LABEL, CVD_TYPES, cvdDelta, minPairwiseDelta } from './cvd'
import { stepIndex } from './scale'
import { COMPUTED_FOREGROUNDS, parseRef, resolveTokens, TOKEN_LABEL, type TokenContext } from './tokens'
import {
  type AuditReport,
  type Check,
  type CheckStatus,
  type Fix,
  type Oklch,
  type PaletteConfig,
  type RoleKey,
  type ScaleKey,
  STEPS,
  type Step,
  type ThemeMode,
  type TokenMap,
} from './types'

export const PENALTY: Record<CheckStatus, number> = { fail: 12, warn: 4, info: 0, pass: 0 }

interface Pair {
  id: string
  fg: string
  bg: string
  /** what is being checked, e.g. "Body text on the page background" */
  what: string
  why: string
  min: number
  /** below this (but ≥ min) → warn */
  warnBelow?: number
  apcaMin: number
  warnOnly?: boolean
}

const PAIRS: Pair[] = [
  {
    id: 'fg-bg',
    fg: 'foreground',
    bg: 'background',
    what: 'Body text on the page background',
    why: 'This is most of the text people read. Low contrast causes eye strain and is unreadable in sunlight or on cheap screens.',
    min: 4.5,
    warnBelow: 7,
    apcaMin: 75,
  },
  {
    id: 'muted-bg',
    fg: 'muted-foreground',
    bg: 'background',
    what: 'Muted text on the page background',
    why: 'Captions, helper text and timestamps use muted text. People with low vision or on a dim screen will struggle with them.',
    min: 4.5,
    apcaMin: 60,
  },
  {
    id: 'muted-muted',
    fg: 'muted-foreground',
    bg: 'muted',
    what: 'Muted text on muted surfaces',
    why: 'Muted text often sits on muted panels (table headers, empty states). It needs to stay readable there too.',
    min: 4.5,
    apcaMin: 60,
  },
  {
    id: 'primary-fg',
    fg: 'primary-foreground',
    bg: 'primary',
    what: 'Text on primary buttons',
    why: 'Primary buttons are your most important actions. If their label is hard to read, people hesitate or miss them.',
    min: 4.5,
    apcaMin: 45,
  },
  {
    id: 'secondary-fg',
    fg: 'secondary-foreground',
    bg: 'secondary',
    what: 'Text on secondary buttons',
    why: 'Secondary actions still need readable labels.',
    min: 4.5,
    apcaMin: 45,
  },
  {
    id: 'accent-fg',
    fg: 'accent-foreground',
    bg: 'accent',
    what: 'Text on accent highlights',
    why: 'Accent is used for hovered menu items and highlights; their text must stay readable.',
    min: 4.5,
    apcaMin: 45,
  },
  {
    id: 'card-fg',
    fg: 'card-foreground',
    bg: 'card',
    what: 'Text on cards',
    why: 'Cards hold a lot of content. Their text needs the same readability as the page.',
    min: 4.5,
    apcaMin: 75,
  },
  ...(['destructive', 'success', 'warning', 'info'] as const).map(
    (k): Pair => ({
      id: `${k}-fg`,
      fg: `${k}-foreground`,
      bg: k,
      what: `Text on ${TOKEN_LABEL[k]} badges and buttons`,
      why: `${cap(TOKEN_LABEL[k])} messages are often urgent. Their labels must be readable at a glance.`,
      min: 4.5,
      apcaMin: 45,
    }),
  ),
  {
    id: 'link',
    fg: 'primary',
    bg: 'background',
    what: 'Primary-coloured links on the page background',
    why: 'Links and text buttons use the primary colour as text. If it is too light, people cannot read or find them.',
    min: 4.5,
    apcaMin: 45,
  },
  {
    id: 'input',
    fg: 'input',
    bg: 'background',
    what: 'Input and control borders against the page background',
    why: 'Input and control borders show people where to click and type. Very faint borders make forms hard to use (WCAG 1.4.11 asks for 3:1 on essential UI). Decorative dividers can stay subtle.',
    min: 3,
    apcaMin: 15,
    warnOnly: true,
  },
  {
    id: 'ring',
    fg: 'ring',
    bg: 'background',
    what: 'Focus ring against the page background',
    why: 'Keyboard users rely on the focus ring to know where they are. If it is invisible, the site is unusable without a mouse.',
    min: 3,
    apcaMin: 30,
  },
]

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const fmtRatio = (r: number) => `${r.toFixed(r >= 10 ? 1 : 2)}:1`

interface PairEval {
  ratio: number
  lc: number
  status: CheckStatus
  reason: 'wcag' | 'aaa' | 'apca' | null
}

function evalPair(p: Pair, tokens: TokenMap): PairEval {
  const fg = tokens[p.fg]
  const bg = tokens[p.bg]
  const ratio = wcag(fg, bg)
  const lc = apca(fg, bg)
  if (ratio < p.min) return { ratio, lc, status: p.warnOnly ? 'warn' : 'fail', reason: 'wcag' }
  if (p.warnBelow && ratio < p.warnBelow) return { ratio, lc, status: 'warn', reason: 'aaa' }
  if (lc < p.apcaMin) return { ratio, lc, status: 'warn', reason: 'apca' }
  return { ratio, lc, status: 'pass', reason: null }
}

/** Walk a token's scale step by step away from `awayFrom` until `ok` holds. */
function walkToken(
  ctx: TokenContext,
  theme: ThemeMode,
  overrides: Record<string, string>,
  token: string,
  ref: string,
  awayFromL: number,
  ok: (tokens: TokenMap) => boolean,
  linked: string[] = [],
): { changes: { theme: ThemeMode; token: string; value: string }[]; dir: 'darker' | 'lighter' } | null {
  const p = parseRef(ref)
  if (!p) return null
  const scale = ctx.scales[p.scale]
  if (!scale) return null
  const current = scale[p.step]
  const dirSign = current.l <= awayFromL ? 1 : -1 // +1 = darker (higher step)
  let i = stepIndex(p.step) + dirSign
  while (i >= 0 && i < STEPS.length) {
    const value = `${p.scale}-${STEPS[i]}`
    const ov = { ...overrides, [token]: value }
    for (const l of linked) ov[l] = value
    const { tokens } = resolveTokens(ctx, theme, ov)
    if (ok(tokens)) {
      return {
        changes: [token, ...linked].map((t) => ({ theme, token: t, value })),
        dir: dirSign > 0 ? 'darker' : 'lighter',
      }
    }
    i += dirSign
  }
  return null
}

function contrastFix(
  ctx: TokenContext,
  theme: ThemeMode,
  overrides: Record<string, string>,
  refs: Record<string, string>,
  tokens: TokenMap,
  p: Pair,
): Fix | undefined {
  const ok = (t: TokenMap) => evalPair(p, t).status === 'pass'
  // Prefer moving the foreground side; computed / fixed foregrounds move the background instead.
  const computed = (p.fg in COMPUTED_FOREGROUNDS && !overrides[p.fg]) || !parseRef(refs[p.fg])
  const order: ('fg' | 'bg')[] = computed ? ['bg', 'fg'] : ['fg', 'bg']
  for (const side of order) {
    const token = side === 'fg' ? p.fg : p.bg
    const other = side === 'fg' ? tokens[p.bg] : tokens[p.fg]
    const linked = token === 'border' ? ['input'] : token === 'primary' ? ['sidebar-primary'] : []
    const res = walkToken(ctx, theme, overrides, token, refs[token], other.l, ok, linked)
    if (res) {
      return {
        kind: 'override',
        label: `${res.dir === 'darker' ? 'Darken' : 'Lighten'} ${TOKEN_LABEL[token] ?? token}`,
        changes: res.changes,
      }
    }
  }
  return undefined
}

function contrastChecks(
  ctx: TokenContext,
  theme: ThemeMode,
  overrides: Record<string, string>,
  tokens: TokenMap,
  refs: Record<string, string>,
): Check[] {
  return PAIRS.map((p) => {
    const e = evalPair(p, tokens)
    const required = p.warnBelow ? `${p.min}:1 (${p.warnBelow}:1 ideal)` : `${p.min}:1`
    let title: string
    if (e.status === 'pass') title = `${p.what} is easy to read (${fmtRatio(e.ratio)}).`
    else if (e.reason === 'wcag')
      title = p.warnOnly
        ? `${p.what} are faint (${fmtRatio(e.ratio)}, ${p.min}:1 recommended for inputs).`
        : `${p.what} is hard to read (${fmtRatio(e.ratio)}, needs ${p.min}:1).`
    else if (e.reason === 'aaa')
      title = `${p.what} passes, but is below the enhanced level (${fmtRatio(e.ratio)}; ${p.warnBelow}:1 is ideal for long reading).`
    else
      title = `${p.what} passes WCAG (${fmtRatio(e.ratio)}) but the newer APCA measure says it is weak (Lc ${Math.round(e.lc)}, aim for ${p.apcaMin}).`
    return {
      id: `contrast-${p.id}`,
      group: 'contrast',
      status: e.status,
      title,
      why: p.why,
      measured: `${fmtRatio(e.ratio)} · Lc ${Math.round(e.lc)}`,
      required: `${required} · Lc ${p.apcaMin}`,
      swatches: [tokens[p.fg], tokens[p.bg]],
      tokens: [p.fg, p.bg],
      fix: e.status === 'pass' ? undefined : contrastFix(ctx, theme, overrides, refs, tokens, p),
    } satisfies Check
  })
}

function cvdChecks(
  ctx: TokenContext,
  theme: ThemeMode,
  overrides: Record<string, string>,
  tokens: TokenMap,
  refs: Record<string, string>,
): Check[] {
  const checks: Check[] = []
  const states = ['success', 'destructive', 'warning'] as const
  const stateMin = (t: TokenMap) => minPairwiseDelta(states.map((s) => t[s]))
  const st = stateMin(tokens)
  let stateFix: Fix | undefined
  if (st.min < 0.1) {
    // success darker, warning lighter, smallest total move first
    const sRef = parseRef(refs.success)
    const wRef = parseRef(refs.warning)
    if (sRef && wRef) {
      const si = stepIndex(sRef.step)
      const wi = stepIndex(wRef.step)
      outer: for (let total = 1; total <= 6; total++) {
        for (let a = 0; a <= total; a++) {
          const b = total - a
          if (si + a >= STEPS.length || wi - b < 0) continue
          const ov = {
            ...overrides,
            success: `success-${STEPS[si + a]}`,
            warning: `warning-${STEPS[wi - b]}`,
          }
          const { tokens: t } = resolveTokens(ctx, theme, ov)
          if (stateMin(t).min >= 0.1) {
            stateFix = {
              kind: 'override',
              label: 'Separate state colours by lightness',
              changes: [
                { theme, token: 'success', value: ov.success },
                { theme, token: 'warning', value: ov.warning },
              ],
            }
            break outer
          }
        }
      }
    }
  }
  const pairName = (i: number) => TOKEN_LABEL[states[i]]
  checks.push({
    id: 'cvd-states',
    group: 'cvd',
    status: st.min >= 0.1 ? 'pass' : 'fail',
    title:
      st.min >= 0.1
        ? 'Success, warning and error colours stay distinct for colour-blind users.'
        : `The ${pairName(st.where!.i)} and ${pairName(st.where!.j)} look almost the same for ${CVD_LABEL[st.where!.type]} vision (ΔE ${st.min.toFixed(3)}, needs 0.10).`,
    why: 'About 1 in 12 men and 1 in 200 women have some colour-vision deficiency. If states only differ by hue, they cannot tell "saved" from "failed". Always pair state colours with an icon or text too.',
    measured: `ΔE ${st.min.toFixed(3)}`,
    required: 'ΔE 0.10',
    swatches: states.map((s) => tokens[s]),
    tokens: [...states],
    fix: stateFix,
  })

  const charts = [1, 2, 3, 4, 5].map((i) => tokens[`chart-${i}`])
  const ch = minPairwiseDelta(charts)
  checks.push({
    id: 'cvd-charts',
    group: 'cvd',
    status: ch.min >= 0.08 ? 'pass' : 'warn',
    title:
      ch.min >= 0.08
        ? 'Chart colours stay distinguishable for colour-blind users.'
        : `Chart colours ${ch.where!.i + 1} and ${ch.where!.j + 1} are hard to tell apart for ${CVD_LABEL[ch.where!.type]} vision.`,
    why: 'Charts often rely on colour alone to match a line to its legend. Add direct labels or patterns when series are close.',
    measured: `ΔE ${ch.min.toFixed(3)}`,
    required: 'ΔE 0.08',
    swatches: charts,
    tokens: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  })

  let pdMin = Number.POSITIVE_INFINITY
  let pdType = CVD_TYPES[0]
  for (const t of CVD_TYPES) {
    const d = cvdDelta(tokens.primary, tokens.destructive, t)
    if (d < pdMin) {
      pdMin = d
      pdType = t
    }
  }
  checks.push({
    id: 'cvd-primary-destructive',
    group: 'cvd',
    status: pdMin >= 0.08 ? 'pass' : 'warn',
    title:
      pdMin >= 0.08
        ? 'Primary and error buttons look different for colour-blind users.'
        : `Primary and error buttons look alike for ${CVD_LABEL[pdType]} vision.`,
    why: 'If a "Save" and a "Delete" button look the same, people can trigger the wrong action. Use clear labels or icons on destructive buttons.',
    measured: `ΔE ${pdMin.toFixed(3)}`,
    required: 'ΔE 0.08',
    swatches: [tokens.primary, tokens.destructive],
    tokens: ['primary', 'destructive'],
  })
  return checks
}

export interface AuditInput {
  ctx: TokenContext
  config: PaletteConfig
  roles: Partial<Record<RoleKey, Oklch>>
  expectedHues: Partial<Record<RoleKey, number>>
  reduced: Partial<Record<ScaleKey, Partial<Record<Step, number>>>>
  collisions: string[]
  saturation: number
}

function scaleChecks(input: AuditInput): Check[] {
  const { ctx, reduced } = input
  const checks: Check[] = []
  const names = Object.keys(ctx.scales) as ScaleKey[]
  const nonMono: string[] = []
  const tooClose: string[] = []
  for (const n of names) {
    const s = ctx.scales[n]!
    for (let i = 1; i < STEPS.length; i++) {
      const a = s[STEPS[i - 1]]
      const b = s[STEPS[i]]
      if (!(b.l < a.l)) nonMono.push(`${n} ${STEPS[i - 1]}→${STEPS[i]}`)
      if (deltaE(a, b) < 0.02) tooClose.push(`${n} ${STEPS[i - 1]}/${STEPS[i]}`)
    }
  }
  checks.push({
    id: 'scale-monotonic',
    group: 'scales',
    status: nonMono.length ? 'warn' : 'pass',
    title: nonMono.length
      ? `Some shades are out of order: ${nonMono.slice(0, 3).join(', ')}.`
      : 'Every shade gets steadily darker from 50 to 950.',
    why: 'Developers expect a higher number to mean a darker shade. Out-of-order shades lead to wrong choices and broken hover states.',
  })
  checks.push({
    id: 'scale-distinct',
    group: 'scales',
    status: tooClose.length ? 'warn' : 'pass',
    title: tooClose.length
      ? `Some neighbouring shades are nearly identical: ${tooClose.slice(0, 3).join(', ')}.`
      : 'Neighbouring shades are clearly different from each other.',
    why: 'If two shades look the same, hover and active states will not be visible.',
  })
  const gamutHit: string[] = []
  for (const [n, steps] of Object.entries(reduced)) {
    if (Object.values(steps ?? {}).some((v) => (v ?? 0) > 0.3)) gamutHit.push(n)
  }
  let gamutFix: Fix | undefined
  if (gamutHit.length) {
    gamutFix = gamutHit.includes('neutral')
      ? {
          kind: 'config',
          label: 'Reduce grey warmth',
          patch: { neutralTint: Math.max(0, input.config.neutralTint - 0.25) },
        }
      : {
          kind: 'config',
          label: 'Reduce vividness',
          patch: { saturation: Math.max(0, input.saturation - 0.1) },
        }
  }
  checks.push({
    id: 'scale-gamut',
    group: 'scales',
    status: gamutHit.length ? 'warn' : 'pass',
    title: gamutHit.length
      ? `${gamutHit.join(', ')} cannot hold this vividness on standard screens, so some shades were dulled.`
      : 'All shades fit on standard screens without being dulled.',
    why: 'Screens can only show so much colour. When a shade is too intense, it is dulled automatically, which can make the scale look uneven.',
    fix: gamutFix,
  })
  return checks
}

function harmonyChecks(input: AuditInput, tokens: TokenMap, refs: Record<string, string>): Check[] {
  const { roles, expectedHues, config, collisions } = input
  const checks: Check[] = []
  const custom = (Object.keys(expectedHues) as RoleKey[]).filter(
    (r) => roles[r] && config.locks[r] && hueDistance(roles[r]!.h, expectedHues[r]!) > 5,
  )
  checks.push({
    id: 'harmony-match',
    group: 'harmony',
    status: custom.length ? 'info' : 'pass',
    title: custom.length
      ? `Custom colour relationship: ${custom.join(', ')} ${custom.length > 1 ? 'are' : 'is'} locked off the ${config.harmony.replace('-', ' ')} pattern.`
      : `Colours follow the ${config.harmony.replace('-', ' ')} relationship.`,
    why: 'Colour relationships (harmonies) are proven patterns for colours that look good together. Going custom is fine, just a conscious choice.',
  })

  const primary = roles.primary!
  const off: string[] = []
  for (const r of ['secondary', 'accent', 'extra'] as const) {
    const c = roles[r]
    if (!c || config.harmony === 'monochromatic') continue
    const lOk = Math.abs(c.l - primary.l) <= 0.08
    const cOk = primary.c < 0.02 || Math.abs(c.c - primary.c) / Math.max(c.c, primary.c) <= 0.25
    if (!lOk || !cOk) off.push(r)
  }
  checks.push({
    id: 'harmony-balance',
    group: 'harmony',
    status: off.length ? 'warn' : 'pass',
    title: off.length
      ? `${cap(off.join(', '))} ${off.length > 1 ? 'feel' : 'feels'} heavier or lighter than the primary colour.`
      : 'Brand colours have balanced visual weight.',
    why: 'Colours with very different brightness or intensity compete for attention. Balanced weight looks intentional and calm.',
    swatches: [primary, ...off.map((r) => roles[r as RoleKey]!)],
  })

  const vib: string[] = []
  for (const p of PAIRS) {
    if (p.warnOnly || p.id === 'ring') continue
    const a = tokens[p.fg]
    const b = tokens[p.bg]
    if (a.c > 0.15 && b.c > 0.15 && Math.abs(a.l - b.l) < 0.25) vib.push(p.what.toLowerCase())
  }
  checks.push({
    id: 'harmony-vibration',
    group: 'harmony',
    status: vib.length ? 'warn' : 'pass',
    title: vib.length
      ? `Vivid colours on vivid colours may appear to vibrate: ${vib.join(', ')}.`
      : 'No vivid-on-vivid text that would visually vibrate.',
    why: 'Two intense colours of similar brightness side by side make edges shimmer, which is tiring to read.',
  })

  const neutralSurfaces = ['background', 'card', 'muted', 'border']
  const colourful = neutralSurfaces.filter((t) => tokens[t].c > 0.04)
  checks.push({
    id: 'harmony-60-30-10',
    group: 'harmony',
    status: colourful.length ? 'warn' : 'pass',
    title: colourful.length
      ? `Large surfaces use strong colour (${colourful.map((t) => TOKEN_LABEL[t]).join(', ')}), so the brand colour loses impact.`
      : 'Surfaces stay neutral and brand colour is used sparingly (60-30-10).',
    why: 'The 60-30-10 rule: about 60% neutral surfaces, 30% supporting tones, 10% brand colour. Used sparingly, the brand colour draws the eye to what matters.',
    tokens: neutralSurfaces,
  })
  void refs

  if (collisions.length) {
    checks.push({
      id: 'harmony-collision',
      group: 'harmony',
      status: 'info',
      title: `Your brand hue is close to the ${collisions.map((c) => TOKEN_LABEL[c]).join(' and ')}; it was shifted to stay distinct.`,
      why: 'If your brand is red, an error message could be mistaken for a branded element. The tool moves the state colour to keep them apart.',
    })
  }
  return checks
}

export function audit(
  input: AuditInput,
  theme: ThemeMode,
): AuditReport & { refs: Record<string, string>; tokens: TokenMap } {
  const overrides = input.config.overrides[theme] ?? {}
  const { tokens, refs } = resolveTokens(input.ctx, theme, overrides)
  const checks = [
    ...contrastChecks(input.ctx, theme, overrides, tokens, refs),
    ...scaleChecks(input),
    ...cvdChecks(input.ctx, theme, overrides, tokens, refs),
    ...harmonyChecks(input, tokens, refs),
  ]
  const score = Math.max(0, 100 - checks.reduce((s, c) => s + PENALTY[c.status], 0))
  return { checks, score, tokens, refs }
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Production ready'
  if (score >= 70) return 'Needs attention'
  return 'Not ready'
}

export function applyFix(config: PaletteConfig, fix: Fix): PaletteConfig {
  if (fix.kind === 'config') return { ...config, ...fix.patch }
  const overrides = { light: { ...config.overrides.light }, dark: { ...config.overrides.dark } }
  for (const ch of fix.changes) overrides[ch.theme][ch.token] = ch.value
  return { ...config, overrides }
}

export const hexOf = toHex
