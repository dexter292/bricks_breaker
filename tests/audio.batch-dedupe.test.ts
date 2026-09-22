/**
 * F-33 / F-34 / F-35 — audio preload soft-fail, batch dedupe, reversible release.
 */
import { describe, expect, it } from 'vitest';
import {
  createAudioServiceWithPlayers,
  createMemoryAudioService,
  type AudioPlayerLike,
} from '../src/services/audio';
import { EventCode } from '../src/core';

describe('audio batch dedupe + preload (F-33/F-34/F-35)', () => {
  it('batch of 8 BRICK_BREAK plays at most once (dedupe)', async () => {
    let playCalls = 0;
    const factory = (): AudioPlayerLike => ({
      volume: 1,
      seekTo: () => {},
      play: () => {
        playCalls += 1;
      },
      release: () => {},
    });
    const svc = createAudioServiceWithPlayers(factory);
    await svc.preload();
    const codes = new Array(8).fill(EventCode.BRICK_BREAK);
    svc.playBatch(codes, 8);
    await Promise.resolve();
    expect(playCalls).toBe(1);
  });

  it('mixed batch dedupes per sfxId', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    // 5 HIT + 3 BREAK → 2 distinct plays
    mem.playBatch(
      [
        EventCode.BRICK_HIT,
        EventCode.BRICK_HIT,
        EventCode.BRICK_HIT,
        EventCode.BRICK_HIT,
        EventCode.BRICK_HIT,
        EventCode.BRICK_BREAK,
        EventCode.BRICK_BREAK,
        EventCode.BRICK_BREAK,
      ],
      8,
    );
    expect(mem.plays.length).toBe(2);
  });

  it('preload still builds pools when preloadSource rejects (F-33)', async () => {
    let playCalls = 0;
    const factory = (): AudioPlayerLike => ({
      volume: 1,
      seekTo: () => {},
      play: () => {
        playCalls += 1;
      },
      release: () => {},
    });
    const svc = createAudioServiceWithPlayers(factory, {
      preloadSource: async () => {
        throw new Error('network');
      },
    });
    await expect(svc.preload()).resolves.toBeUndefined();
    svc.playBatch([EventCode.PADDLE_HIT], 1);
    await Promise.resolve();
    expect(playCalls).toBe(1);
  });

  it('release then preload restores audio (F-35)', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    mem.playBatch([EventCode.WIN], 1);
    expect(mem.plays.length).toBe(1);
    mem.release();
    expect(mem.plays.length).toBe(0);
    await mem.preload();
    mem.playBatch([EventCode.LOSE], 1);
    expect(mem.plays.length).toBe(1);
  });
});
