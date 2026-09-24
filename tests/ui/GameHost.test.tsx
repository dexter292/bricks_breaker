/**
 * F-43 / N-QA-03 — GameHost shell Title↔Playing mount path.
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
import { GameHost } from '../../app/_components/GameHost';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

vi.mock('expo-font', () => ({
  useFonts: () => [true],
}));

vi.mock('../../src/devflags', () => ({
  SOAK_HARNESS: false,
}));

vi.mock('../../src/services/storage', () => ({
  createDefaultPersonalBestStore: () => ({
    getBest: () => Promise.resolve(7),
  }),
}));

vi.mock('../../app/_components/PlayingHost', async () => {
  const React = await import('react');
  const { Text, Pressable, View } = await import('react-native');
  return {
    PlayingHost: ({ onMenu }: { onMenu: () => void }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, 'PlayingStub'),
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
  it('Title → Play → PlayingStub → Menu → Title', async () => {
    render(createElement(GameHost));

    expect(screen.getByText('Neon Brick Breaker')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Best · 7')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(screen.getByText('PlayingStub')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText('Neon Brick Breaker')).toBeTruthy();
  });
});
