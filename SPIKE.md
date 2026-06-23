# SPIKE: selfie -> people ranking via Immich

**Owner question:** can the Immich REST API rank `people` by face-embedding
cosine similarity to a supplied selfie (**Path A**), or must we replicate the
face embeddings into our own pgvector and rank ourselves (**Path B**)?

This doc states both paths, what the probe checks, how to read the result, and
the concrete follow-up wiring in
`apps/api/src/immich/immich.service.ts` (`rankPeopleForSelfie`).

---

## TL;DR (preliminary read from the Immich source)

**Path A is available, with a caveat.** Immich exposes face-embedding cosine
ranking through ONE public route only:

```
GET /api/people?closestPersonId=<personId>   # rank people vs a person's feature face
GET /api/people?closestAssetId=<faceId>      # rank people vs a specific FACE embedding
```

Both internally `ORDER BY face_search.embedding <=> <reference embedding>`
(pgvector cosine distance, HNSW index). There is **no** generic
"give me an embedding, get ranked faces" endpoint, and `closestAssetId` is
misleadingly named: it is matched against `face_search.faceId` (=
`asset_face.id`), so the value must be a **face id**, not an asset id.

Caveats that make the probe necessary rather than a foregone conclusion:

- The route returns people **ordered** by distance but does **not** return the
  distance itself, so we get a rank, not a score.
- `closestPersonId` only works after Immich's facial-recognition job has
  **clustered** the selfie face into a `person`. Until then the selfie face has
  no `personId`, and we must use `closestAssetId=<faceId>` instead.
- Ranking is over `people` (clustered identities), not raw faces. For BOCC that
  is exactly what we want (rank attendees), so it fits.

If we need true cosine **scores**, or ranking before clustering, or matching
against faces that were never clustered into people, fall back to **Path B**.

Source grounding (cloned `./immich`, OpenAPI `3.0.0-rc.2`):

- `immich/server/src/controllers/person.controller.ts` - `GET /people`.
- `immich/server/src/dtos/person.dto.ts:54-55` - `closestPersonId`,
  `closestAssetId` query params.
- `immich/server/src/services/person.service.ts:52-68` - `closestAssetId` is
  passed straight through as `closestFaceAssetId`; `closestPersonId` is resolved
  to that person's `faceAssetId`.
- `immich/server/src/repositories/person.repository.ts:184-200` -
  `ORDER BY (face_search.embedding for person.faceAssetId) <=> (face_search.embedding for closestFaceAssetId)`.
- `immich/server/src/repositories/search.repository.ts` `searchFaces(...)` -
  full embedding cosine search exists but is **internal only**, never exposed
  via a REST controller.
- `immich/server/src/schema/tables/face-search.table.ts` -
  `face_search(faceId, embedding vector(512))`, HNSW `vector_cosine_ops`.

What is **NOT** a face-ranking endpoint (negative controls in the probe):

- `POST /api/search/smart` - CLIP image/text similarity, not face embeddings.
- `GET /api/search/person?name=` - name string search only.
- `POST /api/search/faces`, `GET /api/faces/{id}/similar` - do not exist (the
  probe expects 404, proving their absence).

---

## Path A vs Path B

### Path A: rank inside Immich, over REST

- Upload the selfie as an asset; let Immich detect its face.
- Read the selfie's `faceId` (and `personId` if already clustered).
- Call `GET /api/people?closestPersonId=` or `?closestAssetId=` to get people
  ordered by similarity.
- Pros: no embedding export, no second vector store to keep in sync, uses the
  same HNSW index Immich already maintains.
- Cons: rank only (no raw distance), depends on Immich's clustering for the
  cleaner `closestPersonId` route, and ties us to Immich's people model.

### Path B: replicate embeddings into our pgvector

- Export per-face rows from Immich's Postgres:
  `{ faceId, assetId, personId, embedding[512] }` from `face_search` joined to
  `asset_face`.
- Store them in our `bocc-postgres` (`pgvector/pgvector:pg16`, host 5433).
- For a selfie: upload to Immich, read the selfie `faceId`, pull that 512-d
  embedding, then run `ORDER BY embedding <=> $selfie LIMIT N` in OUR DB.
- Pros: real cosine **scores**, full control of thresholds and grouping, works
  independent of Immich's clustering state, and decouples us from Immich's
  people API.
- Cons: an export/sync pipeline, a second copy of the embeddings to keep fresh,
  and we own the vector index.

---

## What the probe checks

`scripts/spike-selfie-match.mjs` (zero deps, Node 18+) runs end to end and is
defensive: every probe logs its HTTP status and the run always prints a verdict.

