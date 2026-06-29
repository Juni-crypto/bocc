#!/bin/sh
# BOCC API container entrypoint.
# Applies pending Prisma migrations against DATABASE_URL, then boots the server.
set -e

echo "[bocc-api] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[bocc-api] Starting API on port ${PORT:-4000}..."
exec node dist/main.js
