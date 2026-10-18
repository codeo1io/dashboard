import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'

// Fixture build mode: VITE_FIXTURE_MODE=true enables a local-only build that
// includes fixture-gated browser code (import.meta.env.DEV = true). Output goes
// to web/dist-fixture so it never overwrites the production web/dist artifacts.
// Production builds (build:web) always use the default mode with DEV = false.
const isFixtureBuild = process.env['VITE_FIXTURE_MODE'] === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest ships our hand-written SW (web/src/sw.ts) — the
      // deny-by-default precache router (rm-274 truthing: NavigationRoute
      // denylist + /operator redirect, NetworkOnly for auth/operator/API
      // routes, push handlers, legacy-cache sweep; it never unregisters
      // itself). The emitted precache manifest is live — precacheAndRoute
      // installs it, so the shell serves offline.
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
        // route (GET /index.html has no route and 404s). The deployed SW
        // precaches and serves the shell (web/src/sw.ts, rm-274 truthing), so
        // this rewrite is load-bearing: it is what lets the '/' navigation be
        // served from the precache (createHandlerBoundToURL('/')) instead of
        // re-fetched.
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
