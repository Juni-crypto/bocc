#!/usr/bin/env node
/**
 * BOCC selfie-match spike.
 *
 * Question this answers: can the Immich REST API rank `people` by face-embedding
 * cosine similarity to a supplied selfie (PATH A), or must we replicate the
 * face embeddings into our own pgvector and rank ourselves (PATH B)?
 *
 * Zero dependencies. Uses global fetch / FormData / Blob (Node 18+; tested on 20+).
 *
 * Run:
 *   export IMMICH_URL=http://localhost:2283
 *   export IMMICH_API_KEY=<key from the Immich UI>
 *   node scripts/spike-selfie-match.mjs
 *
 * Defensive by design: every probe is wrapped, logs its HTTP status, and never
 * crashes the whole run. The verdict is printed at the end regardless.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SAMPLES_DIR = join(REPO_ROOT, 'samples');

const BASE = (process.env.IMMICH_URL ?? 'http://localhost:2283').replace(/\/$/, '');
const KEY = process.env.IMMICH_API_KEY ?? '';

const POLL_TIMEOUT_MS = Number(process.env.SPIKE_POLL_TIMEOUT_MS ?? 180000);
const POLL_INTERVAL_MS = Number(process.env.SPIKE_POLL_INTERVAL_MS ?? 5000);

// ---- tiny logging helpers ---------------------------------------------------

let step = 0;
const hr = () => console.log('-'.repeat(72));
const head = (t) => {
  hr();
  console.log(`STEP ${++step}: ${t}`);
  hr();
};
const ok = (m) => console.log(`  [ok]   ${m}`);
const info = (m) => console.log(`  [info] ${m}`);
const warn = (m) => console.log(`  [warn] ${m}`);
const fail = (m) => console.log(`  [FAIL] ${m}`);

// ---- HTTP -------------------------------------------------------------------

/**
 * One request. Returns { ok, status, body } and never throws for HTTP errors;
 * only genuine network/transport failures reject, and callers catch those.
 */
