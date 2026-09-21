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

requirements-completed: []  # PLT-04 partial — live HTTPS URL not verified

duration: 15min
completed: 2026-09-21
---

# Phase 8: Plan 05 Summary — Store compliance baseline (partial)

**In-repo privacyManifests + store docs done; live HTTPS privacy URL deferred by owner waiver (D-27 debt).**

## Performance

- **Tasks:** 2/2 (Task 2 closed via owner waiver, not curl-verified HTTPS)
- **Files modified:** ~10

## Accomplishments

- Configured `expo.ios.privacyManifests` with tracking off + required-reason APIs; `assert:privacy-manifest` green
- Filled accurate MVP privacy policy + Play/age/name/originality docs (no ads/IAP/accounts; local AsyncStorage score)
- Owner waived live host: `LIVE_URL: OWNER_WAIVED_2026-09-21` — **PLT-04 not fully closed**

## Open debt

- Publish `privacy-policy.html` to public HTTPS and replace LIVE_URL with real `https://…` + `curl -fsSI` before store submit / final PLT-04

## Deviations

- Task 2 acceptance (`LIVE_URL: https://` + curl 200) not met; owner explicit waiver to unblock Waves 2–5
