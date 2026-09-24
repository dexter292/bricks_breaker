# Google Play Data Safety — Neon Brick Breaker

> **Prepared; not used for the iOS-first public release (D2=B, 2026-09-24).** Keep for a future Android return. ASC privacy nutrition is the active store path for now.
>
> **R-15 (2026-09-24):** Binary **includes** `@sentry/react-native` (N-OPS-01). Answers below distinguish **DSN-off** (default) vs **DSN-on** store builds. Do not paste the DSN-off answers if the submitted binary has `EXPO_PUBLIC_SENTRY_DSN` set.

In-repo answers for the Play Console Data Safety form. Reflects offline gameplay, local personal best via AsyncStorage, no ads/IAP/accounts/**analytics** SDKs, monetization seams no-op, **plus optional Sentry crash reporting**.

## Build postures

| Posture | How | What leaves the device |
|---------|-----|------------------------|
| **DSN-off** (default) | `EXPO_PUBLIC_SENTRY_DSN` unset | Nothing to Sentry; SDK present but inert |
| **DSN-on** | DSN set on that EAS/profile build | Crash/error reports (stack, device model/OS, app version) → Sentry |

Ship posture for a given listing **must match** the answers you enter. See `docs/ops/CRASH-REPORTING.md`.

## Form answers — DSN-off builds

| Question | Answer |
|----------|--------|
| Does the app collect personal or sensitive user data? | **No** *(for Play “collected” = transmitted; local score stays on device)* |
| Does the app share user data with third parties? | **No** |
| Is data encrypted in transit? | **N/A for gameplay / crash data** — none transmitted by the App in this posture |
| Can users request data deletion? | **N/A / device control** — uninstall / clear storage for on-device score |
| Ads? | **No** |
| In-app purchases? | **No** |
| Approximate target age | **Everyone** (see `age-rating.md`) |

## Form answers — DSN-on builds (N-OPS-01 enabled)

| Question | Answer |
|----------|--------|
| Does the app collect personal or sensitive user data? | **Yes** — App info and performance (crash logs) |
| Does the app share user data with third parties? | **Yes** — Sentry (crash reporting processor) |
| Is data encrypted in transit? | **Yes** — HTTPS to Sentry ingest |
| Can users request data deletion? | On-device score: uninstall/clear storage. Crash data retained under Sentry/org policy — contact `dexter@lkfnb.com` |
| Ads? | **No** |
| In-app purchases? | **No** |
| Approximate target age | **Everyone** |

Declare under **App info and performance → Crash logs** (or current Play equivalent): collected, shared with Sentry, for app functionality / analytics-of-stability (not advertising), not sold.

## On-device high score vs Play “collected” (RESEARCH A3)

**Chosen interpretation:** the AsyncStorage personal-best score is **not collected** under Play Data Safety because it is:

1. Stored **only on the device**
2. **Never transmitted** by the App for scoring
3. Not linked to an account or advertising ID

This interpretation is **independent** of Sentry. Do not conflate local score with crash reports.

## Data types checklist

| Category | DSN-off | DSN-on | Notes |
|----------|---------|--------|-------|
| Location | No | No | — |
| Personal info (name, email, etc.) | No | No | Not requested; crashes should not include PII by config (`sendDefaultPii: false`) |
| Financial info | No | No | No IAP |
| Health / fitness | No | No | — |
| Messages | No | No | — |
| Photos / video | No | No | — |
| Audio files | No | No | Bundled SFX only |
| Files / docs | No | No | — |
| Calendar / contacts | No | No | — |
| App activity (gameplay) | No | No | Scores not uploaded |
| App info & performance (crash logs) | **No app-declared** (OS/store may still) | **Yes — via Sentry** | SDK is in the binary either way |
| Device or other IDs | No | Possibly incidental in crash payloads | Not used for ads; no analytics/attribution SDK |
| Ads / IAP / accounts | No | No | — |

## Non-goals

- Creating the Play / ASC listing and clicking submit is an **operator** step — see [`CONSOLE-ENTRY.md`](./CONSOLE-ENTRY.md). Console fields remain **not entered** until that checklist is marked YES.