async function call(method, path, { json, form } = {}) {
  const headers = { 'x-api-key': KEY, accept: 'application/json' };
  let body;
  if (form) {
    body = form; // fetch sets multipart boundary
  } else if (json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  let parsed = null;
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

/** Probe wrapper: logs the attempt + status, returns the result or null. */
async function probe(label, method, path, opts) {
  try {
    const r = await call(method, path, opts);
    const tag = r.ok ? 'ok' : 'non-2xx';
    console.log(`  [probe] ${method} ${path} -> ${r.status} (${tag})`);
    return r;
  } catch (e) {
    console.log(`  [probe] ${method} ${path} -> network error: ${e.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (obj, n = 600) => {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return s.length > n ? s.slice(0, n) + ' ...[truncated]' : s;
};

// ---- sample image handling --------------------------------------------------

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

/**
 * A 1x1-ish valid PNG. Used only when samples/ is empty so the upload path is
 * still exercised end to end. These have NO real faces, so face detection will
 * find nothing: the run then ends INCONCLUSIVE and tells the user to add real
 * photos. We never pretend a placeholder is a face.
 */
function placeholderPng() {
  // Minimal valid 1x1 PNG.
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4' +
      '890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex',
  );
}

async function ensureSamples() {
  if (!existsSync(SAMPLES_DIR)) await mkdir(SAMPLES_DIR, { recursive: true });
  const all = (await readdir(SAMPLES_DIR)).filter((f) => IMG_EXT.has(extname(f).toLowerCase()));
  if (all.length > 0) {
    info(`found ${all.length} sample image(s) in samples/`);
    return { files: all, synthetic: false };
  }
  warn('samples/ is empty -> generating placeholder PNGs (NO real faces).');
  warn('Drop real JPGs with clear faces (+ a selfie.jpg) into samples/ for a meaningful result.');
  const gen = ['gallery-1.png', 'gallery-2.png', 'selfie.png'];
  for (const f of gen) await writeFile(join(SAMPLES_DIR, f), placeholderPng());
  return { files: gen, synthetic: true };
}

/** Pick the selfie file: prefer one named selfie.*, else the last image. */
function pickSelfie(files) {
  const named = files.find((f) => /^selfie\b/i.test(basename(f, extname(f))));
  return named ?? files[files.length - 1];
}

async function uploadAsset(file) {
  const ext = extname(file).toLowerCase();
  const buf = await readFile(join(SAMPLES_DIR, file));
  const form = new FormData();
  form.append('assetData', new Blob([buf], { type: MIME[ext] ?? 'application/octet-stream' }), file);
  form.append('deviceAssetId', `${file}-${Date.now()}`);
  form.append('deviceId', 'bocc-spike');
  const now = new Date().toISOString();
  form.append('fileCreatedAt', now);
  form.append('fileModifiedAt', now);
  const r = await call('POST', '/api/assets', { form });
  if (!r.ok) {
    fail(`upload ${file} -> ${r.status} ${short(r.body)}`);
    return null;
  }
  // AssetMediaResponseDto: { id, status: 'created' | 'duplicate' }
  info(`uploaded ${file} -> asset ${r.body?.id} (${r.body?.status})`);
  return r.body?.id ?? null;
}

// ---- main -------------------------------------------------------------------

async function main() {
  console.log('\n=== BOCC selfie-match spike ===');
  console.log(`Immich: ${BASE}`);
  if (!KEY) {
    fail('IMMICH_API_KEY is not set. Export it and re-run. Aborting.');
    process.exit(2);
  }

  // sanity: server reachable + key valid
  head('Connectivity + auth');
  const ping = await probe('about', 'GET', '/api/server/about');
  const me = await probe('me', 'GET', '/api/users/me');
  if (!me || !me.ok) {
    fail('Could not authenticate (GET /api/users/me failed). Check IMMICH_URL + IMMICH_API_KEY.');
    process.exit(2);
  }
  ok(`authenticated as ${me.body?.email ?? me.body?.name ?? 'user'}; server v${ping?.body?.version ?? '?'}`);

  // 1) album
  head('Create album');
  const album = await call('POST', '/api/albums', {
    json: { albumName: `BOCC spike ${new Date().toISOString()}` },
  });
  let albumId = null;
  if (album.ok) {
    albumId = album.body?.id;
    ok(`album created: ${albumId}`);
  } else {
    fail(`album create -> ${album.status} ${short(album.body)} (continuing without album)`);
  }

  // 2) upload gallery samples
  head('Upload sample gallery images');
  const sample = await ensureSamples();
  const galleryFiles = sample.files.filter((f) => f !== pickSelfie(sample.files));
  const galleryIds = [];
  for (const f of galleryFiles) {
    const id = await uploadAsset(f);
    if (id) galleryIds.push(id);
  }
  if (albumId && galleryIds.length) {
    const add = await call('PUT', `/api/albums/${albumId}/assets`, { json: { ids: galleryIds } });
    info(`add ${galleryIds.length} asset(s) to album -> ${add.status}`);
  }
  if (!galleryIds.length) fail('no gallery assets uploaded; downstream steps will be thin.');

  // 3) poll for face detection
  head('Poll until face detection has run');
  info(`polling /api/people and /api/faces for up to ${Math.round(POLL_TIMEOUT_MS / 1000)}s ...`);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let people = [];
  let detectedAny = false;
  while (Date.now() < deadline) {
    const pe = await call('GET', '/api/people', {});
    people = Array.isArray(pe.body?.people) ? pe.body.people : [];
    // also check faces on the first gallery asset
    let facesOnFirst = 0;
    if (galleryIds[0]) {
      const fr = await call('GET', `/api/faces?id=${galleryIds[0]}`, {});
      facesOnFirst = Array.isArray(fr.body) ? fr.body.length : 0;
    }
    info(`people=${people.length} facesOnFirstAsset=${facesOnFirst}`);
    if (people.length > 0 || facesOnFirst > 0) {
      detectedAny = true;
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  if (detectedAny) ok(`face detection produced ${people.length} person record(s).`);
  else warn('no faces/people detected within the timeout (expected if using placeholder images).');

  // 4) upload the selfie + read its detected face
  head('Upload selfie + read its face');
  const selfieFile = pickSelfie(sample.files);
  info(`selfie file: ${selfieFile}`);
  const selfieAssetId = await uploadAsset(selfieFile);
  let selfieFaceId = null;
  let selfiePersonId = null;
  if (selfieAssetId) {
    // wait briefly for the selfie's own face detection
    const fdl = Date.now() + Math.min(60000, POLL_TIMEOUT_MS);
    while (Date.now() < fdl) {
      const fr = await call('GET', `/api/faces?id=${selfieAssetId}`, {});
      const faces = Array.isArray(fr.body) ? fr.body : [];
      if (faces.length) {
        selfieFaceId = faces[0]?.id ?? null;
        selfiePersonId = faces[0]?.person?.id ?? null;
        ok(`selfie face: faceId=${selfieFaceId} personId=${selfiePersonId ?? '(unassigned)'}`);
        break;
      }
      info('selfie face not ready yet ...');
      await sleep(POLL_INTERVAL_MS);
    }
    if (!selfieFaceId) warn('selfie face never appeared (no detectable face, or detection still pending).');
  }

  // 5) probe the ranking endpoints
  head('Probe face-ranking endpoints (Path A candidates)');
  const findings = [];

  // 5a) PATH A primary: GET /people?closestPersonId=<personId>
  // Internally resolves the person's feature face and ORDER BY embedding <=> ...
  if (selfiePersonId) {
    const r = await probe('people?closestPersonId', 'GET', `/api/people?closestPersonId=${selfiePersonId}&size=50`);
    if (r?.ok && Array.isArray(r.body?.people)) {
      findings.push({
        path: `GET /api/people?closestPersonId=<personId>`,
        works: true,
        note: 'people returned in cosine-similarity order to the selfie person feature face',
        sample: r.body.people.slice(0, 5).map((p) => ({ id: p.id, name: p.name })),
      });
    } else {
      findings.push({ path: 'GET /api/people?closestPersonId=', works: false, status: r?.status });
    }
  } else {
    info('skip closestPersonId probe: selfie has no assigned person yet (needs facial-recognition clustering).');
    findings.push({ path: 'GET /api/people?closestPersonId=', works: false, note: 'no selfie personId available' });
  }

  // 5b) PATH A secondary: GET /people?closestAssetId=<faceId>
  // NOTE: despite the name, the value is matched against face_search.faceId,
  // i.e. it must be a FACE id (asset_face.id), not an asset id. We pass the
  // selfie's detected faceId.
  if (selfieFaceId) {
    const r = await probe('people?closestAssetId(faceId)', 'GET', `/api/people?closestAssetId=${selfieFaceId}&size=50`);
    if (r?.ok && Array.isArray(r.body?.people)) {
      findings.push({
        path: `GET /api/people?closestAssetId=<faceId>`,
        works: true,
        note: 'people returned in cosine-similarity order to the selfie face embedding',
        sample: r.body.people.slice(0, 5).map((p) => ({ id: p.id, name: p.name })),
      });
    } else {
      findings.push({ path: 'GET /api/people?closestAssetId=', works: false, status: r?.status });
    }
    // control: also try passing the ASSET id (expected to mis-rank or 404/empty,
    // proving the param is a face id not an asset id).
    if (selfieAssetId) {
      await probe('people?closestAssetId(assetId control)', 'GET', `/api/people?closestAssetId=${selfieAssetId}&size=5`);
    }
  } else {
    info('skip closestAssetId probe: no selfie faceId available.');
    findings.push({ path: 'GET /api/people?closestAssetId=', works: false, note: 'no selfie faceId available' });
  }

  // 5c) Negative controls: confirm these do NOT do face-embedding ranking.
  // /search/smart is CLIP image/text similarity, NOT face embeddings.
  if (selfieAssetId) {
    await probe('search/smart(queryAssetId)', 'POST', '/api/search/smart', {
      json: { queryAssetId: selfieAssetId, size: 5 },
    });
  }
  // /search/person is NAME search only.
  await probe('search/person(name)', 'GET', '/api/search/person?name=a');
  // A dedicated face-similarity search route does not exist in the spec; probe
  // a couple of plausible names to prove their absence (expect 404).
  await probe('search/faces (guess)', 'POST', '/api/search/faces', { json: { faceId: selfieFaceId } });
  await probe('faces/{id}/similar (guess)', 'GET', selfieFaceId ? `/api/faces/${selfieFaceId}/similar` : '/api/faces/none/similar');

  // 6) verdict
  head('VERDICT');
  const pathAWorks = findings.some((f) => f.works);
  if (pathAWorks) {
    const winners = findings.filter((f) => f.works);
    console.log('\n  >>> PATH A AVAILABLE <<<\n');
    console.log('  Immich CAN rank people by face-embedding cosine similarity via:');
    for (const w of winners) {
      console.log(`    - ${w.path}`);
      console.log(`        ${w.note ?? ''}`);
      console.log(`        sample (top 5): ${short(w.sample)}`);
    }
    console.log('\n  Wiring (apps/api/src/immich/immich.service.ts rankPeopleForSelfie):');
    console.log('    1. Upload selfie via uploadAsset (already implemented).');
    console.log('    2. Poll GET /api/faces?id=<selfieAssetId> until a face appears; take faces[0].id (faceId)');
    console.log('       and faces[0].person?.id (personId, may be null until clustering runs).');
    console.log('    3a. If personId present: GET /api/people?closestPersonId=<personId>&size=N');
    console.log('    3b. Else: GET /api/people?closestAssetId=<faceId>&size=N   (closestAssetId == FACE id).');
    console.log('    4. Map the returned people[] order to { personId, score } (order = rank; Immich does not');
    console.log('       return the raw distance, so derive a rank-based score or fetch distances via Path B).');
  } else {
    console.log('\n  >>> PATH A NOT CONFIRMED in this run -> consider PATH B (pgvector) <<<\n');
    console.log('  Either no face was detected (placeholder/blurry images), recognition had not finished,');
    console.log('  or the ranking endpoints did not return ordered people. If you used REAL faces and gave');
    console.log('  the job time, and the closest* probes still failed, fall back to PATH B:');
    console.log('');
    console.log('  PATH B (replicate embeddings into our pgvector):');
    console.log('    - Immich stores 512-d face embeddings in its DB table `face_search.embedding`');
    console.log('      (pgvector, HNSW index, vector_cosine_ops), keyed by `face_search.faceId`');
    console.log('      = `asset_face.id`. `asset_face` carries assetId, personId, bounding box.');
    console.log('    - Export per face: { faceId, assetId, personId, embedding[512] } from Immich Postgres');
    console.log('      and copy into our bocc-postgres (pgvector/pgvector:pg16, host 5433).');
    console.log('    - For a selfie: upload to Immich, read its faceId, pull that embedding, then run');
    console.log('      `ORDER BY embedding <=> $selfieEmbedding LIMIT N` in OUR DB to rank people, with the');
    console.log('      actual cosine distance available as the score.');
    console.log('    - Set FACE_MATCH_STRATEGY="pgvector" in apps/api/.env and implement rankPeopleForSelfie');
    console.log('      against our DB instead of the Immich REST API.');
  }

  console.log('\n  Findings summary:');
  for (const f of findings) {
    console.log(`    - ${f.path}: ${f.works ? 'WORKS' : 'no'}${f.status ? ` (status ${f.status})` : ''}${f.note ? ` [${f.note}]` : ''}`);
  }

  if (sample.synthetic) {
    console.log('\n  NOTE: this run used GENERATED placeholder images (no real faces), so a');
    console.log('  PATH A "not confirmed" result here is EXPECTED and not evidence either way.');
    console.log('  Put real face photos in samples/ and re-run for a real verdict.');
  }
  console.log('');
}

main().catch((e) => {
  // last-resort guard: never crash without printing something useful
  console.error('\n[fatal] unexpected error (the script should normally absorb probe failures):');
  console.error(e);
  process.exit(1);
});
