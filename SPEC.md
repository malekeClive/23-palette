# Palette — Product & Technical Spec

> Hand-off document for implementation. Everything here is a decision, not a suggestion, unless marked **(open)**.
> Where a number is given (lightness targets, thresholds, weights), implement it exactly; they are tuned to work together.

## 1. Purpose

A single-page web tool that lets a frontend developer/designer go from **one brand colour to a complete, production-ready colour system in under a minute**.

"Production-ready" means the output:

1. is built on colour theory (harmony rules, perceptually uniform scales, tinted neutrals, 60-30-10 distribution),
2. passes accessibility checks (WCAG 2.2 contrast, APCA, colour-vision-deficiency safety),
3. covers every role a real UI needs (brand, neutral, semantic states, charts, light + dark themes),
4. can be pasted straight into a Tailwind v4 + shadcn/ui project with no manual editing.

### Non-goals (v1)

- No accounts, backend, database, or analytics. Fully client-side.
- No AI/LLM generation.
- No image-to-palette extraction (listed under §13 Future).
- No Figma plugin (JSON export only).

## 2. Target user & core workflow

User: frontend dev / designer who knows what a good palette looks like but loses time tuning one by hand.

The whole app is one screen, one loop:

1. **Seed** — enter/pick a brand colour (or press `Space` for a random good one).
2. **Generate** — app instantly derives the full system (harmony accents, 11-step scales, neutrals, semantics, light/dark tokens).
3. **Judge** — see it applied to real shadcn UI in a live preview, alongside a health score.
4. **Tune** — change harmony, lock colours you like, shuffle the rest, nudge sliders. Any failing check has a one-click **Fix**.
5. **Export** — copy CSS / Tailwind / JSON tokens.

No step requires leaving the page or opening a modal, except Export (a dialog).

## 3. Tech stack

