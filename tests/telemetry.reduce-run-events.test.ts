/**
 * N-STAT-01 — `reduceRunTelemetry` coverage (Phase 9, Plan 01 Task 3).
 *
 * Plan 00 scaffolded this file as an `it.todo` checklist before
 * `src/runtime/runStats.ts` existed; every todo is now a real assertion.
 *
 * Phase-9 decision anchors (see `.planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md`):
 *   D-06 base counters · D-07 per-pickup-type counts · D-08 largest explosive cascade
 *   D-10 longest rally (survival streak) is NOT best combo (aggression streak)
 * Research pitfalls (09-RESEARCH.md): 1 cascade attribution · 2 ticks from `world.tick`
 *   · 3 lives lost from LIFE_LOST events, never from a livesRemaining endpoint diff.
 *
 * Two strategies, both required:
 *   1. Direct unit tests against a minimal fake World — the subset of fields the reducer
 *      actually reads. Deterministic, no RNG, exact expected values.
 *   2. A headless integration smoke driving a real level fixture through
 *      `stepRun` + `reduceRunTelemetry`, mirroring `tests/helpers/balanceBot.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepRun,
  FIXED_DT,
  SimPhase,
  loadAndCompile,
  type Intent,
} from '../src/core';
import { BrickFlags, EventCode, PickupType, type World } from '../src/core/types';
import {
  allocateRunStats,
  cloneRunStats,
  reduceRunTelemetry,
  resetRunStats,
  type RunStats,
} from '../src/runtime/runStats';
import { readLevelFile } from './helpers/balanceBot';

/** EVENT_RING_CAPACITY (src/core/constants.ts). */
const EV_CAP = 128;
const BRICK_SLOTS = 64;

/** Only the World fields `reduceRunTelemetry` reads — cast at the call site. */
type FakeWorld = {
  evCode: number[];
  evA: number[];
  evB: number[];
  evX: number[];
  evY: number[];
  evHead: number;
  evCount: number;
  evCap: number;
  combo: number;
  brickFlags: number[];
  brickCount: number;
  brickX: number[];
  brickY: number[];
  latticeOriginX: number;
  latticeOriginY: number;
  latticePitchX: number;
  latticePitchY: number;
  gridCols: number;
  gridRows: number;
};

function makeFakeWorld(over: Partial<FakeWorld> = {}): FakeWorld {
  return {
    evCode: new Array<number>(EV_CAP).fill(0),
    evA: new Array<number>(EV_CAP).fill(0),
    evB: new Array<number>(EV_CAP).fill(-1),
    evX: new Array<number>(EV_CAP).fill(0),
    evY: new Array<number>(EV_CAP).fill(0),
    evHead: 0,
    evCount: 0,
    evCap: EV_CAP,
    combo: 0,
    brickFlags: new Array<number>(BRICK_SLOTS).fill(0),
    brickCount: BRICK_SLOTS,
    brickX: new Array<number>(BRICK_SLOTS).fill(0),
    brickY: new Array<number>(BRICK_SLOTS).fill(0),
    latticeOriginX: 0,
    latticeOriginY: 0,
    latticePitchX: 10,
    latticePitchY: 10,
    gridCols: 16,
    gridRows: 16,
    ...over,
  };
}

/** Same write order as `pushEvent` — head advances, count grows until the next clear. */
function pushEv(
  w: FakeWorld,
  code: number,
  a: number,
  b: number,
  x = 0,
  y = 0,
): void {
  w.evCode[w.evHead] = code;
  w.evA[w.evHead] = a;
  w.evB[w.evHead] = b;
  w.evX[w.evHead] = x;
  w.evY[w.evHead] = y;
  w.evHead = (w.evHead + 1) % w.evCap;
  w.evCount += 1;
}

/** Same as core's `clearEvents`: drop the count, leave `evHead` where it is. */
function clearEv(w: FakeWorld): void {
  w.evCount = 0;
}

/** Park brick `idx` on lattice cell (col,row) so the reducer can recover the cell. */
function placeBrick(
  w: FakeWorld,
  idx: number,
  col: number,
  row: number,
  explosive: boolean,
): void {
  w.brickX[idx] = w.latticeOriginX + col * w.latticePitchX;
  w.brickY[idx] = w.latticeOriginY + row * w.latticePitchY;
  w.brickFlags[idx] = explosive ? BrickFlags.EXPLOSIVE : 0;
}

function breakBrick(w: FakeWorld, idx: number): void {
  pushEv(w, EventCode.BRICK_BREAK, 1, idx, w.brickX[idx]!, w.brickY[idx]!);
}

/** Run one "substep": reduce the pending ring segment, then clear it. */
function reduceSubstep(w: FakeWorld, stats: RunStats): void {
  reduceRunTelemetry(w as unknown as World, stats);
  clearEv(w);
}

