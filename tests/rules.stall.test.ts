/**
 * PHYS-07 — anti-stall stubs (Wave 0). Implementations land in Plan 05.
 */
import { describe, it } from 'vitest';

describe('stall rules (PHYS-07)', () => {
  it.todo('idle 960 ticks without breakable damage → stallTier 1');
  it.todo('tier 2 at 960+240 ticks applies 1.08× speed clamp to MAX_BALL_SPEED');
  it.todo('tier 3 at 960+480 ticks applies deterministic angle nudge; no Math.random');
  it.todo('breakable BRICK_HIT/BREAK resets stallIdleTicks and stallTier to 0');
  it.todo('skipping stepRun (pause/freeze) does not advance stallIdleTicks');
  it.todo('same seed + intents → identical hashWorld including stall fields');
});
