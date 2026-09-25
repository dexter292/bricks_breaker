/**
 * N-LVL-02 — SelectScreen three-state list + mount snapshot (C2 Plan 02).
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
import { SelectScreen } from '../../app/_components/SelectScreen';
import type { ProgressBlob } from '../../src/services/storage';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

function snapshot(partial: Partial<ProgressBlob> = {}): ProgressBlob {
  return {
    v: 3,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('SelectScreen', () => {
  it('mount calls getSnapshot', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(SelectScreen, {
        onBack: () => {},
        onChoose: () => {},
        store: { getSnapshot } as never,
      }),
    );
    await waitFor(() => {
      expect(getSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  it('renders locked / uncleared / cleared row states from snapshot', async () => {
    const getSnapshot = vi.fn(() =>
      Promise.resolve(
        snapshot({
          unlocked: ['level-01', 'level-03'],
          bestByLevel: {
            'level-01': { score: 1200, stars: 2 },
          },
        }),
      ),
    );
    render(
      createElement(SelectScreen, {
        onBack: () => {},
        onChoose: () => {},
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Levels')).toBeTruthy();
    });

    expect(screen.getByText('Level 01')).toBeTruthy();
    expect(screen.getByText('Level 03')).toBeTruthy();
    expect(screen.getByText('Level 04')).toBeTruthy();
    expect(screen.getByText('Level 05')).toBeTruthy();
    expect(screen.getByText('Level 06')).toBeTruthy();

    // Cleared: ★★☆ + Best
    expect(screen.getByLabelText('2 of 3 stars')).toBeTruthy();
    expect(screen.getByText('Best · 1200')).toBeTruthy();

    // Uncleared unlocked: ☆☆☆, no Best for that row alone — Level 03 has no Best line
    expect(screen.getByText('☆☆☆')).toBeTruthy();

    // Locked
    expect(screen.getAllByText('Locked').length).toBeGreaterThanOrEqual(3);
  });

  it('locked tap does not call onChoose', async () => {
    const onChoose = vi.fn();
    const getSnapshot = vi.fn(() =>
      Promise.resolve(
        snapshot({
          unlocked: ['level-01'],
        }),
      ),
    );
    render(
      createElement(SelectScreen, {
        onBack: () => {},
        onChoose,
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Level 04 locked')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Level 04 locked'));
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Play Level 01' }));
    expect(onChoose).toHaveBeenCalledWith('level-01');
  });

  it('Back invokes onBack', async () => {
    const onBack = vi.fn();
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(SelectScreen, {
        onBack,
        onChoose: () => {},
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return to title' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Return to title' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