describe('reduceRunTelemetry — ring-walk basics', () => {
  it('bestCombo tracks a running max of world.combo, never re-derived from events', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // No events at all — bestCombo must still update (Pitfall 2: never gate on evCount).
    w.combo = 5;
    reduceSubstep(w, stats);
    expect(stats.bestCombo).toBe(5);

    // Combo drops back on paddle contact; the recorded best must not regress.
    w.combo = 2;
    reduceSubstep(w, stats);
    expect(stats.bestCombo).toBe(5);

    w.combo = 9;
    reduceSubstep(w, stats);
    expect(stats.bestCombo).toBe(9);

    // Sanity: nothing was derived from BRICK_HIT/BRICK_BREAK sequencing.
    expect(stats.bricksBroken).toBe(0);
  });

  it('bricksBroken counts one per BRICK_BREAK event, cumulative across calls', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    placeBrick(w, 0, 0, 0, false);
    placeBrick(w, 1, 5, 5, false);
    placeBrick(w, 2, 9, 9, false);

    breakBrick(w, 0);
    breakBrick(w, 1);
    reduceSubstep(w, stats);
    expect(stats.bricksBroken).toBe(2);

    breakBrick(w, 2);
    reduceSubstep(w, stats);
    expect(stats.bricksBroken).toBe(3);

    // A substep with no events leaves the count untouched.
    reduceSubstep(w, stats);
    expect(stats.bricksBroken).toBe(3);
  });
});

describe('reduceRunTelemetry — per-pickup-type counts (D-07)', () => {
  const cases: readonly (readonly [string, number, keyof RunStats])[] = [
    ['MULTIBALL', PickupType.MULTIBALL, 'pickupMultiball'],
    ['EXPAND', PickupType.EXPAND, 'pickupExpand'],
    ['EXTRA_LIFE', PickupType.EXTRA_LIFE, 'pickupExtraLife'],
    ['SLOW', PickupType.SLOW, 'pickupSlow'],
    ['FIREBALL', PickupType.FIREBALL, 'pickupFireball'],
  ];
  const allPickupFields: readonly (keyof RunStats)[] = [
    'pickupMultiball',
    'pickupExpand',
    'pickupExtraLife',
    'pickupSlow',
    'pickupFireball',
  ];

  for (const [label, code, field] of cases) {
    it(`POWERUP_CATCH with evA=PickupType.${label} increments ${field} only`, () => {
      const w = makeFakeWorld();
      const stats = allocateRunStats();

      pushEv(w, EventCode.POWERUP_CATCH, code, -1);
      reduceSubstep(w, stats);

      for (const f of allPickupFields) {
        expect(stats[f]).toBe(f === field ? 1 : 0);
      }
    });
  }
});

describe('reduceRunTelemetry — lives lost + longest rally (D-10, Pitfall 3)', () => {
  it('livesLost counts LIFE_LOST events, not (3 - livesRemaining) endpoint diff', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // Lose, catch an extra life (which raises world.lives), lose twice more.
    pushEv(w, EventCode.LIFE_LOST, 2, -1);
    reduceSubstep(w, stats);
    pushEv(w, EventCode.POWERUP_CATCH, PickupType.EXTRA_LIFE, -1);
    reduceSubstep(w, stats);
    pushEv(w, EventCode.LIFE_LOST, 2, -1);
    reduceSubstep(w, stats);
    pushEv(w, EventCode.LIFE_LOST, 1, -1);
    reduceSubstep(w, stats);

    // The endpoint diff (3 - 1) would say 2; the event count is the truth.
    expect(stats.livesLost).toBe(3);
    expect(stats.pickupExtraLife).toBe(1);
  });

  it('rallyCurrent increments on PADDLE_HIT and resets to 0 on LIFE_LOST', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    pushEv(w, EventCode.PADDLE_HIT, 0, -1);
    pushEv(w, EventCode.PADDLE_HIT, 0, -1);
    reduceSubstep(w, stats);
    expect(stats.rallyCurrent).toBe(2);

    pushEv(w, EventCode.LIFE_LOST, 2, -1);
    reduceSubstep(w, stats);
    expect(stats.rallyCurrent).toBe(0);
  });

  it('longestRally is the running max of rallyCurrent, distinct from bestCombo (D-10 — must not collapse the two)', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // Rally of 3, life lost, then a rally of 2.
    for (let i = 0; i < 3; i++) {
      pushEv(w, EventCode.PADDLE_HIT, 0, -1);
    }
    reduceSubstep(w, stats);
    pushEv(w, EventCode.LIFE_LOST, 2, -1);
    reduceSubstep(w, stats);
    for (let i = 0; i < 2; i++) {
      pushEv(w, EventCode.PADDLE_HIT, 0, -1);
    }
    // A high combo in the same window must not leak into longestRally.
    w.combo = 7;
    reduceSubstep(w, stats);

    expect(stats.longestRally).toBe(3);
    expect(stats.rallyCurrent).toBe(2);
    expect(stats.bestCombo).toBe(7);
    // D-10: two distinct fields — a survival streak and an aggression streak.
    expect(stats.longestRally).not.toBe(stats.bestCombo);
  });
});

