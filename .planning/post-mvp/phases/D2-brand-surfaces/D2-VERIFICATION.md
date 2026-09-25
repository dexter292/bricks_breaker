---
phase: D2-brand-surfaces
status: passed_with_debt
verified: 2026-09-25
requirements: [N-BRAND-01, N-BRAND-02]
owner_decision: display_name_pulse_paddle_2026_09_25
human_uat: skipped_owner_2026_09_25
open_process:
  - asc_console_uniqueness_check_for_pulse_paddle
---

# Phase D2 — Brand Surfaces — Verification

**Goal:** N-BRAND-02 — icon, splash and Title match the renamed display name; N-BRAND-01
string recorded and applied.

**Verdict:** `passed_with_debt`. The rename is applied, guarded, and **verified on device**
after a native prebuild + rebuild; store-console uniqueness for the new string has **not**
been run (owner/console work, skipped).

## What changed

| Surface | Before | After |
|---------|--------|-------|
| `app.config.js` `name` | `Neon Brick Breaker` | **`Pulse Paddle`** |
| Title screen brand | hard-coded string | `DISPLAY_NAME` from `app/_brand.ts` |
| App icon / splash / favicon / Android adaptive | **Expo template chevron on blue** | generated Pulse Paddle mark on the game's navy |
| Store docs (clearance, console entry, privacy ×2, data safety, age rating, originality) | old name | new name |

Bundle id `com.dexter292.bricksbreaker`, slug `bricks-breaker` and scheme `bricksbreaker`
are deliberately unchanged — display-name-only rename, as the clearance doc requires.

## Must-haves

| Truth | Evidence | Status |
|-------|----------|--------|
| Chosen string recorded with date | `name-clearance.md` → Pulse Paddle / 2026-09-25 | ✅ |
| Applied to installed app name | `app.config.js` `name` | ✅ |
| Applied on screen | `TitleScreen` renders `DISPLAY_NAME` | ✅ |
| One source of truth, not three copies | `app/_brand.ts`; config + docs checked against it | ✅ |
| Drift is caught, not hoped against | `assert-brand-name` **proven to fail** on an injected mismatch | ✅ |
| Collided old name gone from shipped surfaces | assert scans config + brand module | ✅ |
| Icon is brand art, not template art | regenerated set, game palette | ✅ |
| Rename + icon reach the **device**, not just JS | native rebuild; home screen shows `Pulse Paddle` + new icon | ✅ |
| Icon legible at favicon size | 48×48 render checked | ✅ |
| No new dependency for image work | Node `zlib` + hand-rolled PNG encoder | ✅ |
| Suite green | 79 files / 401 tests; typecheck + lint clean | ✅ |
| ASC uniqueness for "Pulse Paddle" | — | ❌ **not run** |

## Carried debt

1. **Store-console uniqueness check for "Pulse Paddle" has not been run**, nor any informal
   web skim. The old name's problem was an exact-title ASC collision; moving off the
   `Neon + Brick` compound removes *that* collision, but the new string is unsearched.
   Run it before creating the listing.
2. **No cohort validation of the name** — A3 was skipped, so the shortlist never got the
   Q5 pulse it was written for. The pick rests on collision-avoidance alone.
3. Formal trademark opinion still not obtained (pre-existing).
4. The generated icon has had **no human design review**.
5. `@sentry/react-native` **breaks local `expo run:ios`** until `SENTRY_DISABLE_AUTO_UPLOAD=true`
   is set — the upload phase has no org/project because N-OPS-01 is owner-deferred. All three
   EAS profiles already set it; only the local path was uncovered. Documented in
   `docs/ops/LOCAL-IOS-BUILD.md`.
