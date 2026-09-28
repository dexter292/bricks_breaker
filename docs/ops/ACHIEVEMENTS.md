# Achievements (Phase 13)

**Status:** Implemented 2026-09-28
**Requirements:** N-ACH-01 (a catalog of achievements declared as data, each a pure predicate
over a telemetry snapshot) · N-ACH-02 (evaluated once per run end, persisted in the v4 blob,
idempotent) · N-ACH-03 (the player is told, on the result panel they are already looking at)
**Consumers:** Phase 14's Achievements screen, which reads `telemetry.achievements.unlocked`
and the D-14 timestamps this phase captures · Phase 14's shell, which owns the
`maxFontSizeMultiplier` decision deferred below
**Owner sign-off:** **not obtained.** **No human has played this game** — `11-UAT.md` and
`12-UAT.md` both record that as still true — so **eleven of the twelve thresholds below are
judgements with no published anchor**, and every one of them says so at its own declaration
site. The phase's central layout number, the 26px of vertical spare that makes a two-line cap
legal, rests on a **device-supplied safe-area inset that was assumed and is still unmeasured**.
Read *Flagged assumptions from this round* and *Limits* before citing anything here as
established.

## Why this document exists

The catalog is **data** (SC-1). A thirteenth achievement is one array element and no code
change, which means the person who adds it will almost certainly never read a plan — they will
open `src/services/achievements/catalog.ts`, copy the entry above theirs, and ship. This file is
what that person should find first.

**What you may change freely, at no code cost:**

- a display name (subject to the 16-character budget below),
- a description,
- a threshold,
- the declaration ORDER (but read *What the player sees* first — the order is the panel's
  order, and it decides which achievement a player who unlocks four at once actually reads),
- a whole new entry.

**What you may never change: an `id`.**

An id is the stored key. The read path drops an unknown id
(`sanitizeAchievementRecord` in `src/services/storage/parseBlob.ts`, gated on
`isKnownAchievementId`, D-15) and D-17 says nothing un-earns an achievement. So renaming a
shipped id does not migrate anything — it **silently un-earns that achievement for every player
who had it**, on their next cold start, with no error anywhere. An id rename is free only
before the first build ships. After that it is a data-loss migration.

The policy itself lives in **`src/services/achievements/`** — `catalog.ts`
(`Achievement`, `AchievementSnapshot`, `AchievementCounters`, `ACHIEVEMENT_CATALOG`,
`ACHIEVEMENT_NAME_MAX`, `isKnownAchievementId`) and `evaluate.ts` (`qualifyingAchievements`,
`newlyUnlockedAchievements`), both pure, both without a clock and without a storage import.
Its guards are `tests/achievements.catalog.test.ts` (the data shape, purity, unique ids, the
name budget, three-mode coverage), `tests/achievements.evaluate.test.ts` (determinism,
idempotency, the retroactive flood, hostile snapshots, totality),
`tests/achievements.record.test.ts` (the write and read path across both hand-mirrored stores),
`tests/storage.progress-v4.test.ts` (the sanitizer) and `tests/ui/achievementLines.test.ts`
plus the two panel suites (the surface).

The record it writes lives inside the v4 blob documented in `docs/ops/PROGRESS-STORAGE.md`.

## The catalog

Twelve entries, **a single tier** — no bronze/silver/gold (D-09). Names are bounded by
`ACHIEVEMENT_NAME_MAX`, which is 16; the longest shipped name is `Flawless Clear` at 14, so a
rename has two characters of margin.

