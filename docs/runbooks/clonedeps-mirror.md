---
module: dashboard
tags: [clonedeps, dependencies, runbook]
---

# Cloned dependency mirror (`.slim/clonedeps/`)

`.slim/clonedeps.json` is the tracked pin manifest for read-only dependency
source clones. `repos/` is machine-local and gitignored — it is materialized on
demand for inspection, never committed.

## Recipe

```bash
git clone https://github.com/fro-bot/agent.git .slim/clonedeps/repos/fro-bot__agent
git -C .slim/clonedeps/repos/fro-bot__agent checkout v0.121.0
```

Do not edit anything under `repos/` — it is an evidence tree.

## Honesty rule

The manifest pins must match the agent pin the Fro Bot workflow actually runs
(`.github/workflows/fro-bot.yaml`, `uses: fro-bot/agent@<sha> # vX.Y.Z`).
Current lockstep: `v0.121.0` @ `50b5dd41297f8a928914006b8f8c872c4ab3bb14`.
Verify before consuming the mirror:

```bash
git -C .slim/clonedeps/repos/fro-bot__agent rev-parse HEAD
# must equal the workflow pin sha above
```

When the workflow pin moves (agent release adoption), update BOTH sides in the
same change: the manifest's `ref` / `resolvedVersion` / `updatedAt` AND the
materialized mirror. The gateway drift tripwire
(`.github/workflows/gateway-drift-tripwire.yaml`,
`scripts/gateway-drift-tripwire.ts`) is the alerting surface for pin staleness
and contract split-brain between the workflow pin, the operator-contract
mirror, and the operator-stream reader pin.
