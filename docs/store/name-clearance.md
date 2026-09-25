# Name Clearance — Pulse Paddle (was Neon Brick Breaker)

## Shipping name

**Pulse Paddle** (renamed 2026-09-25 from the working title *Neon Brick Breaker*)

- Bundle ID (iOS): `com.dexter292.bricksbreaker` — unchanged by the rename
- Application ID (Android): `com.dexter292.bricksbreaker` — unchanged
- Expo slug: `bricks-breaker` — unchanged
- Display name source of truth: `app/_brand.ts` → `DISPLAY_NAME`, mirrored by
  `app.config.js` → `name` and enforced by `npm run assert:brand`

## Clearance research log (F-54)

| Date | Channel | Query / action | Result |
|------|---------|----------------|--------|
| 2026-09-21 | Web (agent) | `"Neon Brick Breaker" app` / store | Informal skim; no deep conflict logged |
| 2026-09-21 | Intent | App Store Connect / Play Console | **Pending** — run at first listing creation |
| 2026-09-21 | Intent | USPTO / trademark counsel | **Not obtained** |
| 2026-09-21 | Product | Brick Breaker Maker / Shatter | Feel/visual references only |
| **2026-09-22** | App Store (web) | Exact / near title | **Conflict found:** [Neon brick breaker](https://apps.apple.com/us/app/neon-brick-breaker/id1477991378) by **Gosiha Pte. Ltd.** (Free, IAP, Watch support). Near-title also: [Neon Bricks: Brick Breaker](https://apps.apple.com/pk/app/neon-bricks-brick-breaker/id6759252636). |
| **2026-09-22** | Google Play (web) | Neon bricks / brick breaker | Multiple neon brick-breaker genre titles (e.g. “Neon bricks”); descriptive genre crowding, not exclusive marks. |
| **2026-09-22** | Owner decision | Soft-launch risk | Accepted for internal only. |
| **2026-09-24** | Owner decision **D1=B** | Display name | **MUST rename before ASC listing**. Bundle/package/slug unchanged. Exact string **TBD** (owner brand choice). Soft-launch-under-collision-name path closed for public G2. |
| **2026-09-24** | Agent shortlist | Avoid Neon+Brick compound | Added Pulse Paddle / Grid Ricochet / Lumen Break for A3 Q5 |

## Current status

| Item | Status |
|------|--------|
| Shipping display name | **Pulse Paddle** — applied to `app.config.js` + Title (Phase D2, 2026-09-25) |
| Public listing name | Rename (D1=B) **done**; listing not yet created |
| Old-name ASC collision (Gosiha) | **Resolved** — no longer the shipped string |
| Informal web uniqueness skim for *Pulse Paddle* | **Not run** |
| Formal trademark opinion | Not obtained |
| Store console uniqueness check | **Still required** before listing create |

## Differentiation options

Keep bundle/package IDs; change **display name** only.

**Avoid:** exact / near “Neon Brick Breaker”, “Neon Bricks”, “Neon Breaker”, “Bricks Breaker: Neon …” — crowded on ASC (2026 skim).

### Shortlist for A3 Q5 (2026-09-24)

Prefer short, brandable names outside the `Neon + Brick` compound:

| # | Candidate | Notes |
|---|-----------|--------|
| 1 | **Pulse Paddle** | Skill-forward; low genre collision |
| 2 | **Grid Ricochet** | Geometry / aim feel; check “Ricochet” near-titles |
| 3 | **Lumen Break** | Neon vibe without “Neon Brick” |
| 4 | Neon Brick Breaker DX | Weak — still collision-adjacent |
| 5 | Owner write-in | Prefer this if cohort invents something sticky |

Older candidates (weaker): Neon Breakout (Arcade), Brick Neon Rally.

### Chosen alternate (D1=B)

| Field | Value |
|-------|--------|
| **Chosen display name** | Pulse Paddle |
| **Date decided** | 2026-09-25 |
| **Applied to `app.config.js` `name`** | Yes — Phase D2 |
| Source of truth on screen | `app/_brand.ts` `DISPLAY_NAME` |
| Drift guard | `npm run assert:brand` (wired into `npm test`) |
| Bundle id / package | `com.dexter292.bricksbreaker` — **unchanged** |
| Expo slug / URL scheme | `bricks-breaker` / `bricksbreaker` — **unchanged** |

Owner picked shortlist candidate #1 (2026-09-25) without the A3 cohort pulse, which was
skipped. The name therefore has **no cohort validation** — it was chosen on the
collision-avoidance argument alone.

### Still outstanding for "Pulse Paddle"

| Check | Status |
|-------|--------|
| App Store Connect uniqueness | **Not run** — do at listing creation |
| Google Play uniqueness | Not run (no Play track this release, D2=B) |
| Informal web / store skim for "Pulse Paddle" | **Not run** |
| Formal trademark opinion | Not obtained |

The old name's problem was an **exact-title ASC collision** (Gosiha Pte. Ltd.). Moving off
the `Neon + Brick` compound removes that specific collision, but "Pulse Paddle" has not
itself been searched. Run the console check before creating the listing.

## Product note

“Brick breaker” is a descriptive genre phrase. Exact-title collision with an existing App Store product raises **rejection / consumer confusion** risk even without a registered trademark. This file is **not** a legal opinion.