| # | id | Display name | Chars | Reads | D-10 class | Threshold |
|---|---|---|---|---|---|---|
| 1 | `bricks-1000` | `1000 Bricks` | 11 | `lifetime.bricksBroken` | cumulative | ≥ 1 000 |
| 2 | `combo-25` | `25x Combo` | 9 | `lifetime.bestComboEver` | skill-gated | ≥ 25 |
| 3 | `rally-60` | `60 Rally` | 8 | `lifetime.longestRallyEver` | skill-gated | ≥ 60 |
| 4 | `cascade-12` | `12 Cascade` | 10 | `lifetime.largestCascadeEver` | skill-gated | ≥ 12 |
| 5 | `runs-50` | `50 Runs` | 7 | `lifetime.runsPlayed` | cumulative | ≥ 50 |
| 6 | `pickups-100` | `100 Pickups` | 11 | the five `lifetime` pickup counters, summed | cumulative | ≥ 100 |
| 7 | `flawless-clear` | `Flawless Clear` | 14 | `byMode.campaign` | skill-gated | one cell with `runsWon ≥ 1` **and** `livesLost` exactly 0 |
| 8 | `campaign-25` | `25 Clears` | 9 | `byMode.campaign`, `runsWon` summed | cumulative | ≥ 25 |
| 9 | `endless-wave-10` | `Wave 10` | 7 | `endless.bestWave` | skill-gated | ≥ 10 |
| 10 | `endless-runs-20` | `20 Endless` | 10 | `byMode.endless`, `runsPlayed` summed | cumulative | ≥ 20 |
| 11 | `daily-perfect` | `Perfect Daily` | 13 | `byMode.daily` | skill-gated | one cell with `runsWon ≥ 1` **and** `livesLost` exactly 0 |
| 12 | `daily-streak-7` | `7 Day Streak` | 12 | `daily.longestStreak` | skill-gated | ≥ 7 |

**The D-10 split is five cumulative and seven skill-gated.** Cumulative entries (1, 5, 6, 8, 10)
cannot be failed, only waited out — a player who does not have one is not being told they played
badly. Skill-gated entries (2, 3, 4, 7, 9, 11, 12) are things the player did. The split is
**documented, not encoded**: there is no `kind` field on `Achievement`, and the comment above
`ACHIEVEMENT_CATALOG` says why, so the omission reads as a decision.

**All three modes are covered (D-12 / SC-5),** and behaviourally rather than by reading
`lifetime` twelve times. Entries 7 and 8 read only the campaign region, 9 and 10 only the
endless region, 11 and 12 only the daily region. The proof is three snapshots that each populate
exactly one region, anchored by an all-zero snapshot that qualifies nothing.

### The one-sentence version of each entry's reasoning

The full argument is the JSDoc at each entry. Condensed, in declaration order:

1. **`bricks-1000`** — `level-01` is 32 bricks and `level-03` is 94, so 1 000 is on the order of
   15–30 cleared boards: not handed over in the first session, reachable without grinding.
2. **`combo-25`** — `bestComboEver` is consecutive brick hits *without paddle contact*. Against
   the generator's published table (`docs/ops/BOARD-GENERATOR.md`), 25 is most of a tutorial
   board and about a third of a mid-scale one: a long unbroken sequence, not a whole board.
3. **`rally-60`** — `longestRallyEver` is consecutive *paddle* hits without losing a life. 60 is
   "about a minute of unbroken play" at a paddle-contact cadence of roughly one return a second
   — and **that cadence is itself unmeasured**, which makes this the most load-bearing estimate
   in the catalog.
4. **`cascade-12`** — the table places three explosives per half board at `d = 10`, so six on a
   full mid-scale board; 12 is a chain a well-placed shot into a dense region could reach and a
   stray shot could not. The metric UNDER-counts by construction, so the bar is harder than it
   reads.
5. **`runs-50`** — a returning player rather than a curious one, on the order of ten sittings.
   "Ten sittings" is a shape, not a figure: there is no retention curve and no cohort.
6. **`pickups-100`** — the sum of five pickup counters, one entry rather than five, because five
   "collect N of kind X" entries is the tiering D-09 rejected wearing a different hat. 100 across
   five kinds is ~20 each, which reads as "you have used the power-up system".
7. **`flawless-clear`** — the aggregate is per level ACROSS runs, so this means *you have won
   this level and have never lost a life on it*, which is strictly stronger than "cleared it once
   cleanly". It **under-reports on purpose**: a lifetime best invented out of an aggregate tells
   the player something untrue, which is worse than one that arrives a level late.
8. **`campaign-25`** — the cumulative companion to entry 7. Five levels are playable, so 25 wins
   is about five clean passes of the campaign, or many replays of the levels the player likes.
   Both readings are persistence, which is why summed wins is the right metric.
9. **`endless-wave-10`** — **the one entry with a real published anchor**; see below.
10. **`endless-runs-20`** — deliberately lower than entry 5's 50, because endless is one mode of
    three and a mode-specific entry must stay reachable for a player who splits their time. The
    ratio carries the argument, not the number.
