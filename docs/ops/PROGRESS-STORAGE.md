# Progress Storage (N-PROG-01 / N-PROG-02 / N-PROG-03)

**Status:** C2 ProgressBlob **v3** live — nested `{ score, stars? }` + lives-based stars + Level Select three-states  
**Host wire:** `recordRunEnd` on WON/LOST (cold path); Select mount `getSnapshot()`; Results stars/Next from returned blob

## Catalog order (D-01)

| Order | LevelId | Notes |
|------:|---------|-------|
| 1 | `level-01` | Always unlocked |
| 2 | `level-03` | Unlocks after clearing level-01 |
| 3 | `level-04` | After level-03 |
| 4 | `level-05` | After level-04 |
| 5 | `level-06` | Campaign end; next = null |
| — | `level-02` | **Negative fixture only** — never in playable catalog |

Source of truth: `PLAYABLE_LEVEL_ORDER` in `src/services/storage/catalog.ts` (DEV level cycle uses the same list).

## Unlock (N-PROG-01 / D-04)

| Event | Effect |
|-------|--------|
| **WON** | Unlock next catalog id via `unlockAfterClear(cleared)` (inside `recordRunEnd`) |
| **LOST** | Does **not** unlock |
| Idempotent | Re-winning an already-cleared level does not duplicate ids |

Play path: Title → **Select** → unlocked row → Playing (`levelId` required). CERT/SOAK bypass Select (see `SOAK-PHYSICAL.md`).

## Per-level best + stars (N-PROG-02 / N-PROG-03)

| Surface | Source |
|---------|--------|
| Results Best / New Record | Blob after `recordRunEnd` + `evaluatePersonalBest` (strict `>`) |
| Results stars (win) | Nested `bestByLevel[id].stars` from returned blob |
| Select row | `selectRowState` / `getSnapshot()` on each mount |
| Title Personal Best | `getBest()` rollup = max of nested `.score` values |
| Persist | WON **or** LOST merges score; stars **only on win** |

### Stars formula (lives-based in C2)

| Rule | Detail |
|------|--------|
| Key | `@nbb/progress/v3` |
| Nested best | `bestByLevel[id] = { score: number; stars?: 1 \| 2 \| 3 }` |
| Omit stars | Until first **win** for that level (prefer omit over `0`) |
| On win | `stars = clamp(floor(livesRemaining), 1, 3)`; store `max(stored, computed)` |
| On lose | No stars write (score may still watermark) |

**N-PROG-03 amend:** lives-based in C2; **score-band** star thresholds deferred to **E2 / N-CNT-02**. Rationale: max scores differ ~3× across the 5 playable levels — a global T2 band is unfair; per-level thresholds need playtest (A3).

## Select three-states (N-LVL-02 / D-18 / R-30)

| State | Display |
|-------|---------|
| **Locked** | Lock affordance; no best / stars; tap ignored |
| **Unlocked, never cleared** | Label + ☆☆☆; **no** “Best · 0” |
| **Cleared** | Label + stars (or ☆☆☆ if legacy clear without stars yet) + Best when score present |

Cleared ⟺ unlock chain proves prior clear **or** recorded stars ∈ {1,2,3} (R-30). Unlock chain is durable clear history; stars are mastery overlay.

## Storage keys

