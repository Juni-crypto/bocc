#!/usr/bin/env node
// Create or promote the BOCC super admin.
//   node scripts/create-admin.mjs [email] [password] [name]
// or via env: ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envVal = (file, key) => {
  try {
    const m = readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m ? m[1].replace(/^"|"$/g, '').trim() : undefined;
  } catch {
    return undefined;
  }
};
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  envVal(join(ROOT, 'apps/api/.env'), 'DATABASE_URL') ||
  envVal(join(ROOT, '.env'), 'DATABASE_URL');

const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@bocc.app').toLowerCase().trim();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'bocc-super-admin';
const name = process.argv[4] || process.env.ADMIN_NAME || 'Super Admin';

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);
const user = await prisma.user.upsert({
  where: { email },
  update: { role: 'ADMIN', passwordHash, name },
  create: { email, passwordHash, name, role: 'ADMIN' },
});
console.log(`Super admin ready: ${user.email} (role ${user.role})`);
console.log(`Sign in at /login with that email and the password you set.`);
await prisma.$disconnect();
