# Phase E1b Plan 00: Explosive Teaching Curve Summary

**One-liner:** Placed explosive bricks across `level-03`…`level-06` on a sighting →
steel-immunity → chain → mastery curve, proved each lesson with tests against the shipped
assets, and kept N-LVL-03 lint green.

## What shipped

| Level | Change | Lesson |
|-------|--------|--------|
| `level-01` | **none** (deliberate) | fundamentals stay unburied; C2 UAT baseline preserved |
| `level-03` | `E` at `(1,4)` and `(8,2)` | blast clears a soft pocket (7 breaks); blast only **chips** armour (1 break, 8 survivors at −1 HP) |
| `level-04` | `E` at `(2,2)`, `(2,6)` | steel rib stays at HP 99 through the blast |
| `level-05` | `E` at `(5,3)`, `(5,5)`, `(6,4)`, `(7,5)` | converging V-fuse — one hit consumes all four |
| `level-06` | `E` at `(3,4)/(3,5)`, `(6,4)/(6,5)` | pairs chain, vault steel holds — explosive is not a solvent |

All four touched levels declare `"E": { "hp": 1, "explosive": true }`.

## Files

- `assets/levels/level-03.json`, `level-04.json`, `level-05.json`, `level-06.json`
- `tests/levels.verb-curve-e1b.test.ts` — new, 8 cases over shipped assets
- `docs/ops/LEVEL-VERBS-E1b.md` — new; cross-linked from `docs/ops/EXPLOSIVE-BRICKS.md`

## Deviations from plan

None. Placements landed as planned.

## Notes

- **Power-ups are not authorable.** B2/B3 pickups come from `DROP_CHANCE = 0.2` on any
  break, so a level can only influence them through break volume. Teaching *which*
  power-up appears is a drop-table concern → E2 / N-CNT-02. The plan's "teach power-ups"
  goal is therefore met indirectly (break counts rose slightly on 03–06) and documented
  rather than faked with placements.
- **Lint risk was structurally nil:** `E` is breakable, so the reachability flood-fill
  treats it exactly like empty. No steel moved ⇒ corridor warnings unchanged.
- Gotcha worth keeping: `clearBrickFromLattice` sets a broken brick's `cellToBrick` cell
  to `-1`, so any test must resolve indices **before** detonating.

## Verification

`npm test` — 78 files / 394 tests passed (baseline 77 / 386), worklet-closure,
solvability (`ship OK; level-02 FAIL as expected`) and EAS-profile asserts all green.
`npm run typecheck` and `npm run lint` clean.
