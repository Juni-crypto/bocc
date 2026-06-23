# Design

Visual system for BOCC (Be Our Camera Crew). Single locked **dark** theme, cinematic and
photo-forward, one electric accent. Captured from the live code in `apps/web`
(`app/globals.css`, components) and mirrored by the mockups in `mockups/`.

## Theme

Dark only. Off-black canvas so pooled photos pop, a single electric-lime accent for all
primary actions and active states, and a coral that is reserved exclusively for the
semantic "REC / recording / live" indicator (never a second brand color). Background
carries two large, blurred radial orbs (lime + coral) and a fixed low-opacity film-grain
overlay for texture.

## Color

Tokens are CSS custom properties in `apps/web/app/globals.css` (`@theme`). Hex today; move
to OKLCH on the next color pass.

| Token | Value | Role |
|---|---|---|
| `--color-ink` | `#050505` | Page background (off-black, never pure #000) |
| `--color-surface` | `#0E0E10` | Card / bezel core surface |
| `--color-surface2` | `#161619` | Raised surface, image wells |
| `--color-line` | `rgba(255,255,255,0.08)` | Hairline borders |
| `--color-lime` | `#D7FF3E` | The single accent: CTAs, active nav, focus, REC logo |
| `--color-coral` | `#FF6B5E` | Semantic only: the blinking REC / live dot |
| Text | `rgba(255,255,255,0.9 / 0.55 / 0.4)` | Primary / secondary / muted on ink |

Accent usage stays under ~10% of any surface. Watch contrast: muted `white/40` is for
large or non-essential text only; body copy uses `white/55`+ and must clear 4.5:1.

## Typography

Pairing on a contrast axis (one geometric-display + one humanist-body), loaded via
`next/font`.

- **Display:** Space Grotesk (600/700), `tracking-[-0.03em]` on big headings (floor
  -0.04em). Used for hero, section H2s, numerals/stats.
- **Body:** Hanken Grotesk (400/500), `leading-relaxed`, measure capped ~65ch.
- **Mono:** system mono for technical chips ("Immich engine", build/credits).

## Components

- **Double-bezel card** (`.bezel` + `.bezel-core`): outer shell (rgba shell + hairline)
  wrapping an inner core (#0E0E10) with concentric radii (2rem / calc). Primary container.
  No nested bezels.
- **Viewfinder brackets** (`.vf`): lime top-left + bottom-right corner brackets on hero /
  feature / CTA surfaces. The signature motif.
- **REC dot / logo** (`RecDot`, `RecLogo`): blinking coral (or lime-on-ink) dot = live state.
- **Island nav** (`IslandNav`): floating rounded glass pill, detached from the top.
- **Pill CTA** (`PillButton`): full-radius lime button with a nested "button-in-button"
  arrow puck; magnetic `.cta` hover.
- **Masonry gallery** (`MasonryGrid`): CSS columns, real Immich `thumbUrl` images.
- **Form controls**: custom `Toggle`, `Segmented`, `Slider` for the create wizard.

## Layout

- Container: `max-w-[1240px] mx-auto px-6`; mobile falls to single column.
- Radii: cards/bezels 2rem outer (concentric inner), controls/pills full radius. No
  arbitrary 24-40px card rounding.
- Z-index scale (semantic): base content 10, grain 50, nav 40, modals/overlays above.
- Section rhythm `py-24`+; vary for cadence rather than uniform stacking.

## Motion

- Entrance: `Reveal` (motion/react `whileInView`) rises + unblurs, staggered by index.
  Exponential ease `cubic-bezier(0.32,0.72,0,1)`; no bounce/elastic.
- REC dot: infinite 2-step blink = "recording".
- CTA: magnetic arrow puck nudges on hover; `:active` scale 0.97 for tactile press.
- **Reduced motion**: every animation must have a `prefers-reduced-motion: reduce`
  fallback (crossfade or instant). Content is visible by default, never gated on a reveal.
