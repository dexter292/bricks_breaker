/**
 * Wave 0 Nyquist stubs — LVL-01 validate (Plan 01 fills assertions).
 * Do not import src/core/levels/* until modules exist.
 */
import { describe, it } from 'vitest';

describe('levels.validate', () => {
  // 04-W0-01
  it.todo('accepts schemaVersion 1 and rejects unsupported with path schemaVersion');

  // 04-W0-02
  it.todo('rejects unknown char, bad row length, and space-in-row');

  // T-04-02 / T-04-04
  it.todo('rejects non-finite grid metrics and __proto__ brickTypes key');

  // T-04-01
  it.todo('rejects brickCount/cols×rows over MAX_BRICKS');
});
