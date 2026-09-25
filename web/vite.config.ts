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
      // injectManifest ships our hand-written SW (web/src/sw.ts) — a
      // kill-switch that purges caches and unregisters itself. It performs no
      // fetch routing and no caching; the emitted precache manifest is inert.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // Keep the hand-written web/public/manifest.webmanifest — do NOT generate one.
      // The <link rel="manifest"> stays in web/index.html (already present).
      manifest: false,

      // rm-228: the app registers NO service worker. The emitted sw.js is an
      // uninstall-only kill-switch (web/src/sw.ts) served so clients that
      // registered the OLD precaching SW can fetch it and uninstall.
      // injectRegister false stops vite-plugin-pwa from emitting registerSW.js
      // and injecting its loader <script> into the built index.html — under
      // the default 'auto' it re-registered the kill-switch on every page
      // load, so navigator.serviceWorker.ready only ever resolved to a worker
      // that immediately unregisters itself, leaving the push opt-in
      // permanently stuck. A push-capable client must be re-introduced
      // deliberately (roadmap rm-106/rm-163) with its own registration call.
      injectRegister: false,

      // registerType omitted → defaults to 'prompt' (never silently reload).

      injectManifest: {
        // rm-138: the kill-switch never precaches and never serves cached
        // assets, so the injected manifest stays EMPTY — the build must not
        // glob hashed JS/CSS into self.__WB_MANIFEST. The `void [self.__WB_MANIFEST]`
        // token in web/src/sw.ts stays: workbox's injectManifest build step
        // requires it, and it is erased from the runtime output.
        globPatterns: [],
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
