/**
 * PWR-01/03 — pickup drop / catch / miss stubs (Wave 0). Implementations land in Plan 03.
 */
import { describe, it } from 'vitest';

describe('pickup rules (PWR-01/03)', () => {
  it.todo('BRICK_BREAK rolls rngGameplay; DROP_CHANCE 0.2 spawns pickup at evX/evY');
  it.todo('intermediate BRICK_HIT never spawns pickup');
  it.todo('AABB overlap with paddle catches pickup; no auto-collect by proximity');
  it.todo('pickup y > LOGICAL_HEIGHT is removed');
  it.todo('drop rolls never call Math.random or rngCosmetic');
});
