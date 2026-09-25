/**
 * E2 balance guards (N-CNT-01 / N-CNT-03).
 *
 * Two things are pinned here:
 *   1. the campaign order is a real difficulty curve, not file-name order;
 *   2. the F-45 speed ramp is a floor — it never fights anti-stall, never exceeds
 *      MAX_BALL_SPEED, and never changes direction.
 *
 * Measurements behind the chosen numbers live in `docs/ops/BALANCE-E2.md`.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  hashWorld,
  SCORE_HIT,
  SERVE_SPEED,
  MAX_BALL_SPEED,
  SPEED_RAMP_PER_SECOND,
} from '../src/core';
import { applySpeedRamp } from '../src/core/rules/speedRamp';
import { PLAYABLE_LEVEL_ORDER } from '../src/services/storage/catalog';
import {
  runBot,
  levelStatics,
  readLevelFile,
  TICKS_PER_SECOND,
} from './helpers/balanceBot';

describe('E2 difficulty curve (N-CNT-01)', () => {
  it('authored weight is monotone non-decreasing along the campaign order', () => {
    const curve = PLAYABLE_LEVEL_ORDER.map((id) => ({
      id,
      ...levelStatics(id, SCORE_HIT),
    }));

    for (let i = 1; i < curve.length; i++) {
      const prev = curve[i - 1]!;
      const cur = curve[i]!;
      expect(
        cur.bricks,
        `${cur.id} must not have fewer bricks than ${prev.id}`,
      ).toBeGreaterThanOrEqual(prev.bricks);
      expect(
        cur.totalHp,
        `${cur.id} must not have less HP than ${prev.id}`,
      ).toBeGreaterThanOrEqual(prev.totalHp);
    }

    // The showpiece is the finale, not slot 2.
    expect(PLAYABLE_LEVEL_ORDER[PLAYABLE_LEVEL_ORDER.length - 1]).toBe('level-03');
  });

  it('every campaign level fits inside the 360x640 playfield', () => {
    // level-04 and level-05 shipped 4 units wide: the right brick column was clipped
    // off-screen and no test covered it, because bounds were only asserted for level-03.
    const LOGICAL_W = 360;
    const LOGICAL_H = 640;
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const { grid } = readLevelFile(id);
      const right = grid.originX + (grid.cols - 1) * (grid.brickW + grid.gapX) + grid.brickW;
      const bottom = grid.originY + (grid.rows - 1) * (grid.brickH + grid.gapY) + grid.brickH;
      expect(grid.originX, `${id} left edge`).toBeGreaterThanOrEqual(0);
      expect(grid.originY, `${id} top edge`).toBeGreaterThanOrEqual(0);
      expect(right, `${id} right edge`).toBeLessThanOrEqual(LOGICAL_W);
      expect(bottom, `${id} bottom edge`).toBeLessThanOrEqual(LOGICAL_H);
    }
  });

  it('every campaign level is still winnable by a perfect bot', () => {
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const r = runBot(id, { paddleOffset: 12, maxTicks: TICKS_PER_SECOND * 420 });
      expect(r.outcome, `${id} bot outcome (${r.seconds}s)`).toBe('WON');
      expect(r.bricksRemaining, `${id} cleared`).toBe(0);
    }
  }, 300000);
});

describe('E2 speed ramp (N-CNT-03 / F-45)', () => {
  function worldWithBall(tick: number, speed: number) {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.tick = tick;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    // 3-4-5 direction so the scaling is easy to reason about.
    w.ballVx[0] = speed * 0.6;
    w.ballVy[0] = speed * 0.8;
    return w;
  }

  it('is enabled and reaches the cap exactly at MAX_BALL_SPEED', () => {
    expect(SPEED_RAMP_PER_SECOND).toBeGreaterThan(0);
    const capSeconds = (MAX_BALL_SPEED / SERVE_SPEED - 1) / SPEED_RAMP_PER_SECOND;
    const w = worldWithBall(Math.ceil(capSeconds * TICKS_PER_SECOND) * 2, SERVE_SPEED);
    applySpeedRamp(w);
    expect(Math.hypot(w.ballVx[0]!, w.ballVy[0]!)).toBeCloseTo(MAX_BALL_SPEED, 6);
  });

  it('raises a slow ball toward the floor and preserves direction', () => {
    const seconds = 50;
    const w = worldWithBall(seconds * TICKS_PER_SECOND, SERVE_SPEED);
    const dirBefore = Math.atan2(w.ballVy[0]!, w.ballVx[0]!);
    applySpeedRamp(w);

    const expected = SERVE_SPEED * (1 + SPEED_RAMP_PER_SECOND * seconds);
    expect(Math.hypot(w.ballVx[0]!, w.ballVy[0]!)).toBeCloseTo(expected, 6);
    expect(Math.atan2(w.ballVy[0]!, w.ballVx[0]!)).toBeCloseTo(dirBefore, 12);
  });

  it('is a floor, not an assignment — a faster ball is left alone', () => {
    // Anti-stall tier 2 boosts stored velocity; the ramp must not undo it.
    const w = worldWithBall(10 * TICKS_PER_SECOND, MAX_BALL_SPEED);
    const vx = w.ballVx[0]!;
    const vy = w.ballVy[0]!;
    applySpeedRamp(w);
    expect(w.ballVx[0]).toBe(vx);
    expect(w.ballVy[0]).toBe(vy);
  });

  it('does nothing at tick 0 (serve speed is the floor)', () => {
    const w = worldWithBall(0, SERVE_SPEED);
    const vx = w.ballVx[0]!;
    applySpeedRamp(w);
    expect(w.ballVx[0]).toBe(vx);
    expect(Math.hypot(w.ballVx[0]!, w.ballVy[0]!)).toBeCloseTo(SERVE_SPEED, 6);
  });

  it('leaves inactive balls untouched and stays hash-deterministic', () => {
    const build = () => {
      const w = worldWithBall(30 * TICKS_PER_SECOND, SERVE_SPEED * 0.5);
      w.ballActive[1] = 0;
      w.ballVx[1] = 5;
      w.ballVy[1] = 5;
      applySpeedRamp(w);
      return w;
    };
    const a = build();
    const b = build();
    expect(a.ballVx[1]).toBe(5);
    expect(a.ballVy[1]).toBe(5);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });
});
