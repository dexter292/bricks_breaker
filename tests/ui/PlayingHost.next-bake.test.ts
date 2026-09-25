/**
 * D-03 — PlayingHost Next / levelId bake-gate contracts (Plan 03).
 *
 * Source contract: Next must not arm the loop (gate owns setActive(true)).
 * Behavioral: after levelId change (Next path), setActive(true) is last.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, useState } from 'react';
import { cleanup, render, act, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LevelId } from '../../src/core';

const HOST = join(process.cwd(), 'app/_components/PlayingHost.tsx');

/** Strip // line comments so doc notes cannot false-positive. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}

vi.mock('expo-font', () => ({
  useFonts: () => [true],
}));

vi.mock('expo-keep-awake', () => ({
  useKeepAwake: () => {},
}));

vi.mock('@shopify/react-native-skia', () => ({
  useFont: () => null,
}));

vi.mock('react-native-reanimated', () => {
  const shared = (init: unknown) => ({ value: init });
  return {
    useSharedValue: (init: unknown) => shared(init),
    useAnimatedReaction: () => {},
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    runOnUI: (fn: () => void) => () => fn(),
  };
});

vi.mock('../../src/input', () => ({
  usePaddleGesture: () => ({
    paddleTarget: { value: 0 },
    launchFlag: { value: 0 },
    gesture: {},
  }),
}));

vi.mock('../../src/runtime/useVfxIntensity', () => ({
  useVfxIntensity: () => ({ value: 1 }),
}));

vi.mock('../../src/runtime/resolveQualityTier', () => ({
  readDeviceMemory: () => ({ totalMemory: 8, modelName: 'test' }),
  resolveQualityTier: () => ({
    tier: 'mid',
    budget: { particles: 0, glow: false },
  }),
}));

vi.mock('../../src/services/audio', () => ({
  createDefaultAudioService: () => ({
    preload: () => Promise.resolve(),
    playBatch: () => {},
    release: () => {},
  }),
  createMemoryAudioService: () => ({
    preload: () => Promise.resolve(),
    playBatch: () => {},
    release: () => {},
  }),
}));

vi.mock('../../src/services/platform', () => ({
  defaultPlatformServices: () => ({
    ads: { onRunEnded: () => {} },
    purchases: { onRunEnded: () => {} },
    accounts: { onRunEnded: () => {} },
  }),
}));

vi.mock('../../src/devflags', () => ({
  CERT_HARNESS: false,
  PERF_OVERLAY: false,
}));

vi.mock('../../src/services/crashReporting', () => ({
  triggerTestCrash: () => {},
}));

vi.mock('../../src/render/textures/bakeGlowSprites', () => ({
  bakeGlowSprites: () => ({ soft: null }),
}));

vi.mock('../../src/runtime/GameScreen', () => ({
  GameScreen: () => null,
}));

const setActiveCalls: boolean[] = [];
const setActive = vi.fn((v: boolean) => {
  setActiveCalls.push(v);
});
const retry = vi.fn();

vi.mock('../../src/runtime/useGameLoop', () => ({
  UiPhaseNum: { PLAYING: 0, PAUSED: 1, COUNTDOWN: 2 },
  useGameLoop: () => ({
    picture: { value: null },
    surfaceSize: { value: { width: 360, height: 640 } },
    setActive,
    retry,
    injectCertWorstCase: () => {},
    certOut: { value: {} },
    certSeq: { value: 0 },
    // Defensive: the scenarios here never fire WON/LOST/menu-exit, so these are
    // not dereferenced today — kept in sync so a future case cannot hit
    // "Cannot read properties of undefined" (Phase 9 N-STAT-01).
    runStats: { value: null },
    world: { value: null },
  }),
}));

afterEach(() => {
  cleanup();
  setActiveCalls.length = 0;
  setActive.mockClear();
  retry.mockClear();
});

describe('PlayingHost Next bake gate (source contract)', () => {
  const code = codeOnly(readFileSync(HOST, 'utf8'));

  it('Next callback source must not contain setActive(true) (gate owns arm)', () => {
    const m = code.match(
      /const goNext = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    );
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).not.toMatch(/setActive\s*\(\s*true\s*\)/);
    expect(m![1]).toMatch(/runEndedRef\.current = false/);
  });
});

describe('PlayingHost Next bake gate (behavioral D-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('after Next / levelId change, setActive(true) is the last call (mock useGameLoop)', async () => {
    const { PlayingHost } =
      await import('../../app/_components/PlayingHost');

    // Controlled wrapper — parent owns id (same as GameHost after goNext)
    let setId: ((id: LevelId) => void) | null = null;
    function Controlled() {
      const [levelId, setLevelId] = useState<LevelId>('level-01');
      setId = setLevelId;
      return createElement(PlayingHost, {
        levelId,
        onLevelIdChange: setLevelId,
        onMenu: () => {},
      });
    }

    render(createElement(Controlled));

    // Settle initial bake + gate arm
    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(setActiveCalls.includes(true)).toBe(true);
    });

    setActiveCalls.length = 0;
    setActive.mockClear();

    // Next-driven levelId change (parent updates prop — never setActive in goNext)
    await act(async () => {
      setId?.('level-03');
      await Promise.resolve();
      vi.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(setActiveCalls.length).toBeGreaterThan(0);
      expect(setActiveCalls[setActiveCalls.length - 1]).toBe(true);
    });
  });
});
