# BOCC web image (Next.js 15).
#
# Build context is the REPO ROOT (npm workspaces monorepo), so build as:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=http://your-host:4000/api -t bocc-web .
#
# NEXT_PUBLIC_API_URL is a BUILD-TIME value in Next.js (it is inlined into the
# client bundle), so it is wired in as a build ARG -> ENV before `next build`.
# We use a plain `next build` + `next start` (no standalone tracing) for
# reliability inside a monorepo.

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Install all workspace dependencies first (better layer caching).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# Bring in the source and build the web workspace.
COPY . .
RUN npm run build -w @bocc/web

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Carry the installed dependency tree and the built web app.
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json
COPY --from=builder /app/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
