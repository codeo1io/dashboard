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
# only cheap filesystem work: COPY plus one prune RUN — the only step that
# executes on the target (a measured ~1.4 s rm under QEMU for arm64; RUN has no
# --platform flag and COPY cannot express deletions, so this is the minimal
# target-executed step the design allows — see the rm-558 CI-time note in
# .github/workflows/release.yaml).
ARG NODE_IMAGE=node:24-trixie-slim@sha256:173f125896c3087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

# rm-1483 (#641 port): release-channel tag baked into the SPA at build time.
# release.yaml passes the calver tag as a build-arg; 'dev' keeps local builds
# from showing a bogus version in the footer.
ARG DASHBOARD_VERSION=dev

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder

# Re-declared for use inside this stage (global ARGs only feed FROM lines).
ARG DASHBOARD_VERSION

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.28.5 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL deps (including devDependencies) for the build step
RUN pnpm install --frozen-lockfile

# Copy web workspace source
COPY web/ ./web/

# Vite bakes VITE_* env into the bundle at build time (rm-1483 #641).
ENV VITE_DASHBOARD_VERSION=$DASHBOARD_VERSION

# Build the SPA — emits hashed assets to web/dist/
RUN pnpm build:web

# ── Production dependency stage ───────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS prod-deps

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@11.28.5 --activate

WORKDIR /app

# Copy manifests for prod-only install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production deps only (frozen lockfile) — NO dev deps, NO build tools
RUN pnpm install --frozen-lockfile --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
# 2026-09-20: in-image libpcre2-8-0 patch retired — the pinned base digest
# (0e0ff40, upstream #492) ships libpcre2-8-0 10.42-1+deb12u1, so the fix is
# absorbed at the base. History: docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md

FROM ${NODE_IMAGE}

WORKDIR /app


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

# rm-743: container-level liveness truth (was: no HEALTHCHECK — an orchestrator
# restarting the container on a dead server was indistinguishable from one
# restarting it for any other reason). The probe hits /api/healthz and gates on
# HTTP `r.ok` ONLY: /api/healthz is constant-200 liveness (never touches the
# aggregator/store, rm-205's 2026-09-19 pinning), so snapshot staleness can
# NEVER flip the container unhealthy — staleness visibility belongs to the
# dashboard UI's own fields (rm-708, unlanded) once they exist, never here.
# Tuning vs the aggregator cadence (60_000ms refresh, src/github/aggregator.ts
# DEFAULT_REFRESH_INTERVAL_MS): interval 30s is half a refresh cycle, retries 3
# means 90s of CONSECUTIVE dead probes before unhealthy — at least one full
# refresh cycle of noise tolerance, so a single slow cycle cannot flap the
# container. node:24-slim ships no curl/wget, so the probe is a node fetch
# one-liner using the runtime the CMD already uses (adding curl to the image
# would grow the Trivy surface for no other need). The URL hard-codes the
# DASHBOARD_PORT default (3000): a deployment overriding DASHBOARD_PORT must
# override this HEALTHCHECK to match (documented in docs/runbooks/release.md).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "src/server.ts"]
