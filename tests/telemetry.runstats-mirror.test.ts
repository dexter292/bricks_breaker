/**
 * N-STAT-01 regression — the UI→JS counter mirror.
 *
 * Device UAT found a run that scored 60, destroyed a visible brick and lost a life
 * persisting `bricksBroken: 0`, `livesLost: 0`, `ticks: 2`. Cause: `RunStats` is mutated
 * **in place on the UI runtime**, and Reanimated does not propagate in-place mutation of a
 * held object to the JS thread — so `runStats.value.bricksBroken` read from JS returned the
 * object's crossing-time values. `wallClockMs`, the one field read from a plain React ref,
 * was the only correct one.
 *
 * A Node test cannot reproduce the bridge itself (there is no UI runtime here), so this
 * covers the two things that ARE testable: the mirror's publish semantics, and a source
 * guard that the host does not go back to reading counters off the SharedValue.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  createRunStatsMirror,
  publishRunStatsMirror,
} from '../src/runtime/publishRunStatsMirror';
import { allocateRunStats, resetRunStats } from '../src/runtime/runStats';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('run stats mirror (N-STAT-01)', () => {
  it('starts zeroed', () => {
    const m = createRunStatsMirror();
    expect(Object.values(m).every((v) => v === 0)).toBe(true);
  });

  it('publishes changed counters and reports dirty exactly once per change', () => {
    const m = createRunStatsMirror();
    const s = allocateRunStats();

    expect(publishRunStatsMirror(m, s, 0)).toBe(0);

    s.bricksBroken = 3;
    expect(publishRunStatsMirror(m, s, 0)).toBe(1);
    expect(m.bricksBroken).toBe(3);
    // Republishing an unchanged stats object must NOT bump again.
    expect(publishRunStatsMirror(m, s, 0)).toBe(0);
  });

  it('carries ticksPlayed, which JS cannot read off the world either', () => {
    const m = createRunStatsMirror();
    const s = allocateRunStats();
    expect(publishRunStatsMirror(m, s, 1080)).toBe(1);
    expect(m.ticksPlayed).toBe(1080);
  });

  it('mirrors every field the persisted shape needs — none silently stuck at zero', () => {
    const m = createRunStatsMirror();
    const s = allocateRunStats();
    s.bricksBroken = 11;
    s.bestCombo = 7;
    s.pickupMultiball = 1;
    s.pickupExpand = 2;
    s.pickupExtraLife = 3;
    s.pickupSlow = 4;
    s.pickupFireball = 5;
    s.livesLost = 2;
    s.longestRally = 9;
    s.largestCascade = 6;
    publishRunStatsMirror(m, s, 42);

    expect(m).toEqual({
      bricksBroken: 11,
      bestCombo: 7,
      pickupMultiball: 1,
      pickupExpand: 2,
      pickupExtraLife: 3,
      pickupSlow: 4,
      pickupFireball: 5,
      livesLost: 2,
      longestRally: 9,
      largestCascade: 6,
      ticksPlayed: 42,
    });
    // D-10: two distinct fields, never collapsed into one.
    expect(m.longestRally).not.toBe(m.bestCombo);
  });

  it('zeroes with the counters on reset, so a new run does not inherit the last one', () => {
    const m = createRunStatsMirror();
    const s = allocateRunStats();
    s.bricksBroken = 5;
    s.livesLost = 1;
    publishRunStatsMirror(m, s, 900);
    expect(m.bricksBroken).toBe(5);

    // D-01: every retry is a new run. useGameLoop republishes with tick 0 after reset.
    resetRunStats(s);
    expect(publishRunStatsMirror(m, s, 0)).toBe(1);
    expect(m.bricksBroken).toBe(0);
    expect(m.livesLost).toBe(0);
    expect(m.ticksPlayed).toBe(0);
  });
});

describe('host does not re-introduce the stale cross-thread read', () => {
  const raw = readFileSync(join(ROOT, 'app/_components/PlayingHost.tsx'), 'utf8');
  // Strip comments — the file documents the defect by name, and the guard must assert on
  // code, not on the prose explaining what not to do.
  const host = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('PlayingHost reads counters from the mirror ref, not from the SharedValue', () => {
    // The exact shape of the original defect: a JS-thread read of the in-place-mutated
    // RunStats object. If this ever comes back, counters silently persist as zero.
    expect(host).not.toMatch(/runStats\.value/);
    expect(host).not.toMatch(/cloneRunStats\(/);
    expect(host).toMatch(/runStatsMirrorRef\.current/);
  });

  it('the counter mirror crosses via the established seq reaction', () => {
    expect(host).toMatch(/runStatsSeq\.value/);
    expect(host).toMatch(/runOnJS\(applyRunStatsMirror\)/);
  });
});