> **Brought up to v4 on 2026-09-29.** These three sections described **v3** as canonical
> until then, while the shipped key had been `@nbb/progress/v4` since Phase 9. Recorded as
> `T-09-A3` by the phase-09 security audit: phase 09 shipped the v4 blob, the v3→v4 chain,
> the sixteen-field aggregate, `RECENT_RUNS_BOUND` and the whole fail-soft v4 contract, and
> wrote **zero lines** of this document — no plan ever undertook it. That is the direct
> mechanism by which the uncapped `sanitizeAggregateMap` (WINDOWS #27) sat unowned for three
> phases: the document a later phase reads did not describe the thing it was reading.

| Key | Version | Role |
|-----|---------|------|
| `@nbb/progress/v4` | 4 | **Canonical.** Everything v3 held, plus the `telemetry` blob — lifetime and per-`(mode, levelId)` aggregates, the bounded `recentRuns` ring, the endless record, the daily record, and the achievements set |
| `@nbb/progress/v3` | 3 | Legacy migrate source; **retained** after migrate |
| `@nbb/progress/v2` | 2 | Legacy; **retained** after migrate |
| `@nbb/personal-best/v1` | 1 | Legacy PB; **retained** after migrate |

### Migrate

The chain is `migrateOrDefault(v4, v3, v2, v1)` in `src/services/storage/migrateProgress.ts`.

- Prefer valid **v4**.
- Else run the **v3 chain** (`migrateOrDefaultV3`) and lift its result through `v3ToV4`:
  - Prefer valid **v3**.
  - Else **v2→v3**: number bests → `{ score }` (omit stars); preserve `unlocked`.
  - Else **v1→v3**: seed `bestScore` only; `unlocked=['level-01']`; empty `bestByLevel` (no invented attribution).
- `v3ToV4` **adds** the telemetry blob at defaults and carries every v3 field forward unchanged —
  it must not lose a single best score, star or unlocked level. That is Phase 9's SC-3 and a v3
  fixture round-trips through it in `tests/storage.progress-v4.test.ts`.
- Write-through v4 once after a successful seed; do **not** delete legacy keys.
- Corrupt v4 → defaults; in-memory watermarks never lowered (F-26).

**Additive fields take no version bump.** Phase 13's `telemetry.achievements` was added to the v4
blob without touching `PROGRESS_VERSION` (D-13): a v4 blob written before the field existed parses
with `status: 'ok'` and the field defaulted. See § Achievements below.

### Fail-soft (D-09 / F-26)

Corrupt JSON → defaults in parse result; watermark merge never lowers known score/stars. Writes
soft-fail; `flush()` on AppState / OS pause re-attempts pending write.

**Telemetry corruption degrades telemetry ALONE** (Research Pitfall 4), and finer than that: a
corrupt `lifetime`, `byMode`, `recentRuns`, `daily` or `achievements` degrades only *itself*, and
`bestScore`, `unlocked`, `bestByLevel` and the sibling telemetry regions all survive it. Guarded by
`tests/storage.progress-v4.test.ts`; the `lifetime` / `byMode` / `recentRuns` third of that was
itself unguarded until 2026-09-29.

**Every stored collection is bounded on READ as well as on write**, so a hand-edited blob cannot
grow one:

| Collection | Bound | Direction | Why that direction |
|---|---|---|---|
| `recentRuns` | `RECENT_RUNS_BOUND` = 50 | keep **latest** | a recency ring; the oldest run is the one worth losing |
| `byMode.*` maps | `AGGREGATE_MAP_BOUND` = 64 | keep first | every key comes from a five- or one-member domain, so 64 can only drop invented ones |
| `achievements.unlocked` | `ACHIEVEMENT_UNLOCK_BOUND` = 64 | keep **first** | under D-17 an unlock is permanent, so the oldest are the ones held longest |
| `achievements.unseen` | `ACHIEVEMENT_UNLOCK_BOUND` = 64 (same constant) | keep **first** | a subset of `unlocked`, intersected with it on read (14-02) — the same permanence argument applies, so it shares the sibling's bound rather than minting a second one |
| `recentRuns[].levelId` | `RUN_LOG_LEVEL_ID_MAX` = 32 chars | entry dropped | four times the longest legitimate value (`level-01`, 8) |

The two `keep` directions genuinely differ and both are correct for their collection. A later
change must not unify them.

## Ops: cert arm smoke + ceiling re-run (D-16 / RELEASE-GATES §6)

After play-path / `levelId` plumbing changes (C2):

1. **One CERT arm smoke** before any measurement — launch with CERT harness; confirm starts Playing (skip Select) on `level-03`; confirm inject/arm after remount (`[cert] GameHost CERT=1 phase=playing`).
2. After C2 chrome lands: **one** iOS ceiling Cert WC re-run per [RELEASE-GATES](../../.planning/post-mvp/RELEASE-GATES.md) §6 — do **not** measure twice.

Ceiling measurement itself is a separate session (not part of routine UAT approval).

## Achievements in the v4 telemetry blob (Phase 13 / D-13)

> This section covers the achievements field only; the catalog, the thresholds and the surface
> are in [`ACHIEVEMENTS.md`](./ACHIEVEMENTS.md). The telemetry sub-object it belongs to
> (`lifetime`, `byMode`, `endless`, `daily`, `achievements`, `recentRuns`) is described in
> § Storage keys above.
>
> *This note used to open "the sections above describe the **v3** `ProgressBlob`", which was true
> when phase 13 wrote it and is no longer: those sections were brought up to v4 on 2026-09-29
> (`T-09-A3`). Phase 13 having to disclaim the rest of its own ops document is what made the gap
> visible in the first place.*

**Shape.** `TelemetryBlob.achievements` is an `AchievementRecord` — `{ unlocked: AchievementUnlock[] }`
— where an `AchievementUnlock` is `{ id, at }`: the catalog id, and the Unix ms at which it was
**first** earned (D-14). The timestamp never moves; an id already present keeps its existing `at`
on every write and on every merge (D-17 / D-22). An **array**, deliberately not a map keyed by id —
`sanitizeAggregateMap` in the same parser is the counter-example, copying every key it finds on
read with no cap (WINDOWS #27).

**Bound.** `ACHIEVEMENT_UNLOCK_BOUND` is **64**, applied on write and again on read (after the
unknown-id drop). The arithmetic: an unknown id is dropped, so a legitimate record can never
exceed the catalog's size and that drop *is* the natural cap; 64 is more than five times D-09's
largest catalog, and it caps a hostile blob at roughly `64 × 40` bytes of JSON — about 2.5 KB,
against the ~2 MB Android CursorWindow practical ceiling the `RECENT_RUNS_BOUND` comment names. It
exists anyway because it is the fence that survives a future relaxation of the id check. Both
trims keep the **first** entries (`slice(0, …)`), never the last: the recent-run ring keeps the
newest because it is a window on recent activity, whereas an unlock is permanent (D-17) and
dropping the oldest would un-earn the achievements a player has held longest.

**Degrade rules (D-15 / D-21), and the one that inverts.** Downward, like every other v4 field, and
a corrupt achievements field degrades **alone** — campaign unlocks, bests, stars, the endless
record and the daily history are provably untouched.

| What is malformed | What happens | Why |
|---|---|---|
| the `id` | the entry is **dropped** | an id is not a counter; there is no nearest valid value |
| the `at` | it **defaults and the entry is kept** | D-17 — an unlock is one-way; dropping it would un-earn an achievement the player did earn. A bad timestamp costs only a sort order |

That pair has no other precedent in this parser and must not be unified: `sanitizeRunLogEntry`
drops on a non-finite timestamp and is the wrong analog. Guards: `sanitizeAchievementUnlock` and
`sanitizeAchievementRecord` in `src/services/storage/parseBlob.ts`, asserted by
`tests/storage.progress-v4.test.ts` and `tests/achievements.record.test.ts`.

**No version bump and no migration were taken (D-13).** The field is **additive on an existing
version**, exactly the precedent `endless` set and `daily` followed: `sanitizeTelemetry` starts
from `defaultTelemetryBlob()` and copies field by field, so a v4 blob written before achievements
existed parses clean with the field defaulted and every other field intact — asserted rather than
assumed (`tests/storage.progress-v4.test.ts`, the no-migration case). **`PROGRESS_VERSION` is
unchanged at 4 and `@nbb/progress/v4` is unchanged.**

**Three write sites, not two (D-23).** The field must be present in `defaultTelemetryBlob`
(`types.ts`), `mergeTelemetryBlobs` and `cloneTelemetryBlob` (`telemetry.ts`) — the compiler forces
all three — **and** in `sanitizeTelemetry` (`parseBlob.ts`), which it does **not**. A field the
parser never reads is silently defaulted and the file still compiles. Anyone adding a second field
to this record should read `ACHIEVEMENTS.md` § *The stored shape* first.

## Not in this doc’s scope

- Score-band star thresholds (**E2 / N-CNT-02**)
- Chapters / cloud sync / aimed serve
- The achievement catalog, its twelve thresholds and the result-panel surface (**[`ACHIEVEMENTS.md`](./ACHIEVEMENTS.md)**)
