# Be Our Camera Crew — BOCC

> Everyone at an event becomes the camera crew. Scan a QR, drop your photos, and the
> whole night gets pooled into one shared gallery — then AI finds every photo *you're* in.

---

## 1. The product in one line

People go to an event, **scan a QR to join**, each person **adds ~10–15 photos**, and
**everyone sees the whole pooled gallery**. On top of that: **Google-Photos-grade AI** —
face recognition ("show me every photo I'm in" from a single selfie), semantic search
("photos with the cake"), OCR, and auto-highlights.

Nobody captures the full event alone. Pooled together, you get the complete POV of the night.

---

## 2. Why this is a real product (the gap)

- **Open-source personal photo apps** (Immich, PhotoPrism, LibrePhotos) have the AI engine
  but are built as *personal/family libraries* — no event/QR/selfie flow.
- **Commercial event apps** (Memzo, Tagbox, PixsOffice) have the exact flow — but are
  paid, closed, and not ours.

**There is no open-source project that does event-QR + selfie-find-my-photos end to end.**
That gap is BOCC.

---

## 3. Architecture — 3 tiers

```
┌─────────────┐     ┌─────────────┐
│   Web UI    │     │ Mobile App  │      ← our frontends (thin)
│  (Next.js)  │     │ (Expo/RN)   │
└──────┬──────┘     └──────┬──────┘
       └─────────┬─────────┘
                 ▼
        ┌─────────────────┐
        │  OUR BACKEND    │  ← owns events, QR, members, consent,
        │  (BFF/NestJS)   │    upload caps, selfie-match orchestration
        └────────┬────────┘
            ┌─────┴──────┐
            ▼            ▼
   ┌──────────────┐  ┌──────────┐
   │    IMMICH    │  │ Our DB   │
   │ storage + AI │  │(Postgres)│
   │ faces/CLIP/  │  │ events,  │
   │ OCR/search   │  │ members, │
   └──────────────┘  │ mappings │
                     └──────────┘
```

**Hard rule:** frontends never talk to Immich directly. Everything goes through our backend,
which holds the Immich API key, enforces event scoping + the 10–15 cap, and handles consent.
Immich is a private internal service.

### Tier responsibilities

| Tier | Owns |
|---|---|
| **Immich** | Photo/video storage, face detection + clustering, CLIP semantic search, OCR, thumbnails |
| **Our backend (BFF)** | Events, QR/join, members, consent, per-person upload caps, selfie-match orchestration, translating our concepts ↔ Immich |
| **Our DB** | Events, members, consent records, event↔Immich-album mapping, (optional) face embeddings for pgvector fallback |
| **Frontends** | Two thin clients (web + mobile) over one shared API client |

---

## 4. How our concepts map onto Immich

| Our concept | Immich representation |
|---|---|
| An **event** | One Immich **album** |
| **Event photos** | Assets uploaded + added to that album |
| A **guest joins (QR)** | Row in *our* DB — NOT an Immich user |
| Guest's **selfie** | Uploaded as an asset → Immich detects face/embedding |
| **"Find my photos"** | Selfie face → similarity rank against album's people → return that person's assets |
| **Pooled gallery** | List album assets via our backend |

Keeps Immich single-tenant; all multi-tenant event logic lives in our DB.

---

## 5. Our backend API surface

```
# Host / creation & management
POST   /events                host creates event (full options payload) → QR/link
PATCH  /events/:id            update any event option (caps, geo, privacy, AI)
GET    /events/:id/stats      live stats (crew, photos, faces)
GET    /events/:id/moderation moderation queue (pending photos)
POST   /events/:id/go-live    flip to RECORDING state
DELETE /events/:id            end / archive / export

# Guest
POST /events/:id/join         guest joins (name + consent)
POST /events/:id/photos       upload (enforces per-person cap + geofence)
GET  /events/:id/gallery      pooled gallery (paginated)
POST /events/:id/find-me      upload selfie → returns my photos
GET  /events/:id/people       face clusters in the event
GET  /events/:id/search?q=    CLIP text search ("the cake")
GET  /events/:id/map          photos with geo coords for map view
```

---

