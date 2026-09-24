# SDK upgrade cadence (N-OPS-03)

**Status:** Active  
**Date:** 2026-09-24  
**Owner:** Dexter (engineering)  
**Gate:** Should (not a hard G1/G2 blocker)

## Current pins (HEAD baseline at lock)

| Package | Version |
|---------|---------|
| Expo | ~57.0.24 |
| React Native | 0.86.3 |
| Reanimated | 4.5.1 |
| Worklets | 0.10.1 |
| Skia | 2.12.0 |
| Sentry | ~7.11 (optional DSN) |

## Cadence

| Trigger | Action |
|---------|--------|
| **Expo SDK N+1 stable** for ≥**4 weeks** | Time-box a spike: upgrade branch, run full vitest + worklet/solvability asserts, iOS Install smoke, Cert WC if physics/render deps moved |
| **Security advisory** on a pinned native dep | Patch ASAP regardless of cadence |
| **Skia / Reanimated / Worklets major** | Treat as high-risk; do not bundle with content milestones |

## Explicit non-goals

- Chasing every Expo canary
- Upgrading mid-Milestone-B physics work without a freeze

## Next review

| Field | Value |
|-------|--------|
| Next check date | **2026-10-22** (4 weeks from this note) or when Expo 58 has been stable ≥4 weeks — whichever later |
| Owner | Dexter |
