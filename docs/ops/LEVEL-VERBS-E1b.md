# Level verb curve (Phase E1b)

**Status:** Implemented 2026-09-25
**Requirements:** N-LVL-01 (5 playable levels), N-LVL-03 (solvability lint stays green)
**Deps:** B1 explosive · B2 power-ups · B3 fireball · E1a baseline authorship

## Why this phase existed

B1 shipped explosive bricks end-to-end — schema (`brickTypes.*.explosive`), flag
(`BrickFlags.EXPLOSIVE`), 8-neighbour cascade, a distinct `#F97316` fill with an X-mark
cue, and a 1.25× destroy burst — and **no shipped level placed a single `E`**. The verb
was reachable only from unit fixtures. E1b puts it in the player's hands on a curve.

## What is authorable

| Verb | Source | Authorable in level JSON? |
|------|--------|---------------------------|
| Explosive brick | B1 | **Yes** — `"E"` char + `brickTypes.E` |
| Multiball / Expand | MVP | No — drop table |
| Extra life / Slow | B2 | No — drop table |
| Fireball | B3 | No — drop table |

Power-ups drop at `DROP_CHANCE = 0.2` from **any** break (weights in
[`POWERUPS-B2.md`](./POWERUPS-B2.md)). They cannot be placed. The only authoring levers
are **break volume** (more breaks ⇒ more drops) and keeping drop lanes paddle-reachable.
Any change to *which* power-up appears belongs to the drop table, not to a level — see
E2 / N-CNT-02.

## The curve

Campaign order is `PLAYABLE_LEVEL_ORDER` (`src/services/storage/catalog.ts`).

| Slot | Level | Lesson |
|------|-------|--------|
| 1 | `level-01` Phase 3 Grid | Fundamentals + first pickup catches — **no explosive** |
| 2 | `level-03` Neon Gauntlet | Explosive exists; the blast is **1 HP**, not a clear |
| 3 | `level-04` Steel Ribs | The blast **ignores steel** |
| 4 | `level-05` Cascade Lattice | Explosives **chain** |
| 5 | `level-06` Neon Vault | Explosive is **not a steel solvent** |

`level-01` is deliberately byte-identical to its pre-E1b form: it is the C2
progress/stars UAT baseline and the first-run board. A new verb in slot 1 would bury the
fundamentals.

## Placements

Coordinates are authoring `(row, col)`, zero-based, matching `cells[row][col]`.
All four levels declare `"E": { "hp": 1, "explosive": true }`.

### `level-03` — sighting, two beats

| Cell | Was | Beat |
|------|-----|------|
| `(1,4)` | `1` | Sits in a soft hp1 pocket — detonation clears 6 neighbours plus itself. Unmissable payoff. |
| `(8,2)` | `.` | Ringed entirely by hp2/hp3 — every neighbour is chipped, **none die**. Teaches the 1-HP rule before the player over-trusts it. |

### `level-04` — steel immunity

`(2,2)` and `(2,6)`, both `.` → `E`, flanking the `XXX` rib symmetrically. The 2s around
them visibly take damage; the steel does not flinch.

### `level-05` — the chain

A converging V-fuse: `(5,3)` and `(5,5)` (were `1`), `(6,4)` and `(7,5)` (were `.`).
`(5,3)` is diagonal to `(6,4)`, which is diagonal to both `(5,5)` and `(7,5)` — one hit
anywhere on the fuse consumes all four. The level's name finally means something.

### `level-06` — mastery

Adjacent pairs at `(3,4)/(3,5)` and `(6,4)/(6,5)`, all were `.`. Each pair chains itself
and strips the soft filling out of a vault pocket, while the `XX` walls directly above
(`(2,4)/(2,5)` and `(5,4)/(5,5)`) stay at full HP. The player learns the pockets must be
entered, not blasted open.

## Lint safety (N-LVL-03)

`checkSolvability` flood-fills from below through **empty and breakable** cells; only
unbreakable cells block. `E` is breakable, so `isPassable` treats it exactly like empty —
replacing `.` or a breakable with `E` **cannot** make any brick unreachable. No steel was
added or moved, so the corridor-warning set is byte-for-byte unchanged from before E1b.

`npm run assert:solvability` — all five ship levels `OK`, `level-02` still
`FAIL as expected` (negative fixture / self-check).

## Tests

`tests/levels.verb-curve-e1b.test.ts` runs against the **shipped assets**, not fixtures,
and asserts each lesson actually fires: the level-03 pocket clear (7 breaks) and armour
chip (1 break, 8 survivors each −1 HP), level-04 steel at HP 99 after the blast, the
level-05 four-explosive cascade, and the level-06 pair-chain with vault steel intact.

> Breaking a brick clears its lattice cell to `-1` (`clearBrickFromLattice`). Resolve every
> `cellToBrick` index **before** detonating, or lookups come back empty.

See also [`EXPLOSIVE-BRICKS.md`](./EXPLOSIVE-BRICKS.md) for the cascade rules and the Mid
particle budget — cascades are FIFO-evicted at `particleCap`, and E1b does not raise it.
