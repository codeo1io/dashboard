// Decoupled test runner (rm-2300): runs BOTH Vitest legs unconditionally so
// one red leg can never mask the other (the old `vitest run && vitest run
// --config web/vitest.config.ts` chain suppressed the entire web leg whenever
// the server leg exited non-zero). Run via `bun run test` — `pretest`
// (client build) still executes first via the package lifecycle.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const vitestEntry = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');

const legs = [
  {name: 'server', args: ['run']},
  {name: 'web', args: ['run', '--config', 'web/vitest.config.ts']},
];

const results: Array<{name: string; code: number}> = [];
for (const leg of legs) {
  const res = spawnSync(process.execPath, [vitestEntry, ...leg.args], {
    cwd: root,
    stdio: 'inherit',
  });
  const code = res.status === 0 && !res.error ? 0 : 1;
  if (res.error) {
    console.error(`test leg ${leg.name}: spawn error`, res.error);
  }
  results.push({name: leg.name, code});
}

const failed = results.filter((r) => r.code !== 0);
console.log(
  failed.length === 0
    ? `\nall test legs green: ${results.map((r) => `${r.name}=0`).join(' ')}`
    : `\ntest legs summary: ${results.map((r) => `${r.name}=${r.code}`).join(' ')} — ${failed.map((r) => r.name).join(', ')} leg(s) failed`,
);
process.exit(failed.length === 0 ? 0 : 1);
