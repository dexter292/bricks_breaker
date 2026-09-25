---
phase: E1b-verb-enrichment
milestone: post-mvp
requirements: [N-LVL-01, N-LVL-03]
deps: [B1, B2, B3, E1a]
owner_gates_skipped: true
created: 2026-09-25
---

# Phase E1b — Verb Enrichment — Context

## Goal

Retouch the shipped 5-level campaign so it **teaches the verbs B1/B2/B3 added**, while
`N-LVL-03` solvability lint stays green on the ship set and red on `level-02`.

## The actual gap

B1 shipped explosive bricks (`brickTypes.*.explosive`, `BrickFlags.EXPLOSIVE`, 8-neighbour
cascade, distinct `#F97316` fill + X-mark cue, 1.25× destroy VFX) — and **not one shipped
level places an `E`**. A player can finish the whole campaign without ever seeing the
feature. E1b closes that.

## Which verbs are authorable

| Verb | Source | Authorable in JSON? |
|------|--------|---------------------|
| Explosive brick | B1 | **Yes** — `"E"` char + `brickTypes.E` |
| Multiball / Expand | MVP | No — drop table |
| Extra life / Slow | B2 | No — drop table |
| Fireball | B3 | No — drop table |

Power-ups are **drop-driven** (`DROP_CHANCE = 0.2` on any break, weights in
`docs/ops/POWERUPS-B2.md`). The only authoring lever for them is **break volume and safe
catch lanes** — not placement. So E1b teaches power-ups indirectly (keep break counts
healthy, keep drop lanes paddle-reachable) and teaches explosive directly.

## Teaching curve

Campaign order is `PLAYABLE_LEVEL_ORDER` in `src/services/storage/catalog.ts`.

| Slot | Level | Lesson | Mechanism |
|------|-------|--------|-----------|
| 1 | `level-01` Phase 3 Grid | Fundamentals + first pickup catches | **Untouched** — 33 bricks ≈ 6.6 expected drops; clean board |
| 2 | `level-03` Neon Gauntlet | Explosive exists; blast deals **1 HP** | One `E` in a soft hp1 cluster (kills 6); one `E` among hp2/hp3 (chips, kills nothing) |
| 3 | `level-04` Steel Ribs | Blast **ignores steel** | Symmetric `E` pair flanking the `XXX` rib |
| 4 | `level-05` Cascade Lattice | Explosive **chains** | V-fuse: two `E` diagonally feeding a third, feeding a fourth |
| 5 | `level-06` Neon Vault | Explosive is **not a steel solvent** | `E` pairs inside both vault pockets — soft filling clears, `XX` stays |

`level-01` stays byte-identical on purpose: it is the C2 progress/stars UAT baseline and
the first-run experience; adding a new verb to slot 1 would bury the fundamentals.

## Constraints

- `E` must be `{ "hp": 1, "explosive": true }` — validate rejects `unbreakable + explosive`
  (`src/core/levels/validate.ts:158`).
- Lint safety: `E` is **breakable**, so `isPassable` treats it like empty. Replacing `.` or
  a breakable with `E` cannot create an unreachable brick. No steel is added or moved, so
  the corridor-warning set is unchanged.
- `hashWorld` / core untouched — this is asset-only plus one ops doc.
- `level-02` must keep failing reachability (negative fixture / self-check).

## Out of scope

- Difficulty/curve tuning, drop-rate and star score-band retune → **E2** (N-CNT-01…03).
- Owner playtest notes — owner gates skipped for this run (2026-09-25 decision).
- New verbs, new levels, schema bump.
