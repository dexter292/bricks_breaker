---
status: partial
phase: 13-achievements
source: [13-VERIFICATION.md, 13-SECURITY.md, 13-REVIEW.md]
started: 2026-09-29T10:41:00Z
updated: 2026-09-29T10:52:00Z
---

## Current Test

[simulator batch complete — four device/layout items remain blocked on hardware this machine does not have]

## How this session was run

Run by the assistant on a booted **iPhone 17 simulator (402×874 pt)**, dev build from
DerivedData (`Debug-iphonesimulator`, built 2026-09-25) serving the **current** JS from Metro.
Verified before starting that no native or dependency change had landed since that build: the only
`package.json` delta across the window is three `scripts.test` lines, and `ios/` and
`app.config.js` are untouched — so the stale binary is serving current code, not stale code.

**Every functional test below states its prediction BEFORE the run that tested it**, computed from
the blob on disk rather than read off the screen afterwards. Storage was inspected directly at
`.../Library/Application Support/com.dexter292.bricksbreaker/RCTAsyncLocalStorage_V1` between runs.

**Disclosed harness affordance.** Tests 5 and 6 required more than one achievement to qualify at
once, which no amount of play in one session would produce. The stored counters were raised by hand
for those two tests and the unlock set cleared, then **the pre-seed blob was restored byte-for-byte
afterwards** (verified: seeded `bricksBroken: 1500` → `272`, `longestRallyEver: 80` → `36`,
`endless.bestWave: 12` → `2`, and `combo-25` back with its original run-1 timestamp). Tests 1–4 used
**no affordance at all** — they ran against telemetry this device genuinely accumulated over prior
sessions.

**The starting state was itself the most valuable fixture in this batch** and was not constructed:
a real `@nbb/progress/v4` blob, written before phase 13 existed, **with no `achievements` field at
all**. That is D-13's no-migration case arriving naturally rather than staged.

## Tests

### 1. A pre-phase-13 blob gains the achievements field with no version bump (SC-3 / D-13)
expected: the stored blob is `v: 4` with `telemetry.achievements` absent. After one finished run the
field exists and `v` is **still 4** — no `PROGRESS_VERSION` bump, no migration, every campaign,
endless and daily field intact.
result: **pass** — before: `achievements` absent, `v: 4`. After run 1: `{"unlocked":[{"id":"combo-25","at":1790649864663}]}`, `v: 4`. `lifetime.runsPlayed` 20 → 21, every other field unchanged.

### 2. Exactly the predicted achievement fires, and the panel shows its catalog NAME (SC-1 / SC-5 / T-13-01)
expected: stated in full before playing. Against the stored counters (`bestComboEver: 59`,
`bricksBroken: 260`, `longestRallyEver: 36`, `largestCascadeEver: 7`, `runsPlayed: 20`, pickups
summing 42, `runsWon: 0` on every campaign cell, `endless.bestWave: 2`, daily empty) **exactly one
of the twelve qualifies: `combo-25`**. So the lose panel must show one line, `Unlocked · 25x Combo`,
with no `and N more`.
result: **pass** — `Unlocked · 25x Combo`, one line, no overflow. The rendered string is the catalog
**display name**, not the stored id (`combo-25`), which is T-13-01's whole mitigation. The `·` is the
same U+00B7 as the `Best · 4040` line directly above it, so the block reads as part of the panel
rather than as a notification pasted onto it — the UI-SPEC's stated reason for that glyph.

