export type Harmony =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'
  | 'square'

export const HARMONIES: Harmony[] = [
  'monochromatic',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'square',
]

export type RoleKey = 'primary' | 'secondary' | 'accent' | 'extra'
export const ROLE_KEYS: RoleKey[] = ['primary', 'secondary', 'accent', 'extra']

export type SemanticKey = 'success' | 'warning' | 'destructive' | 'info'
export const SEMANTIC_KEYS: SemanticKey[] = ['success', 'warning', 'destructive', 'info']

export type ScaleKey = RoleKey | 'neutral' | SemanticKey

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type Step = (typeof STEPS)[number]

export type Gamut = 'srgb' | 'p3'
export type NeutralTemp = 'brand' | 'warm' | 'cool' | 'pure'
export type ThemeMode = 'light' | 'dark'

export interface PaletteConfig {
  /** hex, 6 digits, lowercase, no '#' */
  seed: string
  harmony: Harmony
  /** -15..15 degrees */
  spread: number
  /** 0..1, or null = derived from the seed (auto) */
  saturation: number | null
  /** 0..20 degrees */
  hueShift: number
  /** 0..1 */
  neutralTint: number
  neutralTemp: NeutralTemp
  gamut: Gamut
  pureBackground: boolean
  /** role -> locked hex (no '#'); acts as that role's seed */
  locks: Partial<Record<RoleKey, string>>
  /** token name -> "primary-700" style ref, "white", or hex (no '#') */
  overrides: Record<ThemeMode, Record<string, string>>
}

export interface Oklch {
  l: number
  c: number
  h: number
}

export type Scale = Record<Step, Oklch>

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info'
export type CheckGroup = 'contrast' | 'scales' | 'cvd' | 'harmony'

export type Fix =
  | { kind: 'override'; label: string; changes: { theme: ThemeMode; token: string; value: string }[] }
  | { kind: 'config'; label: string; patch: Partial<Pick<PaletteConfig, 'saturation' | 'neutralTint'>> }

export interface Check {
  id: string
  group: CheckGroup
  status: CheckStatus
  /** Plain-language sentence describing the result. */
  title: string
  /** Why it matters (shown expandable). */
  why: string
  measured?: string
  required?: string
  swatches?: Oklch[]
  /** Tokens to highlight in the preview on hover. */
  tokens?: string[]
  fix?: Fix
}

export interface AuditReport {
  checks: Check[]
  score: number
}

export type TokenMap = Record<string, Oklch>

export interface PaletteResult {
  config: PaletteConfig
  /** effective saturation used (auto resolved) */
  saturation: number
  roles: Partial<Record<RoleKey, Oklch>>
  scales: Partial<Record<ScaleKey, Scale>>
  anchors: Partial<Record<RoleKey, Step>>
  /** per scale, per step: fraction of chroma lost to gamut mapping (0..1) */
  reduced: Partial<Record<ScaleKey, Partial<Record<Step, number>>>>
  tokens: Record<ThemeMode, TokenMap>
  /** token -> source ref ("neutral-50", "white", "primary-600", "#hex") */
  refs: Record<ThemeMode, Record<string, string>>
  audit: { light: AuditReport; dark: AuditReport; score: number }
  /** role/token name -> plain-language derivation */
  reasons: Record<string, string>
  hints: { id: string; text: string }[]
}
