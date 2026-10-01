---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 03
type: execute
status: complete
---

# 14-03 Summary: StatisticsScreen

## What shipped

- `app/_components/StatisticsScreen.tsx` — built on `SelectScreen.tsx`'s skeleton (same DI
  store prop, same `useMemo`/`useState`/single-effect read pattern, same shell contract).
  Three lifetime rows (`Bricks broken`, `Best combo`, `Longest rally`) and seven `By mode`
  rows (`PLAYABLE_LEVEL_ORDER` then Endless then Daily), all rendered through one `StatRow`
  component with `numberOfLines={1}` on both its `Text` nodes.
- `LEVEL_LABEL` in `SelectScreen.tsx` changed from module-local to `export const` — the one
  shipped level-id-to-label mapping, imported by `StatisticsScreen` rather than duplicated.
- `tests/ui/StatisticsScreen.test.tsx` — 7 cases across both tasks.

## Source-occurrence scan (Task 1 acceptance)

```
texts=5 clamped=2 rowRenderers=1 scrollTokens=0 inlineLevelLabels=0
```

Exact match to the plan's required line: 5 `<Text` (heading, section label, Back label, and
`StatRow`'s two), 2 `numberOfLines={1}` occurrences, 1 row-renderer function, 0 scroll tokens,
0 inline level-label literals.

## Red-proof observed (Task 2 acceptance)

Temporarily changed the mount effect's dependency array from `[store]` to
`[store, Date.now()]` (a value that changes every render). Re-ran
`npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'reads once'`: **1 failed** —
`expected "vi.fn()" to be called 1 times, but got 4 times`. Restored `[store]`; re-ran to
confirm `7 passed`.

A test-authoring pitfall surfaced and fixed along the way (not a component defect): the first
draft of `reads once` passed a brand-new `{ getSnapshot }` object literal to each `rerender()`
call, which changes `store` prop identity every render and legitimately re-triggers the
effect — the same thing a bound-first implementation would do, but for an unrelated reason.
Fixed by holding one `store` reference across all three renders, matching how a real caller
(which holds its store in state/a ref, not a fresh literal per render) behaves.

## Verification (all green)

- `npx vitest run tests/ui/StatisticsScreen.test.tsx` — 7 passed (`row order`, `endless meta`,
  `zero`, `reads once`, `idempotent`, `read failure`, `shell contract`)
- `npx vitest run tests/ui` — **22 files / 228 tests passed**
- `npm test` — 113 files / 898 tests passed, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean
- `npm run typecheck` — clean
- `grep -c 'export const LEVEL_LABEL' app/_components/SelectScreen.tsx` → 1
- `grep -cE "^import .*'\.\./\.\./src/services/storage/[a-z]" app/_components/StatisticsScreen.tsx` → 0 (barrel-only imports)
- `git diff --quiet HEAD -- package-lock.json` — clean
