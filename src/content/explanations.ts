import type { Harmony } from '@/engine/types'

/** All user-facing explanation copy lives here (§8.10). */
export interface Explanation {
  title: string
  /** what it does — one sentence */
  what: string
  /** when to change it — one sentence */
  when?: string
}

export const EXPLAIN: Record<string, Explanation> = {
  seed: {
    title: 'Brand colour',
    what: 'Your main brand colour. Everything else is built from it, and it appears unchanged in the final palette.',
    when: 'Paste your existing brand colour, or press Space to explore random good ones.',
  },
  harmony: {
    title: 'Colour relationship',
    what: 'How your other colours relate to the main one on the colour wheel. Closer together feels calm; further apart feels energetic.',
    when: 'Hover each option to preview it. Split-complementary is a safe, lively default.',
  },
  roles: {
    title: 'Brand colours',
    what: 'The colours the relationship picked for you. Primary is your brand; the others support it.',
    when: 'Lock a colour you like so it stays while you shuffle the rest. Editing a colour locks it automatically.',
  },
  lock: {
    title: 'Lock',
    what: 'Keep this colour while you shuffle the rest.',
  },
  advanced: {
    title: 'Fine-tuning',
    what: 'Optional controls for vividness, shading and greys. The defaults already produce a production-ready palette.',
  },
  vividness: {
    title: 'Vividness',
    what: 'How intense the colours are. Lower is calmer and more corporate; higher is more playful.',
    when: '"Auto" matches the intensity of your brand colour. Technical term: chroma.',
  },
  naturalShading: {
    title: 'Natural shading',
    what: 'Light tints lean slightly warm and dark shades slightly cool, the way real light behaves. Makes scales look less flat.',
    when: 'Set to 0 for strictly one-hue scales. Technical term: hue shift.',
  },
  spread: {
    title: 'Spread',
    what: 'How far apart the supporting colours sit on the colour wheel.',
    when: 'Tighten for a calmer look, widen for more contrast between colours.',
  },
  greyWarmth: {
    title: 'Grey warmth',
    what: 'Adds a hint of your brand colour to greys so backgrounds and text feel part of the same family.',
    when: 'Use 0 for pure greys. Technical term: neutral tint.',
  },
  greyTemp: {
    title: 'Grey tone',
    what: 'Which colour tints your greys: your brand hue, warm (beige), cool (blue-grey) or none.',
  },
  pureBackground: {
    title: 'White background',
    what: 'Use pure white for the light-mode page instead of a very light tinted grey.',
  },
  p3: {
    title: 'Wide colour (P3)',
    what: 'Uses the wider colour range of modern screens for more vivid colours. Older screens get an automatic fallback.',
    when: 'Turn on if your audience mostly uses recent phones and Macs.',
  },
  wheel: {
    title: 'Colour wheel',
    what: 'Shows where each brand colour sits. Drag the big dot to rotate the whole palette; drag another dot to set (and lock) that colour.',
  },
  preview: {
    title: 'Live preview',
    what: 'Your palette applied to real interface components, so you judge colours in context rather than as swatches.',
    when: 'Switch scenes and themes. Use the colour-blindness simulation to see what others see.',
  },
  cvdSim: {
    title: 'Colour blindness simulation',
    what: 'Shows the preview as people with common colour-vision differences see it. About 1 in 12 men see some colours differently.',
  },
  scales: {
    title: 'Shades',
    what: "Each colour comes in 11 shades, from 50 (lightest) to 950 (darkest), matching Tailwind's naming. Lighter shades are for backgrounds, darker for text.",
    when: 'Click a swatch to copy its hex; Alt+click copies oklch().',
  },
  anchor: {
    title: 'Your exact colour',
    what: 'This is your exact brand colour. The rest of the scale is built around it.',
  },
  tokens: {
    title: 'Roles',
    what: "Roles tell your UI which shade to use where — for example 'primary' for main buttons and 'muted' for subtle backgrounds. These match shadcn/ui names.",
    when: 'Hover a role to see why that colour was picked.',
  },
  score: {
    title: 'Health score',
    what: 'How ready this palette is for a real product. It checks readability, colour-blind safety and balance. 90+ means safe to ship.',
    when: 'Click Fix on any issue, or Fix all. Every fix can be undone.',
  },
  contrast: {
    title: 'Readability',
    what: 'Whether text is readable against its background. 4.5:1 is the standard minimum for normal text (WCAG AA); 7:1 is the enhanced level (AAA).',
  },
  apca: {
    title: 'APCA',
    what: 'A newer, more accurate readability measure (Lc, 0–106). Shown for reference; it can only raise a warning, never a failure.',
  },
  scalesCheck: {
    title: 'Shade quality',
    what: 'Checks that shades go steadily from light to dark, are visibly different from their neighbours, and fit on standard screens.',
  },
  colourBlind: {
    title: 'Colour blindness check',
    what: 'About 1 in 12 men see some colours differently. This checks that success, warning and error colours can still be told apart.',
  },
  balance: {
    title: 'Harmony & balance',
    what: 'The 60-30-10 rule: mostly neutral surfaces, some supporting tones, a small amount of brand colour so it keeps its impact.',
  },
  library: {
    title: 'Library',
    what: 'Palettes you saved in this browser. Nothing leaves your device.',
  },
  'export.shadcn': {
    title: 'shadcn CSS',
    what: 'Paste into globals.css, replacing the existing :root, .dark and @theme inline blocks. Includes success, warning and info extras.',
  },
  'export.tailwind': {
    title: 'Tailwind scales',
    what: 'Paste into your main CSS file to get classes like bg-primary-500 and text-neutral-700 for every shade.',
  },
  'export.css': {
    title: 'CSS variables',
    what: 'Plain hex custom properties for any project without Tailwind. Add class "dark" (or data-theme="dark") to switch themes.',
  },
  'export.dtcg': {
    title: 'Design tokens',
    what: 'W3C design-token JSON for Style Dictionary, Tokens Studio and similar tools. Roles reference the shade they come from.',
  },
  'export.figma': {
    title: 'Figma variables',
    what: 'JSON with a Primitives collection (shades) and a Semantic collection (Light/Dark modes) that aliases them. Import with a variables-import plugin.',
  },
}

