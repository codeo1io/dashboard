FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS builder

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.28.3 --activate

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
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS prod-deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.28.3 --activate

WORKDIR /app

# Copy manifests for prod-only install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production deps only (frozen lockfile) — NO dev deps, NO build tools
RUN pnpm install --frozen-lockfile --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
# 2026-10-04: in-image libpcre2-8-0 patch RE-INTRODUCED (rm-634 class) — the
# Release trivy gate enforces CVE-2026-103111 (fixed in 10.42-1+deb12u2), but
# the pinned digest (0e0ff40) still ships deb12u1: the 2026-09-20 retirement
# assumed the fix was absorbed at the base, and the tag has not been republished
# since. Retire this again only when a digest carrying >= deb12u2 can be pinned.
# History: docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md

FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

WORKDIR /app

# CVE-2026-103111: upgrade the vulnerable base package in-image (root context
# required — USER node comes later). --only-upgrade never pulls a new package;
# lists are dropped afterwards to keep the layer lean.
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
