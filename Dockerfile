# syntax=docker/dockerfile:1
# rm-558: multi-arch (linux/amd64 + linux/arm64) with a zero-emulation stage
# list. Every stage that RUNs a toolchain (corepack/pnpm/vite) is pinned to
# BUILDPLATFORM so it executes natively for any --platform target. The
# artifacts those stages produce (web/dist, node_modules) are
# arch-independent: the runtime dependency graph is pure JS — a real --prod
# install (pnpm-workspace.yaml present) yields 31 packages, zero .node
# binaries — so nothing the final image runs differs per TARGETARCH. (The DEV
# toolchain does carry cpu-gated optional deps, a second reason builders stay
# BUILDPLATFORM-native.) The final stage carries the target arch and does
# only cheap target-executed work: COPY plus two RUNs — the libpcre2-8-0
# security upgrade (CVE-2026-103111, added 2026-10-05) and the package-manager
# prune (a measured ~1.4 s rm under QEMU for arm64; RUN has no --platform flag
# and COPY cannot express deletions or package upgrades, so these are the
# minimal target-executed steps the design allows — see the rm-558 CI-time
# note in .github/workflows/release.yaml).
ARG NODE_IMAGE=node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder

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
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS prod-deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.28.3 --activate

WORKDIR /app

# Copy manifests for prod-only install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production deps only (frozen lockfile) — NO dev deps, NO build tools
RUN pnpm install --frozen-lockfile --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
# 2026-10-05 (run 5e661558 cycle:1): REVERSED — this stage had retired the
# in-image libpcre2-8-0 patch on 2026-09-20 believing the pinned base digest
# (0e0ff40) absorbed the fix; it does not: the base ships 10.42-1+deb12u1,
# which carries CVE-2026-103111 (HIGH; the fixed Debian revision is
# 10.42-1+deb12u2), and Release's enforcing trivy step (release.yaml, exit 1
# on unfixed HIGH/CRITICAL) measured 8 HIGH at the base image → 1 after the
# strip (this CVE) → 0 after the upgrade RUN below. --only-upgrade makes the
# layer a no-op once a future base digest ships deb12u2+. History:
# docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md

FROM ${NODE_IMAGE}

WORKDIR /app

# CVE-2026-103111 (HIGH): upgrade the base's libpcre2-8-0 (10.42-1+deb12u1)
# to the deb12u2 security revision — the second of the final stage's two
# target-executed RUNs (see the header). --no-install-recommends + the
# apt-lists cleanup keep the layer from adding anything but the upgrade.
RUN apt-get update && apt-get install -y --no-install-recommends --only-upgrade libpcre2-8-0 && rm -rf /var/lib/apt/lists/*

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
# rm-558: the only target-platform RUN in the file (see the header comment).
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
