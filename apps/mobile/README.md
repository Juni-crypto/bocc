# @bocc/mobile

BOCC - Be Our Camera Crew. The Expo (React Native) client for guests and hosts.

Everyone at the event becomes the camera crew: scan a QR to join, drop your
shots into one pooled gallery, then take a selfie and AI finds every photo you
are in. Hosts can create and run an event entirely in-app.

## Stack

- Expo (SDK 52) + expo-router (typed routes) + TypeScript
- expo-image, expo-image-picker, expo-font
- Fonts: Space Grotesk (display) + Hanken Grotesk (body) via @expo-google-fonts
- One typed API client in `lib/api.ts` (no shared package required)

## Screens

Guest flow:

- `app/index.tsx` - entry chooser (join / host)
- `app/join/[slug].tsx` - scan + consent (QR-scan placeholder + biometric consent)
- `app/event/[slug]/selfie.tsx` - take one selfie, "find my photos"
- `app/event/[slug]/add.tsx` - upload with a 10-15 cap meter
- `app/event/[slug]/index.tsx` - pooled gallery (people strip + bottom tab bar)
- `app/event/[slug]/me.tsx` - "you're in N photos" result
- `app/event/[slug]/search.tsx` - semantic search tab

Host flow:

- `app/host/create.tsx` - create event (type chips with smart-default presets,
  per-guest cap slider, key toggles: face matching, geofence, allow video)
- `app/host/manage.tsx` - live dashboard (stats + moderation queue + share QR)

## Reusable components

`RecDot`, `Bezel`, `Viewfinder`, `Toggle`, `Segmented`, `Slider`, `PillButton`,
`PhotoGrid`, plus `Screen`, `QrPlaceholder`, and small `ui` helpers
(`Label`, `Display`, `SettingRow`, `StatCard`). Design tokens live in
`theme/tokens.ts`.

## Configuration

The API base URL comes from `EXPO_PUBLIC_API_URL` and defaults to
`http://localhost:4000/api`.

```bash
cp .env.example .env.local
# edit EXPO_PUBLIC_API_URL if your backend runs elsewhere
```

Every screen degrades gracefully when the backend is offline: it falls back to
deterministic placeholder imagery (`https://picsum.photos/seed/...`) so the
full design is reviewable without a running API. When the API returns photos
with a `thumbUrl`, those render instead.

## Run

From the repo root (npm workspaces), install once, then start the app:

```bash
# install happens at the repo root (handled separately)
npm run start -w @bocc/mobile
# or, from this directory:
npx expo start
```

Then press `i` (iOS simulator), `a` (Android), or scan the QR with Expo Go.

```bash
npm run ios -w @bocc/mobile      # open iOS simulator
npm run android -w @bocc/mobile  # open Android
npm run web -w @bocc/mobile      # run in the browser
npm run typecheck -w @bocc/mobile
```

## API contract

Mirrors the NestJS BFF (`apps/api`) at `http://localhost:4000/api`:

- `POST /events`, `GET /events/:idOrSlug`, `PATCH /events/:id`
- `POST /events/:id/go-live`, `GET /events/:id/stats`, `GET /events/:id/moderation`
- `POST /events/:idOrSlug/join`
- `POST /events/:idOrSlug/photos` (multipart `files[]`)
- `GET /events/:idOrSlug/gallery?take&cursor`
- `POST /events/:idOrSlug/find-me` (multipart `selfie`)
