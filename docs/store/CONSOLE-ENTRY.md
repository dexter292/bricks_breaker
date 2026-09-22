# Store console entry checklist — Neon Brick Breaker

Paste-ready answers for **App Store Connect** and **Google Play Console**.  
**Status 2026-09-22:** answers locked in-repo. **Console fields not yet submitted** (operator must click through ASC / Play).

Sources: `play-data-safety.md`, `age-rating.md`, `privacy-policy.md`, `name-clearance.md`, `HOSTING.md`.

---

## Pre-submit blockers to acknowledge

1. **Display name collision risk** — App Store already lists [Neon brick breaker](https://apps.apple.com/us/app/neon-brick-breaker/id1477991378) (Gosiha). See `name-clearance.md`. Consider a differentiated title before paid UA.
2. **Formal trademark opinion** — Not obtained (counsel). Soft-launch risk accepted until rename or opinion.
3. **PHYS-05 ledger** — still over-claims “aimed” launch (separate from store forms).

---

## Google Play Console

### Listing (create when ready)

| Field | Value |
|-------|--------|
| App name | Neon Brick Breaker |
| Package name | `com.dexter292.bricksbreaker` |
| Category | Game → Arcade / Casual |
| Free / Paid | Free |
| Ads | **No** |
| IAP | **No** |

### Data Safety (from `play-data-safety.md`)

| Question | Enter |
|----------|--------|
| Does your app collect or share any of the required user data types? | **No** |
| Is all user data encrypted in transit? | N/A — no gameplay data transmitted |
| Can users request data deletion? | Users clear data by uninstall / clear storage (on-device score only) |
| Ads | No |
| Approximate target age | Everyone |

Local AsyncStorage high score = **not collected** (on-device only, never transmitted). See `play-data-safety.md` A3.

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
| Name | Neon Brick Breaker *(or differentiated name if conflict at submit)* |
| Bundle ID | `com.dexter292.bricksbreaker` |
| Primary category | Games → Arcade |
| Age | **4+** (`age-rating.md`) |
| Privacy policy URL | Same live HTTPS URL as Play |

### App Privacy (nutrition labels)

Declare **Data Not Collected** for the MVP (no analytics/ads/accounts; local score only on device — mirror Play A3). Revisit if OS crash reporting is treated as declared collection in a future cycle.

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
