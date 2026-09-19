FROM node:24-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.27.0 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL deps (including devDependencies) for the build step
RUN pnpm install --frozen-lockfile

# Copy web workspace source
COPY web/ ./web/

# Build the SPA — emits hashed assets to web/dist/
RUN pnpm build:web

# ── Production dependency stage ───────────────────────────────────────────────
FROM node:24-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS prod-deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.27.0 --activate

WORKDIR /app

# Copy manifests for prod-only install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production deps only (frozen lockfile) — NO dev deps, NO build tools
RUN pnpm install --frozen-lockfile --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553

WORKDIR /app

# Patch OS packages that have a published distro fix the pinned base digest has
# not yet absorbed (digest verified current against the registry). Dependabot's
# docker ecosystem (.github/dependabot.yml, staged 2026-09-19) proposes base-digest
# bump PRs once it lands — review rule: the pin holds until a REBUILT base both
# clears the Trivy gate and lets this in-image delta be re-audited/absorbed
# (pin-and-patch by design, per the triage doc below). Only packages named here are
# upgraded — the delta stays auditable against the pinned digest. Triage order:
# docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md
# 2026-09-17: libpcre2-8-0 10.42-1 -> 10.42-1+deb12u1 (CVE-2026-86145/89157/89161, HIGH, fixed)
RUN apt-get update \
      && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 \
      && rm -rf /var/lib/apt/lists/*

# Copy only the production dependency tree. Package manifests and package-manager
# state never enter the final image.
COPY --from=prod-deps /app/node_modules/ ./node_modules/

# Copy source (backend runtime — Node 24 strip-only, no build step)
COPY src/ ./src/
COPY public/ ./public/

# Copy prebuilt SPA assets from builder stage
COPY --from=builder /app/web/dist/ ./web/dist/

# Mark this as a production runtime so NODE_ENV-gated guards (e.g. devAutoLogin)
# fire correctly. The builder stage intentionally does NOT set this so pnpm install
# and pnpm build:web run with full dev-dep access.
ENV NODE_ENV=production

# Remove package-manager binaries, shims, and caches inherited from the Node base
# image before handing the filesystem to the unprivileged runtime user.
RUN rm -rf \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/pnpm \
      /usr/local/bin/pnpx \
      /usr/local/bin/corepack \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /root/.cache \
      /root/.npm \
      /root/.local/share/pnpm \
      /usr/local/share/.cache

USER node

EXPOSE 3000

CMD ["node", "src/server.ts"]