1. Connectivity + auth: `GET /api/server/about`, `GET /api/users/me`.
2. Create an album: `POST /api/albums`.
3. Upload sample gallery images from `samples/` (`POST /api/assets`,
   multipart `assetData` + `deviceAssetId` + `deviceId` + `fileCreatedAt` +
   `fileModifiedAt`); add them to the album (`PUT /api/albums/{id}/assets`).
4. Poll `GET /api/people` and `GET /api/faces?id=<assetId>` until face detection
   has produced people/faces (or the timeout, default 180s).
5. Upload a selfie, then poll `GET /api/faces?id=<selfieAssetId>` to read the
   selfie's `faceId` and `personId`.
6. Probe Path A candidates and negative controls:
   - `GET /api/people?closestPersonId=<personId>` (primary, if clustered)
   - `GET /api/people?closestAssetId=<faceId>` (secondary; value is a face id)
   - a control passing the **asset** id to `closestAssetId` (should mis-rank)
   - `POST /api/search/smart`, `GET /api/search/person` (controls; not faces)
   - `POST /api/search/faces`, `GET /api/faces/{id}/similar` (expected 404)
7. Print **PATH A AVAILABLE** (with the winning endpoint + a top-5 sample) or
   **PATH A NOT CONFIRMED -> Path B**, plus a findings summary.

### Samples

Drop real JPGs with clear, distinct faces into `samples/`: a couple of group
shots containing the same person, plus a close-up named `selfie.jpg`. If
`samples/` is empty the script generates placeholder PNGs so the upload path is
still exercised, but placeholders have no faces, detection finds nothing, and
the run reports **INCONCLUSIVE** (not evidence against Path A). Use real photos
for a real verdict.

### How to interpret the result

- **PATH A AVAILABLE** and you used real faces: wire `rankPeopleForSelfie` to
  the winning endpoint (below). Keep `FACE_MATCH_STRATEGY="api"`.
- **PATH A NOT CONFIRMED** with real faces and the recognition job given time:
  switch to Path B and set `FACE_MATCH_STRATEGY="pgvector"`.
- **INCONCLUSIVE** (placeholder images, or recognition still running): not a
  decision. Add real photos, raise `SPIKE_POLL_TIMEOUT_MS`, re-run.

---

## Follow-up wiring: `rankPeopleForSelfie`

File: `apps/api/src/immich/immich.service.ts`. Today it returns
`{ notImplemented: true }`. Branch on `FACE_MATCH_STRATEGY`.

### Path A wiring (`FACE_MATCH_STRATEGY="api"`)

```text
async rankPeopleForSelfie(selfieAssetId):
  1. Poll GET /api/faces?id={selfieAssetId} until faces.length > 0
     (short bounded loop; bail with notImplemented on timeout).
     faceId   = faces[0].id
     personId = faces[0].person?.id        // may be null pre-clustering
  2. If personId:
        people = GET /api/people?closestPersonId={personId}&size=N
     else:
        people = GET /api/people?closestAssetId={faceId}&size=N   // faceId, not assetId
  3. Return people[] mapped to { personId: p.id, score }, where score is
     derived from rank (e.g. 1 - index/length) because Immich does not return
     the raw cosine distance. Exclude the selfie's own person from results.
```

Notes: `closestAssetId` takes the **face id**. The endpoint returns
`PeopleResponseDto { people: PersonResponseDto[], total, hasNextPage }` already
ordered by similarity; there is no per-row distance field.

### Path B wiring (`FACE_MATCH_STRATEGY="pgvector"`)

```text
Sync (batch / on ingest):
  - From Immich Postgres, export face rows:
      SELECT af.id AS faceId, af.assetId, af.personId, fs.embedding
      FROM asset_face af JOIN face_search fs ON fs.faceId = af.id;
  - Upsert into our pgvector table, e.g.
      face_embedding(face_id uuid pk, asset_id uuid, person_id uuid,
                     embedding vector(512))
    with an HNSW index using vector_cosine_ops.

rankPeopleForSelfie(selfieAssetId):
  1. Upload happened already; poll GET /api/faces?id={selfieAssetId} -> faceId.
  2. Pull that face's embedding (from the export, or a one-off read).
  3. In OUR DB:
       SELECT person_id, MIN(embedding <=> $selfie) AS distance
       FROM face_embedding
       WHERE person_id IS NOT NULL
       GROUP BY person_id
       ORDER BY distance
       LIMIT N;
  4. Return [{ personId, score: 1 - distance }], excluding the selfie's person.
```

Path B gives real cosine scores and does not depend on Immich's clustering, at
the cost of an export/sync pipeline and a second embedding store.

---

## Files in this spike

- `immich-stack/docker-compose.yml`, `.env.example`, `README.md` - minimal
  published-image Immich stack on host port 2283 (its own DB, separate from our
  app's `bocc-postgres` on 5433).
- `scripts/spike-selfie-match.mjs` - the probe described above.
- `samples/` - drop real face photos here before running.
