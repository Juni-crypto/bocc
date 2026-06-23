#!/usr/bin/env node
// Provisions a fresh Immich instance for BOCC and wires it into apps/api/.env.
//   1. wait for the server to answer
//   2. create the admin account (first-run onboarding)
//   3. log in, mint an API key
//   4. write IMMICH_ENABLED / IMMICH_URL / IMMICH_API_KEY into apps/api/.env
//
// Zero deps. Usage:
//   node scripts/setup-immich.mjs
// Env overrides: IMMICH_URL, IMMICH_ADMIN_EMAIL, IMMICH_ADMIN_PASSWORD, IMMICH_ADMIN_NAME
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = (process.env.IMMICH_URL || 'http://localhost:2283').replace(/\/$/, '');
const EMAIL = process.env.IMMICH_ADMIN_EMAIL || 'admin@bocc.local';
const PASSWORD = process.env.IMMICH_ADMIN_PASSWORD || 'bocc-admin-1';
const NAME = process.env.IMMICH_ADMIN_NAME || 'BOCC Admin';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(path, init) {
  const res = await fetch(`${URL}${path}`, init);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function waitForServer() {
  process.stdout.write('Waiting for Immich');
  for (let i = 0; i < 120; i++) {
    for (const p of ['/api/server/ping', '/api/server-info/ping']) {
      try {
        const r = await jget(p);
        if (r.ok) { console.log(` up (${p})`); return; }
      } catch { /* not ready */ }
    }
    process.stdout.write('.');
    await sleep(2000);
  }
  throw new Error('Immich did not come up within ~4 minutes.');
}

async function ensureAdmin() {
  const r = await jget('/api/auth/admin-sign-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }),
  });
  if (r.ok) { console.log('Admin account created.'); return; }
  // already exists -> Immich returns 400; that is fine
  console.log(`Admin sign-up: ${r.status} (likely already exists, continuing).`);
}

async function login() {
  const r = await jget('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status} ${JSON.stringify(r.body)}`);
  console.log('Logged in.');
  return r.body.accessToken;
}

async function mintApiKey(token) {
  // try with explicit permissions first (newer Immich), fall back to bare name
  for (const body of [{ name: 'bocc-bff', permissions: ['all'] }, { name: 'bocc-bff' }]) {
    const r = await jget('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (r.ok) { console.log('API key minted.'); return r.body.secret; }
    console.log(`api-keys POST ${JSON.stringify(body)} -> ${r.status}`);
  }
  throw new Error('Could not mint an API key.');
}

function writeEnv(secret) {
  const envPath = join(ROOT, 'apps', 'api', '.env');
  let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const set = (k, v) => {
    const line = `${k}=${v}`;
    env = new RegExp(`^${k}=.*$`, 'm').test(env)
      ? env.replace(new RegExp(`^${k}=.*$`, 'm'), line)
      : (env.endsWith('\n') || env === '' ? env : env + '\n') + line + '\n';
  };
  set('IMMICH_ENABLED', 'true');
  set('IMMICH_URL', URL);
  set('IMMICH_API_KEY', `"${secret}"`);
  writeFileSync(envPath, env);
  console.log(`Wrote IMMICH_* into ${envPath}`);
}

(async () => {
  await waitForServer();
  await ensureAdmin();
  const token = await login();
  const secret = await mintApiKey(token);
  writeEnv(secret);
  console.log('\nDone. Restart the API so it picks up the new env:');
  console.log('  npm run api:dev   (or rebuild + node dist/main.js)');
})().catch((e) => { console.error('\nSETUP FAILED:', e.message); process.exit(1); });
