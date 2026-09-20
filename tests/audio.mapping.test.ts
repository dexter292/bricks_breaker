// tests/audio.mapping.test.ts — FX-03 / 07-W0-06 Nyquist stubs
import { describe, it } from 'vitest';

describe('audio mapping (FX-03)', () => {
  it.todo('mapEventToSfx maps seven gameplay codes; ignores WALL_HIT/BALL_OUT');
  it.todo('SFX_VOLUME hierarchy: life/win/lose > break > paddle/chip > catch');
  it.todo('voice pool reuses oldest at per-category limit');
});
