# 23palette

One brand colour → a production-ready colour system for Tailwind v4 + shadcn/ui. Fully client-side. Spec: [SPEC.md](SPEC.md).

## Run

```bash
nvm use            # Node 24 (.nvmrc)
bun install
bun run dev        # http://localhost:5173
```

| Script | What |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | Type-check (`tsc -b`) + production build |
| `bun test` | Colour-engine tests (`src/engine/engine.test.ts`) |
| `bun run lint` | Biome |

If `bun run dev` fails with a file-descriptor error on macOS, run Vite with Node instead: `node node_modules/vite/bin/vite.js`.

## Layout

- `src/engine/` — pure TypeScript colour engine (no React). `generate(config)` → scales, shadcn tokens (light + dark), audit, reasons. Exporters in `src/engine/export/`.
- `src/state/` — zustand store (+ zundo undo/redo), URL search schema (zod), library (localStorage).
- `src/components/` — controls, preview scenes, audit, scales/roles, export, library, help (popovers, tour, help dialog).
- `src/content/explanations.ts` — all user-facing explanation copy.

## Deviations from SPEC.md

The spec's raw numbers conflicted with its own acceptance criteria (default ≥ 90, random seeds ≥ 90 after Fix all). Changes, all found by measuring across random seeds:

| Area | Spec | Implemented | Why |
|---|---|---|---|
| `saturation` | number | `number \| null` (null = auto from seed) | "default derived from seed" needs an auto state; URL omits it when auto |
| muted-foreground | N-600 / N-400 | N-700 / N-300 | N-600 on N-100 is 4.34:1 (fails AA) |
| muted (dark) | N-800 | N-900 | N-300 text on N-800 was APCA Lc 59 |
| input (border) | N-200 / N-800 | N-500 / N-600 | 3:1 for essential UI; decorative `border` stays subtle |
| Border check | `border` vs bg, warn | `input` vs bg, warn | WCAG 1.4.11 applies to controls, not dividers |
| destructive | D-600 / D-500 | D-700 / D-600 | dark D-500 failed 4.5:1 with both foregrounds |
| success / warning / info | unspecified | light 400 / 200 / 600, dark 400 / 200 / 400 | lightness ladder keeps states ΔE ≥ 0.13 under all CVD types |
| Dark primary | "anchor − 1, min 400" | one step lighter, at most step 400 | read "min 400" as "no darker than 400" so it reads on dark backgrounds |
| Computed foregrounds | higher WCAG wins | among WCAG-passing candidates, higher APCA wins | WCAG picks white on mid-tones where APCA (and eyes) prefer dark |
| APCA minimum | Lc 60 for fills/links | Lc 45 for button/badge labels and links | per APCA guidance for UI labels; body text keeps 75, muted 60 |
| Semantic saturation | = brand | max(brand, 0.6) | greyish brands made states indistinguishable |
| maxChroma | exact | 0.5% safety margin | memoised rounding pushed some colours just out of gamut |
| Charts | equal L, then ±0.10 | + lightness-ladder permutation search | equal/alternating often failed CVD ΔE 0.08 |

Everything in the spec's v1 scope is built. Items in §14 Future (image extraction, Figma plugin, etc.) are not.
