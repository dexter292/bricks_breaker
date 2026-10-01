---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 02
type: execute
status: complete
---

# 14-02 Summary: persisted `unseen` unlock set

## Task 1 — blocking decision

**Chosen: `store-side`**, gated on the run's outcome (`args.outcome === 'abandoned'`).

**Rejected: `host-side`** (gated on the result panel actually rendering) — it would need a
second persist inside the same run-end tick, breaking the shipped one-write-per-run-end
invariant.

**Named residual, recorded verbatim as the plan requires:** `outcome` is a PROXY for "no
result panel rendered", not the fact itself. All four shipped run exits were traced and pass
`abandoned` only when no panel renders, but that is a reading of control flow, not a test. If
a future win-or-lose path can navigate away without raising a panel, an unlock earned there
is never marked unseen and WINDOWS #35 survives in a narrower form.

## What shipped

- `AchievementRecord.unseen: string[]` (types.ts) — inverted-default field, additive, no
  `PROGRESS_VERSION` bump.
- `ProgressStore.markAchievementsSeen?(): Promise<void>` — optional, same reason `flush?()` is.
- Site 2 (clone): `cloneTelemetryBlob` spread-copies `unseen`.
- Site 3 (reconcile): `mergeAchievementRecords` unions both sides' `unseen` through a `Set`,
  first-seen order, bounded.
- New pure helper `markAchievementsUnseen(telemetry, ids)` in `telemetry.ts`, exported from
  `index.ts`, copying `mergeAchievementUnlocks`' clone/guard/union/bound shape.
- Site 4 (read path, the one tsc cannot see): `sanitizeAchievementRecord` (`parseBlob.ts`)
  gained a fourth step — drop unknown/non-string → intersect with the just-assigned
  `out.unlocked` id set → de-dupe keep-first → bound LAST as a survivor counter. Corrected the
  stale `sanitizeAggregateMap` "no key cap" comment beside it (false since `AGGREGATE_MAP_BOUND`
  landed); left `types.ts`'s past-tense history of that bound untouched.
- Both write tails (`memoryStore.ts`, `asyncStorageStore.ts`): inside the existing
  `newlyUnlocked.length > 0` block, immediately after `mergeAchievementUnlocks`, call
  `markAchievementsUnseen(..., newlyUnlocked)` gated on `args.outcome === 'abandoned'`. One
  `updatedAt` stamp and one persist per run end, unchanged.
- `markAchievementsSeen()` implemented on both stores — clears `unseen` to `[]`, one persist.
- **Unplanned but required fix found while implementing site 3:** `mergeAchievementUnlocks`
  itself (the write-side unlock merge) reassigned `next.achievements = { unlocked: ... }`
  without spreading the existing record, which would have silently wiped `unseen` on every
  run that earns a new achievement — including wins and losses, not just the write this plan
  owns. Fixed with `{ ...next.achievements, unlocked: ... }`.

## Compiler-caught sites, observed

Adding the required `unseen` field (before site 4 or the write tails existed) produced
exactly the sites the compiler can see and no others in source:
`cloneTelemetryBlob`, `mergeAchievementRecords`'s return, and `defaultTelemetryBlob`'s chain —
all fixed together in one pass (Task 2), after which `npm run typecheck` surfaced five
`TS2741`s, all in `tests/achievements.record.test.ts` at object-literal `AchievementRecord`
construction sites (lines 513, 520, 570, 572, 650 pre-edit), confirming the same class of
compiler-caught omission the plan predicted — fixed by adding `unseen: []` to each literal.

## Red-proofs observed

1. **Task 3's entry-dispatch readiness gate is 14-01's, not this plan's — not repeated here.**
2. **The `unseen bound` drop-then-bound ordering case.** Temporarily changed the read-path loop
   to `for (const item of unseenRaw.slice(0, ACHIEVEMENT_UNLOCK_BOUND))` (bound-first).
   Re-ran `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen bound'`: **1 failed** —
   `expected [] to deeply equal [ 'bricks-1000', 'combo-25', 'rally-60' ]`, because the
   bound-first slice kept only padding and dropped every real id. Reverted to the drop-then-
   bound order; re-ran to confirm `2 passed`.

## Verification (all green)

- `npm run typecheck` — clean
- `npx vitest run tests/daily.record.test.ts -t 'unseen'` — 3 passed
- `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen'` — 2 passed (`unseen`, `unseen bound`)
- `npx vitest run tests/achievements.record.test.ts -t 'unseen'` — 2 passed (one per store)
- `npm test` — 112 files / 891 tests passed, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean
- `git diff --quiet HEAD -- package-lock.json` — clean
- `grep -c 'record.unseen' src/services/storage/parseBlob.ts` → 2
- `grep -c 'ACHIEVEMENT_UNLOCK_BOUND' src/services/storage/telemetry.ts` → 6; `UNSEEN_BOUND` → 0 everywhere
- `markAchievementsUnseen`/`markAchievementsSeen` present in both store tails and `types.ts`
  (counts include both the import line and the call site, so 2 rather than the plan's
  predicted 1 — the semantic requirement, both hand-mirrored tails edited, holds)
