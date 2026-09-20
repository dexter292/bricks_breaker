// tests/vfx.shake.test.ts — FX-02 / 07-W0-03 Nyquist stubs
import { describe, it } from 'vitest';

describe('vfx shake (FX-02)', () => {
  it.todo('punchShake merges with max then caps at 2.5');
  it.todo('stepShake multiplies amp by 0.85 and zeros below 0.05');
  it.todo('intensity 0.2 → amp approaches 0');
  it.todo('punch only for BRICK_BREAK / LIFE_LOST impulses');
});
