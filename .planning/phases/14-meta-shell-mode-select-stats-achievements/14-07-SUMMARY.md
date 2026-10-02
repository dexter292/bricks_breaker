---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 07
type: execute
status: complete
---

# 14-07 Summary: the twelve-file font cap gate, docs, requirements, and six backstops

## Task 1 — capped the five `app/_components` files

`TitleScreen.tsx`, `SelectScreen.tsx`, `StatisticsScreen.tsx`, `AchievementsScreen.tsx`,
`PlayingHost.tsx` all pass `maxFontSizeMultiplier={MAX_FONT_SCALE}` on every `Text` node,
imported from `'../../src/runtime/textScale'`.

```
app/_components/TitleScreen.tsx text=9 prop=9 viaConstant=9
app/_components/SelectScreen.tsx text=7 prop=7 viaConstant=7
app/_components/StatisticsScreen.tsx text=5 prop=5 viaConstant=5
app/_components/AchievementsScreen.tsx text=5 prop=5 viaConstant=5
app/_components/PlayingHost.tsx text=4 prop=4 viaConstant=4
appTierTotal=30
SCALE_PARITY_OK
```

**Twelve-file total, measured in this tree on 2026-10-01, not inherited from any
document: `twelveFileTotal=69`** (`src/runtime`'s 39 from 14-04 + `app/_components`'s 30
from this task), `mismatchFiles=0`.

**Red-proof:** temporarily hard-coded `maxFontSizeMultiplier={1.2}` on `SelectScreen.tsx`'s
`Back` label. Re-ran the app-tier scan: `viaConstant=6` against `prop=7`, reporting
`SCALE_PARITY_MISMATCH=1`. Restored; re-ran to confirm `SCALE_PARITY_OK`.
`git diff --stat HEAD -- app/_components/SelectScreen.tsx` shows only the prop and
import additions.

## Task 2 — the three-assertion gate (`tests/ui/textScale.gate.test.ts`)

Six cases: a two-direction self-check, the twelve-file-list guard, the constant's own
declaration check, and the three assertions (count equality + pinned sum; no hard-coded
value; no escapee outside the enumeration, scanned from a live `git ls-files` listing
scoped to `src/` and `app/`).

**Red-proofs, all four required observations:**
1. **Assertion 1** — removed the prop from `SelectScreen.tsx`'s `Back` label. Failed,
   naming the file: `found 7 Text tags but 6 prop occurrences`. Restored.
2. **Assertion 2** — hard-coded `{1.2}` on the same node. Failed: `a hard-coded numeric
   value ... would pass assertion 1 identically`. Restored.
3. **Assertion 3, direction (a)** — created `app/_components/__RedProofEscapee.tsx`
   (staged with `git add` so `git ls-files` could see it) rendering a bare `<Text>`.
   Failed, naming the file exactly: `a Text node exists outside the twelve-file
   enumeration in: app/_components/__RedProofEscapee.tsx`. Deleted the file.
4. **Assertion 3, direction (b)** — the identical node written inside a block comment
   in the same new file. Gate reported green (1 passed) — the exact direction
   `14-UI-SPEC.md`'s own approved design document failed on arrival, against a doc
   comment in a non-component module. Deleted the file; unstaged first.

`npx vitest run tests/ui/textScale.gate.test.ts` — 6 passed. `npx vitest run tests/ui` —
**25 files / 244 tests**. `npm test` — 116 files / 914 tests, all 8 assert scripts `OK`.

## Task 3 — documentation, requirement checkboxes, six backstops

- **`docs/ops/PROGRESS-STORAGE.md`**: added a fifth bounds-table row for
  `achievements.unseen` — bound `ACHIEVEMENT_UNLOCK_BOUND` (shared with its sibling, no
  second constant minted), direction keep-first, reason: a subset of `unlocked`,
  intersected with it on read. `boundRows=5`.
