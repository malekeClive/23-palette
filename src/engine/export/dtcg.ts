import { parseRef } from '../tokens'
import type { PaletteResult, ThemeMode } from '../types'
import { STEPS } from '../types'
import { scaleEntries, toHex, tokenEntries } from './common'

type Tok = { $type: 'color'; $value: string; $description?: string }

/** W3C Design Tokens Community Group format. Semantic tokens alias primitives where possible. */
export function exportDtcg(result: PaletteResult): string {
  const primitives: Record<string, Record<string, Tok>> = {}
  for (const [name, colors] of scaleEntries(result)) {
    primitives[name] = {}
    colors.forEach((c, i) => {
      primitives[name][String(STEPS[i])] = { $type: 'color', $value: toHex(c) }
    })
  }
  const semantic = (theme: ThemeMode) => {
    const out: Record<string, Tok> = {}
    for (const [t, c] of tokenEntries(result, theme)) {
      const ref = parseRef(result.refs[theme][t] ?? '')
      out[t] = {
        $type: 'color',
        $value: ref ? `{color.${ref.scale}.${ref.step}}` : toHex(c),
      }
      const reason = result.reasons[`${theme}:${t}`]
      if (reason) out[t].$description = reason
    }
    return out
  }
  return `${JSON.stringify({ color: primitives, semantic: { light: semantic('light'), dark: semantic('dark') } }, null, 2)}\n`
}
