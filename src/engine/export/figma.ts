import { toRgb255 } from '../color'
import { parseRef } from '../tokens'
import type { Oklch, PaletteResult } from '../types'
import { STEPS } from '../types'
import { scaleEntries, tokenEntries } from './common'

const rgba = (c: Oklch) => {
  const [r, g, b] = toRgb255(c)
  return { r: +(r / 255).toFixed(4), g: +(g / 255).toFixed(4), b: +(b / 255).toFixed(4), a: 1 }
}

/** Figma variables: "Primitives" collection + "Semantic" collection with Light/Dark modes aliasing primitives. */
export function exportFigma(result: PaletteResult): string {
  const primitives = scaleEntries(result).flatMap(([name, colors]) =>
    colors.map((c, i) => ({ name: `${name}/${STEPS[i]}`, type: 'COLOR', values: { Value: rgba(c) } })),
  )
  const val = (theme: 'light' | 'dark', t: string, c: Oklch) => {
    const ref = parseRef(result.refs[theme][t] ?? '')
    return ref
      ? { type: 'VARIABLE_ALIAS', collection: 'Primitives', name: `${ref.scale}/${ref.step}` }
      : rgba(c)
  }
  const dark = Object.fromEntries(tokenEntries(result, 'dark'))
  const semantic = tokenEntries(result, 'light').map(([t, c]) => ({
    name: t.replace(/-/g, '/'),
    type: 'COLOR',
    values: { Light: val('light', t, c), Dark: val('dark', t, dark[t] ?? c) },
  }))
  return `${JSON.stringify(
    {
      collections: [
        { name: 'Primitives', modes: ['Value'], variables: primitives },
        { name: 'Semantic', modes: ['Light', 'Dark'], variables: semantic },
      ],
    },
    null,
    2,
  )}\n`
}
