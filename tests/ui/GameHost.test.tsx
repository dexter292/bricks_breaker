/**
 * F-43 / N-QA-03 / N-LVL-02 / N-UI-01 / N-UI-02 — GameHost shell router (14-06).
 * PlayingHost is stubbed so Skia/worklets never load.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameHost } from '../../app/_components/GameHost';
import { DISPLAY_NAME } from '../../app/_brand';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

vi.mock('expo-font', () => ({
  useFonts: () => [true],
}));

vi.mock('../../src/devflags', () => ({
  SOAK_HARNESS: false,
  CERT_HARNESS: false,
  // Unarmed, exactly as an ordinary build: the A1 probe must never generate its
  // 4 200-board corpus inside a UI test (Phase 10 plan 05).
  LEVELGEN_PROBE: false,
}));

vi.mock('expo-keep-awake', () => ({
  useKeepAwake: () => {},
}));

// The best-only method and the snapshot's bestScore are DELIBERATELY DIFFERENT (7 vs
// 100): Title now reads the snapshot (14-06), and asserting 100 rather than 7 is a
// positive proof of the widening from the narrower best-only call rather than an
// incidental fixture value.
vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBest: () => Promise.resolve(7),
      getSnapshot: () =>
        Promise.resolve({
          v: 4 as const,
          unlocked: ['level-01', 'level-03'] as const,
          bestByLevel: {
            'level-01': { score: 100, stars: 1 as const },
          },
          bestScore: 100,
          updatedAt: 0,
          telemetry: actual.defaultTelemetryBlob(),
        }),
    }),
  };
});

vi.mock('../../app/_components/PlayingHost', async () => {
  const React = await import('react');
  const { Text, Pressable, View } = await import('react-native');
  return {
    PlayingHost: ({
      onMenu,
      levelId,
      entryMode,
    }: {
      onMenu: () => void;
      levelId: string;
      onLevelIdChange?: (id: string) => void;
      entryMode: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, 'PlayingStub'),
        React.createElement(Text, null, `levelId:${levelId}`),
        React.createElement(Text, null, `entryMode:${entryMode}`),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Menu',
            onPress: onMenu,
          },
          React.createElement(Text, null, 'Menu'),
        ),
      ),
  };
});

afterEach(cleanup);

describe('GameHost', () => {
  it('Title → Campaign → Select → PlayingStub → Menu → Title', async () => {
    render(createElement(GameHost));

    expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    await waitFor(() => {
      // The snapshot's bestScore (100), not the best-only method's value (7) — the
      // positive control for Title now reading one snapshot rather than the narrower call.
      expect(screen.getByText('Best · 100')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Play campaign mode' }));
    await waitFor(() => {
      expect(screen.getByText('Levels')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Play Level 01' }));
    expect(screen.getByText('PlayingStub')).toBeTruthy();
    expect(screen.getByText('levelId:level-01')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
  });

  it('entry mode: Title Endless reaches PlayingHost in endless', async () => {
    render(createElement(GameHost));

    await waitFor(() => {
      expect(screen.getByText('Best · 100')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play endless mode' }));
    expect(screen.getByText('PlayingStub')).toBeTruthy();
    expect(screen.getByText('entryMode:endless')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play campaign mode' }));
    await waitFor(() => {
      expect(screen.getByText('Levels')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play Level 01' }));
    expect(screen.getByText('entryMode:campaign')).toBeTruthy();
  });

  it('no PlayingHost', async () => {
    render(createElement(GameHost));
    await waitFor(() => {
      expect(screen.getByText('Best · 100')).toBeTruthy();
    });

    // Positive control FIRST: driven into playing, the stub sentinel IS present — so
    // "the stub was never wired" cannot pass as "the branch does not mount it".
    fireEvent.click(screen.getByRole('button', { name: 'Play endless mode' }));
    expect(screen.getByText('PlayingStub')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

    // Stats: the sentinel must be absent.
    fireEvent.click(screen.getByRole('button', { name: 'View statistics' }));
    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeTruthy();
    });
    expect(screen.queryByText('PlayingStub')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Return to title' }));

    // Achievements: the sentinel must be absent.
    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'View achievements' }));
    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeTruthy();
    });
    expect(screen.queryByText('PlayingStub')).toBeNull();
  });

  it('Back', async () => {
    render(createElement(GameHost));
    await waitFor(() => {
      expect(screen.getByText('Best · 100')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View statistics' }));
    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Return to title' }));
    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    });
    expect(screen.queryByText('PlayingStub')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'View achievements' }));
    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Return to title' }));
    await waitFor(() => {
      expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    });
    expect(screen.queryByText('PlayingStub')).toBeNull();
  });

  it('CERT/SOAK source: initial playing when CERT; soak never sets select, stats or achievements', () => {
    const code = readFileSync(
      resolve(__dirname, '../../app/_components/GameHost.tsx'),
      'utf8',
    );
    expect(code).toMatch(
      /CERT_HARNESS && !SOAK_HARNESS \? 'playing' : 'title'/,
    );
    expect(code).toMatch(/setShellPhase\('select'\)/);
    // Soak effect bodies only title|playing — no select/stats/achievements in
    // setShellPhase soak paths.
    const soakMatch = code.match(
      /if \(typeof __DEV__[\s\S]*?SOAK_HARNESS\)[\s\S]*?return \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
    );
    expect(soakMatch).toBeTruthy();
    expect(soakMatch![0]).not.toMatch(/setShellPhase\('select'\)/);
    expect(soakMatch![0]).not.toMatch(
      /setShellPhase\('(stats|achievements)'\)/,
    );
  });
});
