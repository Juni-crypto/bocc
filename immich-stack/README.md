# BOCC Immich stack

A minimal, self-contained Immich instance for the selfie-match spike. Immich is
our private AI + storage engine: it ingests event photos, detects and clusters
faces into `people`, and (we are spiking whether) it can rank those people by
similarity to a supplied selfie.

This stack uses only published images (`ghcr.io/immich-app/*`). It does NOT build
Immich from source and does NOT share a database with our app
(`bocc-postgres` on host port 5433). Immich gets its own Postgres, Redis, and
machine-learning container on an internal network; only the web/API server is
exposed, on host port **2283**.

## 1. Bring it up

```bash
cd immich-stack
cp .env.example .env        # adjust IMMICH_VERSION / DB_PASSWORD if you like
docker compose --env-file .env up -d
```

First start pulls a few GB of images (server + ML + vectorchord Postgres) and
downloads the face-recognition model on first use, so allow a few minutes. Check
progress:

```bash
docker compose --env-file .env ps
docker compose --env-file .env logs -f immich-server
```

When healthy, open the UI at http://localhost:2283 and complete the one-time
admin onboarding (create the admin account, accept defaults).

## 2. Create an API key

1. Log in to http://localhost:2283.
2. Click your avatar (top right) > **Account Settings**.
3. Open the **API Keys** panel > **New API Key**, name it `bocc-spike`, copy the
   generated key (shown once).

The key authenticates as your user via the `x-api-key` header, which is exactly
what `apps/api/src/immich/immich.service.ts` and the spike script send.

## 3. Wire it into our API

Put the URL and key in `apps/api/.env` (copy from `apps/api/.env.example` if it
does not exist yet) and flip the engine on:

```dotenv
IMMICH_ENABLED=true
IMMICH_URL="http://localhost:2283"
IMMICH_API_KEY="<paste the key from step 2>"
```

`ImmichService` reads these at boot. With `IMMICH_ENABLED=false` (the default)
every Immich call degrades gracefully and the app runs without this stack.

## 4. Run the spike

From the repo root, with the same two values exported:

```bash
export IMMICH_URL=http://localhost:2283
export IMMICH_API_KEY=<your key>
node scripts/spike-selfie-match.mjs
```

The script creates an album, uploads a few sample faces from `samples/`, waits
for face detection, uploads a selfie, then probes every plausible
face-ranking endpoint and prints a PATH A vs PATH B verdict. See `SPIKE.md` at
the repo root for what it checks and how to read the result.

> Drop a handful of JPGs that contain clear, distinct faces into `samples/`
> before running (the same person across a couple of group shots, plus one
> close-up selfie of that person named `selfie.jpg`). The script generates a few
> trivial placeholder images if `samples/` is empty, but placeholder squares
> have no real faces, so face detection will find nothing and the verdict will
> be inconclusive. Use real photos for a meaningful result.

## Tear down

```bash
docker compose --env-file .env down       # stop, keep the DB + uploads
docker compose --env-file .env down -v    # also wipe the named volume + bind mounts
```

The `library/` (uploads) and `postgres/` (DB) bind-mount folders are created
next to this README; delete them manually after a `down -v` for a clean slate.