- **`docs/ops/ACHIEVEMENTS.md`** Limit 2b: rewritten from an open limitation to CLOSED,
  naming the mechanism (inverted additive `unseen` field, the store-side
  `markAchievementsUnseen` write gated on `outcome === 'abandoned'`, the Achievements
  screen's frozen-at-mount `New` marker, the screen-open seen-write). The 7-of-12
  measurement is intact, now as the mark's provenance rather than the gap's.
  `grep -c '7 of the 12\|7 of 12'` → 2.
- **`.planning/REQUIREMENTS.md`**: ticked `N-STAT-03` (line 167), `N-UI-01` (line 199),
  `N-UI-02` (line 200) — the only surface these ids have; no traceability table rows
  exist for them. `grep -c` of the three ticked lines → 3.
- **Six backstops registered** — five appended through `gsd-tools windows append
  --kind unrun-verify --phase 14`, never by hand-editing the JSON:
  1. Title vertical fit (468/548 default, 517.2/548 at cap, no scroll)
  2. The brand's two-line wrap claim at 320pt and at the cap
  3. Statistics vertical fit (458/548 default, 522.4/548 at cap, no scroll)
  4. Achievements scroll — Back visible/tappable at max scroll, first two entries
     complete, no sticky header, last entry not clipped — **carries the token `#35`**
     as the appearance half of the unseen-unlock split
  5. **NOT appended** — this is window **#29** (Dynamic Type), already registered and
     already open from phase 13. Left byte-identical: not fixed, not waived, not
     annotated (`markFixed` takes one positional and touches no text field; no
     permitted verb can write prose to an existing row — verified in the installed
     runtime). What this phase decided about it is recorded in
     `src/runtime/textScale.ts`'s doc comment (14-04) and here.
  6. Horizontal budgets at Label 14 (daily meta 227.8/240, table meta 177.7, entry
     name + widest marker 221.6/272), extending window 16's prior discharge

  **The #35 split, asserted structurally:** appended the five rows FIRST, then ran
  `gsd-tools windows fixed 35`. Post-scan: `w35=fixed w29=open phase14Rows=5
  unrunVerify=5 p14Open=5 b4Rows=1 b4Open=1 b4NamesW35=1`. The LOGIC half (recorded,
  marked, rendered distinctly, cleared once) is machine-verified by
  `tests/ui/AchievementsScreen.test.tsx -t 'marker'`, `-t 'writes once'`, and
  `tests/achievements.record.test.ts -t 'unseen'` (parameterised over both stores) —
  together establishing that an unlock earned on an abandoned run is recorded, marked,
  rendered distinctly, and cleared exactly once on screen open. The APPEARANCE half
  stays open as the appended backstop-4 row, cross-referencing `#35` in its own
  description — the one route a ledger verb can actually write.

  **Ledger counters, before → after this task:** `open_count` 30 → 34,
  `fixed_count` 7 → 8, `total_count` 37 → 42 (five appended, one fixed).
  `gsd-tools windows status` exits 0 with no validation error.

## The human-check — UNAVAILABLE on this machine, all six rows correctly left open

Per the plan's own precondition: the 320×568pt reading requires Display Zoom on a
**physical** 375×667 device. This environment has no physical iOS device; it has the
iOS Simulator, whose `simctl ui` surface exposes no display-zoom option, and the
natively-320×568 device type cannot be created against the installed runtime. **The
320×568 viewport was never rendered.** All six backstops (the five appended rows plus
window #29) are therefore left `open`, exactly as the plan requires in this case — not
omitted, not marked satisfied, and `npm test` being green is explicitly NOT evidence
for any of them (the test environment performs no layout and supplies no safe-area
insets).

A broader simulator-based visual check of Phase 14's new screens (Title's seven rows,
Endless/Daily entries, Statistics, Achievements, and the SC-5 no-leaked-run navigation)
was performed separately as general UAT and is recorded in the session, but it is at a
device size other than 320×568 and does not discharge any of the six backstop rows —
consistent with the plan's explicit warning that a passing reading at the wrong
viewport is not evidence.

## Verification (all green)

- `npx vitest run tests/ui/textScale.gate.test.ts` — 6 passed
- `npx vitest run tests/ui` — 25 files / 244 tests passed
- `npm test` — 116 files / 914 tests passed, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean
- `npm run typecheck` — clean
- `gsd-tools windows status` — exit 0, no validation error
- `grep -c '#29' src/runtime/textScale.ts` → 5
- `git diff --quiet HEAD -- package-lock.json` — clean