export const HARMONY_EXPLAIN: Record<Harmony, { label: string; what: string; goodFor: string }> = {
  monochromatic: {
    label: 'Mono',
    what: 'One hue in different strengths. Elegant and very safe.',
    goodFor: 'Good for minimal brands, tools and documentation.',
  },
  analogous: {
    label: 'Analogous',
    what: 'Neighbours on the wheel. Calm and cohesive, low risk.',
    goodFor: 'Good for wellness, nature and content-heavy sites.',
  },
  complementary: {
    label: 'Complementary',
    what: 'Opposite on the wheel. Maximum contrast — great for a call-to-action that must stand out.',
    goodFor: 'Good for marketing pages and bold brands.',
  },
  'split-complementary': {
    label: 'Split',
    what: 'The two neighbours of the opposite colour. Lively but easier to balance than complementary.',
    goodFor: 'Good for most products — a safe, energetic default.',
  },
  triadic: {
    label: 'Triadic',
    what: 'Three evenly spaced colours. Playful and balanced.',
    goodFor: 'Good for consumer apps, kids and creative brands.',
  },
  tetradic: {
    label: 'Tetradic',
    what: 'Two complementary pairs in a rectangle. Rich, needs restraint.',
    goodFor: 'Good for dashboards and data with many categories.',
  },
  square: {
    label: 'Square',
    what: 'Four colours evenly spaced. Very diverse and vibrant.',
    goodFor: 'Good for games, illustration and colourful data.',
  },
}

export const GROUP_EXPLAIN = {
  contrast: 'contrast',
  scales: 'scalesCheck',
  cvd: 'colourBlind',
  harmony: 'balance',
} as const

