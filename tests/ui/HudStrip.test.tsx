/**
 * F-43 — HudStrip component-contract coverage (RN → react-native-web).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { HudStrip } from '../../src/runtime/HudStrip';

afterEach(cleanup);

describe('HudStrip', () => {
  it('renders Score, Lives, combo, Stall text and Pause button', () => {
    const onPause = vi.fn();
    render(
      createElement(HudStrip, {
        score: 1200,
        combo: 3,
        lives: 2,
        stallTier: 2,
        showStall: true,
        showPause: true,
        onPause,
        top: 0,
        left: 0,
        right: 0,
      }),
    );

    expect(screen.getByText('Score · 1200')).toBeTruthy();
    expect(screen.getByText('Lives · 2')).toBeTruthy();
    expect(screen.getByText('×3')).toBeTruthy();
    expect(screen.getByText('Stall! · 2')).toBeTruthy();

    const pause = screen.getByRole('button', { name: 'Pause game' });
    expect(pause).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
    fireEvent.click(pause);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('hides Stall and Pause when flags are false', () => {
    render(
      createElement(HudStrip, {
        score: 0,
        combo: 1,
        lives: 3,
        stallTier: 0,
        showStall: false,
        showPause: false,
        onPause: () => {},
        top: 0,
        left: 0,
        right: 0,
      }),
    );
    expect(screen.queryByText(/Stall!/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause game' })).toBeNull();
  });
});