| Concern | Choice |
|---|---|
| Runtime / package manager | **Bun** (`bun install`, `bun run dev`, `bun test`) |
| Node version | **24** — commit `.nvmrc` containing `24`; `engines.node: ">=24"` |
| Build | Vite + React 19 + TypeScript (strict) |
| Routing | **TanStack Router**, file-based routes, `@tanstack/router-plugin/vite` |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`, CSS-first config, no `tailwind.config.js`) |
| Components | **shadcn/ui** (new-york style, CSS variables on, base colour neutral) |
| Colour maths | `culori` (conversions, gamut, CVD filters, ΔE) |
| APCA | `apca-w3` |
| State | `zustand` (+ `zundo` for undo/redo) |
| Validation | `zod` (URL search params, imported JSON) |
| Icons | `lucide-react` |
| Tests | `bun test` for the colour engine; no E2E in v1 |
| Lint/format | Biome |

Scaffold: `bun create vite` (react-ts) → add TanStack Router plugin → `bunx shadcn@latest init`.

No other runtime dependencies without good reason.

## 4. Colour-science foundation

All generation happens in **OKLCH**. Hex/RGB/HSL are input and output formats only.

Why: OKLCH lightness is perceptually uniform, so equal `L` across hues means equal perceived brightness — this is what makes scales consistent between hues and contrast predictable. HSL does not have this property and must not be used for any generation maths.

### 4.1 Gamut

- Target gamut: **sRGB** (default). Toggle for **Display P3** (exports then emit `oklch()` with an sRGB hex fallback).
- `maxChroma(L, h, gamut)`: binary search on `C` (0 → 0.4, 16 iterations) for the highest in-gamut chroma. Memoise on rounded `(L, h)`.
- Any out-of-gamut colour is mapped by **reducing chroma at constant L and h** (never by clipping RGB channels).

### 4.2 Harmony (accent hue derivation)

Hue rotation is done on the OKLCH hue angle. Given seed hue `h`:

| Harmony | Hues produced (besides `h`) | Roles filled |
|---|---|---|
| Monochromatic | none | secondary/accent reuse primary scale at other steps |
| Analogous | `h−30`, `h+30` | secondary, accent |
| Complementary | `h+180` | accent |
| Split-complementary | `h+150`, `h+210` | secondary, accent |
| Triadic | `h+120`, `h+240` | secondary, accent |
| Tetradic (rectangle) | `h+60`, `h+180`, `h+240` | secondary, accent, extra |
| Square | `h+90`, `h+180`, `h+270` | secondary, accent, extra |

- Default harmony: **split-complementary**.
- An **angle spread** slider (±15° around the defaults) lets the user tighten/loosen analogous and split-complementary.
- Derived accent colours start at the seed's `L` and at `min(seed.C, maxChroma(L, h'))` so accents have matched visual weight.

### 4.3 Tonal scales (50–950)

Every hue (primary, secondary, accent, extra, neutral, each semantic) gets an 11-step scale.

Target lightness per step (OKLCH `L`):

| Step | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L | 0.977 | 0.946 | 0.890 | 0.815 | 0.720 | 0.630 | 0.540 | 0.455 | 0.380 | 0.310 | 0.230 |

Chroma per step = `maxChroma(L, h) × chromaFactor[step] × saturation`, where `saturation` is a user slider (0–1, default derived from seed: `seed.C / maxChroma(seed.L, seed.h)`, clamped 0.35–1):

| Step | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| factor | 0.55 | 0.65 | 0.75 | 0.85 | 0.95 | 1.00 | 1.00 | 0.95 | 0.88 | 0.80 | 0.70 |

Hue shift (natural-looking scales; lights drift toward yellow, darks toward blue):

- `hueShift` slider, 0–20°, default 6°.
- Per step: `h_step = h + shift × t`, where `t` runs linearly from `+1` at step 50 to `−1` at step 950 (0 at 500), and the sign is chosen so light steps move toward hue 100° (yellow) and dark steps toward 265° (blue) by the shortest arc. Skip shifting if seed hue is within 15° of either pole.

Seed anchoring:

- Find the step whose target `L` is nearest to the seed's `L`. That step is the **anchor** and is set to the **exact seed colour**.
- Remaining steps follow the tables above (do not rescale the whole curve). Show a small dot on the anchor swatch.
- If seed `L` is outside 0.35–0.80, show a hint: "Seed is very light/dark; brand step is {step}".

### 4.4 Neutrals

- Neutral scale uses the same `L` table, hue = primary hue, chroma = `neutralTint × 0.02` constant across steps (not gamut-relative), reduced to fit gamut if needed.
- `neutralTint` slider 0–1, default 0.5 (i.e. `C = 0.01`). 0 = pure grey.
- Option: neutral temperature `brand | warm (h=70) | cool (h=255) | pure`.

### 4.5 Semantic colours

Fixed anchor hues, nudged toward the brand for cohesion:

| Role | Anchor hue | Allowed range |
|---|---|---|
| success | 150 | 135–165 |
| warning | 80 | 65–95 |
| destructive | 27 | 15–35 |
| info | 245 | 230–260 |

- Final hue = anchor rotated toward the primary hue by up to 8°, clamped to the allowed range.
- Chroma follows the same `saturation` as the brand scales, so semantics feel like part of the family.
- **Collision rule:** if the primary hue is within 20° of a semantic anchor (e.g. a red brand vs destructive), push that semantic hue to the far edge of its allowed range and flag an info-level note in the audit.

### 4.6 Chart colours

Five categorical colours (`chart-1..5`): hues from primary, accent, secondary, then gap-filling hues that maximise minimum hue distance; all at `L = 0.65` (light theme) / `0.70` (dark), equal chroma. Must pass the CVD distinguishability check (§6.3); if not, alternate lightness ±0.10 across adjacent entries.

## 5. Semantic token mapping (shadcn)

The engine outputs the standard shadcn token set for **light and dark**. `N` = neutral scale, `P` = primary, `S` = secondary, `A` = accent, `D` = destructive.

| Token | Light | Dark |
|---|---|---|
| `background` | N-50 (or white if `pureBackground` on) | N-950 |
| `foreground` | N-950 | N-50 |
| `card`, `popover` | white | N-900 |
| `card-foreground`, `popover-foreground` | N-950 | N-50 |
| `primary` | P-anchor (see below) | P-(anchor − 1 step lighter, min 400) |
| `primary-foreground` | computed | computed |
| `secondary` | N-100 | N-800 |
| `secondary-foreground` | N-900 | N-50 |
| `muted` | N-100 | N-800 |
| `muted-foreground` | N-600 | N-400 |
| `accent` | A-100 | A-900 |
| `accent-foreground` | A-900 | A-100 |
| `destructive` | D-600 | D-500 |
| `border`, `input` | N-200 | N-800 |
| `ring` | P-500 | P-400 |
| `chart-1..5` | §4.6 | §4.6 |
| `sidebar-*` | derived from the same rules (sidebar = N-100 / N-900) | |

Rules:

- **`primary` step selection:** start from the anchor step. If it cannot reach 4.5:1 against either white or N-950 as its foreground, walk darker (light theme) / lighter (dark theme) until it does.
- **Computed foregrounds** (`primary-foreground`, and extra tokens `success-foreground`, `warning-foreground`, `info-foreground`): choose whichever of white / N-950 gives higher WCAG contrast.
- Extra tokens beyond stock shadcn: `success`, `warning`, `info` (+ `-foreground`). Export them alongside the standard set.
- **60-30-10:** neutrals carry ~60% (backgrounds), neutral-adjacent surfaces ~30% (cards, muted, borders), brand/accent ≤10% (primary buttons, ring, links). The preview (§8.3) is laid out to respect this and the audit measures it (§6.4).
- Radius is not part of this tool; leave `--radius` at the shadcn default in exports.

## 6. Audit ("health score")

A panel listing checks, each `pass | warn | fail`, with an overall score 0–100. Runs on every state change (debounced 100 ms) for both themes.

### 6.1 Contrast pairs checked

| Pair | WCAG 2.2 min | APCA min (Lc) |
|---|---|---|
| foreground / background | 7:1 (AAA) warn below, 4.5 fail below | 75 |
| muted-foreground / background | 4.5 | 60 |
| muted-foreground / muted | 4.5 | 60 |
| primary-foreground / primary | 4.5 | 60 |
| secondary-foreground / secondary | 4.5 | 60 |
| accent-foreground / accent | 4.5 | 60 |
| card-foreground / card | 4.5 | 75 |
| white (or computed fg) / destructive, success, warning, info | 4.5 | 60 |
| primary / background (as link text) | 4.5 | 60 |
| border / background (non-text UI) | 3:1 → **warn only** | 15 |
| ring / background | 3:1 | 30 |

WCAG result decides pass/fail. APCA is shown next to it and yields at most a `warn`.

### 6.2 Scale quality

- Lightness is strictly monotonic across each scale.
- Adjacent steps differ by ΔE-OK ≥ 0.02 (distinguishable).
- No step was chroma-reduced by more than 30% during gamut mapping (else warn: "hue X cannot hold this saturation").

### 6.3 Colour-vision deficiency

Simulate protanopia, deuteranopia, tritanopia (culori `filterDeficiencyProt/Deuter/Trit`, severity 1). Under each:

- `success` vs `destructive` vs `warning`: pairwise ΔE-OK ≥ 0.10, else **fail** ("states indistinguishable for {type}; do not rely on colour alone").
- `chart-1..5`: pairwise ΔE-OK ≥ 0.08, else warn.
- `primary` vs `destructive`: ΔE-OK ≥ 0.08, else warn.

### 6.4 Harmony & balance

- Hue set matches the selected harmony within ±5° (fails only when the user manually overrode a hue; shown as info "custom harmony").
- Accent/brand lightness and chroma are within 0.08 L and 25% C of each other (visual-weight balance), else warn.
- Vibration: any pair used as text-on-fill where both have `C > 0.15` and `|ΔL| < 0.25` → warn.
- Semantic collision (§4.5) → info.

### 6.5 Score

`score = 100 − Σ penalties`, floor 0. Penalties: fail = 12, warn = 4, info = 0. Label: ≥90 "Production ready", 70–89 "Needs attention", <70 "Not ready". Light and dark are scored separately and the lower is shown, with both visible on hover.

### 6.6 Auto-fix

Every `fail`/`warn` with a deterministic remedy shows a **Fix** button:

- Contrast failure → move the *foreground-side* token one step at a time away from the background until it passes (never alter the seed/anchor).
- CVD failure → apply lightness separation (success darker, warning lighter) within each role's scale.
- Gamut warning → lower `saturation` to the highest value with no warning.

**Fix all** applies every available fix in order. Fixes are stored as token overrides (§7) and are undoable.

## 7. State model

```ts
type Harmony =
  | 'monochromatic' | 'analogous' | 'complementary'
  | 'split-complementary' | 'triadic' | 'tetradic' | 'square';

type RoleKey = 'primary' | 'secondary' | 'accent' | 'extra';
type Step = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

interface PaletteConfig {
  seed: string;                 // hex, 6 digits, no '#'
  harmony: Harmony;
  spread: number;               // -15..15 degrees
  saturation: number;           // 0..1
  hueShift: number;             // 0..20
  neutralTint: number;          // 0..1
  neutralTemp: 'brand' | 'warm' | 'cool' | 'pure';
  gamut: 'srgb' | 'p3';
  pureBackground: boolean;
  locks: Partial<Record<RoleKey, string>>;        // role -> locked hex (acts as that role's seed)
  overrides: {                                    // from manual edits / auto-fix
    light: Record<string, string>;                // token name -> "primary-700" style ref or hex
    dark: Record<string, string>;
  };
}

interface Oklch { l: number; c: number; h: number }
type Scale = Record<Step, Oklch>;

interface PaletteResult {
  scales: Record<RoleKey | 'neutral' | 'success' | 'warning' | 'destructive' | 'info', Scale>;
  anchors: Record<RoleKey, Step>;
  tokens: { light: Record<string, Oklch>; dark: Record<string, Oklch> };
  audit: { light: AuditReport; dark: AuditReport; score: number };
  reasons: Record<string, string>;   // role/token name -> plain-language derivation (§8.10c)
}
```

- `generate(config): PaletteResult` is a **pure function**. UI never computes colours.
- Store: `zustand` holding `PaletteConfig` + UI state (preview theme, preview scene, CVD simulation mode). `zundo` gives undo/redo on `PaletteConfig` only (limit 50).
- **URL is the source of truth for sharing.** `PaletteConfig` is mirrored into TanStack Router search params on `/`, validated with a zod schema (`validateSearch`), with defaults stripped so a default palette has a clean URL. Short keys: `s` seed, `h` harmony, `sp`, `sat`, `hs`, `nt`, `ntp`, `g`, `pb`, `l` (locks, `role:hex` comma list), `o` (overrides, base64url JSON, omitted when empty). URL updates use `replace` and are debounced 300 ms.
- **Library:** saved palettes in `localStorage` key `palette.library.v1` as `{ id, name, config, createdAt }[]`. Wrap all storage access in try/catch.

## 8. UI

Desktop-first (≥1280px ideal), usable down to 768px; below that, panels stack and the preview moves under the controls. The app's own chrome uses a fixed neutral shadcn theme — **generated colours are applied only inside the preview and swatches**, scoped via CSS variables on a wrapper element, so a bad palette never makes the tool unusable.

### 8.1 Layout (route `/`)

```
┌────────────────────────────────────────────────────────────────────┐
│ Top bar: logo · seed input · Generate(Space) · undo/redo · score   │
│          badge · Library · Share · Export                          │
├──────────────┬───────────────────────────────────┬─────────────────┤
│ Controls     │ Preview (live shadcn UI)          │ Audit           │
│ (320px)      │ scene tabs · light/dark/split ·   │ (340px)         │
│              │ CVD simulation select             │ collapsible     │
├──────────────┴───────────────────────────────────┴─────────────────┤
│ Scales strip: one row per scale, 11 swatches each                  │
└────────────────────────────────────────────────────────────────────┘
```

### 8.2 Controls panel

- **Seed:** colour swatch opening a picker (OKLCH L/C/H sliders + hex field). Accepts pasted hex, `rgb()`, `hsl()`, `oklch()`, and CSS named colours.
- **Harmony:** 7-option visual segmented control; each option shows a mini hue wheel with its dots. Hovering previews, clicking commits.
- **Role cards** (primary / secondary / accent / extra when present): swatch, hex, **lock** toggle, per-role picker. Editing a role's colour locks it automatically.
- **Sliders:** saturation, hue shift, spread (only for harmonies that use it), neutral tint; select for neutral temperature; switches for pure background and P3.
- **Hue wheel:** interactive OKLCH wheel showing all role hues; dragging the seed dot rotates the whole harmony, dragging another dot locks that role.

### 8.3 Preview

Rendered with real shadcn components reading the generated tokens. Scenes (tabs):

1. **Dashboard** — sidebar, stat cards, a bar + line chart (plain SVG, uses `chart-1..5`), table with badges, primary/secondary/ghost/destructive buttons.
2. **Marketing** — hero with CTA, feature cards, pricing card with highlighted tier, footer.
3. **Forms & states** — inputs, select, checkbox/switch, focus ring, alerts for success/warning/destructive/info, toast, dialog body, skeletons.
4. **Typography** — headings, body, muted text, links, code, blockquote on background/card/muted surfaces.

Toolbar: theme `Light | Dark | Split` (split shows both side by side), CVD simulation `None | Protan | Deutan | Tritan | Grayscale` (applied via an SVG `feColorMatrix` filter on the preview wrapper only).

### 8.4 Scales strip

- Row per scale; each swatch shows step number, and on hover: hex, `oklch()`, contrast vs white and vs black, AA/AAA badges.
- Click = copy hex (toast "Copied #xxxxxx"). `Alt`+click = copy `oklch()`.
- Anchor step marked with a dot; gamut-reduced steps marked with a small warning corner.

### 8.5 Audit panel

Score ring at top, then checks grouped: Contrast · Scales · Colour vision · Harmony. Each row: status icon, the pair (two swatches), measured value vs required, **Fix** button where available. Hovering a row highlights the affected elements in the preview (outline via a data attribute). "Fix all" at the top.

### 8.6 Export dialog

Tabs, each with a code block + Copy + Download:

1. **shadcn CSS** — `:root { … }` and `.dark { … }` with all tokens as `oklch()`, plus the `@theme inline { --color-…: var(--…); }` block, including the extra `success/warning/info` tokens. Paste-ready for `globals.css`.
2. **Tailwind v4 scales** — `@theme { --color-primary-50: oklch(…); … }` for all scales.
3. **CSS variables (hex)** — plain custom properties in hex for non-Tailwind projects.
4. **Design tokens JSON** — W3C DTCG format (`$type: "color"`, `$value`), scales + semantic tokens with light/dark modes.
5. **Figma variables JSON** — collections `Primitives` (scales) and `Semantic` (modes Light/Dark, aliasing primitives).

Options: colour format (`oklch | hex | hsl`) for tabs 1–2; "include hex fallback" when gamut is P3. Values rounded: L 3 dp, C 3 dp, h 1 dp.

If the score is < 70, show a non-blocking warning banner in the dialog with a "Fix all" button.

### 8.7 Library & share

- **Library** (sheet): saved palettes as cards (name, 5 key swatches, score). Actions: load, rename, duplicate, delete (with confirm), import/export library JSON (zod-validated).
- **Share:** copies the current URL.

### 8.8 Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Generate: new random seed for unlocked roles (ignored when focus is in an input) |
| `1`–`7` | Select harmony |
| `L` | Lock/unlock hovered role |
| `⌘/Ctrl+Z`, `⇧⌘/Ctrl+Z` | Undo / redo |
| `D` | Cycle preview theme |
| `C` | Cycle CVD simulation |
| `E` | Open export |
| `S` | Save to library |
| `?` | Shortcut help dialog |

**Random seed rule** (so `Space` never gives ugly results): `L ∈ [0.50, 0.68]`, `h` uniform 0–360, `C = maxChroma(L, h) × rand(0.6, 0.95)`. If primary is locked, `Space` instead re-rolls harmony + spread for unlocked roles.

### 8.9 UX principles (apply to every screen)

1. **Useful with zero input.** First load shows a complete, good-looking palette (default seed) already applied to the preview. The user never sees an empty state or a setup wizard.
2. **Progressive disclosure.** Controls panel has two tiers:
   - **Basic** (always visible): seed, harmony, role cards with lock, Generate.
   - **Advanced** (collapsed accordion, state remembered in `localStorage`): saturation, hue shift, spread, neutral tint/temperature, pure background, P3.
   A user who only touches Basic must still be able to reach an exportable, ≥ 90 palette.
3. **Plain language first, jargon second.** Labels use everyday words; the technical term appears in the explanation, not the label. Examples: "Colour blindness check" (not "CVD"), "Vividness" (not "chroma/saturation"), "Grey warmth" (not "neutral tint"), "Natural shading" (not "hue shift"), "Colour relationship" (not "harmony").
4. **Instant, reversible feedback.** Every control updates the preview live while dragging. Every change is undoable. Hovering an option previews it without committing. No "Apply" buttons.
5. **Always show the next step.** The score badge in the top bar is a call to action: `Production ready ✓` → highlights Export; `3 issues` → clicking opens the audit scrolled to the first failure.
6. **Never blame, always offer the fix.** No bare red errors. Every problem states what is wrong, why it matters, and has a button (or one sentence) that resolves it.
7. **Confirm quietly.** Copy, save, fix, and undo show a short toast (2 s, bottom-centre). Only destructive actions (delete saved palette, import overwriting library) ask for confirmation.
8. **Comfortable targets and rhythm.** Interactive targets ≥ 32 px (≥ 44 px under 768 px width); consistent 4 px spacing grid; transitions 150 ms ease-out on colour changes, disabled under `prefers-reduced-motion`.
9. **Fast states.** No spinners (everything is synchronous). Skeletons are not needed outside the preview scene that demos them.

### 8.10 Explanations & guidance

Goal: a user with no colour-theory background understands **what each thing does, why the tool chose it, and what to do about a problem** — without leaving the page or reading docs. All copy lives in one file (`src/content/explanations.ts`) keyed by id, so it is consistent and easy to edit.

**Copy rules:** second person, present tense, max ~25 words for tooltips and ~60 for popovers, no unexplained acronyms, say the benefit before the mechanism.

**a) Info popovers (`?` icon) on every control and section heading.** Click/focus opens a shadcn Popover with: one-sentence "what it does", one-sentence "when to change it", and where useful a tiny visual (before/after swatches). Required entries, with reference copy to use or lightly adapt:

| Id | Copy |
|---|---|
| `seed` | "Your main brand colour. Everything else is built from it, and it appears unchanged in the final palette." |
| `harmony` | "How your other colours relate to the main one on the colour wheel. Closer together feels calm; further apart feels energetic." |
| `harmony.*` | One line per option, e.g. complementary: "Opposite on the wheel. Maximum contrast — great for a call-to-action that must stand out." analogous: "Neighbours on the wheel. Calm and cohesive, low risk." triadic: "Three evenly spaced colours. Playful and balanced." (write all seven, each with a "Good for…" hint) |
| `lock` | "Keep this colour while you shuffle the rest." |
| `vividness` | "How intense the colours are. Lower is calmer and more corporate; higher is more playful." |
| `naturalShading` | "Light tints lean slightly warm and dark shades slightly cool, the way real light behaves. Makes scales look less flat." |
| `greyWarmth` | "Adds a hint of your brand colour to greys so backgrounds and text feel part of the same family." |
| `scales` | "Each colour comes in 11 shades, from 50 (lightest) to 950 (darkest), matching Tailwind's naming. Lighter shades are for backgrounds, darker for text." |
| `anchor` | "This is your exact brand colour." |
| `tokens` | "Roles tell your UI which shade to use where — for example 'primary' for main buttons and 'muted' for subtle backgrounds. These match shadcn/ui names." |
| `score` | "How ready this palette is for a real product. It checks readability, colour-blind safety and balance. 90+ means safe to ship." |
| `contrast` | "Whether text is readable against its background. 4.5:1 is the legal/standard minimum for normal text (WCAG AA)." |
| `apca` | "A newer, more accurate readability measure. Shown for reference; it does not affect pass/fail." |
| `colourBlind` | "About 1 in 12 men see some colours differently. This checks that success, warning and error colours can still be told apart." |
| `balance` | "The 60-30-10 rule: mostly neutral surfaces, some supporting tones, a small amount of brand colour so it keeps its impact." |
| `p3` | "Uses the wider colour range of modern screens for more vivid colours. Older screens get an automatic fallback." |
| `export.*` | One line per export tab saying where to paste it, e.g. shadcn CSS: "Paste into `globals.css`, replacing the existing `:root` and `.dark` blocks." |

**b) Audit messages are sentences, not codes.** Each row has three parts:

