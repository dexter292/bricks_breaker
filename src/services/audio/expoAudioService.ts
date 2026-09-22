import type { AudioService, SfxId } from './types';
import {
  mapEventToSfx,
  selectVoiceIndex,
  SFX_VOLUME,
  VOICE_LIMITS,
} from './mapping';

/** Minimal player surface used by pools (expo-audio AudioPlayer compatible). */
export type AudioPlayerLike = {
  volume: number;
  seekTo(seconds: number): void | Promise<void>;
  play(): void;
  release(): void;
};

export type PlayerFactory = (source: unknown, sfxId: SfxId) => AudioPlayerLike;

export type MemoryPlayRecord = { sfxId: SfxId; voiceIndex: number };

export type MemoryAudioService = AudioService & {
  readonly plays: MemoryPlayRecord[];
};

const ALL_SFX: readonly SfxId[] = [
  'paddle_hit',
  'brick_chip',
  'brick_break',
  'powerup_catch',
  'life_lost',
  'win',
  'lose',
];

/** Soft gain bumps when deduping N identical sfx in one batch (F-34). */
const DEDUPE_GAIN = [1, 1.12, 1.25] as const;

function placeholderSources(): Record<SfxId, unknown> {
  const out = {} as Record<SfxId, unknown>;
  for (const id of ALL_SFX) {
    out[id] = id;
  }
  return out;
}

/**
 * Lazy require of original assets (T-07-16). Falls back to placeholders when
 * Metro/Node cannot resolve WAVs (Vitest).
 */
function loadSfxSources(): Record<SfxId, unknown> {
  try {
    return {
      paddle_hit: require('../../../assets/sfx/paddle_hit.wav'),
      brick_chip: require('../../../assets/sfx/brick_chip.wav'),
      brick_break: require('../../../assets/sfx/brick_break.wav'),
      powerup_catch: require('../../../assets/sfx/powerup_catch.wav'),
      life_lost: require('../../../assets/sfx/life_lost.wav'),
      win: require('../../../assets/sfx/win.wav'),
      lose: require('../../../assets/sfx/lose.wav'),
    };
  } catch {
    return placeholderSources();
  }
}

type ServiceDeps = {
  setAudioModeAsync?: (mode: { playsInSilentMode: boolean }) => Promise<void>;
  preloadSource?: (source: unknown) => Promise<void> | void;
  sources?: Record<SfxId, unknown>;
};

/**
 * Pooled AudioService over an injectable player factory (D-23 / T-07-13).
 * Fixed VOICE_LIMITS pools; seekTo(0)+play reuses oldest voice at limit.
 */
export function createAudioServiceWithPlayers(
  createPlayer: PlayerFactory,
  deps: ServiceDeps = {},
): AudioService {
  const sources = deps.sources ?? loadSfxSources();
  const pools = new Map<SfxId, AudioPlayerLike[]>();
  const cursors = new Map<SfxId, number>();
  let released = false;

  function ensurePools(): void {
    if (pools.size > 0) return;
    for (const id of ALL_SFX) {
      const limit = VOICE_LIMITS[id];
      const voices: AudioPlayerLike[] = [];
      for (let i = 0; i < limit; i++) {
        voices.push(createPlayer(sources[id], id));
      }
      pools.set(id, voices);
      cursors.set(id, 0);
    }
  }

  function playSfx(sfxId: SfxId, gainMult: number): void {
    const voices = pools.get(sfxId);
    if (!voices || voices.length === 0) return;
    const cursor = cursors.get(sfxId) ?? 0;
    const idx = selectVoiceIndex(cursor, voices.length);
    cursors.set(sfxId, cursor + 1);
    const player = voices[idx]!;
    const base = SFX_VOLUME[sfxId];
    player.volume = Math.min(1, base * gainMult);
    void Promise.resolve(player.seekTo(0))
      .then(() => {
        try {
          player.play();
        } catch {
          // Soft-fail play
        }
      })
      .catch(() => {
        // Soft-fail seek
      });
  }

  return {
    async preload(): Promise<void> {
      // F-35: release() is reversible — clear latch so remount can rebuild pools.
      released = false;
      // F-33: build pools even when mode/source preload rejects.
      try {
        if (deps.setAudioModeAsync) {
          await deps.setAudioModeAsync({ playsInSilentMode: true });
        }
      } catch {
        // soft-fail mode
      }
      if (deps.preloadSource) {
        const jobs = ALL_SFX.map((id) =>
          Promise.resolve(deps.preloadSource!(sources[id])).catch(() => undefined),
        );
        await Promise.allSettled(jobs);
      }
      try {
        ensurePools();
      } catch {
        // Soft-fail pool build
      }
    },

    playBatch(codes: ArrayLike<number>, count: number): void {
      if (released) return;
      try {
        ensurePools();
        const n = Math.min(count, codes.length);
        // F-34: count identical sfxId in batch → one play with gain bump (cap ×3).
        const tallies = new Map<SfxId, number>();
        for (let i = 0; i < n; i++) {
          const sfxId = mapEventToSfx(codes[i]!);
          if (!sfxId) continue;
          tallies.set(sfxId, (tallies.get(sfxId) ?? 0) + 1);
        }
        for (const [sfxId, hits] of tallies) {
          const gainIdx = Math.min(hits, 3) - 1;
          playSfx(sfxId, DEDUPE_GAIN[gainIdx]!);
        }
      } catch {
        // Soft-fail play — never throw into gameplay
      }
    },

    release(): void {
      if (released) return;
      released = true;
      for (const voices of pools.values()) {
        for (const p of voices) {
          try {
            p.release();
          } catch {
            // ignore
          }
        }
      }
      pools.clear();
      cursors.clear();
    },
  };
}

