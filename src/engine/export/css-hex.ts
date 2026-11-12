import type { PaletteResult } from '../types'
import { STEPS } from '../types'
import { header, scaleEntries, toHex, tokenEntries } from './common'

/** Plain CSS custom properties in hex, for non-Tailwind projects. */
export function exportCssHex(result: PaletteResult): string {
  const scales = scaleEntries(result).flatMap(([name, colors]) => [
    ...colors.map((c, i) => `  --${name}-${STEPS[i]}: ${toHex(c)};`),
    '',
  ])
  scales.pop()
  const light = tokenEntries(result, 'light').map(([t, c]) => `  --${t}: ${toHex(c)};`)
  const dark = tokenEntries(result, 'dark').map(([t, c]) => `  --${t}: ${toHex(c)};`)
  return `${header(result)}
:root {
  /* Scales */
${scales.join('\n')}

  /* Semantic (light) */
${light.join('\n')}
}

.dark,
[data-theme="dark"] {
${dark.join('\n')}
}
`
}