- **What:** "Muted text on the page background is hard to read (3.8:1, needs 4.5:1)."
- **Why it matters** (expandable): "People with low vision or on a dim screen will struggle with captions and helper text."
- **Fix:** button label describes the result — "Darken muted text" — not just "Fix".

Passing rows collapse into a single "12 checks passed" line (expandable) so the panel shows only what needs attention.

**c) "Why this colour?" on tokens.** Hovering/focusing a role card or any token swatch shows its derivation in one line: "Accent = your brand colour rotated 150° (split-complementary), matched in brightness." / "Primary button uses shade 600 instead of 500 so white text stays readable." The engine returns these as a `reason` string per token and per role (add `reasons: Record<string, string>` to `PaletteResult`).

**d) First-run coach marks.** On first visit only (`localStorage` flag `palette.onboarded.v1`), a 4-step, skippable tour using popovers anchored to real UI: (1) "Start with your brand colour", (2) "Press Space to explore, lock what you like", (3) "Check the score — one click fixes issues", (4) "Export when it says Production ready". "Skip" on every step; replayable from the `?` help dialog. Must not block interaction with the rest of the page.

**e) Help dialog (`?`).** Three tabs: **Shortcuts**, **How it works** (5 short illustrated paragraphs: colour wheel & relationships, shades, roles, readability, colour-blind safety), **Glossary** (plain definitions for: OKLCH, hue, chroma, contrast ratio, WCAG AA/AAA, APCA, gamut, P3, token, CVD).

