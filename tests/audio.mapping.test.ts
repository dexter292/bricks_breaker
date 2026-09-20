// tests/audio.mapping.test.ts — FX-03 audio mapping + voice pools
import { describe, expect, it } from 'vitest';
import {
  createAudioServiceWithPlayers,
  createDefaultAudioService,
  createMemoryAudioService,
  mapEventToSfx,
  selectVoiceIndex,
  SFX_VOLUME,
  VOICE_LIMITS,
  type AudioPlayerLike,
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

describe('audio service pools (FX-03)', () => {
  it('createDefaultAudioService preload soft-fails and never throws', async () => {
    const svc = createDefaultAudioService();
    await expect(svc.preload()).resolves.toBeUndefined();
    // Ignored codes + rapid play must not throw even before/without native
    expect(() => svc.playBatch([1, 5, 3, 3, 3], 5)).not.toThrow();
    expect(() => {
      svc.release();
      svc.release();
    }).not.toThrow();
  });

  it('voice pool reuses oldest at per-category limit (D-23)', async () => {
    const created: AudioPlayerLike[] = [];
    const playCounts: number[] = [];

    const factory = (_source: unknown, sfxId: string): AudioPlayerLike => {
      if (sfxId !== 'brick_chip') {
        return {
          volume: 1,
          seekTo: () => {},
          play: () => {},
          release: () => {},
        };
      }
      const idx = created.length;
      playCounts[idx] = 0;
      const player: AudioPlayerLike = {
        volume: 1,
        seekTo: () => {},
        play: () => {
          playCounts[idx] += 1;
        },
        release: () => {},
      };
      created.push(player);
      return player;
    };

    const svc = createAudioServiceWithPlayers(factory);
    await svc.preload();

    // 5 rapid BRICK_HIT → brick_chip limit 3; only 3 players for that id
    const hits = [3, 3, 3, 3, 3];
    svc.playBatch(hits, hits.length);

    expect(created.length).toBe(VOICE_LIMITS.brick_chip);
    // 5 plays across 3 voices: indices 0,1,2,0,1 → playCounts [2,2,1]
    expect(playCounts.reduce((a, b) => a + b, 0)).toBe(5);
    expect(Math.max(...playCounts)).toBe(2);
    expect(playCounts[0]).toBe(2); // oldest reused

    svc.release();
    expect(() => svc.release()).not.toThrow();
  });

  it('memory service records plays without exceeding voice limits', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    const codes = [3, 3, 3, 3, 3, 3]; // BRICK_HIT ×6
    mem.playBatch(codes, codes.length);
    expect(mem.plays.length).toBe(6);
    expect(mem.plays.every((p) => p.sfxId === 'brick_chip')).toBe(true);
    const voiceIndices = new Set(mem.plays.map((p) => p.voiceIndex));
    expect(voiceIndices.size).toBeLessThanOrEqual(VOICE_LIMITS.brick_chip);
    expect([...voiceIndices].sort()).toEqual([0, 1, 2]);
  });
});
