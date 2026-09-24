# Crash reporting (N-OPS-01)

**Status:** Code wired (DSN-off). **Owner deferred 2026-09-24** — skip Sentry project/DSN for now; N-OPS-01 / G1.9 remain open until resumed  
**Date:** 2026-09-24  
**Gate:** Must before **G1** (`RELEASE-GATES` G1.9) — not waived, only paused

## What shipped

| Piece | Location |
|-------|----------|
| Optional Sentry init | `src/services/crashReporting.ts` |
| Root call | `app/_layout.tsx` → `initCrashReporting()` |
| Metro | `metro.config.js` via `@sentry/react-native/metro` |
| Expo plugin | `app.config.js` → `@sentry/react-native` |
| DEV test control | PlayingHost **Crash** chip (`__DEV__` only) |

Runtime is **disabled** unless `EXPO_PUBLIC_SENTRY_DSN` is set. No events leave the device without a DSN — matches offline-first privacy until provisioned.

## Owner setup (when resumed — required to close N-OPS-01)

1. Create a Sentry project (React Native / Expo). Free tier is fine — signup: https://sentry.io/signup/
2. Copy **Client Key (DSN)** and run:
   ```bash
   ./scripts/set-sentry-dsn.sh 'https://…@o….ingest.sentry.io/…'
   ```
   That writes `.env.local` (gitignored) and attempts EAS `preview` + `production` env.
3. (Optional, for source maps on EAS) Create org auth token → `SENTRY_AUTH_TOKEN` EAS secret; then configure plugin `organization` + `project` in `app.config.js`. Until then, EAS profiles set `SENTRY_DISABLE_AUTO_UPLOAD=true` so builds do not fail on missing Sentry org.
4. **Verify (Debug):**  
   ```bash
   npx expo run:ios --device
   ```  
   Open PlayingHost → tap **Crash** → confirm Issue in Sentry dashboard.
5. (Optional) Rebuild Release/TestFlight with DSN on EAS for store-posture binary.
6. Record evidence below.

## Privacy & store forms

When DSN is set, crash reports may include stack traces, device model/OS, and app version — **not** gameplay scores or accounts. See updated `docs/store/privacy-policy.md`.

**R-15:** Store console paste answers must match the build:

| Doc | What to use |
|-----|-------------|
| `docs/store/CONSOLE-ENTRY.md` | ASC App Privacy + Play Data Safety rows for DSN-off vs DSN-on |
| `docs/store/play-data-safety.md` | Full Play tables for both postures |

Do not declare “Data Not Collected” / “no crash data” for a **DSN-on** binary. Default engineering builds stay DSN-off until verification log below is filled.

Local template: [`.env.example`](../../.env.example) → copy to `.env.local`.

**Not** an ads/analytics SDK for G2.17 — crash reporting is N-OPS-01 operational tooling (still declare when it transmits).

## Verification log

| Date | Build | Event ID / link | Operator |
|------|-------|-----------------|----------|
| _pending_ | | | |

## Acceptance

- [ ] DSN provisioned  
- [ ] Real crash visible in Sentry from a distributed build  
- [ ] Row filled in verification log above  