**f) Explain mode toggle** (top bar, book icon, off by default, remembered): when on, the preview shows small labelled callouts on key elements ("primary", "muted-foreground", "border", "ring") so users see which token paints which part of the UI. Clicking a callout scrolls to that token in the scales strip.

**g) Contextual hints.** Short inline notes that appear only when relevant and are dismissible: seed very light/dark (§4.3), semantic collision (§4.5), saturation reduced by gamut (§6.2), Advanced controls changed while collapsed ("2 advanced settings changed · Reset").

All explanation UI must be keyboard reachable (popover opens on Enter/Space, closes on Esc) and screen-reader friendly (`aria-describedby` linking controls to their short description).

## 9. Project structure

```
src/
  routes/
    __root.tsx
    index.tsx               # the tool; validateSearch = paletteSearchSchema
  engine/                   # pure TS, no React, no DOM
    color.ts                # parse/format, conversions, maxChroma, gamut mapping
    harmony.ts
    scale.ts
    neutral.ts
    semantic.ts
    charts.ts
    tokens.ts               # shadcn token mapping, light + dark
    contrast.ts             # WCAG + APCA
    cvd.ts
    audit.ts                # checks, score, fixes
    generate.ts             # generate(config) -> PaletteResult
    export/                 # one file per export format
    *.test.ts
  state/
    store.ts                # zustand + zundo
    search-schema.ts        # zod schema <-> PaletteConfig
    library.ts              # localStorage
  components/
    ui/                     # shadcn generated
    controls/  preview/  audit/  scales/  export/  library/
    help/                   # info popovers, coach marks, help dialog, explain-mode callouts
  content/
    explanations.ts         # all user-facing explanation copy, keyed by id (§8.10)
  lib/utils.ts
.nvmrc                      # 24
```

