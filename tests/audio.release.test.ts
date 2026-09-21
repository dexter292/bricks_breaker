/**
 * Soak D-20 / D-22 — audio release lifecycle asserts (08-04).
 * Node-safe: createMemoryAudioService + injectable player pools (no expo-audio).
 */
import { describe, expect, it } from 'vitest';
import {
  createAudioServiceWithPlayers,
  createMemoryAudioService,
  type AudioPlayerLike,
} from '../src/services/audio';

describe('audio.release', () => {
  it('memory release clears recorded plays and is idempotent', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    mem.playBatch([3, 4, 2], 3); // BRICK_HIT, BRICK_BREAK, PADDLE_HIT
    expect(mem.plays.length).toBeGreaterThan(0);

    expect(() => mem.release()).not.toThrow();
    expect(mem.plays.length).toBe(0);

    // Second release must not throw (D-20 idempotent)
    expect(() => mem.release()).not.toThrow();
    expect(mem.plays.length).toBe(0);
  });

  it('second release does not throw (idempotent)', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    mem.playBatch([8], 1); // WIN
    expect(() => {
      mem.release();
      mem.release();
      mem.release();
    }).not.toThrow();
  });

  it('after release, playBatch soft-fails / no-ops without throwing', async () => {
    const mem = createMemoryAudioService();
    await mem.preload();
    mem.playBatch([3, 3, 3], 3);
    mem.release();

    expect(() => mem.playBatch([3, 4, 2, 6, 7, 8, 9], 7)).not.toThrow();
    expect(() => mem.playBatch([], 0)).not.toThrow();
    // No new plays after release
    expect(mem.plays.length).toBe(0);
  });

  it('pooled service release clears voices and is idempotent', async () => {
    const releasedPlayers: AudioPlayerLike[] = [];
    let playCalls = 0;

    const factory = (): AudioPlayerLike => {
      const player: AudioPlayerLike = {
        volume: 1,
        seekTo: () => {},
        play: () => {
          playCalls += 1;
        },
        release: () => {
          releasedPlayers.push(player);
        },
      };
      return player;
    };

    const svc = createAudioServiceWithPlayers(factory);
    await svc.preload();
    svc.playBatch([3, 3, 3], 3);
    await Promise.resolve();
    expect(playCalls).toBeGreaterThan(0);

    const playsBeforeRelease = playCalls;
    expect(() => svc.release()).not.toThrow();
    expect(releasedPlayers.length).toBeGreaterThan(0);

    // Idempotent second release — no throw, no extra player.release storms required
    expect(() => svc.release()).not.toThrow();

    // Post-release play is a soft no-op
    expect(() => svc.playBatch([3, 4], 2)).not.toThrow();
    await Promise.resolve();
    expect(playCalls).toBe(playsBeforeRelease);
  });
});