describe('reduceRunTelemetry — largest explosive cascade (D-08, grid-adjacency grouping)', () => {
  it('BRICK_BREAK events are grouped by 8-neighbor lattice adjacency (Chebyshev distance <=1 between broken bricks (col,row)), the same adjacency rule explodeAtCell itself uses — NOT by substep co-occurrence', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // (0,0) - (1,0) orthogonal, (1,0) - (1,1) orthogonal: one connected group of 3.
    placeBrick(w, 0, 0, 0, true);
    placeBrick(w, 1, 1, 0, false);
    placeBrick(w, 2, 1, 1, false);
    breakBrick(w, 0);
    breakBrick(w, 1);
    breakBrick(w, 2);
    reduceSubstep(w, stats);

    expect(stats.largestCascade).toBe(3);
    expect(stats.bricksBroken).toBe(3);
  });

  it('two non-adjacent BRICK_BREAK events in the same substep land in separate groups and must NOT merge into one cascade (the overcount plan-check rejected — largestCascade is a Phase 13 achievement trigger, so overcounting is the harmful direction)', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // Non-adjacent does NOT merge: an explosive break at (0,0) and an unrelated
    // ordinary break at (10,10) in the SAME substep. The old substep-level
    // heuristic reported 2 here; grid-adjacency must report largestCascade === 1.
    placeBrick(w, 0, 0, 0, true);
    placeBrick(w, 1, 10, 10, false);
    breakBrick(w, 0);
    breakBrick(w, 1);
    reduceSubstep(w, stats);

    expect(stats.largestCascade).toBe(1);
    expect(stats.largestCascade).not.toBe(2);
    expect(stats.bricksBroken).toBe(2);
  });

  it('largestCascade only updates from a group containing at least one EXPLOSIVE-flagged brick, and takes that whole group size', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // Two disconnected adjacent pairs, each containing one explosive brick.
    placeBrick(w, 0, 0, 0, true);
    placeBrick(w, 1, 1, 0, false);
    placeBrick(w, 2, 5, 5, true);
    placeBrick(w, 3, 6, 5, false);
    breakBrick(w, 0);
    breakBrick(w, 1);
    breakBrick(w, 2);
    breakBrick(w, 3);
    reduceSubstep(w, stats);

    // Both groups tie at size 2 — the max is 2, never the combined 4.
    expect(stats.largestCascade).toBe(2);
    expect(stats.bricksBroken).toBe(4);
  });

  it('a group of only non-EXPLOSIVE BRICK_BREAK events does not update largestCascade', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    // Seed a real cascade of 2 first so "no update" is observable as "unchanged".
    placeBrick(w, 0, 0, 0, true);
    placeBrick(w, 1, 1, 0, false);
    breakBrick(w, 0);
    breakBrick(w, 1);
    reduceSubstep(w, stats);
    expect(stats.largestCascade).toBe(2);

    // Three mutually adjacent bricks, none explosive — a bigger group, but it must
    // not count: a cascade needs at least one EXPLOSIVE member.
    placeBrick(w, 2, 8, 8, false);
    placeBrick(w, 3, 9, 8, false);
    placeBrick(w, 4, 9, 9, false);
    breakBrick(w, 2);
    breakBrick(w, 3);
    breakBrick(w, 4);
    reduceSubstep(w, stats);

    expect(stats.largestCascade).toBe(2);
  });

  it('a break with no resolvable lattice cell (pitchX/pitchY <= 0, dense/legacy fixture only) forms its own singleton group — it can undercount but can never merge into an unrelated group', () => {
    const w = makeFakeWorld({ latticePitchX: 0, latticePitchY: 0 });
    const stats = allocateRunStats();

    // Both explosive, both unresolvable: each is its own singleton group.
    w.brickFlags[0] = BrickFlags.EXPLOSIVE;
    w.brickFlags[1] = BrickFlags.EXPLOSIVE;
    breakBrick(w, 0);
    breakBrick(w, 1);
    reduceSubstep(w, stats);

    expect(stats.largestCascade).toBe(1);
    expect(stats.bricksBroken).toBe(2);
  });

  it('largestCascade is a running max across substeps, never reset mid-run', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    placeBrick(w, 0, 0, 0, true);
    placeBrick(w, 1, 1, 0, false);
    placeBrick(w, 2, 1, 1, false);
    breakBrick(w, 0);
    breakBrick(w, 1);
    breakBrick(w, 2);
    reduceSubstep(w, stats);
    expect(stats.largestCascade).toBe(3);

    // A later, smaller isolated explosive break must not lower the record.
    placeBrick(w, 3, 12, 12, true);
    breakBrick(w, 3);
    reduceSubstep(w, stats);
    expect(stats.largestCascade).toBe(3);

    // Only an explicit reset (a new run, D-01) clears it.
    resetRunStats(stats);
    expect(stats.largestCascade).toBe(0);
  });
});

