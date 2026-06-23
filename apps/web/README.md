# @bocc/web

The BOCC web app: host dashboard + pooled event gallery + selfie find-me. A thin
Next.js client over the NestJS BFF (`@bocc/api`). It never talks to Immich
directly - all calls go through the backend.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 via `@tailwindcss/postcss`
- `motion` (Framer Motion) for entrance/hover motion
- Fonts via `next/font/google`: Space Grotesk (display) + Hanken Grotesk (body)

## Run

From the monorepo root (workspaces are already wired):

```bash
npm install            # installs all workspaces
npm run dev -w @bocc/web
```

Then open http://localhost:3000.

The app expects the BFF at `NEXT_PUBLIC_API_URL` (default
`http://localhost:4000/api`). Copy `.env.example` to `.env.local` to override:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Every data-driven screen degrades gracefully: if the BFF is not running, pages
fall back to demo content and seeded placeholder imagery, so the UI renders
standalone.

## Routes

| Route             | Screen                                                        |
| ----------------- | ------------------------------------------------------------ |
| `/`               | Landing - "Everyone's the camera crew" + how-it-works        |
| `/create`         | 6-step event create wizard (posts to `POST /events`)         |
| `/e/[slug]`       | Pooled masonry gallery + people strip + search entry         |
| `/e/[slug]/search`| CLIP-style semantic search input + chips + results grid      |
| `/e/[slug]/me`    | "You're in N photos" selfie-match result grid                |
| `/host/[id]`      | Live host dashboard - RECORDING state, stats, feed, QR/share |

`[id]` accepts an event id or slug (the BFF resolves either).

## Structure

- `app/` - App Router routes (server components fetch data; interactive views
  are split into `*View` / `*Form` / `*Dashboard` client components)
- `components/` - reusable primitives: `Bezel`, `RecDot`, `Viewfinder`,
  `MasonryGrid`, `Toggle`, `Segmented`, `Slider`, `PillButton`, `IslandNav`,
  `PeopleStrip`, `QrCode`, `Reveal`
- `lib/api.ts` - typed API client (base URL from `NEXT_PUBLIC_API_URL`)
- `lib/types.ts` - API contract types (mirror the BFF DTOs; swap for
  `@bocc/shared` if/when that package ships)
- `lib/eventData.ts` - server-side fetch helpers with demo fallbacks
- `app/globals.css` - design tokens + the mockup's motifs (mesh, grain,
  double-bezel, viewfinder, masonry, REC blink)

## Design tokens

Dark only. Ink `#050505`, surface `#0E0E10`, hairline `rgba(255,255,255,0.08)`.
Single locked accent: lime `#D7FF3E`. Coral `#FF6B5E` is reserved for the
recording dot only.
