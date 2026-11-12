import type { PaletteResult } from '../types'
import { type ExportOptions, header, toHex, tokenEntries, value, wantsHexFallback } from './common'

function block(selector: string, lines: string[]) {
  return `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`
}

/** Paste-ready shadcn/ui globals.css section (Tailwind v4). */
export function exportShadcn(result: PaletteResult, opts: ExportOptions): string {
  const fallback = wantsHexFallback(result, opts)
  const vars = (theme: 'light' | 'dark', fmt: 'main' | 'hex') =>
    tokenEntries(result, theme).map(([t, c]) => `--${t}: ${fmt === 'hex' ? toHex(c) : value(c, opts)};`)
  const parts: string[] = [header(result)]
  if (fallback) {
    parts.push(block(':root', ['--radius: 0.625rem;', ...vars('light', 'hex')]))
    parts.push(block('.dark', vars('dark', 'hex')))
    parts.push(
      `@media (color-gamut: p3) {\n${block(':root', vars('light', 'main')).replace(/^/gm, '  ')}\n${block('.dark', vars('dark', 'main')).replace(/^/gm, '  ')}\n}`,
    )
  } else {
    parts.push(block(':root', ['--radius: 0.625rem;', ...vars('light', 'main')]))
    parts.push(block('.dark', vars('dark', 'main')))
  }
  const themeLines = [
    '--radius-sm: calc(var(--radius) - 4px);',
    '--radius-md: calc(var(--radius) - 2px);',
    '--radius-lg: var(--radius);',
    '--radius-xl: calc(var(--radius) + 4px);',
    ...tokenEntries(result, 'light').map(([t]) => `--color-${t}: var(--${t});`),
  ]
  parts.push(block('@theme inline', themeLines))
  return `${parts.join('\n\n')}\n`
}
