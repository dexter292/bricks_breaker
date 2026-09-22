/**
 * F-43 — CountdownOverlay component-contract coverage.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { CountdownOverlay } from '../../src/runtime/overlays/CountdownOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

describe('CountdownOverlay', () => {
  it('renders the countdown numeral', () => {
    render(createElement(CountdownOverlay, { numeral: 3 }));
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('updates when numeral changes', () => {
    const { rerender } = render(
      createElement(CountdownOverlay, { numeral: 2 }),
    );
    expect(screen.getByText('2')).toBeTruthy();
    rerender(createElement(CountdownOverlay, { numeral: 1 }));
    expect(screen.getByText('1')).toBeTruthy();
  });
});