/** In-memory AudioService for tests / soft-fail fallback (records plays). */
export function createMemoryAudioService(): MemoryAudioService {
  const plays: MemoryPlayRecord[] = [];
  const cursors = new Map<SfxId, number>();
  let released = false;

  return {
    plays,
    async preload(): Promise<void> {
      // F-35: reversible after release
      released = false;
    },
    playBatch(codes: ArrayLike<number>, count: number): void {
      if (released) return;
      const n = Math.min(count, codes.length);
      const tallies = new Map<SfxId, number>();
      for (let i = 0; i < n; i++) {
        const sfxId = mapEventToSfx(codes[i]!);
        if (!sfxId) continue;
        tallies.set(sfxId, (tallies.get(sfxId) ?? 0) + 1);
      }
      for (const [sfxId, hits] of tallies) {
        const limit = VOICE_LIMITS[sfxId];
        const cursor = cursors.get(sfxId) ?? 0;
        const voiceIndex = selectVoiceIndex(cursor, limit);
        cursors.set(sfxId, cursor + 1);
        // Record one play per distinct sfx (dedupe); hits kept for test assertions via plays length
        void hits;
        plays.push({ sfxId, voiceIndex });
      }
    },
    release(): void {
      if (released) return;
      released = true;
      plays.length = 0;
      cursors.clear();
    },
  };
}

type ExpoAudioModule = {
  createAudioPlayer: (source: unknown) => AudioPlayerLike;
  preload: (source: unknown) => Promise<void>;
  setAudioModeAsync: (mode: { playsInSilentMode: boolean }) => Promise<void>;
};

/**
 * Probe for the ExpoAudio native module WITHOUT importing `expo-audio`.
 * `expo-audio`'s entry calls `requireNativeModule('ExpoAudio')`, which throws
 * (and can surface as Uncaught Error under Fast Refresh) when the binary was
 * built before the dependency was added. Soft-fail must never crash play (D-24).
 */
function isExpoAudioNativeAvailable(): boolean {
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native probe
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    return requireOptionalNativeModule('ExpoAudio') != null;
  } catch {
    return false;
  }
}

function loadExpoAudio(): ExpoAudioModule | null {
  if (!isExpoAudioNativeAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native load
    return require('expo-audio') as ExpoAudioModule;
  } catch {
    return null;
  }
}

/**
 * expo-audio createAudioPlayer pools (SDK 57). Caller must handle missing native
 * via createDefaultAudioService.
 */
export function createExpoAudioService(): AudioService {
  const audio = loadExpoAudio();
  if (!audio) {
    return createMemoryAudioService();
  }
  return createAudioServiceWithPlayers(
    (source) => audio.createAudioPlayer(source),
    {
      setAudioModeAsync: audio.setAudioModeAsync.bind(audio),
      preloadSource: (source) => audio.preload(source),
      sources: loadSfxSources(),
    },
  );
}

/**
 * Prefer expo-audio when linked; otherwise memory. Soft-fail never blocks play
 * with a modal (D-24 / UI-SPEC / T-07-14).
 *
 * Missing native module (stale Expo Go / pre-`expo-audio` dev client) → memory
 * service + console.warn — never throw into PlayingHost.
 */
export function createDefaultAudioService(): AudioService {
  try {
    const audio = loadExpoAudio();
    if (!audio) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          '[audio] ExpoAudio native module missing — using memory AudioService (no SFX). Rebuild with `npx expo run:ios` or `npx expo run:android` after adding expo-audio.',
        );
      }
      return createMemoryAudioService();
    }
    return createExpoAudioService();
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[audio] createDefaultAudioService soft-fail', err);
    }
    return createMemoryAudioService();
  }
}
