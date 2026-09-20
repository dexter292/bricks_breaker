// tests/vfx.particles.test.ts — FX-02 / 07-W0-02 Nyquist stubs
import { describe, it } from 'vitest';

describe('vfx particles (FX-02)', () => {
  it.todo('spawn chip count at intensity 1.0 is 4');
  it.todo('spawn destroy count at intensity 1.0 is 12');
  it.todo('hard cap 128 with oldest-eviction; never exceeds 192');
  it.todo('spawn counts scale with round(base × intensity)');
});
