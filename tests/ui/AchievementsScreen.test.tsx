/**
 * N-ACH-03 / N-UI-02 — AchievementsScreen: twelve entries, catalog order, both states, the
 * frozen unseen mark (14-05).
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
import { AchievementsScreen } from '../../app/_components/AchievementsScreen';
import {
  defaultTelemetryBlob,
  type ProgressBlob,
  type TelemetryBlob,
} from '../../src/services/storage';
import { ACHIEVEMENT_CATALOG } from '../../src/services/achievements';

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

const CATALOG_NAMES = ACHIEVEMENT_CATALOG.map((a) => a.name);
const CATALOG_IDS = ACHIEVEMENT_CATALOG.map((a) => a.id);

describe('AchievementsScreen', () => {
  it('locked description', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText(CATALOG_NAMES[0]!)).toBeTruthy();
    });

    for (const entry of ACHIEVEMENT_CATALOG) {
      expect(
        screen.getByText(entry.description),
        `${entry.name}'s description must render in the all-locked state (D-08)`,
      ).toBeTruthy();
    }
    expect(screen.getAllByText('Locked')).toHaveLength(12);
  });

  it('catalog order', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText(CATALOG_NAMES[0]!)).toBeTruthy();
    });
    const order1 = screen.getAllByText(new RegExp(`^(${CATALOG_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`)).map(
      (el) => el.textContent,
    );
    expect(order1).toEqual(CATALOG_NAMES);
    cleanup();

    // A DIFFERENT unlocked set must not change the order — adjacency/stable-tie half.
    const unlockedTelemetry = defaultTelemetryBlob();
    unlockedTelemetry.achievements = {
      unlocked: [
        { id: CATALOG_IDS[2]!, at: 1 },
        { id: CATALOG_IDS[6]!, at: 2 },
      ],
      unseen: [],
    };
    const getSnapshot2 = vi.fn(() => Promise.resolve(snapshot(unlockedTelemetry)));
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshot2 } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText(CATALOG_NAMES[0]!)).toBeTruthy();
    });
    const order2 = screen.getAllByText(new RegExp(`^(${CATALOG_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`)).map(
      (el) => el.textContent,
    );
    expect(order2).toEqual(CATALOG_NAMES);
  });

  it('marker', async () => {
    const telemetry = defaultTelemetryBlob();
    telemetry.achievements = {
      unlocked: [
        { id: CATALOG_IDS[2]!, at: 1 }, // unlocked, unseen -> New
        { id: CATALOG_IDS[6]!, at: 2 }, // unlocked, not unseen -> Unlocked
      ],
      // An unseen id NOT in the unlocked set (CATALOG_IDS[9]) must produce no marker.
      unseen: [CATALOG_IDS[2]!, CATALOG_IDS[9]!],
    };
    // ONE shared snapshot object, handed back on every call — models a store whose
    // markAchievementsSeen mutates the SAME object it already returned from getSnapshot
    // rather than cloning before mutating. The frozen unseenAtMount state must survive
    // this because it captured the ORIGINAL unseen array by reference before the
    // reassignment below replaces the property with a new, empty array.
    const sharedSnap = snapshot(telemetry);
    const getSnapshot = vi.fn(() => Promise.resolve(sharedSnap));
    const markAchievementsSeen = vi.fn(() => {
      sharedSnap.telemetry.achievements = {
        ...sharedSnap.telemetry.achievements,
        unseen: [],
      };
      return Promise.resolve();
    });
    const store = { getSnapshot, markAchievementsSeen } as never;
    const onBack = () => {};
    const { rerender } = render(createElement(AchievementsScreen, { onBack, store }));
    await waitFor(() => {
      expect(screen.getAllByText('New')).toHaveLength(1);
    });
    expect(screen.getAllByText('Unlocked')).toHaveLength(1);
    expect(screen.getAllByText('Locked')).toHaveLength(10);

    // The seen-write has mutated sharedSnap.telemetry.achievements.unseen to [] by now.
    await waitFor(() => {
      expect(markAchievementsSeen).toHaveBeenCalledTimes(1);
    });

    // Force a re-render of the same mounted tree — the New marker must survive it,
    // because it is frozen and does not live-read the (now-mutated) shared object.
    rerender(createElement(AchievementsScreen, { onBack, store }));
    expect(screen.getAllByText('New')).toHaveLength(1);
  });

  it('writes once', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    const markAchievementsSeen = vi.fn(() => Promise.resolve());
    const store = { getSnapshot, markAchievementsSeen } as never;
    const onBack = () => {};
    const { rerender } = render(
      createElement(AchievementsScreen, { onBack, store }),
    );
    await waitFor(() => {
      expect(markAchievementsSeen).toHaveBeenCalledTimes(1);
    });
    const before = screen.getAllByText('Locked').length;

    rerender(createElement(AchievementsScreen, { onBack, store }));
    rerender(createElement(AchievementsScreen, { onBack, store }));

    expect(markAchievementsSeen).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Locked').length).toBe(before);
  });

  it('writes once: fail-soft when markAchievementsSeen is absent', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    expect(() =>
      render(
        createElement(AchievementsScreen, {
          onBack: () => {},
          store: { getSnapshot } as never,
        }),
      ),
    ).not.toThrow();
    await waitFor(() => {
      expect(screen.getAllByText('Locked')).toHaveLength(12);
    });
  });

  it('shell contract', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId('achievements-scroll')).toBeTruthy();
    });

    // Positive control, then the structural claim.
    const scroll = screen.getByTestId('achievements-scroll');
    expect(
      scroll.textContent,
      'positive control: the scroll container must contain at least one entry name',
    ).toContain(CATALOG_NAMES[0]);

    const back = screen.getByRole('button', { name: 'Return to title' });
    const heading = screen.getByText('Achievements');
    expect(scroll.contains(back)).toBe(false);
    expect(scroll.contains(heading)).toBe(false);

    cleanup();
    useSafeAreaInsets.mockReturnValue({ top: 11, bottom: 22, left: 33, right: 44 });
    const getSnapshot2 = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot: getSnapshot2 } as never,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeTruthy();
    });
    let node: HTMLElement | null = screen.getByText('Back');
    let style = '';
    while (node != null) {
      const s = node.getAttribute('style') ?? '';
      if (s.includes('padding')) {
        style = s;
        break;
      }
      node = node.parentElement;
    }
    for (const px of ['11px', '22px', '33px', '44px']) {
      expect(style).toContain(px);
    }

    const container = screen.getByText('Achievements').closest('div')?.textContent ?? '';
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

  it('read failure', async () => {
    const getSnapshot = vi.fn(() => Promise.reject(new Error('disk read failed')));
    const markAchievementsSeen = vi.fn(() => Promise.resolve());
    render(
      createElement(AchievementsScreen, {
        onBack: () => {},
        store: { getSnapshot, markAchievementsSeen } as never,
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByText('Locked')).toHaveLength(12);
    });
    expect(markAchievementsSeen).not.toHaveBeenCalled();
    expect(screen.getByText('Achievements')).toBeTruthy();

    const container = screen.getByText('Achievements').closest('div')?.textContent ?? '';
    for (const word of ['error', 'failed', 'failure', 'retry', 'unavailable']) {
      expect(container.toLowerCase()).not.toContain(word);
    }
  });
});
