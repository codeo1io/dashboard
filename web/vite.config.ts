import tailwindcss from '@tailwindcss/vite'
import {readdir, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {brotliCompress, constants, gzip} from 'node:zlib'
import {promisify} from 'node:util'
import react from '@vitejs/plugin-react-swc'
import {defineConfig, type Plugin} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'

// Fixture build mode: VITE_FIXTURE_MODE=true enables a local-only build that
// includes fixture-gated browser code (import.meta.env.DEV = true). Output goes
// to web/dist-fixture so it never overwrites the production web/dist artifacts.
// Production builds (build:web) always use the default mode with DEV = false.
const isFixtureBuild = process.env['VITE_FIXTURE_MODE'] === 'true'

// rm-252 (run c1a9e791 batch B3, 2026-09-29): build-time precompression of
// the content-hashed assets. The server negotiates the .br/.gz siblings this
// plugin writes (src/server.ts /assets/* handler) so the request path stays
// zero-transform — no runtime compression middleware can ever touch the SSE
// or ingest routes, and no compression dependency joins the server. The SW
// precache globPatterns match the ORIGINAL extensions only, so the compressed
// siblings are never precached; the deployed SW is a kill-switch regardless
// (see injectManifest notes above).
const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)

function precompressAssets(): Plugin {
  let assetsDir: string | null = null
  return {
    name: 'precompress-assets',
    apply: 'build',
    configResolved(resolved) {
      // Anchor on resolved.root (absolute) — rolldown-vite leaves
      // build.outDir RELATIVE ('dist'), so a bare join would resolve against
      // process cwd (`vite build web` runs from the repo root) and compress
      // the wrong tree. root is the config file's own directory.
      assetsDir = join(resolved.root, resolved.build.outDir, 'assets')
    },
    async closeBundle() {
      if (assetsDir === null) return
      let entries: string[] = []
      try {
        entries = await readdir(assetsDir)
      } catch {
        console.warn(`precompress-assets: no assets directory at ${assetsDir}`)
        return
      }
      for (const file of entries) {
        if (file.endsWith('.br') || file.endsWith('.gz')) continue
        const raw = await readFile(join(assetsDir, file))
        const [brotli, gz] = await Promise.all([
          brotliAsync(raw, {params: {[constants.BROTLI_PARAM_QUALITY]: 11}}),
          gzipAsync(raw, {level: 9}),
        ])
        await writeFile(join(assetsDir, `${file}.br`), brotli)
        await writeFile(join(assetsDir, `${file}.gz`), gz)
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest ships our hand-written SW (web/src/sw.ts) — a
      // kill-switch that purges caches and unregisters itself. It performs no
      // fetch routing and no caching; the emitted precache manifest is inert.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // Keep the hand-written web/public/manifest.webmanifest — do NOT generate one.
      // The <link rel="manifest"> stays in web/index.html (already present).
      manifest: false,

      // registerType omitted → defaults to 'prompt' (never silently reload).

      injectManifest: {
        // Exclude the SW itself and the manifest from the precache list.
        // The default globPatterns cover hashed JS/CSS/assets in web/dist.
        globIgnores: [
          '**/sw.js',
          '**/manifest.webmanifest',
          '**/registerSW.js',
          '**/privacy.html',
        ],

        // Rewrite the precache manifest entry for index.html → '/' so the
        // generated workbox manifest stays consistent with the server's '/'
        // route (GET /index.html has no route and 404s). The deployed SW is a
        // kill-switch (web/src/sw.ts) that purges caches, unregisters itself,
        // and never precaches or serves — this transform only shapes the
        // manifest the build emits.
        manifestTransforms: [
          (entries) => {
            const manifest = entries.map((entry) =>
              entry.url === 'index.html' ? {...entry, url: '/'} : entry,
            )
            return {manifest, warnings: []}
          },
        ],
      },
    }),
    // Production builds only — fixture builds (dist-fixture) are served by
    // the dev server and never need precompressed siblings.
    ...(isFixtureBuild ? [] : [precompressAssets()]),
  ],
  root: '.',
  // Fixture builds set DEV = true so import.meta.env.DEV-gated fixture code is
  // included. Production builds leave DEV = false (the Vite default for build mode).
  define: isFixtureBuild
    ? {'import.meta.env.DEV': 'true', 'import.meta.env.PROD': 'false'}
    : {},
  build: {
    outDir: isFixtureBuild ? 'dist-fixture' : 'dist',
    // Vite's default output uses hashed filenames for assets.
    // No inline scripts are emitted by default — all JS is external chunks
    // referenced via <script type="module" src="..."> tags, satisfying CSP.
    rollupOptions: {
      input: {
        index: 'index.html',
        privacy: 'privacy.html',
      },
      output: {
        // Ensure JS chunks use content-hash filenames
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