## 6. Selfie-match flow (the core feature)

1. Guest sends selfie to `POST /find-me`
2. Backend uploads it to Immich → waits for face detection
3. Backend asks Immich to **rank the event album's people by cosine similarity** to that selfie face
4. Top match above threshold → `getPersonAssets` / `searchMetadata` → that person's photos *within this event*
5. Delete the selfie asset (privacy)

**Fallback (Path B):** if the public API won't rank people by embedding for us, pull face
embeddings from Immich into our own **pgvector** table and do cosine match ourselves.

### Immich API — confirmed capabilities
- Upload assets via `x-api-key`, albums, shared links ✅
- Smart/CLIP search, OCR search, metadata search, face search ✅
- Faces/People: `GET/POST/PUT/DELETE /faces`, `getPersonAssets`, `searchMetadata` by person ✅
- Order people by cosine similarity to a face embedding ✅ (internal `PersonRepository` — **spike to confirm public-API reach**)

---

## 7. Consent / legal (must-have, not optional)

Face recognition = **biometric data**. GDPR (EU) and BIPA (Illinois) require **explicit consent**
before processing faces. The QR-join flow includes a consent checkbox
("this event uses face matching to find your photos"). Cheap now, expensive to retrofit.

---

## 8. "Much more" roadmap (Google-Photos parity, all on Immich's engine)

- Semantic text search (CLIP) — ships with Immich
- Auto-tagging / scene detection (CLIP zero-shot)
- Duplicate / near-dupe removal (perceptual hash)
- Auto-highlights / best shots (blur + face-quality scoring)
- OCR — ships with Immich

---

## 9. Storage cost note

Immich self-hosted = storage is whatever disk/object store we point it at.
Free options explored: Cloudflare R2 (10 GB free, zero egress), Backblaze B2 (10 GB free),
or the Telegram-as-storage hack (TG-S3 / Pentaract) — free but rate-limited + against
Telegram ToS, so only a last resort.

---

## 10. Stack (TS monorepo — matches existing Node/TS codebases)

- **Backend:** NestJS (TS)
- **Web:** Next.js
- **Mobile:** Expo / React Native
- **Shared:** `packages/api-client` + shared TS types (one contract, both frontends)
- **DB:** Postgres (+ pgvector if Path B)
- **Storage/AI:** self-hosted Immich (Docker)

---

## 11. Build order

1. **Mockups** (this step) — web + mobile, design direction confirmed before code
2. **Spike** — stand up Immich locally, prove the selfie-match path (A vs B)
3. **Scaffold** monorepo (NestJS + Next.js + Expo + shared types)
4. **Vertical slice** — create event → join → upload → pooled gallery
5. **Selfie-match** endpoint + UI
6. **"Much more"** — search, highlights, dedupe

---

## 12. Core screens (for mockups)

**Web (host + viewer):**
- Landing / what-is-BOCC
- Host: create event → QR + share screen
- Event gallery (pooled grid, masonry)
- Search bar (semantic)
- People strip (face clusters)

**Mobile (guest + host):**
- Scan QR / join event (+ consent)
- Take selfie, "find my photos"
- Upload photos (with 10-15 cap meter)
- Pooled gallery
- "My photos" filtered view
- **Host: create event in-app** (full options, see section 13-14)
- **Host: manage event** (live stats, moderation queue, settings)

---

## 13. Event creation flow (host) — web AND in-app

Hosting is a first-class flow on **both** surfaces. A host can spin up an event from the
web dashboard or directly inside the mobile app. Same backend, same options.

**Wizard steps (mobile + web share the contract):**

1. **Basics** — event name, type (drives smart defaults), cover photo, date/time, venue
2. **Capture rules** — per-guest photo cap, video on/off, live-capture vs camera-roll, upload window
3. **Location** — geo-tagging toggle, geofence radius, map view, auto-group by place
4. **AI** — face matching, auto-highlights, semantic search, auto-moderation toggles (+ consent copy)
5. **Access & privacy** — visibility, join method, view/download permissions, "upload to unlock"
6. **Review & go live** — generates QR + link, starts "RECORDING" state

Step 1 + 6 are the minimum to launch; 2-5 are smart-defaulted by event type and editable later.