export const GROUP_LABEL = {
  contrast: 'Readability',
  scales: 'Shades',
  cvd: 'Colour blindness',
  harmony: 'Harmony & balance',
} as const

export const GLOSSARY: { term: string; def: string }[] = [
  {
    term: 'OKLCH',
    def: 'A way of describing colour by Lightness, Chroma (intensity) and Hue that matches how people perceive it. Equal lightness numbers look equally bright, which makes scales consistent.',
  },
  {
    term: 'Hue',
    def: 'The colour family, as an angle on the colour wheel: 0° red, 90° yellow, 150° green, 250° blue.',
  },
  {
    term: 'Chroma',
    def: 'How intense or colourful a colour is. 0 is grey. Shown in this tool as "Vividness".',
  },
  {
    term: 'Contrast ratio',
    def: 'How different two colours are in brightness, from 1:1 (identical) to 21:1 (black on white).',
  },
  {
    term: 'WCAG AA / AAA',
    def: 'The web accessibility standard. AA needs 4.5:1 for normal text and 3:1 for large text and UI parts; AAA needs 7:1.',
  },
  {
    term: 'APCA',
    def: 'Accessible Perceptual Contrast Algorithm: a newer readability measure (Lc) that accounts for dark mode and font weight better than WCAG 2.',
  },
  {
    term: 'Gamut',
    def: 'The range of colours a screen can show. Colours outside it are dulled automatically.',
  },
  {
    term: 'P3',
    def: 'The wider gamut of modern phones and Macs — about 25% more colours than standard sRGB.',
  },
  {
    term: 'Token',
    def: 'A named colour role, like "primary" or "muted-foreground", that your components use instead of raw colour values.',
  },
  {
    term: 'CVD',
    def: 'Colour-vision deficiency ("colour blindness"). Protanopia (red-blind), deuteranopia (green-blind) and tritanopia (blue-blind) are the main types.',
  },
  {
    term: '60-30-10',
    def: 'A balance rule: ~60% neutral surfaces, ~30% supporting tones, ~10% accent colour.',
  },
]

export const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: '1. The colour wheel & relationships',
    body: 'Your brand colour sits somewhere on the colour wheel. Harmonies (colour relationships) are proven patterns for picking partner colours: neighbours feel calm, opposites feel energetic. Partner colours are matched in brightness so none of them shouts louder than the others.',
  },
  {
    title: '2. Shades',
    body: 'Every colour becomes 11 shades from 50 to 950. The shades are spaced by perceived brightness (OKLCH), so "500" looks equally bright in blue and in yellow. Your exact brand colour is kept at the shade closest to its brightness.',
  },
  {
    title: '3. Roles',
    body: 'Components never use shades directly; they use roles like background, primary and muted-foreground. This tool maps shades to roles for light and dark mode, and picks white or near-black text for each fill automatically.',
  },
  {
    title: '4. Readability',
    body: 'Every text/background pair is checked against WCAG 2.2 (pass/fail) and APCA (advisory). If something fails, the Fix button moves that role to the nearest shade that passes, without touching your brand colour.',
  },
  {
    title: '5. Colour-blind safety',
    body: 'The tool simulates the three main types of colour blindness and checks that success, warning and error look different — mainly by giving them different brightness, which everyone can see.',
  },
]

export const TOUR_STEPS: { target: string; title: string; body: string }[] = [
  {
    target: 'seed',
    title: 'Start with your brand colour',
    body: 'Paste a hex, rgb() or any CSS colour. Everything else is generated from it.',
  },
  {
    target: 'generate',
    title: 'Press Space to explore',
    body: 'Each press gives a new well-balanced palette. Lock colours you like and they stay put.',
  },
  {
    target: 'score',
    title: 'Check the score',
    body: 'It checks readability and colour-blind safety. One click fixes most issues.',
  },
  {
    target: 'export',
    title: 'Export when it says Production ready',
    body: 'Copy CSS for shadcn/ui, Tailwind scales or design tokens.',
  },
]
