---
phase: 08-showpiece-level-performance-certification-launch-baseline
plan: 05
subsystem: store-compliance
tags: [privacy-manifest, play-data-safety, privacy-policy, plt-04]

requires:
  - phase: 08-00
    provides: store doc stubs + assert-privacy-manifest.mjs
provides:
  - ios.privacyManifests in app.json (assert green)
  - Filled in-repo store paperwork (policy, Play Data Safety, age, name, originality)
  - Publishable privacy-policy.html + HOSTING.md
affects: [08-06 phase gate, PLT-04]

tech-stack:
  added: []
  patterns: [privacyManifests via app.json CNG; in-repo store docs; no eas submit]

key-files:
  created: [docs/store/HOSTING.md]
  modified:
    - app.json
    - docs/store/privacy-policy.md
    - docs/store/privacy-policy.html
    - docs/store/play-data-safety.md
    - docs/store/age-rating.md
    - docs/store/name-clearance.md
    - docs/store/originality-attestation.md
    - scripts/assert-privacy-manifest.mjs
    - package.json

key-decisions:
  - "Owner waived live HTTPS publish for Phase 8 continuation (2026-09-21); D-27 live-URL gate remains OPEN debt"
  - "No eas submit / store listings (D-26)"

patterns-established:
  - "Store paperwork lives under docs/store/; LIVE_URL recorded in privacy-policy.md"

requirements-completed: [PLT-04]  # live HTTPS verified 2026-09-21; in-repo paperwork + privacyManifests done

duration: 15min
completed: 2026-09-21
---

# Phase 8: Plan 05 Summary — Store compliance baseline

**In-repo privacyManifests + store docs done; live HTTPS privacy policy verified on GitHub Pages.**

## Performance

- **Tasks:** 2/2
- **Files modified:** ~10

## Accomplishments

- Configured `expo.ios.privacyManifests` with tracking off + required-reason APIs; `assert:privacy-manifest` green
- Filled accurate MVP privacy policy + Play/age/name/originality docs (no ads/IAP/accounts; local AsyncStorage score)
- **LIVE_URL:** https://dexter292.github.io/bricks_breaker/store/privacy-policy.html — `curl -fsSI` → HTTP/2 200 (GitHub Pages `/docs`)

## Open debt

- None for Plan 05 / PLT-04 live-URL gate (D-24/D-27 URL). Device cert (PLT-03) remains Plan 06.