Hard rule: `engine/` imports nothing from React or `components/`. All of it is unit-testable with `bun test`.

## 10. Quality requirements

- **Performance:** `generate()` < 10 ms on a mid-range laptop; slider drags stay at 60 fps (apply tokens by writing CSS variables on the preview wrapper, not by re-rendering the preview tree).
- **The tool itself is accessible:** full keyboard operation, visible focus, ARIA labels on swatches ("primary 500, #4f46e5"), status never conveyed by colour alone (icons + text in the audit), respects `prefers-reduced-motion`.
- **Determinism:** same `PaletteConfig` → byte-identical exports. Randomness only in seed generation.
- **Robustness:** invalid URL params fall back to defaults silently; invalid colour input shows inline error and keeps the previous value.
- No network requests at runtime. Fonts are system stack or bundled.

## 11. Engine tests (minimum)

- Round-trip hex → OKLCH → hex is lossless for 1,000 random sRGB colours.
- Every generated colour is in the target gamut, for 500 random configs.
- Scales are monotonic in L; anchor step equals the seed exactly.
- Harmony hues match §4.2 for every harmony type.
- Default config scores ≥ 90 in both themes; 200 random `Space` seeds with default settings score ≥ 90 after "Fix all".
- WCAG contrast matches known values (black/white = 21, `#767676`/white ≈ 4.54).
- Each export format snapshot-tested; shadcn CSS export contains every token in §5.
- Search schema: `config → params → config` is identity; garbage params yield defaults.