11. **`daily-perfect`** — symmetric with entry 7 in shape and **harder than it**; see *Accepted
    costs*.
12. **`daily-streak-7`** — a week is the unit a daily habit is measured in and the smallest
    streak a single enthusiastic weekend cannot produce. `daily.longestStreak` is read **as
    stored**, which inherits the accepted tamper model (D-16, registered as T-13-04).

### Eleven of the twelve thresholds have no published anchor

Stated plainly because the alternative is a document that reads as if the catalog were
calibrated. **No human has played this game.** There is no distribution, no cohort, no retention
curve and no session-length measurement anywhere in this repository, and both `11-UAT.md` and
`12-UAT.md` record that as still true. Eleven entries therefore carry a *reasoning* and no
*anchor*, and each one says so in its own JSDoc rather than leaving the reader to infer it.

**The exception is `endless-wave-10`,** and what makes it different is that its anchor is a
relationship rather than a round number. `DAILY_DIFFICULTY` is fixed at 10
(`src/services/daily/dateKey.ts`), justified there against the generator's published table in
`docs/ops/BOARD-GENERATOR.md`: `d = 10` is 12 rows, 72 bricks, 116 authored HP, sitting between
`level-01`'s 32 bricks at `d = 0` and `level-03`'s 94-brick showpiece at `d ≈ 13`. The endless
ramp is `difficultyForWave(wave) = wave − 1` clamped (`src/services/endless/ramp.ts`), so **wave
10 is difficulty 9 and wave 11 is exactly the difficulty every daily board is fixed at.**
Reaching wave 10 therefore means having survived the ramp to one step below a board the player
already knows. That relationship is real and re-derivable. Whether that depth is *worth* an
achievement is still a judgement, and the table cannot answer it.

## Where evaluation happens, and why only there

**One call site: inside `recordRunEnd`, in both hand-mirrored stores
(`src/services/storage/memoryStore.ts` and `src/services/storage/asyncStorageStore.ts`),
against the telemetry snapshot that same write has just merged** (D-01). It sits **outside every
mode gate** (D-12), so campaign, endless and daily all reach it — and that is held
behaviourally, not structurally: `tests/achievements.record.test.ts` drives one qualifying run
through each of the three modes against three fresh stores and requires all three to report the
id.

**The rejected alternative, and its cost.** Evaluating again on app open or hydrate would catch
a retroactive unlock without needing a run — and it would put **one rule in two places**, the
exact shape that cost phase 11 six gap-closure rounds and phase 12 five separate leaks of a
single rule. Rejected. The cost is accepted and it is real:

- A retroactive unlock (D-04) **cannot appear until the player finishes one run.** On the Title
  screen immediately after installing this build, nothing has changed yet, however much
  telemetry the device already holds.

## Idempotency is a set difference, not a flag

SC-2 has two halves and they have **different mechanisms**, neither of which is a guard anyone
has to remember to write:

| Half | Mechanism | Holder |
|---|---|---|
| Determinism — the same snapshot evaluates to the same set, twice | a pure function of (catalog, snapshot) with no clock, no storage read and no randomness (D-03) | `qualifyingAchievements` |
| Idempotency — an already-unlocked achievement never fires again | a **set difference** against the stored unlocked set, not a per-achievement flag (D-02) | `newlyUnlockedAchievements` |

Re-evaluating an unlocked achievement produces an id that is already in the stored set, so the
difference is empty and nothing fires. There is no flag to forget to set and no second place for
the answer to live.

Purity is enforced at **AST level** by the `src/services/achievements/**` block in
`eslint.config.js`, which bans the clock, `Math.random`, `performance.now` and the storage
import inside that directory. **`npm run lint` enforces that block but does not observe whether
it still exists** — measured, lint exits 0 against a clean achievements directory with the block
deleted outright. The command that observes its presence is the `__purity_probe` gate (a
throwaway file written, linted and deleted in one command), which prints **5 errors with the
block and 0 without**. When you need evidence that D-03 and D-20 are still enforced, that probe
is the evidence; a green lint is not.

## The stored shape

`TelemetryBlob.achievements` is an `AchievementRecord`
(`src/services/storage/types.ts`): `{ unlocked: AchievementUnlock[] }`, where an
`AchievementUnlock` is `{ id, at }` — the catalog id, and the Unix ms at which it was **first**
earned (D-14). The timestamp never moves: an id already present keeps its existing `at` on every
subsequent write and on every merge.

