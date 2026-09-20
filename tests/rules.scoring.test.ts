/**
 * RUN-01 — score / combo stubs (Wave 0). Implementations land in Plan 02.
 */
import { describe, it } from 'vitest';

describe('scoring rules (RUN-01)', () => {
  it.todo('BRICK_HIT awards SCORE_HIT * combo then increments combo');
  it.todo('BRICK_BREAK awards (SCORE_HIT + SCORE_BREAK_BONUS) * combo then increments combo');
  it.todo('PADDLE_HIT resets combo to 1');
  it.todo('unbreakable BRICK_HIT awards no score and does not change combo');
  it.todo('simultaneous multi-ball brick damage is deterministic (ring order)');
});
