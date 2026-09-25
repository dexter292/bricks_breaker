---
phase: E1b-verb-enrichment
plan: "00"
title: Explosive teaching curve across the ship set
requirements: [N-LVL-01, N-LVL-03]
wave: 0
---

# E1b Plan 00 — Explosive Teaching Curve

<objective>
Place `E` (explosive) bricks across `level-03`…`level-06` on a deliberate teaching curve —
sighting → steel immunity → chain → mastery — add the `E` brick type to each touched level,
document the curve, and keep the N-LVL-03 lint green on the ship set / red on `level-02`.
</objective>

## Tasks

### T-E1b-00-01 — `level-03` Neon Gauntlet: first sighting (2 beats)

- Add `"E": { "hp": 1, "explosive": true }` to `brickTypes`.
- Row 1 col 4 `1` → `E`. Soft hp1 cluster; blast kills 6 neighbours — the payoff is
  unmissable.
- Row 8 col 2 `.` → `E`. Surrounded by hp2/hp3; blast chips every neighbour and kills
  none — teaches "1 HP, not instant clear".

### T-E1b-00-02 — `level-04` Steel Ribs: blast ignores steel

- Add `E` brick type.
- Row 2 cols 2 and 6 `.` → `E`, flanking the `XXX` rib symmetrically. Player sees the 2s
  around them take damage while the steel does not flinch.

### T-E1b-00-03 — `level-05` Cascade Lattice: the chain

- Add `E` brick type.
- Row 5 cols 3 and 5 `1` → `E`; row 6 col 4 `.` → `E`; row 7 col 5 `.` → `E`.
- Forms a converging V-fuse: either top `E` diagonally reaches row6col4, which reaches the
  other top `E` **and** row7col5 — one hit cascades through four explosives.

### T-E1b-00-04 — `level-06` Neon Vault: explosive is not a steel solvent

- Add `E` brick type.
- Row 3 cols 4,5 `.` → `E` (upper vault) and row 6 cols 4,5 `.` → `E` (lower vault).
- Adjacent pairs chain each other; the `XX` vault walls above them stay untouched.

### T-E1b-00-05 — Ops doc + lint proof

- Write `docs/ops/LEVEL-VERBS-E1b.md`: the curve table, per-level placement with
  coordinates, the lint-safety argument, and the "power-ups are drop-driven" note.
- Cross-link from `docs/ops/EXPLOSIVE-BRICKS.md`.
- Run `npm test` — vitest + worklet closures + solvability + EAS profiles all green.

## Verification

| Truth | Evidence |
|-------|----------|
| All 4 touched levels declare `E` with `hp:1, explosive:true` | `brickTypes` diff |
| Every ship level still passes reachability | `npm run assert:solvability` |
| `level-02` still fails reachability | same run, "FAIL as expected" |
| Chain actually chains in `level-05` | new vitest over the real asset |
| Steel immunity holds in `level-04` | new vitest over the real asset |
| No core/hash change | `git diff --stat` limited to assets + docs + tests |
