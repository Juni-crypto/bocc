<div align="center">

# Be Our Camera Crew (BOCC)

**Everyone's the camera crew.** Guests scan a QR, drop their best shots, and the whole night
pools into one shared gallery, so you relive the event from every point of view, not just
your own. A self-hosted Immich engine adds face matching, semantic search, OCR, and
auto-highlights on top.

</div>

---

## Contents

- [What it is](#what-it-is)
- [Architecture](#architecture)
- [Monorepo layout](#monorepo-layout)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Turning on the AI (Immich)](#turning-on-the-ai-immich)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [API surface](#api-surface)
- [Deployment](#deployment)
- [Production checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

See also: [PRODUCT.md](./PRODUCT.md) (strategy), [DESIGN.md](./DESIGN.md) (visual system),
[SPIKE.md](./SPIKE.md) (selfie-match decision), and [`public/about.html`](#about-page) (shareable overview).

---

## What it is

Every guest captures a sliver of an event from their own seat. BOCC pools every point of
view into one gallery. Face matching ("find my photos" from a selfie) is one feature, not
the headline; the pooled POV gallery is the product.

- **Hosts** create an event (web or phone), set rules (per-guest caps, geofence, privacy, AI
  toggles), and watch it fill live.
- **Guests** scan a QR, join in one tap with consent, shoot, browse the pooled gallery, and
  pull the shots they are in.

## Architecture

```
apps/web (Next.js)   apps/mobile (Expo)        thin clients
            \         /
        apps/api (NestJS BFF)                  events, caps, geofence, selfie-match, media proxy
            /         \
   Immich (AI + storage)   Postgres + pgvector  engine + our data
```

Frontends never talk to Immich directly. The API holds the Immich key, enforces event
scoping, per-guest caps, geofence, and consent, and proxies media. **An event maps 1:1 to an
Immich album.** Selfie matching uses Immich **Path A**
(`/api/faces?id=<assetId>` then `/api/people?closestAssetId=<faceId>`, cosine ranking),
implemented in `apps/api/src/immich/immich.service.ts`.

## Monorepo layout

```
BOCC/
├─ apps/
│  ├─ api/        NestJS BFF (events / members / photos / Immich client + media proxy)
│  ├─ web/        Next.js (marketing landing + host dashboard + guest gallery)
│  └─ mobile/     Expo / React Native (guest + host)
├─ packages/
│  └─ shared/     @bocc/shared: types + typed API client (createBoccClient)
├─ immich/        cloned Immich engine source (reference)
├─ immich-stack/  docker-compose + env to RUN Immich (published images)
├─ scripts/       setup-immich.mjs, demo-face-match.mjs, spike-selfie-match.mjs
├─ mockups/       static HTML design references
├─ docker-compose.dev.yml   Postgres (pgvector) + Adminer
├─ PRODUCT.md  DESIGN.md  SPIKE.md  README.md
```

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | 20+ (built on 24) | with npm workspaces |
| Docker + Compose | recent | Postgres, and Immich when enabled |
| Expo Go / simulator | optional | only to run the mobile app |

## Local setup

The backend runs fully **without** Immich (uploads use stub asset ids, `find-me` returns a
`not_implemented` marker). Everything else is real. Turn on Immich when you want the AI.

```bash
# 0. from the repo root
npm install

# 1. infra: Postgres (pgvector) on :5433 + Adminer on :8080
npm run db:up

# 2. backend env, db, and API
cp .env.example .env            # if present; otherwise .env already exists
npm run db:generate             # prisma generate
npm run db:migrate              # prisma migrate dev
npm run api:dev                 # http://localhost:4000/api

# 3. web (new terminal)
npm run dev -w @bocc/web        # http://localhost:3000   (NEXT_PUBLIC_API_URL -> :4000/api)

# 4. mobile (new terminal, optional)
npm run start -w @bocc/mobile   # Expo; set EXPO_PUBLIC_API_URL for a physical device (LAN IP)
```

Smoke test the API:

```bash
curl localhost:4000/api/health
# { "status":"ok", "db":"up", "immich":"disabled" | "enabled" }
```

## Turning on the AI (Immich)

```bash
# 1. bring up the Immich stack (published images) on :2283
cd immich-stack && cp .env.example .env && docker compose up -d && cd ..

# 2. auto-provision: waits for Immich, creates the admin, mints an API key,
#    and writes IMMICH_ENABLED/URL/KEY into apps/api/.env
node scripts/setup-immich.mjs

# 3. restart the API so it picks up the new env
npm run api:dev
# health now shows "immich":"enabled"; new events create real Immich albums,
# uploads become real assets, and /find-me runs the real Path A face match.

# (optional) prove a real selfie match end to end:
node scripts/demo-face-match.mjs <selfie.jpg> <galleryImg...>
```

Immich generates thumbnails and runs face detection asynchronously. Note: by default it only
forms a "person" from a cluster of >= 3 faces (`minFaces`); lower it in Immich's settings for
small test sets.

## Environment variables

**apps/api/.env**

| Var | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://bocc:bocc@localhost:5433/bocc?schema=public` | app Postgres (pgvector) |
| `PORT` | `4000` | API port |
| `API_PUBLIC_URL` | `http://localhost:4000` | base for absolute media (thumb/original) URLs |
| `IMMICH_ENABLED` | `false` / `true` | gate Immich calls |
| `IMMICH_URL` | `http://localhost:2283` | Immich base URL |
| `IMMICH_API_KEY` | `...` | Immich API key (set by `setup-immich.mjs`) |
| `FACE_MATCH_STRATEGY` | `api` | `api` (Path A) or `pgvector` (Path B) |
| `JWT_SECRET` | `change-me` | reserved for auth |

**apps/web/.env.local** — `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
**apps/mobile/.env** — `EXPO_PUBLIC_API_URL=http://localhost:4000/api` (use the dev machine LAN IP for a physical device)
**immich-stack/.env** — `IMMICH_VERSION`, `UPLOAD_LOCATION`, `DB_*` (see its README)

## Scripts

| Command | Does |
|---|---|
| `npm run db:up` / `db:down` | start / stop Postgres + Adminer |
| `npm run db:migrate` / `db:generate` / `db:studio` | Prisma migrate / generate / studio |
| `npm run api:dev` / `api:build` | run / build the API |
| `npm run dev -w @bocc/web` / `build -w @bocc/web` | run / build web |
| `npm run start -w @bocc/mobile` | run Expo |
| `npm run build -w @bocc/shared` | build the shared package |
| `node scripts/setup-immich.mjs` | provision Immich + wire the API |
| `node scripts/demo-face-match.mjs` | end-to-end real face-match demo |

## API surface

`POST /events` · `GET /events/:idOrSlug` · `PATCH /events/:id` · `POST /events/:id/go-live`
· `GET /events/:id/stats` · `GET /events/:id/moderation` · `POST /events/:idOrSlug/join`
· `POST /events/:idOrSlug/photos` (multipart) · `GET /events/:idOrSlug/gallery`
· `POST /events/:idOrSlug/find-me` (multipart) ·
`GET /events/:eventId/photos/:photoId/thumb|original` (media proxy) · `GET /health`

---

## Deployment

Four pieces deploy independently. The API is the hub; web and mobile point at it, and it
points at Postgres + Immich.

### 1. Postgres (pgvector)

Use a managed Postgres with the `pgvector` extension: **Neon**, **Supabase**, or **RDS**.
Set `DATABASE_URL` on the API. Run `prisma migrate deploy` on release.

### 2. API (NestJS)

Containerize and run on **Railway**, **Fly.io**, **Render**, or any VPS/Kubernetes.

```bash
npm install
npm run db:generate -w @bocc/api
npm run build -w @bocc/api          # -> apps/api/dist
node apps/api/dist/main.js          # honors PORT
```

Set env: `DATABASE_URL`, `API_PUBLIC_URL` (your public API origin, e.g. `https://api.bocc.app`),
`IMMICH_ENABLED=true`, `IMMICH_URL`, `IMMICH_API_KEY`. Run behind HTTPS. CORS is open by
default in `main.ts`; lock it to your web origin for production. The media proxy streams
through the API, so put it behind a CDN/cache for gallery-heavy traffic.

### 3. Immich (engine)

Run the `immich-stack/` compose on a VPS (or managed Docker). Point `UPLOAD_LOCATION` at a
mounted volume or object storage. **Do not expose Immich publicly** — keep it on a private
network reachable only by the API, and connect over the internal address. Create one
service-account API key for the API. Pin `IMMICH_VERSION`.

### 4. Web (Next.js)

Deploy to **Vercel** (zero-config) or as a Node server / Docker.

```bash
npm run build -w @bocc/web && npm run start -w @bocc/web
```

Set `NEXT_PUBLIC_API_URL=https://api.bocc.app/api`. The marketing landing is static; app
routes are server-rendered.

### 5. Mobile (Expo)

Build with **EAS** and ship to the stores (or distribute internally).

```bash
npx eas build --platform all       # in apps/mobile
```

Set `EXPO_PUBLIC_API_URL=https://api.bocc.app/api` for the build profile.

## Production checklist

- [ ] Managed Postgres with pgvector; `prisma migrate deploy` in the release step
- [ ] API behind HTTPS; CORS restricted to the web origin
- [ ] Immich on a private network, not public; pinned version; service-account key only
- [ ] Object storage for `UPLOAD_LOCATION`; backups for Postgres + uploads
- [ ] `API_PUBLIC_URL` set to the public API origin (so media URLs resolve)
- [ ] CDN in front of the media proxy for gallery traffic
- [ ] Biometric-consent copy reviewed (GDPR / BIPA) before processing faces
- [ ] Rotate `JWT_SECRET` and the Immich API key out of source control

## Troubleshooting

- **`immich:"disabled"` in health** — `IMMICH_ENABLED` is not `true` in `apps/api/.env`, or the API was not restarted after `setup-immich.mjs`.
- **Gallery images 404 right after upload** — Immich thumbnails are async; the media proxy falls back to the original until the thumbnail is ready.
- **`find-me` returns `no_match` on real faces** — Immich needs >= `minFaces` (default 3) to form a person; lower it in Immich settings or upload more shots of the person.
- **Mobile cannot reach the API** — `localhost` on a device means the phone, not your machine; set `EXPO_PUBLIC_API_URL` to the dev machine LAN IP.
- **Duplicate upload errors** — Immich dedupes by checksum; the API upserts photos by asset id, so re-uploading the same file is idempotent.

<a name="about-page"></a>
## About page

A shareable, Notion-style overview lives at `apps/web/public/about.html`, served at
`http://localhost:3000/about.html`. Send it to anyone who wants the plain-English pitch.
