// Post-build service-worker manifest assertion (rm-2301): vite-plugin-pwa's
// closeBundle inject-manifest rejection is fire-and-forget relative to the
// `vite build` exit code — a failed manifest injection printed "error during
// build" while vite exited 0 (observed first-hand 2026-10-22 at this fork,
// vite 8.3.4 + vite-plugin-pwa 1.3.0; artifacts were correct that time, but a
// genuinely broken offline shell would ship green). This script fails the
// build lane on any of the three observable broken states.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const candidates = [
  process.argv[2],
  path.join(root, 'web', 'dist', 'sw.js'),
  path.join(root, 'web', 'dist', 'sw.mjs'),
].filter((p): p is string => typeof p === 'string');
let swPath: string | undefined;
let sw: string | undefined;
for (const candidate of candidates) {
  try {
    sw = readFileSync(candidate, 'utf8');
    swPath = candidate;
    break;
  } catch {
    // try the next candidate
  }
}
if (swPath === undefined || sw === undefined) {
  console.error(
    `sw-manifest check: no emitted service worker found (tried ${candidates.join(', ')})`,
  );
  process.exit(1);
}

const failures: string[] = [];
if (sw.includes('self.__WB_MANIFEST')) {
  failures.push('unsubstituted self.__WB_MANIFEST token (inject-manifest did not run)');
}
const precall = sw.match(/precacheAndRoute\s*\(/);
if (!precall) {
  failures.push('no precacheAndRoute( call in the emitted service worker');
} else if (/precacheAndRoute\s*\(\s*\[\s*\]\s*[),]/.test(sw)) {
  failures.push('precacheAndRoute called with an empty manifest array');
}

if (failures.length > 0) {
  for (const f of failures) console.error(`sw-manifest check FAILED (${swPath}): ${f}`);
  process.exit(1);
}
console.log(`sw-manifest check ok: ${swPath} (precached, no residual token)`);
