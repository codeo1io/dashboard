# syntax=docker/dockerfile:1
# rm-558: multi-arch (linux/amd64 + linux/arm64) with a zero-emulation stage
# list. Every stage that RUNs a toolchain (bun/vite) is pinned to
# BUILDPLATFORM so it executes natively for any --platform target. The
# artifacts those stages produce (web/dist, node_modules) are
# arch-independent: the runtime dependency graph is pure JS — a real --prod
# install (bunfig.toml present) yields 31 packages, zero .node
# binaries — so nothing the final image runs differs per TARGETARCH. (The DEV
# toolchain does carry cpu-gated optional deps, a second reason builders stay
# BUILDPLATFORM-native.) The final stage carries the target arch and does
# only cheap filesystem work: COPY plus one prune RUN — the only step that
# executes on the target (a measured ~1.4 s rm under QEMU for arm64; RUN has no
# --platform flag and COPY cannot express deletions, so this is the minimal
# target-executed step the design allows — see the rm-558 CI-time note in
# .github/workflows/release.yaml).
ARG NODE_IMAGE=node:24-trixie-slim@sha256:54f84b4cf8432b21aaffd5d3ce8d41e12cea0d10d33c09d2f3c9879d49d6b446

# rm-1483 (#641 residual, run 9511a1b5): release-channel tag baked into the
# SPA at build time. release.yaml passes the calver tag as a build-arg; 'dev'
# keeps local builds from showing a bogus version in the footer.
ARG DASHBOARD_VERSION=dev

# ── Bun toolchain stage ───────────────────────────────────────────────────────
# Digest-pinned multi-arch index. The bare version tag must equal package.json
# packageManager (enforced by test/bun-version-pin.test.ts). Only the bun binary
# is copied out of this stage; nothing from it reaches the runtime image.
# rm-558 (Bun-migration repair, 2026-10-19): pinned to BUILDPLATFORM like every
# other toolchain stage — under multi-platform builds the index otherwise
# resolves the TARGET arch (aarch64 bun copied into the amd64 node stage →
# '/lib/ld-linux-aarch64.so.1' loader failure in prod-deps; release run
# 39255231972). Bun is a static binary; the build-platform one serves both
# targets.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS bun

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder

# Re-declared for use inside this stage (global ARGs only feed FROM lines).
ARG DASHBOARD_VERSION

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy manifests first for layer caching. (No workspace members: the excluded
# upstream capability is never absorbed — rm-252/259 — so only the root
# manifest is copied.)
COPY package.json bun.lock bunfig.toml ./

# Install ALL deps (including devDependencies) for the build step
RUN bun install --frozen-lockfile

# Copy web workspace source
COPY web/ ./web/

# rm-602: build:web chains this one zero-dependency script (gzip-9 sidecars
# for the precompressed serveStatic mounts), so the builder stage needs it in
# the image — everything else under scripts/ stays sealed out of the context
# (.dockerignore's scripts/* entry with this single re-inclusion).
COPY scripts/gzip-static-sidecars.ts ./scripts/

# Vite bakes VITE_* env into the bundle at build time (rm-1483 #641).
ENV VITE_DASHBOARD_VERSION=$DASHBOARD_VERSION

# Build the SPA — emits hashed assets to web/dist/
RUN bun run build:web

# ── Production dependency stage ───────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS prod-deps

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Copy manifests for prod-only install. (No workspace members per rm-252/259;
# the root manifest alone satisfies the frozen lockfile.)
COPY package.json bun.lock bunfig.toml ./

# Install the root package's production deps only (frozen lockfile) — NO dev deps,
# NO build tools, NO lifecycle scripts.
RUN bun install --filter './' --production --frozen-lockfile --ignore-scripts

# ── Runtime stage ─────────────────────────────────────────────────────────────
# 2026-09-20: in-image libpcre2-8-0 patch retired — the then-pinned base digest
# (0e0ff40, upstream #492) shipped libpcre2-8-0 10.42-1+deb12u1, so the fix is
# absorbed at the base. 2026-10-15 (rm-863): the base digest is re-pinned on
# the ARG line above (7f486c at the 2026-10-20 integrate; 173f1258 at the
# rm-863 batch, moved again by later base refreshes — never cite it as fixed);
# the retirement claim was verified against 0e0ff40 only, so re-verify the
# current base's libpcre2-8-0 version (dpkg-query) before relying on it
# whenever the digest moves again (moved again 2026-10-30: 54f84b4, upstream
# #737 via the 2026.10.78 adoption — re-verify before the next release claim).
# History: docs/solutions/best-practices/trivy-base-image-alerts-unfixable-by-design-2026-08-30.md

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
# fire correctly. The builder stage intentionally does NOT set this so bun install
# and bun run build:web run with full dev-dep access.
ENV NODE_ENV=production

# Remove package-manager binaries, shims, and caches (inherited from the Node base
# image, or left by Bun) before handing the filesystem to the unprivileged runtime user.
# rm-558: the only target-platform RUN in the file (see the header comment).
RUN rm -rf \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/pnpm \
      /usr/local/bin/pnpx \
      /usr/local/bin/corepack \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
      /usr/local/bin/bun \
      /usr/local/bin/bunx \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /root/.cache \
      /root/.npm \
      /root/.local/share/pnpm \
      /root/.bun \
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
# would grow the Trivy surface for no other need).
# rm-233 fold (2026-10-19, integrate of run c8b5d2ec cycle-1 batch B2, conflict
# case 5e1dbf59): the URL is now env-aware instead of hard-coding 3000 —
# DASHBOARD_PORT is the server's documented bind override (README env table;
# src/server.ts reads env.DASHBOARD_PORT), PORT a conventional fallback, 3000
# the server default matching EXPOSE above, and HEALTHCHECK_URL replaces the
# whole URL for exotic probe targets. The 4.5s in-process watchdog sits just
# under HEALTHCHECK --timeout=5s so a hung fetch exits 1 before the runtime
# kill; a deployment overriding DASHBOARD_PORT therefore needs no HEALTHCHECK
# override (the docs/runbooks/release.md coupling note is retired by this
# fold — the probe follows the bind port now).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "const t=setTimeout(()=>process.exit(1),4500);fetch(process.env.HEALTHCHECK_URL??('http://127.0.0.1:'+(process.env.DASHBOARD_PORT??process.env.PORT??3000)+'/api/healthz')).then(r=>{clearTimeout(t);process.exit(r.ok?0:1)}).catch(()=>{clearTimeout(t);process.exit(1)})"]

CMD ["node", "src/server.ts"]
