import type { PaletteResult } from '../types'
import { STEPS } from '../types'
import { type ExportOptions, header, scaleEntries, toHex, value, wantsHexFallback } from './common'

/** Tailwind v4 @theme block with every 50–950 scale. */
export function exportTailwind(result: PaletteResult, opts: ExportOptions): string {
  const fallback = wantsHexFallback(result, opts)
  const lines: string[] = []
  for (const [name, colors] of scaleEntries(result)) {
    colors.forEach((c, i) => {
      lines.push(`--color-${name}-${STEPS[i]}: ${fallback ? toHex(c) : value(c, opts)};`)
    })
    lines.push('')
  }
  lines.pop()
  let out = `${header(result)}\n@theme {\n${lines.map((l) => (l ? `  ${l}` : '')).join('\n')}\n}\n`
  if (fallback) {
    const p3 = scaleEntries(result).flatMap(([name, colors]) =>
      colors.map((c, i) => `    --color-${name}-${STEPS[i]}: ${value(c, opts)};`),
    )
    out += `\n@media (color-gamut: p3) {\n  :root {\n${p3.join('\n')}\n  }\n}\n`
  }
  return out
}
