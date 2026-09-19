# dashboard — Roadmap

> Autonomously maintained by the roadmap sync (reliability-first). Items cite reproducible codebase signals; acceptance is proven by cited evidence.

**Vision**: A reliable, customer-friendly repository advanced by evidence-cited roadmap cycles owned by the autonomy loop

**Pillars**: reliability work outranks customer-experience work; every roadmap item cites reproducible codebase signals; acceptance is proven by cited evidence, never claimed

## Open items

### Add test coverage for 21 untested module(s)
- id: `rm-002` | track: reliability | priority: 100.0 | status: candidate
- signals: reliability.no_tests:*, reliability.no_tests:.agents/skills/impeccable/scripts/context-signals.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/critique-storage.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detect-csp.mjs, reliability.no_tests:.agents/skills/impeccable/scripts/detector/design-system.mjs (+16 more)
- acceptance: Every module in ['*', '.agents/skills/impeccable/scripts/context-signals.mjs', '.agents/skills/impeccable/scripts/critique-storage.mjs', '.agents/skills/impeccable/scripts/detect-csp.mjs', '.agents/skills/impeccable/scripts/detector/design-system.mjs', '.agents/skills/impeccable/scripts/detector/detect-antipatterns-browser.js', '.agents/skills/impeccable/scripts/detector/detect-antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/engines/browser/detect-url.mjs', '.agents/skills/impeccable/scripts/detector/engines/regex/detect-text.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/css-cascade.mjs', '.agents/skills/impeccable/scripts/detector/engines/static-html/detect-html.mjs', '.agents/skills/impeccable/scripts/detector/engines/visual/screenshot-contrast.mjs', '.agents/skills/impeccable/scripts/detector/node/file-system.mjs', '.agents/skills/impeccable/scripts/detector/profile/profiler.mjs', '.agents/skills/impeccable/scripts/detector/registry/antipatterns.mjs', '.agents/skills/impeccable/scripts/detector/shared/fonts.mjs', '.agents/skills/impeccable/scripts/detector/shared/inline-ignores.mjs', '.agents/skills/impeccable/scripts/hook-admin.mjs', '.agents/skills/impeccable/scripts/hook-before-edit.mjs', '.agents/skills/impeccable/scripts/hook-lib.mjs', '.agents/skills/impeccable/scripts/lib/design-parser.mjs'] has a corresponding test file with at least one passing test
- evidence: CI: pytest collects the new test files and they pass

### Refactor 21 high-complexity function(s)
- id: `rm-001` | track: reliability | priority: 90.0 | status: candidate
- signals: reliability.complexity_hot:*, reliability.complexity_hot:.agents/skills/impeccable/scripts/live-browser.js::L164, reliability.complexity_hot:.agents/skills/impeccable/scripts/live-browser.js::L165, reliability.complexity_hot:.agents/skills/impeccable/scripts/live-browser.js::L166, reliability.complexity_hot:.agents/skills/impeccable/scripts/live-browser.js::L265 (+16 more)
- acceptance: Each flagged function is decomposed below the branch threshold with behavior locked by characterization tests
- evidence: ast-based branch-count check passes in CI

<!-- managed by hermes-roadmap render; do not edit by hand -->
