# Toolpeek brand

**Toolpeek** — *See what AI agents see.* Secondary line: *Discover. Inspect. Execute.*

Write the name as **Toolpeek**: one word, capital T only. Not ToolPeek, TOOLPEEK or Tool Peek.

## Logo

The mark is an eye peeking over an edge: the arc is the lid, the dot is the pupil, the line is the edge of the page. It stands for looking at what a website exposes underneath.

| File | Use |
| --- | --- |
| [`brand/symbol.svg`](brand/symbol.svg) | Primary symbol on a violet tile. App icons, favicons, avatars. |
| [`brand/symbol-dark.svg`](brand/symbol-dark.svg) | Symbol on a dark tile, for places where violet tiles clash. |
| [`brand/mark.svg`](brand/mark.svg) | Glyph only, violet, no tile. Small inline use. |
| [`brand/wordmark-dark.svg`](brand/wordmark-dark.svg) | Horizontal logo for dark backgrounds. |
| [`brand/wordmark-light.svg`](brand/wordmark-light.svg) | Horizontal logo for light backgrounds. |

The wordmark text is Geist SemiBold converted to outlines, so it renders without the font. Raster icons are generated from `brand/symbol.svg` by `scripts/brand.mjs`.

- Keep clear space of at least half the symbol's height around the logo.
- Minimum size: 16px for the symbol, 96px wide for the wordmark.
- Don't recolor, rotate, stretch, outline or add effects to the logo, and don't put the violet tile on a busy image.

## Color

Dark is the primary identity. Tokens live in [`brand/tokens.css`](brand/tokens.css).

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| Background | `#09090F` | `#FAFAFB` | Page |
| Surface | `#15151F` | `#FFFFFF` | Panels, cards, inputs |
| Raised | `#1E1E2B` | `#F1EFFA` | Hover, selected |
| Border | `#30303D` | `#E2E1EA` | Dividers, outlines |
| Text | `#FAFAFA` | `#09090F` | Primary text |
| Secondary text | `#A1A1AA` | `#5B5B66` | Descriptions, metadata |
| Primary | `#8B5CF6` | `#7C3AED` | Logo, focus rings, active indicators |
| Primary fill | `#7C3AED` | `#7C3AED` | Filled buttons with white text (meets WCAG AA) |
| Accent | `#C4B5FD` | `#6D28D9` | Links, highlights, icons in accent tiles |

Status colors (success, warning, danger) are for state only, never decoration. Violet is the only brand color; use it sparingly.

## Type

- **Geist** for interface and marketing text; **Geist Mono** for tool names, code, origins and data. Both are SIL OFL and self-hosted.
- Headings: semibold, slightly tight tracking. Body: regular, 1.5–1.7 line height.
- Sentence case for headings, buttons and labels.

## Interface

- Spacing on a 4px grid. Radii: 6px controls, 8px cards, 12px large surfaces.
- Borders over shadows. Shadows only on floating layers (dialogs, menus, the website showcase).
- Icons: [Lucide](https://lucide.dev), 15–18px, 2px stroke, tinted with `currentColor`.
- Motion: short (150–600ms), ease-out, used to show change. Respect `prefers-reduced-motion`.
- Avoid heavy gradients, glassmorphism, decorative badges and stock illustrations. Show the real product instead.

## Voice

Plain, specific and calm. Say what the extension does and what it doesn't. No hype, and never claim a feature, integration or store approval that doesn't exist.

## Assets

| Path | Contents |
| --- | --- |
| `assets/screenshots/` | Real captures of the extension against the bundled demo (`scripts/screenshots.mjs`) |
| `assets/store/` | Chrome Web Store icon, screenshots and promo tiles (`scripts/promo.mjs`) |
| `assets/social/og.png` | 1200×630 social preview, also served by the website |
| `assets/readme/showcase.png` | README hero image |
