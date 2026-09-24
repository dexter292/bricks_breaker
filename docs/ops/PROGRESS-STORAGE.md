# Progress Storage C1 (N-PROG-01 / N-PROG-02)

**Status:** C1 storage live 2026-09-24 · host wire unlock-on-win + per-level Results Best  
**Next UI:** Level select / stars / play gating → **C2** (not in C1)

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
| **WON** | Unlock next catalog id via `unlockAfterClear(cleared)` |
| **LOST** | Does **not** unlock |
| Idempotent | Re-winning an already-cleared level does not duplicate ids |

C1 does **not** gate Play on `isUnlocked` — default start remains `level-03` until C2.

## Per-level best (N-PROG-02 / D-05 / D-07)

| Surface | Source |
|---------|--------|
| Results Best / New Record | `getBestForLevel(activeLevelId)` — strict `>` |
| Title Personal Best | `getBest()` rollup = max of `bestByLevel` values (and prior rollup) |
| Persist | WON **or** LOST if run score beats that level’s stored best |

## Storage keys

| Key | Version | Role |
|-----|---------|------|
| `@nbb/progress/v2` | 2 | Canonical unlock + `bestByLevel` + rollup `bestScore` |
| `@nbb/personal-best/v1` | 1 | Legacy PB; **retained** after migrate |

### Migrate (D-08)

- Prefer valid v2.
- If v2 absent/corrupt and v1 ok → seed `bestScore` only; `unlocked=['level-01']`; empty `bestByLevel` (no invented attribution).
- Write-through v2 once after successful v1 seed; do **not** delete v1.

### Fail-soft (D-09 / F-26)

Corrupt JSON → defaults in parse result; in-memory watermarks never lowered. Writes soft-fail; `flush()` on AppState / OS pause re-attempts pending write.

## Not in C1

- Level select chrome / lock icons / stars / replay (**C2**)
- Changing default start level to `level-01`
- Aimed serve / Sentry DSN verify
