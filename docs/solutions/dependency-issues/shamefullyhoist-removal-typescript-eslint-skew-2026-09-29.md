---
module: tooling
tags: ['eslint', 'pnpm', 'dependency-hygiene', 'typescript-eslint']
problem_type: dependency-compatibility
---

# Removing `shamefullyHoist` surfaces hoisted-version dependencies you never declared

## Problem

`pnpm-workspace.yaml` carried `shamefullyHoist: true` — every package in the
dependency graph was silently resolvable from the root, so source files could
import packages that appear nowhere in `package.json`. Removing the flag (to
restore pnpm's strict phantom-dependency protection) then breaks the build in
two distinct ways, and the first one is misleading:

1. **A hoisted version wins the resolution race.** `eslint.config.ts` imported
   `typescript-eslint`, which the root never declared. pnpm resolved it from
   `@bfra.me/eslint-config`'s own dependency tree — a version chosen by the
   config package, not by this repo (8.46.1). That version predates the
   eslint 10 flat-config API, and eslint then fails while *loading the config*:

   ```
   TypeError: Cannot read properties of undefined (reading 'extends')
   at new FlatESLint (eslint/lib/eslint/flat-eslint.js:...)
   ```

   The stack never mentions `typescript-eslint`; it looks like an eslint
   install problem. It is not — it is a version skew behind an undeclared
   import.

2. **Declaring the package fixes resolution but not the types.** Adding
   `typescript-eslint` to `devDependencies` resolves a current version
   (8.70.0), the config loads, and `pnpm lint` goes green — but `tsc` on the
   *config itself* then fails with TS2883, because the default-export type of
   `defineConfig(...)` is inferred through typescript-eslint 8.70.0's public
   types and is no longer nameable under `declaration` portability rules.

## Solution

Three moves, in order:

1. **Find what actually resolves before editing anything.** `pnpm why <pkg>`
   (and `ls node_modules/.pnpm | grep <pkg>`) shows both the hoisted version
   and its parent. In this case: 8.46.1 via `@bfra.me/eslint-config@0.54.0`,
   while 8.70.0 was already present deeper in the tree.

2. **Declare the import you actually make.** Add the package to
   `devDependencies` at the version the strict layout resolves (8.70.0 —
   eslint-10 compatible). The declared range now wins; the config package's
   older pin no longer matters.

3. **Erase the inferred type at the export seam, don't fight the types.**
   Annotate the config export with eslint's own nameable type instead of
   letting typescript-eslint's types leak into the inference:

   ```ts
   import type { Linter } from 'eslint';
   // ...
   export default config as unknown as Linter.Config[];
   ```

   `eslint` is already a declared dependency, so no new package is needed; the
   cast is the house `as unknown as X` boundary form, applied at the one seam
   where a third-party's inferred type crosses a declaration boundary.

Also note: `@eslint/core` types are pulled in transitively; if `tsc` complains
about *those*, the same rule applies — declare what you import, don't rely on
the hoist.

## Prevention

- Keep `shamefullyHoist` off. The audit that found the phantom imports took
  minutes (`node --input-type=module -e` resolving each root-level import);
  the hoist had been hiding the problem for the life of the repo.
- When a lint config crashes at *load* time with a flat-config TypeError,
  suspect version skew of a config-authoring package
  (`typescript-eslint`, `eslint-plugin-*`) before suspecting eslint itself.
  `pnpm why <that package>` is the one-command discriminator.
- When a third-party's exported type trips declaration portability (TS2883),
  erase at the export seam with the dependency's own nameable type rather
   than reworking the config object.

## Evidence

Diagnosed and fixed 2026-09-29 during the cycle-1 maintenance batch (rm-259);
local reproduction in the phase evidence (delegate spool
`1609046dfdc64050a0ea974a01968a59.json`), with CI-routed full validation
(ephemeral PR) confirming `Lint`, `Check Types`, and `Test` all green after
the fix.
