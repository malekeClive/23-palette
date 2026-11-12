import { hexToOklch, toHex, WHITE } from './color'
import { bestForeground, wcag as contrastRatio } from './contrast'
import { stepIndex } from './scale'
import {
  type Oklch,
  type RoleKey,
  type Scale,
  type ScaleKey,
  STEPS,
  type Step,
  type ThemeMode,
  type TokenMap,
} from './types'

export const SHADCN_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const

export const EXTRA_TOKENS = [
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
] as const

export const ALL_TOKENS: string[] = [...SHADCN_TOKENS, ...EXTRA_TOKENS]

/** Foreground tokens computed as white vs N-950 (whichever reads better), unless overridden. */
export const COMPUTED_FOREGROUNDS: Record<string, string> = {
  'primary-foreground': 'primary',
  'destructive-foreground': 'destructive',
  'success-foreground': 'success',
  'warning-foreground': 'warning',
  'info-foreground': 'info',
  'sidebar-primary-foreground': 'sidebar-primary',
}

/** Plain-language names for tokens (used in explanations & audit copy). */
export const TOKEN_LABEL: Record<string, string> = {
  background: 'page background',
  foreground: 'body text',
  card: 'card surface',
  'card-foreground': 'card text',
  popover: 'popover surface',
  'popover-foreground': 'popover text',
  primary: 'primary colour',
  'primary-foreground': 'text on primary',
  secondary: 'secondary surface',
  'secondary-foreground': 'text on secondary',
  muted: 'muted surface',
  'muted-foreground': 'muted text',
  accent: 'accent surface',
  'accent-foreground': 'text on accent',
  destructive: 'error colour',
  'destructive-foreground': 'text on error',
  success: 'success colour',
  'success-foreground': 'text on success',
  warning: 'warning colour',
  'warning-foreground': 'text on warning',
  info: 'info colour',
  'info-foreground': 'text on info',
  border: 'borders',
  input: 'input borders',
  ring: 'focus ring',
}

export interface TokenContext {
  scales: Partial<Record<ScaleKey, Scale>>
  anchors: Partial<Record<RoleKey, Step>>
  charts: Record<ThemeMode, Oklch[]>
  pureBackground: boolean
}

export function parseRef(ref: string): { scale: ScaleKey; step: Step } | null {
  const m = /^([a-z]+)-(\d+)$/.exec(ref)
  if (!m) return null
  const step = Number(m[2]) as Step
  if (!STEPS.includes(step)) return null
  return { scale: m[1] as ScaleKey, step }
}

export function resolveRef(ctx: TokenContext, ref: string): Oklch | null {
  if (ref === 'white') return WHITE
  if (/^[0-9a-f]{6}$/i.test(ref)) return hexToOklch(ref)
  const p = parseRef(ref)
  if (!p) return null
  return ctx.scales[p.scale]?.[p.step] ?? null
}

/** Primary step: anchor (light) or one lighter, min 400 (dark); walk until some fg reaches 4.5:1. */
export function primaryStep(ctx: TokenContext, theme: ThemeMode): Step {
  const scale = ctx.scales.primary!
  const neutral = ctx.scales.neutral!
  const anchor = ctx.anchors.primary ?? 500
  let idx = stepIndex(anchor)
  if (theme === 'dark') idx = Math.max(0, Math.min(idx - 1, stepIndex(400)))
  const reachable = (i: number) => {
    const bg = scale[STEPS[i]]
    const fg = bestForeground(bg, [{ color: WHITE }, { color: neutral[950] }])
    return wcagOk(fg.color, bg)
  }
  const dir = theme === 'light' ? 1 : -1
  let i = idx
  while (i >= 0 && i < STEPS.length) {
    if (reachable(i)) return STEPS[i]
    i += dir
  }
  return STEPS[idx]
}

function wcagOk(a: Oklch, b: Oklch) {
  return contrastRatio(a, b) >= 4.5
}

