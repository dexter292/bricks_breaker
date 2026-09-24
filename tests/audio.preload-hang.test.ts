/**
 * Device CERT found expo-audio preload can hang forever — soft timeouts required.
 */
import { describe, expect, it } from 'vitest';
import {
  createAudioServiceWithPlayers,
  type AudioPlayerLike,
} from '../src/services/audio';

describe('audio.preload hang soft-fail', () => {
  it('resolves when setAudioModeAsync never settles', async () => {
    const factory = (): AudioPlayerLike => ({
      volume: 1,
      seekTo: () => {},
      play: () => {},
      release: () => {},
    });
    const svc = createAudioServiceWithPlayers(factory, {
      setAudioModeAsync: () => new Promise(() => {}),
    });
    const t0 = Date.now();
    await svc.preload();
    expect(Date.now() - t0).toBeLessThan(4000);
    expect(() => svc.playBatch([3], 1)).not.toThrow();
  });

  it('resolves when preloadSource never settles', async () => {
    const factory = (): AudioPlayerLike => ({
      volume: 1,
      seekTo: () => {},
      play: () => {},
      release: () => {},
    });
    const svc = createAudioServiceWithPlayers(factory, {
      preloadSource: () => new Promise(() => {}),
    });
    const t0 = Date.now();
    await svc.preload();
    expect(Date.now() - t0).toBeLessThan(4000);
  });
});
