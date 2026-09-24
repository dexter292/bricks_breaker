# Power-ups B2 (N-PWR-01 / N-PWR-02 / N-PWR-04)

**Status:** Implemented 2026-09-24 · drop table extended by B3 fireball  
**Fireball details:** [`FIREBALL-B3.md`](./FIREBALL-B3.md)

## Pickup types

| Code | Name | On catch |
|------|------|----------|
| 1 | Multiball | Spawn ±angles @ SERVE_SPEED |
| 2 | Expand | Paddle ×1.5 for 10s (refresh) |
| 3 | Extra life | `lives = min(lives+1, MAX_LIVES)` · **MAX_LIVES = 5** |
| 4 | Slow | Timed offensive — 8s @ 0.5 live scale |
| 5 | Fireball | Timed pierce — see FIREBALL-B3 |

## Drop table (after `DROP_CHANCE = 0.2`)

| Band | Type | Weight |
|------|------|--------|
| `[0, 0.36)` | Multiball | 36% |
| `[0.36, 0.72)` | Expand | 36% |
| `[0.72, 0.82)` | Slow | 10% |
| `[0.82, 0.92)` | Fireball | 10% |
| `[0.92, 1)` | Extra life | 8% |

## Mutual exclusion (N-PWR-04)

Timed **offensive**: `SLOW` XOR `FIREBALL`. Expand may coexist with either.

## Render

multiball orange · expand amber · extra-life green · slow cyan · fireball red