## 12. Milestones

1. **Engine** — `color`, `harmony`, `scale`, `neutral`, `semantic`, `generate` + tests. No UI.
2. **Shell** — scaffold, routing, layout, controls panel, scales strip, URL sync.
3. **Tokens + preview** — shadcn mapping, four preview scenes, light/dark/split.
4. **Audit** — checks, score, CVD simulation, auto-fix.
5. **Export** — all five formats.
6. **Guidance** — plain-language labels, info popovers, sentence-style audit messages, "why this colour" reasons, help dialog, explain mode, coach marks (§8.9–8.10).
7. **Polish** — library, shortcuts, undo/redo, hue wheel, responsive, a11y pass.

Each milestone ends with `bun test` green and `bun run build` clean (no TS errors, no Biome errors).

## 13. Acceptance criteria (v1 done when)

- From a cold load, typing a hex and opening Export produces shadcn CSS that, pasted into a fresh `bunx shadcn@latest init` project, renders correctly in light and dark with no edits.
- Pressing `Space` 20 times in a row yields 20 palettes that all score ≥ 90 or reach ≥ 90 with one "Fix all".
- Locking primary and pressing `Space` keeps primary untouched.
- Copying the URL into a new tab reproduces the identical palette, including locks and fixes.
- Every `fail` in the audit either has a working Fix or an explanation of what the user must change.
- Preview under each CVD simulation updates without a re-layout.
- Using only the Basic controls (Advanced never opened), a user can reach an exported palette scoring ≥ 90.
- Every control, section heading, audit row and export tab has an explanation; none uses an acronym without defining it.
- Every token and role shows a "why this colour" reason.
- First-run tour appears once, is skippable at every step, and can be replayed from Help.

## 14. Future (out of scope for v1)

- Extract seed colours from an uploaded image (client-side k-means in OKLab).
- Multiple brand colours as seeds; per-scale custom lightness curves.
- Import an existing shadcn `globals.css` and audit/repair it.
- Figma plugin; VS Code extension; contrast-grid matrix view; gradient generator.
