# BOCC API image (NestJS + Prisma).
#
# Build context is the REPO ROOT (this is a monorepo with npm workspaces), so
# build it as:  docker build -f apps/api/Dockerfile -t bocc-api .
#
# Strategy chosen for reliability over image size: copy the whole repo, run a
# single `npm ci` for all workspaces, `prisma generate`, then `nest build`.
# The final stage carries the installed node_modules and the built dist, and an
# entrypoint runs `prisma migrate deploy` before booting the server.

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL is needed by Prisma's engines on alpine.
RUN apk add --no-cache openssl

# Install all workspace dependencies first (better layer caching).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# Bring in the rest of the source and build the api workspace.
COPY . .
RUN npm run prisma:generate -w @bocc/api \
  && npm run build -w @bocc/api

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# OpenSSL again for the Prisma query engine at runtime.
RUN apk add --no-cache openssl

# Carry the full installed dependency tree (Prisma client + CLI live here) plus
# the compiled API and its Prisma schema/migrations.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Entrypoint: apply migrations, then start the server.
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
