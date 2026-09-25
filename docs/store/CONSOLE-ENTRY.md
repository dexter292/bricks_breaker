# Store console entry checklist — Pulse Paddle

Paste-ready answers for **App Store Connect** and **Google Play Console**.  
**Status 2026-09-24:** answers locked in-repo. **Console fields not yet submitted.**

**Platform posture (D2=B):** **ASC checklist is in use** for the iOS-first release. **Play Console is deferred** (prepared, not blocking G2).

Sources: `play-data-safety.md`, `age-rating.md`, `privacy-policy.md`, `name-clearance.md`, `HOSTING.md`, `docs/audit/DECISIONS-2026-09-24.md`.

---

## Pre-submit blockers to acknowledge

1. **Display name — D1=B** — **MUST rename** before creating ASC listing. Collision: [Neon brick breaker](https://apps.apple.com/us/app/neon-brick-breaker/id1477991378) (Gosiha). Fill chosen name in `name-clearance.md` first.
2. **Formal trademark opinion** — Not obtained; rename is the G2 path.
3. **PHYS-05** — tap-only accepted for temp MVP; aimed pending D3 (not a store-form blocker).
4. **R-15 / Sentry** — Confirm whether the submitted binary is DSN-off or DSN-on before filling App Privacy / Play Data Safety. See sections below.

---

## Google Play Console (DEFERRED — D2=B)

> Prepared for a future Android return. **Do not treat as a G2 blocker** for the iOS-first release.

### Listing (create when ready)

| Field | Value |
|-------|--------|
| App name | Pulse Paddle |
| Package name | `com.dexter292.bricksbreaker` |
| Category | Game → Arcade / Casual |
| Free / Paid | Free |
| Ads | **No** |
| IAP | **No** |

### Data Safety (from `play-data-safety.md`)

**Pick the row that matches the binary you upload** (R-15 — `@sentry/react-native` is always linked; transmission depends on DSN).

| Question | DSN-off (default) | DSN-on (N-OPS-01 enabled) |
|----------|-------------------|---------------------------|
| Collect required user data types? | **No** | **Yes** — App info & performance (crash logs) |
| Share with third parties? | **No** | **Yes** — Sentry |
| Encrypted in transit? | N/A — nothing transmitted by App | **Yes** (HTTPS to Sentry) |
| Data deletion | Uninstall / clear storage (on-device score) | Score: same; crashes: contact `dexter@lkfnb.com` |
| Ads / IAP | **No** / **No** | **No** / **No** |
| Approximate target age | Everyone | Everyone |

Local AsyncStorage high score = **not collected** (on-device only). Full tables: `play-data-safety.md`.

### Content rating

Follow Play questionnaire → target **Everyone** (`age-rating.md`).

### Privacy policy URL

Use the live HTTPS URL from `HOSTING.md` (must include Contact `dexter@lkfnb.com`).

### Entered into console?

| Item | Status |
|------|--------|
| App listing created | **NO** — operator |
| Data Safety form saved | **NO** — operator |
| Content rating questionnaire | **NO** — operator |
| Privacy policy URL attached | **NO** — operator |

---

## App Store Connect

### Listing

| Field | Value |
|-------|--------|
| Name | Pulse Paddle *(cleared 2026-09-25; run console uniqueness before listing)* |
| Bundle ID | `com.dexter292.bricksbreaker` |
| Primary category | Games → Arcade |
| Age | **4+** (`age-rating.md`) |
| Privacy policy URL | Same live HTTPS URL as Play |

### App Privacy (nutrition labels)

**R-15:** The App binary **includes** `@sentry/react-native`. Answers must match whether that build’s `EXPO_PUBLIC_SENTRY_DSN` is set.

| Build | Declare |
|-------|---------|
| **DSN-off** (default until N-OPS-01 verified) | **Data Not Collected** for App-declared collection — no analytics/ads/accounts; local score on-device only; Sentry SDK present but **does not send** without DSN. Still link the live privacy policy (mentions optional crash reporting). |
| **DSN-on** (ship with crash reporting) | **Data Collected** — Crash Data / Diagnostics (or current ASC labels for crash logs). Purpose: App Functionality. Linked to user: No. Used for tracking: No. Third party: Sentry processes crashes. |

Do **not** paste “Data Not Collected” for a DSN-on binary. Revisit ASC labels whenever the production EAS profile gains/loses a DSN.

### Entered into console?

| Item | Status |
|------|--------|
| App record created | **NO** — operator |
| Age rating questionnaire | **NO** — operator |
| App Privacy answers | **NO** — operator |
| Privacy policy URL | **NO** — operator |

---

## After operator submits

Update this file: set each row to **YES** + date + ASC/Play listing ID. Do not mark PLT-04 “console entered” until then — PLT-04 only requires paperwork **prepared**, which this checklist completes.
