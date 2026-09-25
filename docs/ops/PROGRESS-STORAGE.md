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

| Key | Version | Role |
|-----|---------|------|
| `@nbb/progress/v3` | 3 | Canonical unlock + nested `bestByLevel` + rollup `bestScore` |
| `@nbb/progress/v2` | 2 | Legacy; **retained** after migrate |
| `@nbb/personal-best/v1` | 1 | Legacy PB; **retained** after migrate |

### Migrate

- Prefer valid **v3**.
- Else **v2→v3**: number bests → `{ score }` (omit stars); preserve `unlocked`.
- Else **v1→v3**: seed `bestScore` only; `unlocked=['level-01']`; empty `bestByLevel` (no invented attribution).
- Write-through v3 once after successful seed; do **not** delete legacy keys.
- Corrupt v3 → defaults; in-memory watermarks never lowered (F-26).

### Fail-soft (D-09 / F-26)

Corrupt JSON → defaults in parse result; watermark merge never lowers known score/stars. Writes soft-fail; `flush()` on AppState / OS pause re-attempts pending write.

## Ops: cert arm smoke + ceiling re-run (D-16 / RELEASE-GATES §6)

After play-path / `levelId` plumbing changes (C2):

1. **One CERT arm smoke** before any measurement — launch with CERT harness; confirm starts Playing (skip Select) on `level-03`; confirm inject/arm after remount (`[cert] GameHost CERT=1 phase=playing`).
2. After C2 chrome lands: **one** iOS ceiling Cert WC re-run per [RELEASE-GATES](../../.planning/post-mvp/RELEASE-GATES.md) §6 — do **not** measure twice.

Ceiling measurement itself is a separate session (not part of routine UAT approval).

## Not in this doc’s scope

- Score-band star thresholds (**E2 / N-CNT-02**)
- Chapters / cloud sync / aimed serve
