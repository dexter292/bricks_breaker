/**
 * PWR-01 — last-ball life stubs (Wave 0). Implementations land in Plan 04.
 * Deprecated: any BALL_OUT → −life (replaced by activeBallCount === 0).
 */
import { describe, it } from 'vitest';

describe('lives rules (last-ball)', () => {
  it.todo('activeBallCount === 0 after step decrements exactly one life');
  it.todo('BALL_OUT while other balls remain does not change lives');
  it.todo('life reset clears pickups, expires expand, docks one ball, preserves score and brick HP');
  it.todo('lives === 0 → SimPhase.LOST');
  it.todo('WON/LOST phases are no-ops for stepRun');
});
