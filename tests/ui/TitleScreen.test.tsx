/**
 * N-UI-01 / N-UI-02 — TitleScreen: the seven-row composition (14-06).
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

function baseProps(over: Partial<Record<string, unknown>> = {}) {
  return {
    best: 42,
    dailyPlayedToday: false,
    dailyStreak: 0,
    unseenCount: 0,
    onCampaign: vi.fn(),
    onEndless: vi.fn(),
    onDaily: vi.fn(),
    onStats: vi.fn(),
    onAchievements: vi.fn(),
    ...over,
  };
}

describe('TitleScreen', () => {
  it('seven rows', () => {
    const props = baseProps();
    render(createElement(TitleScreen, props));

    expect(screen.getByText(DISPLAY_NAME)).toBeTruthy();
    expect(screen.getByText('Best · 42')).toBeTruthy();

    const campaign = screen.getByRole('button', { name: 'Play campaign mode' });
    const endless = screen.getByRole('button', { name: 'Play endless mode' });
    const daily = screen.getByRole('button', {
      name: "Play today's daily challenge",
    });
    const stats = screen.getByRole('button', { name: 'View statistics' });
    const achievements = screen.getByRole('button', { name: 'View achievements' });

    fireEvent.click(campaign);
    expect(props.onCampaign).toHaveBeenCalledTimes(1);
    expect(props.onEndless).not.toHaveBeenCalled();

    fireEvent.click(endless);
    expect(props.onEndless).toHaveBeenCalledTimes(1);

    fireEvent.click(daily);
    expect(props.onDaily).toHaveBeenCalledTimes(1);

    fireEvent.click(stats);
    expect(props.onStats).toHaveBeenCalledTimes(1);

    fireEvent.click(achievements);
    expect(props.onAchievements).toHaveBeenCalledTimes(1);

    // Each callback was invoked exactly once overall — no cross-firing.
    expect(props.onCampaign).toHaveBeenCalledTimes(1);
    expect(props.onEndless).toHaveBeenCalledTimes(1);
    expect(props.onDaily).toHaveBeenCalledTimes(1);
    expect(props.onStats).toHaveBeenCalledTimes(1);
    expect(props.onAchievements).toHaveBeenCalledTimes(1);
  });

  it('daily meta', () => {
    const unplayed = baseProps({ dailyPlayedToday: false });
    render(createElement(TitleScreen, unplayed));
    // Positive control: the Daily label itself is present even with no meta.
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.queryByText(/Played ·/)).toBeNull();
    cleanup();

    const played = baseProps({ dailyPlayedToday: true, dailyStreak: 7 });
    render(createElement(TitleScreen, played));
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Played · 7-day streak')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Daily, played today, 7-day streak',
      }),
    ).toBeTruthy();
  });

  it('new', () => {
    const zero = baseProps({ unseenCount: 0 });
    render(createElement(TitleScreen, zero));
    // Positive control: the Achievements label is present even with no meta at zero.
    expect(screen.getByText('Achievements')).toBeTruthy();
    expect(screen.queryByText(/new$/)).toBeNull();
    cleanup();

    const one = baseProps({ unseenCount: 1 });
    render(createElement(TitleScreen, one));
    expect(screen.getByText('1 new')).toBeTruthy();
    cleanup();

    const twelve = baseProps({ unseenCount: 12 });
    render(createElement(TitleScreen, twelve));
    expect(screen.getByText('12 new')).toBeTruthy();
  });
});
