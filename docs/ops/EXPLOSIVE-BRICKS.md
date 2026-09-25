# Explosive bricks (N-BRK-01 / Phase B1)

**Status:** Implemented 2026-09-24  
**Schema:** `brickTypes.*.explosive: true` (additive on v1; mutually exclusive with `unbreakable`)  
**Flag:** `BrickFlags.EXPLOSIVE = 2`  
**Authoring char (convention):** `"E"`

## Behavior

On **break** (HP → 0), an explosive brick deals **1 HP** to each **8-neighbor** on the level lattice (`cellToBrick`), in fixed order: row −1…+1, within each row col −1…+1 (skip self).

- Steel / unbreakable neighbors: ignored (no HIT spam).
- Dead / empty cells: skipped.
- If a damaged neighbor is itself explosive and reaches 0 HP, it **chains** in the same step.
- Ball damage still ≤1 HP / brick / step; AoE can add a second HP in the same step (intentional).

Events stay `BRICK_HIT` / `BRICK_BREAK` — scoring, drops, audio, VFX consumers unchanged.

## Mid particle budget

| Tier | `particleCap` | Destroy sparks @1.0 | Explosive destroy |
|------|---------------|---------------------|-------------------|
| Mid (Cert WC) | **128** | 12 | **×1.25 intensity** (~15 sparks) |
| High | 192 | 12 | ×1.25 |
| Low | 48 | 12 | ×1.25 (FIFO eviction sooner) |

Cascade clears can enqueue many `BRICK_BREAK` bursts in one step. Pool uses **FIFO eviction** when over cap (`src/vfx/particles.ts`) — Mid remains the marketing/Cert baseline; do not raise `particleCap` for chains.

## Where it ships

Placed across `level-03`…`level-06` on a teaching curve — see
[`LEVEL-VERBS-E1b.md`](./LEVEL-VERBS-E1b.md). `level-01` stays explosive-free by design.

## Tests

`tests/physics.explosive.test.ts` — single blast + chain + steel immunity + hash stability.
`tests/levels.verb-curve-e1b.test.ts` — the same rules asserted on the shipped level assets.