describe('reduceRunTelemetry — worklet-safe, zero core mutation', () => {
  it('never writes to any world.* field (read-only contract, same as consumeEventsForVfx)', () => {
    const w = makeFakeWorld();
    const stats = allocateRunStats();

    placeBrick(w, 0, 2, 3, true);
    placeBrick(w, 1, 3, 3, false);
    w.combo = 4;
    breakBrick(w, 0);
    breakBrick(w, 1);
    pushEv(w, EventCode.PADDLE_HIT, 0, -1);
    pushEv(w, EventCode.POWERUP_CATCH, PickupType.SLOW, -1);
    pushEv(w, EventCode.LIFE_LOST, 2, -1);

    const before = JSON.stringify(w);
    reduceRunTelemetry(w as unknown as World, stats);
    expect(JSON.stringify(w)).toBe(before);

    // Specifically: the ring itself is untouched — stepRun owns clear policy.
    expect(w.evCount).toBe(5);
    // And the reduction really did happen (the snapshot above is not vacuous).
    expect(stats.bricksBroken).toBe(2);
    expect(stats.pickupSlow).toBe(1);
    expect(stats.livesLost).toBe(1);
  });

  it('cloneRunStats snapshots by value and tolerates a null source', () => {
    const stats = allocateRunStats();
    stats.bricksBroken = 7;
    stats.largestCascade = 3;

    const snap = cloneRunStats(stats);
    stats.bricksBroken = 99;
    expect(snap.bricksBroken).toBe(7);
    expect(snap.largestCascade).toBe(3);

    // Null source (no frame has run yet) degrades to all-zero defaults.
    expect(cloneRunStats(null)).toEqual(allocateRunStats());
  });
});

describe('headless integration smoke (mirrors tests/helpers/balanceBot.ts)', () => {
  it('driving a real level fixture through stepRun + reduceRunTelemetry produces bricksBroken <= level brickCount and non-negative counters', () => {
    const compiled = loadAndCompile(readLevelFile('level-01'));
    if (!compiled.ok) {
      throw new Error(
        `level-01 failed to compile: ${JSON.stringify(compiled.issues)}`,
      );
    }

    const w = allocateWorld();
    resetWorld(w, 0xace, 0xbeef);
    applyCompiledLevel(w, compiled.compiled);

    const stats = allocateRunStats();
    const maxTicks = Math.round(1 / FIXED_DT) * 120;
    let intent: Intent = { paddleX: w.paddleX, launch: 1 };

    for (let t = 0; t < maxTicks; t++) {
      stepRun(w, intent, FIXED_DT);
      // Drain BEFORE the next stepRun clears the ring — same ordering as useGameLoop.
      reduceRunTelemetry(w, stats);

      if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) {
        break;
      }
      if (w.simPhase === SimPhase.DOCKED) {
        intent = { paddleX: w.paddleX, launch: 1 };
        continue;
      }

      // Track the lowest live ball, exactly like the balance bot's paddle.
      let best = -1;
      let bestY = -Infinity;
      for (let i = 0; i < w.ballActive.length; i++) {
        if (w.ballActive[i] !== 1) {
          continue;
        }
        if (w.ballY[i]! > bestY) {
          bestY = w.ballY[i]!;
          best = i;
        }
      }
      intent = { paddleX: best >= 0 ? w.ballX[best]! : w.paddleX, launch: 0 };
    }

    expect(stats.bricksBroken).toBeGreaterThanOrEqual(0);
    expect(stats.bricksBroken).toBeLessThanOrEqual(w.brickCount);
    expect(stats.bestCombo).toBeGreaterThanOrEqual(1);
    expect(stats.livesLost).toBeGreaterThanOrEqual(0);
    expect(stats.longestRally).toBeGreaterThanOrEqual(0);
    expect(stats.largestCascade).toBeGreaterThanOrEqual(0);
    // Pitfall 2: ticks are world.tick, never a field on RunStats.
    expect(w.tick).toBeGreaterThan(0);
  });
});
