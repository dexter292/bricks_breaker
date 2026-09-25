# Balance pass (Phase E2)

**Status:** Implemented 2026-09-25
**Requirements:** N-CNT-01 (difficulty curve) · N-CNT-02 (drop rates / star score bands) ·
N-CNT-03 (F-45 ball speed ramp — ship or reject)
**Owner sign-off:** **not obtained** — the playtest cohort (A3) was skipped by the owner, and
owner/device-gated work was skipped for this run. Everything below is derived from a
deterministic headless measurement, not from human play. See *Limits* at the end.

## The instrument

`tests/helpers/balanceBot.ts` plays a level headlessly through the real `stepRun` pipeline.
The paddle tracks the lowest live ball with a fixed lateral offset; seeds are explicit, so
every number replays exactly.

It is a **measuring instrument, not a player model**: it never misses. Its clear time is a
*floor* on human duration and its lives-remaining is always maximal. Offset `0` is the
degenerate case (the ball returns straight up and the board clears slowly); non-zero
offsets inject the angle variety a real player produces. Every figure below is over
offsets `{0, 12, −12, 20}`, seeds `0xace / 0xbeef`.

## N-CNT-01 — the curve was broken

Authored weight per level, and where each sat before E2:

| Level | Bricks | Total HP | Steel | E | Old slot | New slot |
|-------|--------|----------|-------|---|----------|----------|
| `level-01` Phase 3 Grid | 32 | 55 | 3 | 0 | 1 | **1** |
| `level-04` Steel Ribs | 48 | 64 | 5 | 2 | 3 | **2** |
| `level-05` Cascade Lattice | 55 | 94 | 4 | 4 | 4 | **3** |
| `level-06` Neon Vault | 68 | 132 | 12 | 4 | 5 | **4** |
| `level-03` Neon Gauntlet | 94 | 173 | 10 | 2 | **2** | **5** |

`level-03` is the 10×16 showpiece — **2.7× the authored weight of `level-04`** — and it sat
at slot 2. The campaign's hardest board was the second thing a new player saw, and every
level after it was lighter. That is a curve defect, not a taste question.

`PLAYABLE_LEVEL_ORDER` is now `01 → 04 → 05 → 06 → 03`, which is monotone non-decreasing in
both brick count (32 → 48 → 55 → 68 → 94) and total HP (55 → 64 → 94 → 132 → 173), and it
makes the showpiece the finale. `tests/balance.curve-e2.test.ts` pins the monotonicity so
the curve cannot silently regress.

Reordering is data-safe: progress v3 keys per-level bests by `LevelId`, and `unlocked` is a
membership list, so existing saves keep their bests and their unlocked set. Only the
*chain* differs going forward.

## N-CNT-03 — F-45 ball speed ramp: **ship**

`SERVE_SPEED` is 360 and fixed for the whole run; `MAX_BALL_SPEED` is 720 and, before E2,
was reached only through the anti-stall tier-2 nudge. A perfect bot still needed minutes
per board.

Ramp rates probed **outside core** (harness-side velocity rescale, nothing shipped),
20 runs per rate:

| Ramp (per second) | Median clear | Slowest | Runs not won |
|-------------------|--------------|---------|--------------|
| **0** (pre-E2) | 195.4 s | 360 s (timeout) | 1 |
| 0.005 | 136.5 s | 360 s (timeout) | 1 |
| **0.01** | 142.5 s | 272.9 s | 0 |
| 0.02 | 91.1 s | 209.1 s | 0 |

`0.01` is the chosen rate: it is the gentlest setting that removes the "last brick" timeout
entirely, and it reaches the `MAX_BALL_SPEED` cap only at t = 100 s, so most of a run is
still below 2× serve speed. `0.02` was rejected as a larger change to feel than the
evidence supports without a cohort.

### Shipped implementation

`src/core/rules/speedRamp.ts`, called from `stepRun` **before** `stepAntiStall`:

```
floor(t) = min(SERVE_SPEED × (1 + SPEED_RAMP_PER_SECOND × t), MAX_BALL_SPEED)
```

