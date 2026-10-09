import '@testing-library/jest-dom'

import {configure} from '@testing-library/react'

// rm-819 (2026-10-10): testing-library's async utilities (waitFor / findBy*)
// default to a 1000ms per-assertion window — one level below the vitest
// `testTimeout` this suite already raises to 30_000 for contended runners
// (web/vitest.config.ts). A full web-suite run on a loaded box failed the
// rm-487 focus re-probe `waitFor` once at HEAD 364272b while the same test
// passed 6/6 isolated and CI stayed green at the same SHA — the
// per-assertion default never received the contended-runner raise. Lift
// asyncUtilTimeout to 5s so a single assertion gets the same headroom the
// suite already grants a whole test.
configure({asyncUtilTimeout: 5_000})
