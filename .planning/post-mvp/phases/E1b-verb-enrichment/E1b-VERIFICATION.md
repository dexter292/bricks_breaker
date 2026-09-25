---
phase: E1b-verb-enrichment
status: passed
verified: 2026-09-25
requirements: [N-LVL-01, N-LVL-03]
human_uat: skipped_owner_2026_09_25
---

# Phase E1b — Verification

**Goal:** Retouch the shipped campaign so it teaches the verbs B1/B2/B3 added, with the
N-LVL-03 lint green on the ship set and red on `level-02`.

**Verdict:** `passed` (automated). Owner playtest notes intentionally **skipped** — owner
elected to skip all owner/device-gated items for this run (2026-09-25).

## Must-haves

| Truth | Evidence | Status |
|-------|----------|--------|
| Explosive reachable in normal play | `E` placed in 4 of 5 ship levels | ✅ |
| `E` declared `hp:1, explosive:true` everywhere | `levels.verb-curve-e1b` brickTypes case | ✅ |
| Slot 1 stays fundamentals-only | `level-01` byte-identical; 0 explosives asserted | ✅ |
| Sighting beat lands | level-03 `(1,4)` → 7 breaks | ✅ |
| "1 HP, not a clear" beat lands | level-03 `(8,2)` → 1 break, 8 survivors each −1 HP | ✅ |
| Blast ignores steel | level-04 rib at HP 99 post-blast | ✅ |
| Explosives chain | level-05 four-E fuse fully consumed from one hit | ✅ |
| Explosive ≠ steel solvent | level-06 pairs chain; vault `XX` at HP 99 | ✅ |
| Ship levels pass reachability | `assert:solvability` → all `OK` | ✅ |
| `level-02` still fails (self-check) | `FAIL as expected (8 unreachable)` | ✅ |
| Corridor warnings unchanged | same 8 / 2 / 5 counts on 03 / 04 / 06 as pre-E1b | ✅ |
| Core / `hashWorld` untouched | diff limited to `assets/levels`, `tests`, `docs` | ✅ |
| Suite green | 78 files / 394 tests; typecheck + lint clean | ✅ |

## Requirement IDs

| ID | Coverage |
|----|----------|
| N-LVL-01 | 5 playable levels unchanged in count; all still compile |
| N-LVL-03 | lint green on ship set, red on `level-02`, warnings unchanged |

## Carried forward

- Power-up *teaching* is bounded by the drop table, not by layouts — drop-rate and star
  score-band tuning is **E2 / N-CNT-02**.
- Difficulty curve validation (N-CNT-01) needs the playtest cohort that A3 skipped; E2
  proceeds on authored-curve analysis instead and records that limitation.
