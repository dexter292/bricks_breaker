---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 05
type: execute
status: complete
---

# 14-05 Summary: AchievementsScreen

## What shipped

- `app/_components/AchievementsScreen.tsx` — all twelve `ACHIEVEMENT_CATALOG` entries,
  catalog declaration order, no sort/filter/group. Two pieces of state from one read:
  `progress` and a SEPARATE frozen `unseenAtMount`, so the New marker a player is looking
  at cannot be erased by the seen-write their own visit triggers. `Back` and the heading
  are preceding siblings of a `flex: 1` `ScrollView` (never wrapped, never sticky), which
  carries `testID="achievements-scroll"` — the first production `testID` in this repo.
  `markAchievementsSeen?()` is called optional-call + swallowed-catch, inside the same
  `.then()`, only on a successful read.
- `tests/ui/AchievementsScreen.test.tsx` — 7 cases across both tasks.
- `tests/ui/shellColorFences.test.ts` — a durable `@vitest-environment node` source
  contract fencing `#6B7280` / `#F2CC8F` / `#E85D5D` out of both new screens, with a
  two-direction self-check, a non-vacuity accent-token check, and a file-list guard.

## Source-occurrence scans

```
catalogRead=2 sorts=0 clamped=2 maxHeight=0
scrollFound=true backBeforeScroll=true headingBeforeScroll=true pressableInsideScroll=0 testId=1
```

Both exact matches to the plan's required lines.

## `testID` forwarding — confirmed

`screen.getByTestId('achievements-scroll')` resolves under jsdom in the `shell contract`
case and its positive control (the container's text includes the first catalog entry's
name) passes — the `testID` forwards correctly through react-native-web, so the render-tree
half of the scroll-structure claim is not a vacuous assertion.

## Red-proofs observed

1. **The freeze (Task 1).** First attempt — switching `unseenIds` from the frozen
   `unseenAtMount` state to a memoised derivation of `progress.telemetry.achievements.unseen`
   — did NOT fail the existing `marker` case, because in this component's single-read
   architecture both sources are populated from the identical snapshot object and never
   diverge across a plain re-render with an unchanged store reference. Rewrote the case to
   exercise the REAL hazard the freeze protects against: a shared mutable snapshot object,
   where `markAchievementsSeen`'s mock reassigns `sharedSnap.telemetry.achievements.unseen`
   to `[]` **in place, synchronously, inside the same effect tick** that handed that same
   object to `setProgress`. Switched the component to `const unseenIds = new
   Set(progress.telemetry.achievements.unseen);` (an unmemoised live read, no freeze) and
   re-ran `-t marker`: **1 failed** — the `New` marker never appeared at all, because the
   synchronous mutation inside the same `.then()` landed before React's first paint read
   the live property (stronger than a failure only after a forced re-render). Restored the
   frozen `useMemo(() => new Set(unseenAtMount), [unseenAtMount])`; re-ran to confirm
   `7 passed`.
2. **The scroll structure (Task 2).** Temporarily moved the `Back` `Pressable` inside the
   `ScrollView`. Re-ran both instruments: `-t 'shell contract'` reported **1 failed**
   (`expected true to be false` on `scroll.contains(back)`), and the source scan printed
   `backBeforeScroll=false pressableInsideScroll=1`. Restored the original structure;
   re-ran both to confirm `7 passed` and `backBeforeScroll=true pressableInsideScroll=0`.
3. **The colour fence, both directions (Task 3).** (a) Added `const __REDPROOF_MUTED =
   '#6B7280';` as real code in `StatisticsScreen.tsx`: re-ran `shellColorFences.test.ts`,
   **1 failed** (`expected 1 to be +0`). (b) Replaced it with the identical token inside a
   `//` comment only: re-ran, **3 passed** — the strip correctly removed the comment-only
   mention. Restored the original file; re-ran to confirm `3 passed`.

## Verification (all green)

- `npx vitest run tests/ui/AchievementsScreen.test.tsx` — 7 passed
- `npx vitest run tests/ui/shellColorFences.test.ts` — 3 passed
- `npx vitest run tests/ui` — **24 files / 238 tests passed**
- `npm test` — 115 files / 908 tests passed, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean
- `npm run typecheck` — clean
- `grep -cE "^import .*'\.\./\.\./src/services/(storage|achievements)/[a-z]" app/_components/AchievementsScreen.tsx` → 0 (barrel-only)
- `grep -c "SelectScreen" tests/ui/shellColorFences.test.ts` → 0
- `git diff --quiet HEAD -- package-lock.json` — clean
