/**
 * F-43 — LevelErrorOverlay component-contract coverage.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { LevelErrorOverlay } from '../../src/runtime/overlays/LevelErrorOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

describe('LevelErrorOverlay', () => {
  it('renders heading, body, and validation issues', () => {
    render(
      createElement(LevelErrorOverlay, {
        issues: [
          { path: 'bricks[0].hp', message: 'must be >= 1' },
          { path: 'version', message: 'unsupported' },
        ],
      }),
    );

    expect(screen.getByText('Level Error')).toBeTruthy();
    expect(screen.getByText('Invalid level — gameplay blocked')).toBeTruthy();
    expect(screen.getByText('bricks[0].hp: must be >= 1')).toBeTruthy();
    expect(screen.getByText('version: unsupported')).toBeTruthy();
  });
});
