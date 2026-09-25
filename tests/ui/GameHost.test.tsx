/**
 * F-43 / N-QA-03 / N-LVL-02 — GameHost Title→Select→Playing shell.
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

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

vi.mock('expo-font', () => ({
  useFonts: () => [true],
}));

vi.mock('../../src/devflags', () => ({
  SOAK_HARNESS: false,
  CERT_HARNESS: false,
}));

vi.mock('expo-keep-awake', () => ({
  useKeepAwake: () => {},
}));

vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBest: () => Promise.resolve(7),
      getSnapshot: () =>
        Promise.resolve({
          v: 3 as const,
          unlocked: ['level-01', 'level-03'] as const,
          bestByLevel: {
            'level-01': { score: 100, stars: 1 as const },
          },
          bestScore: 100,
          updatedAt: 0,
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
    }: {
      onMenu: () => void;
      levelId?: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, 'PlayingStub'),
        levelId
          ? React.createElement(Text, null, `levelId:${levelId}`)
          : null,
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
  it('Title → Play → Select → PlayingStub → Menu → Title', async () => {
    render(createElement(GameHost));

    expect(screen.getByText('Neon Brick Breaker')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Best · 7')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    await waitFor(() => {
      expect(screen.getByText('Levels')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Play Level 01' }));
    expect(screen.getByText('PlayingStub')).toBeTruthy();
    expect(screen.getByText('levelId:level-01')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText('Neon Brick Breaker')).toBeTruthy();
  });

  it('CERT/SOAK source: initial playing when CERT; soak never sets select', () => {
    const code = readFileSync(
      resolve(__dirname, '../../app/_components/GameHost.tsx'),
      'utf8',
    );
    expect(code).toMatch(
      /CERT_HARNESS && !SOAK_HARNESS \? 'playing' : 'title'/,
    );
    expect(code).toMatch(/setShellPhase\('select'\)/);
    // Soak effect bodies only title|playing — no select in setShellPhase soak paths
    const soakMatch = code.match(
      /if \(typeof __DEV__[\s\S]*?SOAK_HARNESS\)[\s\S]*?return \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
    );
    expect(soakMatch).toBeTruthy();
    expect(soakMatch![0]).not.toMatch(/setShellPhase\('select'\)/);
  });
});
