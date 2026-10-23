# Security Posture

_A living scorecard of this repo's security posture — verify live before trusting._

As of the 2026-10-21 run the score is **7.7** (best score achievable in our
posture is **8.6**; the remaining gap is documented check-by-check below). The
scorecard badge in README.md reflects the same data source (see the score
caveat in the Branch-Protection row).

This runbook is a **living document**. Re-verify the live state before acting
on it.

As of 2026-10-23, branch protection is **enforced** on `main` (see the
AGENTS.md landing-pipeline traps section): required checks (Check Types /
Check Workflows / Design Check / Lint / Test / Test Scripts Load / CodeQL),
strict contexts, admin-enforced.

| Check | Score | Status | Disposition |
| ---- | ----- | ------ | ----------- |
| [Branch-Protection](https://github.com/codeo1io/dashboard/settings/branches) | n/a (branch protection enforced) | tracked | rm-878 (filled 2026-10-23 — required checks + strict + admin-enforced; the next scheduled Scorecard run will re-score this row) |
| [Security-Policy](https://github.com/codeo1io/dashboard/security/policy) | yes | tracked | security.txt present in `docs/security.txt` (Expires 2026-12-24 — see the note below) |
| [Security-Policy note] | n/a | watch | current security.txt Expires is 2026-12-24; the in-repo guard (test/server.test.ts:612) reds every CI Main run when fewer than 60 days remain — from 2026-10-25 until refreshed |
| [Token-Permissions](https://github.com/codeo1io/dashboard/settings/actions) | 0 (top-level `permissions: read-all`) | tracked | workflow-level `permissions` blocks grant only what each job uses (rm-779; frozen `contents: read` etc. per job); org-level `Workflow` restrict + `any_workflow_runner` remain open items |
| [Workflow-Permissions] | 0 (job-scoped) | tracked | per-workflow least-privilege `permissions:` blocks (rm-1497); fro-bot.yaml has its own env+secrets block; gate truth: 330819996 active, ghost lockfile-guard id 375606447 disabled_manually 2026-10-23 (file absent from the tree since 2026-10-21 — it registers no live surface) |
| [Cron-Monitoring] | 0 (cron jobs present) | accepted | schedule-driven workflows ship a dead-man channel — fro-bot cron is armed but secret-gated (HAS_FRO_BOT_PAT skips fires without the secret); cron-tripwire (cve-tripwire.yaml) self-reports failures via the repository_dispatch bridge |
| [CII-Best-Practices](https://github.com/codeo1io/dashboard/network/dependencies) | 0 (no badge) | untracked | no CII badge; the repo carries an equivalent in-repo posture ledger (this file + ROADMAP.md) |
| [Frozen-Deps](https://github.com/codeo1io/dashboard/blob/main/bun.lock) | yes (bun.lock) | tracked | `bun install --frozen-lockfile` in CI + bunfig.toml `minimumReleaseAge = 259200` (72h release-age floor); lockfile drift guarded by audit + dependabot |
| [Pinned-Dependencies] | 2 of 16 pinned by digest | track risk | unpin blocked by policy since 2026-09-25 (mermaid 11.12.2 held back; upstream TA2 re-pins to `weekly` cadence only for triaged CVEs) |

**Score re-verification:** the 2026-10-21 datum (7.7) was verified first-hand
by this run's prioritize + stewardship phases (gh api code-scanning analyses,
tool=scorecard — latest analysis created 2026-10-21T18:31:20Z) and
re-corroborated at implement dispatch. Re-verify via the same probe before
citing the number again.
