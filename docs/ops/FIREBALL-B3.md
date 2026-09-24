# Fireball pierce (N-PWR-03 / Phase B3)

**Status:** Implemented 2026-09-24  
**Deps:** B2 drop table + SLOW↔FIREBALL exclusion  
**Risk:** Highest physics risk — CCD continue-after-hit path

## Behavior

| Contact | While fireball active |
|---------|------------------------|
| Breakable brick | **Pierce** — 1 HP damage, **no reflect**, CCD continues (push along velocity) |
| Steel / unbreakable | **Bounce** (normal reflect) |
| Wall / paddle / bottom | Unchanged |

- Duration **8s** (`FIREBALL_DURATION_TICKS = 960`)
- Refresh = reset timer; exclusive with **slow** (`applyOrRefreshFireball` clears SLOW)
- Cleared on life loss with other effects
- Ball render tints red while active

## Drop table (updated)

After `DROP_CHANCE = 0.2`:

| Band | Type | Weight |
|------|------|--------|
| `[0, 0.36)` | Multiball | 36% |
| `[0.36, 0.72)` | Expand | 36% |
| `[0.72, 0.82)` | Slow | 10% |
| `[0.82, 0.92)` | **Fireball** | 10% |
| `[0.92, 1)` | Extra life | 8% |

## Caps / safety

- Still ≤1 ball-HP / brick / step (`brickDamagedThisStep`)
- CCD budget `MAX_CCD_ITERATIONS = 5` — pierces multiple bricks per step within budget
- Stored `ballVx/Vy` unchanged on pierce (direction preserved)

## Tests

`tests/physics.fireball.test.ts` — apply/expire, drop band, pierce 2 bricks, steel bounce, golden hash identity.

See also `docs/ops/POWERUPS-B2.md` (extra life / slow / expand).