It raises a **floor**, it does not assign a speed. Consequences that matter:

- the anti-stall tier-2 ×1.08 boost lands on top of the floor and is never erased;
- the SLOW power-up is unaffected — slow is applied at integration time
  (`ballSpeedScale`), stored `vx/vy` stay absolute, so the ramp and slow do not fight;
- direction is always preserved;
- `t` comes from `world.tick`, so the ramp is a pure function of world state and
  `hashWorld` stays reproducible.

Set `SPEED_RAMP_PER_SECOND = 0` in `src/core/constants.ts` to disable it — one line.

### Measured result of the shipped config

Shipped config = ramp `0.01` + the new curve order. 20 runs:

| Level | Clear seconds (4 offsets) | Score range |
|-------|---------------------------|-------------|
| `level-01` | 95.0 / 96.4 / 133.1 / 223.8 | 2,630 – 7,750 |
| `level-04` | 66.6 / 68.4 / 86.4 / 108.5 | 7,030 – 21,020 |
| `level-05` | 72.0 / 93.0 / 125.5 / 126.7 | 8,320 – 22,370 |
| `level-06` | 92.2 / 156.5 / 166.6 / 216.9 | 14,490 – 30,650 |
| `level-03` | 135.9 / 157.3 / 164.9 / 175.7 | 15,160 – 50,570 |

**Median 195.4 s → 126.7 s (−35%). Slowest 360 s timeout → 223.8 s (−38%). 20 of 20 won,
up from 19 of 20.**

`level-01`'s slow tail (223.8 s at offset 20) is a bot artefact, not difficulty: on a
32-brick board the degenerate return angle dominates. Authored weight, not bot time, is
what the curve test pins.

### Certification impact — open

The ceiling cert (`CEILING-CERT.md` §5c PASS) was measured **without** a ramp. Sustained
higher ball speed means more CCD iterations per frame, so that perf evidence no longer
covers the shipped build. Physics *correctness* at speed is already covered — `PROP-TUNNEL`
property-tests at **2× MAX_BALL_SPEED**, so a ramp clamped to `MAX_BALL_SPEED` stays inside
the tested envelope — but frame cost is unproven. This is recorded as §5d debt.

## N-CNT-02 — drop rates and star score bands: **no change, with evidence**

### Score-band stars: rejected for now

C2 ships lives-based stars (`clamp(livesRemaining, 1, 3)`), and the v3 blob carries a
`{score, stars}` shape ready for a richer formula. E2 owns the score-band half — and the
measurement says thresholds would be close to arbitrary today:

| Level | Lowest score | Highest score | Spread |
|-------|--------------|---------------|--------|
| `level-03` | 15,160 | 50,570 | **3.3×** |
| `level-04` | 7,030 | 21,020 | **3.0×** |
| `level-06` | 14,490 | 30,650 | 2.1× |

That spread is at **identical bot skill on an identical board** — it comes entirely from
combo chains, which are a function of bounce angle. Any fixed score band would mostly
measure how lucky the ricochets were, not how well the level was played. Tuning this needs
human runs that show where real players actually land in that distribution.

**Decision:** keep lives-based stars; keep the v3 `{score, stars}` shape; revisit when a
cohort exists. Recorded rather than guessed.

### Drop table: unchanged

The B2/B3 table (36 / 36 / 10 / 10 / 8) is unchanged. Retuning it is explicitly
"tuned from playtest" in N-CNT-02, and the bot cannot supply that signal: it never dies, so
it cannot tell whether extra-life drops are too generous or the slow/fireball rate feels
right. Changing weights on bot data alone would be a guess wearing a number.

One observation worth carrying to the cohort: the bot regularly finished with **4 lives**,
above the 3 it started with, so extra-life drops do accumulate over these run lengths.

## Limits

- No human play informed any of this. N-CNT-01's requirement text says "validated by
  playtest"; it has been validated by **authored-weight analysis and headless measurement**
  instead. That is weaker evidence and is not a substitute.
- Owner sign-off on the curve — E2's stated acceptance — was **not obtained**.
- §5d ceiling re-cert is required before the ramp's perf cost can be claimed safe.