export function defaultRefs(ctx: TokenContext, theme: ThemeMode): Record<string, string> {
  const p = primaryStep(ctx, theme)
  const hasAccent = !!ctx.scales.accent
  const accent = hasAccent ? 'accent' : 'primary'
  if (theme === 'light') {
    return {
      background: ctx.pureBackground ? 'white' : 'neutral-50',
      foreground: 'neutral-950',
      card: 'white',
      'card-foreground': 'neutral-950',
      popover: 'white',
      'popover-foreground': 'neutral-950',
      primary: `primary-${p}`,
      secondary: 'neutral-100',
      'secondary-foreground': 'neutral-900',
      muted: 'neutral-100',
      'muted-foreground': 'neutral-700',
      accent: `${accent}-100`,
      'accent-foreground': `${accent}-900`,
      destructive: 'destructive-700',
      border: 'neutral-200',
      input: 'neutral-500',
      ring: 'primary-500',
      sidebar: 'neutral-100',
      'sidebar-foreground': 'neutral-950',
      'sidebar-primary': `primary-${p}`,
      'sidebar-accent': 'neutral-200',
      'sidebar-accent-foreground': 'neutral-900',
      'sidebar-border': 'neutral-200',
      'sidebar-ring': 'primary-500',
      success: 'success-400',
      warning: 'warning-200',
      info: 'info-600',
    }
  }
  return {
    background: 'neutral-950',
    foreground: 'neutral-50',
    card: 'neutral-900',
    'card-foreground': 'neutral-50',
    popover: 'neutral-900',
    'popover-foreground': 'neutral-50',
    primary: `primary-${p}`,
    secondary: 'neutral-800',
    'secondary-foreground': 'neutral-50',
    muted: 'neutral-900',
    'muted-foreground': 'neutral-300',
    accent: `${accent}-900`,
    'accent-foreground': `${accent}-100`,
    destructive: 'destructive-600',
    border: 'neutral-800',
    input: 'neutral-600',
    ring: 'primary-400',
    sidebar: 'neutral-900',
    'sidebar-foreground': 'neutral-50',
    'sidebar-primary': `primary-${p}`,
    'sidebar-accent': 'neutral-800',
    'sidebar-accent-foreground': 'neutral-50',
    'sidebar-border': 'neutral-800',
    'sidebar-ring': 'primary-400',
    success: 'success-400',
    warning: 'warning-200',
    info: 'info-400',
  }
}

export interface ResolvedTokens {
  tokens: TokenMap
  refs: Record<string, string>
}

/** Default mapping → overrides → computed foregrounds (§5). */
export function resolveTokens(
  ctx: TokenContext,
  theme: ThemeMode,
  overrides: Record<string, string> = {},
): ResolvedTokens {
  const refs: Record<string, string> = { ...defaultRefs(ctx, theme) }
  for (const [k, v] of Object.entries(overrides)) {
    if (resolveRef(ctx, v)) refs[k] = v
  }
  const tokens: TokenMap = {}
  for (const [k, ref] of Object.entries(refs)) {
    const c = resolveRef(ctx, ref)
    if (c) tokens[k] = c
  }
  const n950 = ctx.scales.neutral![950]
  for (const [fg, bg] of Object.entries(COMPUTED_FOREGROUNDS)) {
    if (overrides[fg] && tokens[fg]) continue
    const pick = bestForeground(tokens[bg], [
      { color: WHITE, ref: 'white' },
      { color: n950, ref: 'neutral-950' },
    ])
    tokens[fg] = pick.color
    refs[fg] = pick.ref
  }
  ctx.charts[theme].forEach((c, i) => {
    tokens[`chart-${i + 1}`] = c
    refs[`chart-${i + 1}`] = `chart`
  })
  return { tokens, refs }
}

/** Human-readable source for a ref, e.g. "neutral 50" or "#4f46e5". */
export function describeRef(ref: string, color?: Oklch): string {
  if (ref === 'white') return 'white'
  if (ref === 'chart') return 'chart colour'
  const p = parseRef(ref)
  if (p) return `${p.scale} ${p.step}`
  return color ? toHex(color) : `#${ref}`
}
