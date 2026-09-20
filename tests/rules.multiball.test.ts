/**
 * PWR-01 — multi-ball spawn stubs (Wave 0). Implementations land in Plan 03.
 */
import { describe, it } from 'vitest';

describe('multiball rules (PWR-01)', () => {
  it.todo('multi-ball catch spawns min(2, freeSlots) from paddle with ±18° and ±36° offsets');
  it.todo('existing ball velocities are preserved');
  it.todo('never exceeds maxBalls; never replaces active balls');
  it.todo('spawn speeds are finite and |vy|/speed >= MIN_VERTICAL_RATIO');
});
