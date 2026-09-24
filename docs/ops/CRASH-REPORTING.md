# Crash reporting (N-OPS-01)

**Status:** Code wired; **dashboard verification pending owner Sentry project**  
**Date:** 2026-09-24  
**Gate:** Must before **G1** (`RELEASE-GATES` G1.9)

## What shipped

| Piece | Location |
|-------|----------|
| Optional Sentry init | `src/services/crashReporting.ts` |
| Root call | `app/_layout.tsx` → `initCrashReporting()` |
| Metro | `metro.config.js` via `@sentry/react-native/metro` |
| Expo plugin | `app.config.js` → `@sentry/react-native` |
| DEV test control | PlayingHost **Crash** chip (`__DEV__` only) |

Runtime is **disabled** unless `EXPO_PUBLIC_SENTRY_DSN` is set. No events leave the device without a DSN — matches offline-first privacy until provisioned.

## Owner setup (required to close N-OPS-01)

1. Create a Sentry project (React Native / Expo). Free tier is fine.
2. Copy **Client Key (DSN)** → set as EAS secret / local env:
   ```bash
   export EXPO_PUBLIC_SENTRY_DSN='https://…@o….ingest.sentry.io/…'
   ```
3. (Optional, for source maps on EAS) Create org auth token → `SENTRY_AUTH_TOKEN` EAS secret; then configure plugin `organization` + `project` in `app.config.js`.
4. Build a **distributed** binary (TestFlight / internal, not Metro-only).
5. Open PlayingHost → tap **Crash** (dev) **or** force a release crash once.
6. Confirm the event appears in the Sentry Issues dashboard.
7. Record evidence below.

## Privacy

When DSN is set, crash reports may include stack traces, device model/OS, and app version — **not** gameplay scores or accounts. See updated `docs/store/privacy-policy.md`. Update ASC privacy nutrition when enabling DSN for a store build.

**Not** an ads/analytics SDK for G2.17 — crash reporting is N-OPS-01 operational tooling.

## Verification log

| Date | Build | Event ID / link | Operator |
|------|-------|-----------------|----------|
| _pending_ | | | |

## Acceptance

- [ ] DSN provisioned  
- [ ] Real crash visible in Sentry from a distributed build  
- [ ] Row filled in verification log above  
