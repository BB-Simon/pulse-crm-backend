# syntax=docker/dockerfile:1

# All stages share the same Debian-based image so Prisma's query-engine
# binary (resolved at `prisma generate` time) matches the runtime OS/libc —
# an Alpine (musl) runtime with a glibc-built engine would fail at startup.
ARG NODE_IMAGE=node:24-bookworm-slim

# ---- base: shared setup, including OpenSSL which Prisma's query engine
# links against both at `generate` time and at runtime — without it, npm's
# Prisma postinstall step fails outright on the slim image. ----
FROM ${NODE_IMAGE} AS base
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---- deps: full install, needed to compile TypeScript ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# ---- build: compile to dist/ ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod-deps: production-only install, separate from the build's devDeps ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---- runtime: minimal final image ----
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --gid 1001 nodeapp \
  && useradd --uid 1001 --gid nodeapp --no-create-home nodeapp

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nodeapp

EXPOSE 3000

# Runs `prisma migrate deploy` against DATABASE_URL before starting the
# server — see the README/CI docs for the alternative of running migrations
# as a separate deploy step instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
