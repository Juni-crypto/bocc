#!/usr/bin/env node
// End-to-end REAL face-match demo against the running stack.
//   create event -> upload gallery photos (incl. faces) -> wait for Immich face
//   detection -> run facial recognition (cluster into people) -> find-me with
//   one person's selfie -> print the matched set.
//
// Reads IMMICH_URL + IMMICH_API_KEY from apps/api/.env. Zero deps.
//   node scripts/demo-face-match.mjs <selfie.jpg> <galleryImg...>
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const API = process.env.BOCC_API || 'http://localhost:4000/api';
const env = readFileSync(new URL('../apps/api/.env', import.meta.url), 'utf8');
const IMMICH = (env.match(/^IMMICH_URL=(.*)$/m)?.[1] || 'http://localhost:2283').trim();
const KEY = (env.match(/^IMMICH_API_KEY="?([^"\n]*)"?$/m)?.[1] || '').trim();

const [selfie, ...gallery] = process.argv.slice(2);
if (!selfie || !gallery.length) {
  console.error('usage: node scripts/demo-face-match.mjs <selfie.jpg> <galleryImg...>');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imm = (p, init = {}) =>
  fetch(`${IMMICH}${p}`, { ...init, headers: { 'x-api-key': KEY, ...(init.headers || {}) } });
const part = (form, field, path) =>
  form.append(field, new Blob([new Uint8Array(readFileSync(path))]), basename(path));
const jpost = async (p, b) => {
  const r = await fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  if (!r.ok) throw new Error(`${p} -> ${r.status} ${await r.text()}`);
  return r.json();
};

(async () => {
  console.log(`Immich ${IMMICH} (key ${KEY ? 'ok' : 'MISSING'})\n`);

  const ev = await jpost('/events', { name: 'Face Match Demo', type: 'BIRTHDAY', faceMatching: true });
  console.log(`1. event ${ev.slug}  album ${ev.immichAlbumId}`);
  const { member } = await jpost(`/events/${ev.slug}/join`, { name: 'Demo', consentFaceMatch: true });

  const upForm = new FormData();
  upForm.append('memberId', member.id);
  gallery.forEach((g) => part(upForm, 'files', g));
  const up = await (await fetch(`${API}/events/${ev.slug}/photos`, { method: 'POST', body: upForm })).json();
  console.log(`2. uploaded ${up.uploaded} photos`);
  const assetIds = up.photos.map((p) => p.assetId);

  console.log('3. wait for face detection on the uploaded assets');
  let detected = 0;
  for (let i = 0; i < 45; i++) {
    let total = 0;
    for (const id of assetIds) {
      const faces = await (await imm(`/api/faces?id=${id}`)).json();
      total += Array.isArray(faces) ? faces.length : 0;
    }
    detected = total;
    process.stdout.write(`\r   faces=${detected} t=${i * 4}s   `);
    if (detected > 0) break;
    await sleep(4000);
  }
  console.log();

  console.log('4. run facial recognition (cluster faces into people)');
  await imm('/api/jobs/facialRecognition', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'start', force: true }),
  });
  let people = 0;
  for (let i = 0; i < 45; i++) {
    people = (await (await imm('/api/people')).json()).total ?? 0;
    process.stdout.write(`\r   people=${people} t=${i * 3}s   `);
    if (people > 0) break;
    await sleep(3000);
  }
  console.log();

  console.log('5. find-me with the selfie (real Path A: faces -> people closestAsset -> resolve)');
  const fmForm = new FormData();
  fmForm.append('memberId', member.id);
  part(fmForm, 'selfie', selfie);
  const res = await (await fetch(`${API}/events/${ev.slug}/find-me`, { method: 'POST', body: fmForm })).json();
  console.log('\nRESULT:', JSON.stringify(res, null, 2));
})().catch((e) => { console.error('DEMO FAILED:', e.message); process.exit(1); });
