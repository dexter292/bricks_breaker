/**
 * F-43 / N-QA-03 — TitleScreen mount-path contract (RN → react-native-web).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { TitleScreen } from '../../app/_components/TitleScreen';
import { DISPLAY_NAME } from '../../app/_brand';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

describe('TitleScreen', () => {
  it('renders brand, best, and Play; Play invokes onPlay', () => {
    const onPlay = vi.fn();
    const onEndless = vi.fn();
    render(createElement(TitleScreen, { best: 42, onPlay, onEndless }));

    expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    expect(screen.getByText('Best · 42')).toBeTruthy();

    const play = screen.getByRole('button', { name: 'Start game' });
    expect(play).toBeTruthy();
    fireEvent.click(play);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('renders the Endless entry alongside Play', () => {
    const onPlay = vi.fn();
    const onEndless = vi.fn();
    render(createElement(TitleScreen, { best: 42, onPlay, onEndless }));

    expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    expect(screen.getByText('Best · 42')).toBeTruthy();

    const play = screen.getByRole('button', { name: 'Start game' });
    const endless = screen.getByRole('button', { name: 'Play endless mode' });
    expect(play).toBeTruthy();
    expect(endless).toBeTruthy();

    fireEvent.click(endless);
    expect(onEndless).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();

    fireEvent.click(play);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onEndless).toHaveBeenCalledTimes(1);
  });
});