### 3. Idempotency — the same achievement does not re-fire (SC-2 / D-02)
expected: a second losing run on the same level shows **no** unlock block, while the rest of the
panel renders normally — so the absence is a suppression and not an empty render. The stored
timestamp must not move (D-14).
result: **pass** — run 2's panel shows `Lose / Out of lives / Score · 240 / Best · 4040 / Retry /
Menu` and **no `Unlocked` line**; the panel is visibly one row shorter than run 1's. Storage:
still exactly one entry, `at` **unchanged** at `1790649864663`, `runsPlayed` 21 → 22. The positive
control is the rest of the panel, present and correct in the same screenshot.

### 4. The unlock survives an app kill (SC-3)
expected: terminate the app, cold start, play a third losing run. If the field did not survive the
read path the achievement would re-announce. It must not.
result: **pass** — `xcrun simctl terminate`, relaunch, run 3: **no unlock block**. Storage after:
`runsPlayed: 23`, one entry, `at` still the **original run-1 timestamp** — so it survived the kill
and was read back rather than re-earned.

### 5. The retroactive flood, the two-line cap and the overflow copy (D-04 / D-05 AMENDED)
expected: stated before the run. With the unlock set cleared and counters raised so that seven
qualify, catalog declaration order makes the named one `1000 Bricks` and the remainder six, so the
panel must show **exactly two lines**: `Unlocked · 1000 Bricks` then `and 6 more`.
result: **pass, and this is the first time any of it has been seen** — the computed two-row budget,
the `and N more` copy, the declaration-order choice of which achievement gets named, and the count
being the honest remainder of the whole set were all arithmetic in `13-UI-SPEC.md` that nothing had
ever rendered. Storage confirms all **seven** persisted, in declaration order, **sharing one
timestamp** (`1790650128462`) — which is exactly D-04's recorded consequence and the reason
`achievementLines` refuses to sort by recency.

### 6. The same block on the daily panel, above the countdown (N-ACH-03 / D-06)
expected: a daily run with achievements pending shows the same block, from the same classifier,
**after** the stats rows and **above** the countdown.
result: **pass** — the daily lose panel reads, in order: `Daily · 2026-09-29`, `Score · 140`,
`Streak · 1`, `Best streak · 1`, `Days played · 1`, **`Unlocked · 1000 Bricks`**, **`and 6 more`**,
`New board in 13h 9m`, `Menu`. The block is above the countdown, as specified. Incidentally this is
the **fully-populated 11-row case** WINDOWS #17 budgets against, and `Menu` was fully visible and
tappable without scrolling — **at 402×874 pt**, which is not the viewport #17 asks about. See below.

### 7. WINDOWS #16 — a 16-character display name on one line at 320 px
expected: view `Unlocked · {name}` with a display name of exactly sixteen characters in the shipped
320 px panel; one line, no wrap, no truncation.
result: **blocked — hardware.** Two separate reasons, both real. (a) No 320 px-wide device is
reachable here: `xcrun simctl list` offers only iPhone 17 / 17 Pro / 17 Pro Max / 17e, and 320×568
requires Display Zoom on an iPhone 8 / SE, none of which is installed. (b) **No sixteen-character
name exists in the shipped catalog** — the longest is `Flawless Clear` at 14, and the two observed
today were `25x Combo` (9) and `1000 Bricks` (11). The entry's own text already says confirming at
14 does not verify the budget; a name must be temporarily lengthened to exactly 16. Stays OPEN.

### 8. WINDOWS #28 / #17 — the 320×568 pt vertical fit, and the bottom safe-area INSET
expected: reach a campaign win with three stars, `New Record`, `Retry`, `Next` and `Menu` plus a
two-line unlock block at 320×568 pt; confirm `Menu` is reachable without scrolling, and **read** the
bottom safe-area inset rather than inferring it from the panel appearing to fit.
result: **blocked — hardware.** No 320×568 device exists on this machine, and the inset is the
question, not the fit. What today *does* contribute is a lower bound and nothing more: the
11-row daily panel and the 2-line block both render with `Menu` reachable at 402×874. That is a
larger viewport in both dimensions and says nothing about 26 px of spare at 568 pt. `ACHIEVEMENT_LINES_MAX`
stays 2. Stays OPEN — and note the remedy is only load-bearing as of `99afd8b`; before it, the
constant was read by nothing in production.

### 9. WINDOWS #29 — Dynamic Type at iOS xLarge
expected: expected to CLIP (≈1.118 against a computed ceiling of 1.102). Confirming the clip is the
correct outcome — D-18's recorded deferral, due Phase 14, not a new defect.
result: **not run.** Stays OPEN.

### 10. D-11 — the twelve thresholds as judgements
expected: an owner decides whether each threshold is the right bar. Four questions are prepared in
`docs/ops/ACHIEVEMENTS.md`.
result: **owner decision, not run.** Nothing today calibrates a threshold: one run of real play
crossed exactly one of them, and the other six observations came from hand-raised counters.
`rally-60`, `daily-perfect` and `flawless-clear` remain the three worth the hardest look.
**An id rename must happen before any build ships**, since an id is the stored key.

### 11. Code review WR-03 — an unlock earned on an abandoned run
expected: earn an achievement on a run ended with `Menu` rather than by losing; the unlock is stored
and never announced (7 of 12 entries are crossable this way).
result: **not run.** Recorded as WINDOWS #35 and deferred to Phase 14 as an inherited obligation;
today's runs all ended by losing, which is the announced path.

## Evidence provenance

| Kind | Count | What |
|---|---|---|
| assistant-measured on device | 6 | Tests 1–6. Each states a prediction computed from the on-disk blob **before** the run, then checks the screen **and** the blob afterwards. |
| blocked — hardware absent | 3 | Tests 7, 8, 9. No 320×568-capable simulator is installed; Dynamic Type not exercised. |
| owner decision | 1 | Test 10. |
| not run | 1 | Test 11. |
| human testimony | 0 | **No human has played this build.** Every observation here is the assistant's. |

**What a simulator settles and what it does not.** It settles behaviour that is a function of code
and stored state — which achievements fire, what the panel renders, what persists across a kill,
what the blob holds. It does **not** settle layout at a viewport it cannot emulate, and phase 11
established on the record that this project does not accept simulator readings for device-timing
claims. Nothing above is recorded as having discharged a backstop.

**Two incidental observations, neither a phase-13 item.** The `__DEV__` dev row wraps to two lines
as `eec2137` intended, but `Daily` and `Crash` render **over the brick field** rather than beside
it — cosmetic, dev-only, and that surface is deleted by Phase 14. And the daily board generated for
2026-09-29 rendered with steel, explosive and mirrored structure, compiled and played without
incident, which is a data point for phase 10 and not evidence for any of its criteria.
