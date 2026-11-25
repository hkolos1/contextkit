# Toolpeek brand

**Toolpeek** — *See what AI agents see.* Secondary line: *Discover. Inspect. Execute.*

Write the name as **Toolpeek**: one word, capital T only. Not ToolPeek, TOOLPEEK or Tool Peek.

## Logo

The mark is `{•}`: code braces as eyelids around a pupil. It reads as an eye peeking into code, which is what Toolpeek does with the tools a website hands to AI agents. The tile carries the aurora gradient.

| File | Use |
| --- | --- |
| [`brand/symbol.svg`](brand/symbol.svg) | Primary symbol: dark glyph on the aurora tile. App icons, favicons, avatars. |
| [`brand/symbol-dark.svg`](brand/symbol-dark.svg) | Aurora glyph on a dark tile, for surfaces where a bright tile is too loud. |
| [`brand/mark.svg`](brand/mark.svg) | Glyph only in the aurora gradient, no tile. Small inline use. |
| [`brand/wordmark-dark.svg`](brand/wordmark-dark.svg) | Horizontal logo for dark backgrounds. |
| [`brand/wordmark-light.svg`](brand/wordmark-light.svg) | Horizontal logo for light backgrounds. |

The wordmark text is Geist SemiBold converted to outlines, so it renders without the font. Raster icons are generated from `brand/symbol.svg` by `scripts/brand.mjs`.

- Keep clear space of at least half the symbol's height around the logo.
- Minimum size: 16px for the symbol, 96px wide for the wordmark.
- Don't recolor, rotate, stretch, outline or add effects to the logo, and don't put the aurora tile on a busy image.

## Color

Aurora: deep night backgrounds with green, cyan and blue light. Dark is the primary identity. Tokens live in [`brand/tokens.css`](brand/tokens.css).

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| Background | `#06090D` | `#F7FAFB` | Page |
| Surface | `#0D1318` | `#FFFFFF` | Panels, cards, inputs |
| Raised | `#151E25` | `#E8F4F3` | Hover, selected |
| Border | `#24313A` | `#D7E2E6` | Dividers, outlines |
| Text | `#F2F6F8` | `#06090D` | Primary text |
| Secondary text | `#93A1AC` | `#52616B` | Descriptions, metadata |
| Primary | `#2DD4BF` | `#0D9488` | Focus rings, active indicators |
| Primary fill | `#2DD4BF` + text `#04161A` | `#0F766E` + text `#FFFFFF` | Filled buttons (both meet WCAG AA) |
| Accent | `#67E8F9` | `#0E7490` | Links, highlights, icons in accent tiles |

**Aurora gradient:** `#34D399` → `#22D3EE` → `#3B82F6` (green, cyan, blue), at 45°. Use it for the logo tile and a few moments of light on the website (hero glow, beams, globe). Never for body text, form controls or large flat areas in the extension.

Status colors (success, warning, danger) are for state only, never decoration.

## Type

- **Geist** for interface and marketing text; **Geist Mono** for tool names, code, origins and data. Both are SIL OFL and self-hosted.
- Headings: semibold, slightly tight tracking. Body: regular, 1.5–1.7 line height.
- Sentence case for headings, buttons and labels.

## Interface

- Spacing on a 4px grid. Radii: 6px controls, 8px cards, 12px large surfaces.
- Borders over shadows. Shadows only on floating layers (dialogs, menus, the website showcase).
- Icons: [Lucide](https://lucide.dev), 15–18px, 2px stroke, tinted with `currentColor`.
- Motion: short (150–600ms), ease-out, used to show change. Ambient website motion (aurora, beams, globe, the three.js constellation) stays slow and subtle, and pauses off-screen. Respect `prefers-reduced-motion`.
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