It is an **array of entries, deliberately not a map keyed by id.** The counter-example lives one
file away: `sanitizeAggregateMap` in `parseBlob.ts` copies every key it finds on read, with no
cap, forever (WINDOWS #27).

**`ACHIEVEMENT_UNLOCK_BOUND` is 64.** The arithmetic: an unknown id is dropped on read, so a
legitimate record can never exceed the catalog's size, and that drop *is* the natural cap. 64 is
more than five times D-09's largest catalog — room for Phase 14 and beyond with no bound edit —
while capping a hostile blob at roughly 64 × 40 bytes of JSON, about 2.5 KB, against the ~2 MB
Android CursorWindow practical ceiling the neighbouring ring-buffer comment names. It exists
anyway, given the id check already caps it, because it is **the fence that survives a future
relaxation of that check** — the "forward-compatible with a later catalog" edit that looks
harmless and turns the collection into an unbounded map.

### The three-site obligation, and which two thirds of it the compiler catches

D-23: the field must be added to **the sanitizer, the merge, and the clone**. Not two sites —
three.

**MEASURED before this phase started**, by adding the field and reading the compiler's output:

| Site | Symbol | Compiler-forced? |
|---|---|---|
| default | `defaultTelemetryBlob` (`types.ts`) | **yes** — red until the field is added |
| merge | `mergeTelemetryBlobs` (`telemetry.ts`) | **yes** — red until the field is added |
| clone | `cloneTelemetryBlob` (`telemetry.ts`) | **yes** — red until the field is added |
| sanitizer | `sanitizeTelemetry` (`parseBlob.ts`) | **NO — absent from that list** |

`sanitizeTelemetry` starts from `defaultTelemetryBlob()` and copies field by field, so a field it
never reads is silently defaulted and the file compiles clean. That is exactly what happened
between plan 13-01 and plan 13-03: the write path shipped, the read path did not, every gate was
green, and a stored unlock was discarded on the next cold start.

**That is the sentence a later contributor adding a second field to this record will need.** The
clone and the merge will tell you. The parser will not.

The clone site is the one that would otherwise have had a campaign run silently erase the whole
unlock set, which is why D-23 calls the obligation three-sited rather than two.

## Degrade rules, and the one that inverts

The unlock set degrades **downward** on read like every other v4 field (D-15), and a corrupt
achievements field must not make the enclosing blob read as corrupt — the independence contract
`sanitizeTelemetry` already states, asserted rather than assumed.

The entry sanitizer (`sanitizeAchievementUnlock`) carries **two different failure rules inside
one function**, and the asymmetry is deliberate (D-21):

| What is malformed | What happens | Why |
|---|---|---|
| the `id` | the whole **entry is dropped** | an id is not a counter; there is no nearest valid value, and an invented id is an achievement nobody earned |
| the `at` timestamp | the timestamp **defaults and the entry is KEPT** | D-17 — an unlock is one-way. Dropping the entry would **un-earn an achievement the player did earn**. Degrading the timestamp costs a sort order that only Phase 14 reads |

**There is no in-repo precedent for that pair, so it must not be "unified".**
`sanitizeRunLogEntry`, in the same file, drops on a non-finite timestamp and is the WRONG analog
— the JSDoc at the site names it and says why. A cleanup that makes both rules the same rule
picks one of two costs: a lost sort order, or a lost achievement.

The order of operations is **drop, de-duplicate keeping the earliest, then bound** — and the
bound keeps the **first** entries (`slice(0, ACHIEVEMENT_UNLOCK_BOUND)`), never the last. All
three sites that trim this collection agree on that direction. Unifying the read bound onto the
recent-run ring's keep-newest form would make the parser drop the achievements the player has
held longest, which is the one direction D-17 forbids. The ring keeps the newest because it is a
window on recent activity; an unlock is permanent.

## The merge keeps the earliest timestamp

`mergeAchievementUnlocks` (the per-run fold) and the record merge behind `mergeTelemetryBlobs`
key **whole `{ id, at }` entries** and resolve a collision by taking the **earliest** timestamp
(D-22).

**`mergeDailyRecords`, in the same file, states the opposite rule** — incoming wins — for reasons
that do not hold here. Copying it without inverting it is a silent D-14 defect: every reconcile
would walk an unlock's timestamp forward, and D-14's whole reason to exist is a recency order
that cannot be reconstructed afterwards. **No test outside
`tests/achievements.record.test.ts` would catch it,** because nothing else reads the timestamp.

Two things about that guard are worth knowing before editing it:

- It asserts **commutativity** — the merge is performed in **both argument orders** and must
  give the same answer. This is not belt-and-braces. The narrower form (merge once, assert the
  earlier timestamp survives) was **measured passing against a deliberately inverted,
  last-writer-wins merge**, because `mergeTelemetryBlobs` iterates memory-then-incoming and the
  natural fixture puts the earlier timestamp on `incoming`, where both rules agree. Earliest-wins
  is commutative; incoming-wins is not. Deleting one of the two orders restores a case that
  cannot fail.
- The cross-wiring hazard here is narrower than phase 12's — an id is its own evidence, so only
  the timestamp can be mispaired — but a merge that unions ids and *then* reduces over all
  timestamps attaches one record's evidence to another's claim, which is the phase-12 defect in a
  new place. `telemetry.ts` names the banned `mergeAchievements(ids, timestamps)` shape in prose
  for that reason, and notes at the site that a check for it must read **declarations**, not file
  text.

## What the player sees

One block on the result panel the player is already looking at (D-06) — `ResultOverlay.tsx` for
campaign and endless, `DailyResultOverlay.tsx` for daily — rendered from **one** pure classifier,
`achievementLines` in `src/runtime/overlays/achievementLines.ts`. The panels take **display-name
strings** via props and never a storage type (D-08); the id-to-name mapping happens at a single
site in `app/_components/PlayingHost.tsx`, above the runtime boundary.

SC-4 ("does not interrupt a live rally") is satisfied **structurally, not by timing** (D-07): the
result panel only exists once the run has ended, so there is no rally left to interrupt. A toast
layer would have made SC-4 depend on getting timing right.

**Three copy shapes, and a cap of two rows.** `ACHIEVEMENT_LINES_MAX` is 2.

| Newly unlocked, `n` | Rendered |
|---|---|
| 0 | **nothing** — an absence, not an empty state |
| 1 | `Unlocked · {name₁}` |
| 2 | `Unlocked · {name₁}` and `Unlocked · {name₂}` |
| ≥ 3 | `Unlocked · {name₁}` and `and {n − 1} more` |

The zero state is an absence by contract: a `No achievements this run` line would cost 32px on
every result panel forever to say nothing, and phrased at all it becomes a small reproach at the
end of a run the player just lost.

Order is **catalog declaration order** — never sorted, never de-duplicated. Recency is
unavailable: under D-04's retroactive flood every unlock carries the same timestamp, so a
recency sort would make the NAMED achievement vary between two evaluations of one snapshot,
breaking SC-2 at the surface the player actually sees.

Two suppression states, both reusing a **shipped** flag and adding none: the block is absent at
endless Retry time (`showRunLines`, the `'start'` wave-build failure — no run has happened yet,
so any names still in props belong to the previous run) and on a daily board failure (`isClosed`
— nothing was played and `recordRunEnd` never ran). A `'mid'` wave-build failure is **not**
suppressed: that run ended and saved, so the unlocks are real.

### The measured arithmetic behind the two-row cap

**The binding panel is `ResultOverlay`, not `DailyResultOverlay`** — stated first, because every
prior phase's layout backstop pointed at the daily one and the measurement moves it.

The binding case is a **campaign win** with three stars, `New Record`, `Retry`, `Next` and
`Menu`, summed from the shipped `StyleSheet.create` values:
48 pad + 40 heading + 40 body + 32 `Score` + 32 `Best` + 32 stars + 44 badge + 64 `Retry` +
64 `Next` + 62 `Menu` = **458px**, against **548px usable** at 320×568pt.

| Rows added | Panel height | Verdict |
|---|---|---|
| 1 | 490 | fits, 58px spare |
| **2** | **522** | **fits, 26px spare — the tightest margin in the phase** |
| 3 | 554 | **over by 6px — clips `Menu`** |
| 4 | 586 | over by 38px |

`12-UI-SPEC.md` forbids scrolling on this panel, so a clipped `Menu` is a *control the player
cannot reach*, not a cosmetic overflow. That is why the cap is two and not D-05's original three,
and D-05's own reversibility clause anticipated exactly this ("the cap is a single constant").

The 26px of spare rests on a **bottom safe-area inset of zero**, which is an assumption. See
*Flagged assumptions from this round*.

A 16-character name budget backs the cap horizontally: 320 maxWidth − 24 padding on each side is
272px, SpaceMono's advance is 0.612 em measured from the shipped font file, so at Body 16px that
is 9.792px per character and ⌊272 / 9.792⌋ = 27 characters; the `Unlocked · ` prefix is 11, which
leaves 16. **That is load-bearing vertically too** — a 17-character name wraps, silently adding
24px, and 24px is most of the 26px of spare the whole reduction bought.

## Accepted costs

Named, bounded, deliberately unmitigated. Each is a **decision a later reader will find**, not a
defect to file.

**1. The retroactive flood names one unlock and counts the rest, and nothing lists them.** A
player who installs this build with thousands of bricks already broken unlocks everything they
qualify for on their first run end (D-04) and is told `Unlocked · {name₁}` and `and 11 more`.
Until Phase 14 ships the Achievements screen there is **no surface anywhere in the app that
lists the other eleven.** That is a real gap in the phase goal's "tells them"; it is a direct
consequence of the measured 26px budget rather than a preference.

**2. Every threshold is uncalibrated, and eleven have no anchor at all.** See *The catalog*. The
cost is not a code defect: a threshold at the wrong height makes an achievement either cheap or
invisible, and nothing in the repository can tell you which. Re-tuning is free (SC-1), which is
why the owner review below is cheap to act on.

**3. A tampered counter unlocks permanently.** `safeCounter` on the read path bounds **downward
only** — the phase-11 audit measured `Number.MAX_VALUE` surviving intact. So a hand-edited
counter on a rooted device fires a threshold predicate, and under D-17 the resulting unlock never
goes away (D-16 / D-17, registered as T-13-03 and T-13-04). Accepted for the reason
`11-SECURITY.md` and `12-SECURITY.md` both close local record tampering: there is no server, no
leaderboard and no asset being protected. An offline single-player achievement has no adversary
but the player.

**4. `sanitizeAggregateMap` is still uncapped on read, and four predicates now iterate those
maps.** WINDOWS #27 measured 5 000 injected keys surviving `parseProgressResult` with
`status: 'ok'`. Entries 7, 8, 10 and 11 iterate `byMode` maps once per run end, which makes that
pre-existing hole slightly more expensive to exploit and does **not** create it. **The
achievements bound does not close #27** — different collection, different file, and #27 is
inherited from phase 09. Named here so nobody reads one as having fixed the other.

**5. `daily-perfect` is the hardest entry in the catalog, and it is harder than its campaign
twin rather than equivalent.** `byMode.daily` is keyed by a single constant
(`DAILY_TELEMETRY_KEY`, phase 12's D-15 — a per-date key would create a map nothing ever trims).
So where campaign has one aggregate per level and therefore five chances at a clean one, daily
has exactly **one aggregate spanning every date the player has ever played**. One lost life on
any daily, ever, closes this achievement permanently. Deliberately not "fixed" by keying the
daily map per date: that would trade an unbounded stored map for a friendlier threshold.

**6. `flawless-clear` under-reports on purpose.** The aggregate is per level across runs, so a
player who fumbled `level-01` on their first evening and later plays it perfectly will never get
this on `level-01` — they will get it on the next level they never fumble. The exact alternative,
a per-run "flawless" flag, is not available from stored telemetry at all, and inventing one means
a new counter in the v4 blob for one achievement.

**7. The Dynamic Type ceiling falls from 1.433 to 1.102 at 320×568, and Phase 14 owns it.**
`allowFontScaling` defaults to `true` in React Native and an explicit `lineHeight` scales with it
— both measured in the installed tree. Adding two rows moves the campaign-win panel from clipping
at the first accessibility size to clipping **one step above the default** (iOS xLarge is ≈1.118
against a computed ceiling of 1.102). Pre-existing in kind: the panel already clips at AX1 today.
The lever is `maxFontSizeMultiplier`, it crosses three shipped components, and it is therefore
**not this phase's to pull** — deferred as D-18 with a **due point of Phase 14**, registered as
WINDOWS #29. See *Limits*.

**8. `assert-streak-evidence.mjs` does not cover the achievements merge, and nothing claims it
does.** WINDOWS #26 records why it could not: the script reaches only a consumer's own body, so
a cross-wire performed one function away is invisible to it. The guard for the merge tiebreak is
the two vitest cases in `tests/achievements.record.test.ts` and nothing else.

## Flagged assumptions from this round

Recorded here rather than only in the planning artifacts, so an open question is visible where
the work gets picked up.

- **The safe-area insets at 320×568 are device-supplied and were ASSUMED, not measured, and they
  are still unmeasured as this phase closes.** The usable-height figure of 548 is
  `568 − top inset 20 − bottom inset 0`. The top inset of 20 is reasoned from a measured fact
  (the status bar is visible and never hidden); **the bottom inset of 0 is reasoned from the
  device having a home button, and nothing in this repository can read it.** The whole two-row
  cap rests on that single number: if the bottom inset is non-zero, the 26px of spare goes
  negative *regardless of how the panel looked*, and `ACHIEVEMENT_LINES_MAX` must drop from 2 to
  1. **Unverified as of Phase 13.** Tracked as WINDOWS #28 (new and binding) with the
  reproduction recipe and the consequence attached.
- **320×568 is not a native viewport for this build, and the check needs Display Zoom.**
  `IPHONEOS_DEPLOYMENT_TARGET` is 16.4, and iOS 16 will not install on any natively-320×568
  device, so the viewport is reachable only through Display Zoom on a 375×667 device (iPhone 8 /
  SE 2nd gen / SE 3rd gen). At 375×667 (usable 647) the constraint disappears entirely — campaign
  win is 458 with 189px of headroom and four rows fit. **The entire reduction is a 320×568
  artifact.**
- **No layout claim in this document has been observed on a rendered panel.** jsdom performs no
  layout and supplies no safe-area insets, so it cannot report wrapping, clipping, truncation,
  overlap or fit. Every height, width and character-budget figure above is computed. A passing
  jsdom render is **not** evidence that the panel fits and must never be recorded as having
  verified one.
- **The 16-character budget has never been seen rendered.** The shipped catalog's longest name is
  `Flawless Clear` at 14, so even a device check at the current catalog does not exercise the
  budget — confirming at 14 does not verify 16. Tracked as WINDOWS #16.
- **`rally-60`'s threshold rests on a second, unmeasured judgement.** The paddle-contact cadence
  of roughly one return a second is an estimate from ball speed and field height, not a figure
  from a sweep or a playtest. `docs/ops/BALANCE-E2.md` and the generator sweep record clear
  *times*, not return counts, and a clear time cannot be converted into one without assuming
  exactly that cadence.

## Limits

This section is why this document exists rather than a code comment. Everything above is real;
these are the things that are **not** established, stated plainly so a later phase does not
mistake an inference for a fact.

**1. Nobody has played this game, and nothing here was calibrated by a player.** That is the
single largest limit on this document and it applies to all twelve thresholds at once. Treat the
reasoning as inherited and every number as re-openable.

**2. The device half of the row budget is unmeasured, and one number can still change shipped
code.** See *Flagged assumptions*. `ACHIEVEMENT_LINES_MAX` is 2 on the stated zero-inset
assumption; a non-zero bottom inset drops it to 1, and two test cases move with it.

**3. This document does not cover the Achievements screen.** Phase 14 owns it. This phase writes
the data it reads — `telemetry.achievements.unlocked`, every id minted by the catalog, every `at`
a non-negative integer, at most one entry per id — and the display order is not storage's.

**4. Tiering, rewards and progress meters are out of scope by decision, not by omission.** No
bronze/silver/gold (D-09 rejected it: it multiplies the thresholds needing justification and adds
a ladder that must be shown sane at both ends). No reward attached to an unlock — there is no
currency and no shop, and PROJECT.md rules the whole category out. No `7 of 12 unlocked`
completion line on the result panel: it costs a row that does not exist and it belongs to Phase
14's screen.

**5. No cross-device or social comparison of any kind.** PROJECT.md rules it out — no server, no
account, no store. An achievement is a local fact about one device's telemetry, and the tamper
posture in *Accepted costs* is only acceptable because of that.

---
*Phase: 13-achievements*
*Written: 2026-09-28*
