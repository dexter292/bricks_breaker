// tests/audio.mapping.test.ts — FX-03 audio mapping + voice pools
import { describe, expect, it } from 'vitest';
import {
  mapEventToSfx,
  selectVoiceIndex,
  SFX_VOLUME,
  VOICE_LIMITS,
} from '../src/services/audio';

describe('audio mapping (FX-03)', () => {
  it('mapEventToSfx maps seven gameplay codes; ignores WALL_HIT/BALL_OUT', () => {
    // EventCode numeric literals (services must not import core/)
    expect(mapEventToSfx(2)).toBe('paddle_hit'); // PADDLE_HIT
    expect(mapEventToSfx(3)).toBe('brick_chip'); // BRICK_HIT
    expect(mapEventToSfx(4)).toBe('brick_break'); // BRICK_BREAK
    expect(mapEventToSfx(6)).toBe('powerup_catch'); // POWERUP_CATCH
    expect(mapEventToSfx(7)).toBe('life_lost'); // LIFE_LOST
    expect(mapEventToSfx(8)).toBe('win'); // WIN
    expect(mapEventToSfx(9)).toBe('lose'); // LOSE
    expect(mapEventToSfx(1)).toBeNull(); // WALL_HIT
    expect(mapEventToSfx(5)).toBeNull(); // BALL_OUT
  });

  it('SFX_VOLUME hierarchy: life/win/lose > break > paddle/chip > catch', () => {
    expect(SFX_VOLUME.life_lost).toBe(1.0);
    expect(SFX_VOLUME.win).toBe(1.0);
    expect(SFX_VOLUME.lose).toBe(1.0);
    expect(SFX_VOLUME.brick_break).toBe(0.85);
    expect(SFX_VOLUME.paddle_hit).toBe(0.7);
    expect(SFX_VOLUME.brick_chip).toBe(0.7);
    expect(SFX_VOLUME.powerup_catch).toBe(0.55);
    expect(SFX_VOLUME.life_lost).toBeGreaterThanOrEqual(SFX_VOLUME.brick_break);
    expect(SFX_VOLUME.brick_break).toBeGreaterThanOrEqual(SFX_VOLUME.paddle_hit);
    expect(SFX_VOLUME.paddle_hit).toBeGreaterThanOrEqual(SFX_VOLUME.powerup_catch);
  });

  it('selectVoiceIndex round-robins and reuses oldest at pool limit', () => {
    const poolLen = VOICE_LIMITS.brick_chip; // 3
    expect(selectVoiceIndex(0, poolLen)).toBe(0);
    expect(selectVoiceIndex(1, poolLen)).toBe(1);
    expect(selectVoiceIndex(2, poolLen)).toBe(2);
    expect(selectVoiceIndex(3, poolLen)).toBe(0); // reuse oldest
    expect(selectVoiceIndex(4, poolLen)).toBe(1);
  });
});
