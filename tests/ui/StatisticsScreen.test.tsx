/**
 * N-STAT-03 / N-UI-02 — StatisticsScreen: three lifetime rows and a seven-row By mode
 * table, read once (14-03).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StatisticsScreen } from '../../app/_components/StatisticsScreen';
import {
  defaultTelemetryBlob,
  type ProgressBlob,
  type TelemetryBlob,
} from '../../src/services/storage';

const { useSafeAreaInsets } = vi.hoisted(() => ({
  useSafeAreaInsets: vi.fn(() => ({ top: 0, left: 0, right: 0, bottom: 0 })),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => useSafeAreaInsets(),
}));

afterEach(() => {
  cleanup();
  useSafeAreaInsets.mockReturnValue({ top: 0, left: 0, right: 0, bottom: 0 });
});

function snapshot(telemetry: Partial<TelemetryBlob> = {}): ProgressBlob {
  return {
    v: 4,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
    telemetry: { ...defaultTelemetryBlob(), ...telemetry },
  };
}

describe('StatisticsScreen', () => {
  it('row order', async () => {
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.bricksBroken = 4_200;
    telemetry.lifetime.bestComboEver = 18;
    telemetry.lifetime.longestRallyEver = 27;
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot(telemetry)));

    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('4200')).toBeTruthy();
    });
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('27')).toBeTruthy();

    const labels = screen
      .getAllByText(/^(Level 0\d|Endless|Daily)$/)
      .map((el) => el.textContent);
    expect(
      labels,
      'exactly seven By mode rows, in PLAYABLE_LEVEL_ORDER then Endless then Daily',
    ).toEqual(['Level 01', 'Level 04', 'Level 05', 'Level 06', 'Level 03', 'Endless', 'Daily']);

    const lifetimeLabels = screen
      .getAllByText(/^(Bricks broken|Best combo|Longest rally)$/)
      .map((el) => el.textContent);
    expect(lifetimeLabels, 'exactly three lifetime rows').toEqual([
      'Bricks broken',
      'Best combo',
      'Longest rally',
    ]);
  });

  it('endless meta', async () => {
    // Seeded: the endless row's meta must read "{runs} runs" only — no won count.
    const seededTelemetry = defaultTelemetryBlob();
    seededTelemetry.byMode.endless.endless = {
      ...seededTelemetry.byMode.endless.endless!,
      runsPlayed: 9,
      runsWon: 0,
      runsLost: 0,
      runsAbandoned: 0,
      bricksBroken: 0,
      bestComboEver: 0,
      pickupMultiball: 0,
      pickupExpand: 0,
      pickupExtraLife: 0,
      pickupSlow: 0,
      pickupFireball: 0,
      livesLost: 0,
      longestRallyEver: 0,
      largestCascadeEver: 0,
      ticksPlayed: 0,
      wallClockMsTotal: 0,
    };
    const getSnapshotSeeded = vi.fn(() => Promise.resolve(snapshot(seededTelemetry)));
    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotSeeded } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('9 runs')).toBeTruthy();
    });
    expect(
      screen.getByText('Endless').parentElement?.textContent,
      'the endless row itself must carry no won-count substring',
    ).not.toMatch(/won/);

    cleanup();

    // Unseeded: still "{runs} runs" with 0, and still no "won" substring.
    const getSnapshotEmpty = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotEmpty } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('0 runs')).toBeTruthy();
    });
    expect(
      screen.getByText('Endless').parentElement?.textContent,
      'the endless row itself must carry no won-count substring',
    ).not.toMatch(/won/);
  });

  it('zero', async () => {
    // An absent byMode.campaign entry for level-05 must render the same strings as an
    // all-zero entry, with no error copy anywhere.
    const absentTelemetry = defaultTelemetryBlob();
    delete absentTelemetry.byMode.campaign['level-05'];
    const getSnapshotAbsent = vi.fn(() => Promise.resolve(snapshot(absentTelemetry)));
    const { unmount } = render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotAbsent } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('Level 05')).toBeTruthy();
    });
    const absentRow = screen.getByText('Level 05').parentElement;
    const absentMeta = absentRow?.textContent ?? '';
    unmount();
    cleanup();

    const zeroedTelemetry = defaultTelemetryBlob();
    zeroedTelemetry.byMode.campaign['level-05'] = {
      runsPlayed: 0,
      runsWon: 0,
      runsLost: 0,
      runsAbandoned: 0,
      bricksBroken: 0,
      bestComboEver: 0,
      pickupMultiball: 0,
      pickupExpand: 0,
      pickupExtraLife: 0,
      pickupSlow: 0,
      pickupFireball: 0,
      livesLost: 0,
      longestRallyEver: 0,
      largestCascadeEver: 0,
      ticksPlayed: 0,
      wallClockMsTotal: 0,
    };
    const getSnapshotZeroed = vi.fn(() => Promise.resolve(snapshot(zeroedTelemetry)));
    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotZeroed } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('Level 05')).toBeTruthy();
    });
    const zeroedMeta = screen.getByText('Level 05').parentElement?.textContent ?? '';

    expect(
      absentMeta,
      'an absent campaign entry renders the same strings as an explicit all-zero entry',
    ).toBe(zeroedMeta);

    const container = screen.getByText('Statistics').closest('div')?.textContent ?? '';
    for (const word of ['error', 'failed', 'failure', 'retry', 'unavailable']) {
      expect(container.toLowerCase()).not.toContain(word);
    }
  });

  it('reads once', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    // ONE store reference reused across every render — a real caller holds its store
    // across re-renders, and re-creating a fresh object per render would defeat the
    // useMemo this case exists to prove, for a reason that has nothing to do with SC-2.
    const store = { getSnapshot } as never;
    const onBack = () => {};
    const { rerender } = render(
      createElement(StatisticsScreen, { onBack, store }),
    );
    await waitFor(() => {
      expect(getSnapshot).toHaveBeenCalledTimes(1);
    });

    // Force at least one additional render of the same mounted tree.
    rerender(createElement(StatisticsScreen, { onBack, store }));
    rerender(createElement(StatisticsScreen, { onBack, store }));

    expect(
      getSnapshot,
      'N-STAT-03 / SC-2: a re-render of the same mounted screen must not re-read the store',
    ).toHaveBeenCalledTimes(1);
  });

  it('idempotent', async () => {
    const telemetry = defaultTelemetryBlob();
    telemetry.lifetime.bricksBroken = 777;
    const getSnapshotA = vi.fn(() => Promise.resolve(snapshot(telemetry)));
    const { container: a, unmount: unmountA } = render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotA } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('777')).toBeTruthy();
    });
    const textA = a.textContent;
    unmountA();
    cleanup();

    const getSnapshotB = vi.fn(() => Promise.resolve(snapshot(telemetry)));
    const { container: b } = render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshotB } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('777')).toBeTruthy();
    });
    const textB = b.textContent;

    expect(textA).toBe(textB);
  });

  it('read failure', async () => {
    const getSnapshot = vi.fn(() => Promise.reject(new Error('disk read failed')));
    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
    // Every lifetime value reads 0, and every By mode meta reads its zero form.
    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getAllByText('0 won · 0 runs')).toHaveLength(6);
    expect(screen.getByText('0 runs')).toBeTruthy();
    // Positive control: the heading IS present — "rendered nothing" cannot pass as
    // "the failure was handled".
    expect(screen.getByText('Statistics')).toBeTruthy();

    const container = screen.getByText('Statistics').closest('div')?.textContent ?? '';
    for (const word of ['error', 'failed', 'failure', 'retry', 'unavailable']) {
      expect(container.toLowerCase()).not.toContain(word);
    }
  });

  it('shell contract', async () => {
    useSafeAreaInsets.mockReturnValue({ top: 11, bottom: 22, left: 33, right: 44 });
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(StatisticsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeTruthy();
    });

    const root = screen.getByText('Statistics').closest('div[style*="padding"]') as HTMLElement | null;
    // react-native-web resolves inline style props onto the element's style attribute.
    const styled = screen.getByText('Back').closest('div')?.parentElement?.parentElement;
    const style = (root ?? styled)?.getAttribute('style') ?? '';
    for (const px of ['11px', '22px', '33px', '44px']) {
      expect(style).toContain(px);
    }

    const container = screen.getByText('Statistics').closest('div')?.textContent ?? '';
    const lower = container.toLowerCase();
    for (const word of [
      'ad',
      'ads',
      'shop',
      'store',
      'purchase',
      'subscribe',
      'sign in',
      'log in',
      'account',
    ]) {
      expect(lower).not.toContain(word);
    }
  });
});