### Event-type presets (smart defaults)
| Type | Per-guest cap | Geo | Video | Default visibility |
|---|---|---|---|---|
| Wedding | 15 | off | on (30s) | private (QR) |
| Birthday / Party | 10 | off | on (15s) | private (QR) |
| Corporate | 20 | venue geofence on | on | unlisted + approval |
| Sports / Tournament | 15 | venue geofence on | on (60s) | unlisted |
| Concert / Festival | 10 | on, map view | on (15s) | public |
| Travel / Trip | unlimited | on, map + auto-group | on | private |

---

## 14. Advanced event options (the "much more")

Grouped exactly as the create wizard and the settings screen present them.

**Capture controls**
- Per-guest photo cap: 5 / 10 / 15 / 20 / 30 / unlimited (slider)
- Total event cap (optional ceiling)
- Allow video (on/off) + max clip length
- Live-capture-only vs allow camera roll
- Upload window: during event only / open until N days after / always
- Burst/duplicate auto-collapse

**Location & geo-tagging**
- Geo-tagging on/off (read EXIF GPS from photos)
- Geofence: only accept photos taken within R metres of the venue
- Map view of the gallery (photos pinned where shot)
- Auto-group by location (clusters: "ceremony", "afterparty", etc.)
- Hide exact coordinates from guests (privacy)

**AI features**
- Face matching (selfie → my photos) on/off
- Auto-highlights / best-shot reel on/off
- Semantic + OCR search on/off
- Auto-moderation (NSFW / blur / screenshot filter)

**Access & privacy**
- Visibility: private (QR/link) / unlisted / public
- Join: QR, share link, or short code; require name; require selfie
- Host approval of new guests (on/off)
- View gallery: anytime / "upload to unlock" (must add photos first)
- Download: everyone / host only / disabled; optional watermark
- Per-guest delete of own photos

**Moderation & lifecycle**
- Photo approval queue before a photo goes public (host moderation)
- Report / flag, block guest, remove photo
- Gallery expiry: auto-delete after N days (7 / 30 / 90 / never)
- Export full album (zip), hand off ownership

**Branding**
- Cover image, theme accent, welcome message, custom QR poster

---

## 15. Immich engine & fork strategy

Immich is cloned into `./immich` (shallow). We run it as the **AI + storage engine**, headless,
behind our backend. We touch its source only where the API genuinely can't serve us.

**Run as-is (no fork needed):**
- Storage, thumbnails, transcoding
- Face detection + clustering, CLIP search, OCR, EXIF/GPS extraction
- Albums (one per event), assets, shared links — all via REST + `x-api-key`

**Where we might patch Immich (decide at spike, keep patches minimal + tracked):**
1. **Selfie ranking** — if the public API won't rank `people` by cosine similarity to a
   supplied face embedding, add a tiny read-only endpoint exposing that
   (`POST /search/face-similarity`), OR avoid the fork entirely by replicating face
   embeddings into our **pgvector** (Path B). Prefer Path B; fork only if needed.
2. **Service-account hardening** — run single internal account, disable public signup/UI,
   our BFF is the only client.

**Geofence & caps are enforced in OUR backend, not Immich** — Immich just stores GPS from EXIF;
our backend rejects/accepts on upload based on the event's geofence + cap rules.

**Keep our changes as a patch set** (`immich-patches/`) so we can rebase on upstream Immich.

---

## 16. Monorepo layout

```
BOCC/
├─ PLAN.md
├─ immich/                 # cloned engine (run via its docker-compose)
├─ immich-patches/         # our minimal diffs against upstream (if any)
├─ apps/
│  ├─ api/                 # NestJS BFF — events, join, caps, geofence, selfie-match
│  ├─ web/                 # Next.js — host dashboard + viewer gallery
│  └─ mobile/              # Expo / React Native — guest + host
├─ packages/
│  ├─ api-client/          # generated client + shared TS types (one contract)
│  └─ config/              # shared tsconfig, eslint, tokens
├─ mockups/                # the HTML design mockups (this step)
└─ docker-compose.yml      # immich + our api + postgres(pgvector)
```
