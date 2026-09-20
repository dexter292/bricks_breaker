/**
 * PHYS-07 — deterministic anti-stall (Plan 05).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  clearEvents,
  pushEvent,
  hashWorld,
  SimPhase,
  EventCode,
  BrickFlags,
  MAX_BALL_SPEED,
} from '../src/core';
import { stepAntiStall } from '../src/core/rules/stall';

/** cos(62°) — matches MIN_VERTICAL_RATIO in constants.ts */
const MIN_VERTICAL_RATIO = Math.cos((62 * Math.PI) / 180);

function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  // One live ball so tier 2/3 mutations have a target
  w.ballActive[0] = 1;
  w.activeBallCount = 1;
  w.ballVx[0] = 300;
  w.ballVy[0] = -400;
  return w;
}

function idleSteps(w: ReturnType<typeof allocateWorld>, n: number): void {
  for (let i = 0; i < n; i++) {
    clearEvents(w);
    stepAntiStall(w);
  }
}

describe('stall rules (PHYS-07)', () => {
  it('idle 960 ticks without breakable damage → stallTier 1', () => {
    const w = playingWorld();
    idleSteps(w, 959);
    expect(w.stallIdleTicks).toBe(959);
    expect(w.stallTier).toBe(0);

    clearEvents(w);
    stepAntiStall(w);
    expect(w.stallIdleTicks).toBe(960);
    expect(w.stallTier).toBe(1);
  });

  it('tier 2 at 960+240 ticks applies 1.08× speed clamp to MAX_BALL_SPEED', () => {
    const w = playingWorld();
    w.ballVx[0] = 300;
    w.ballVy[0] = -400;
    const speed0 = Math.hypot(300, -400);

    idleSteps(w, 1200);
    expect(w.stallTier).toBe(2);
    expect(w.stallIdleTicks).toBe(1200);

    const speed1 = Math.hypot(w.ballVx[0], w.ballVy[0]);
    expect(speed1).toBeCloseTo(speed0 * 1.08, 6);
    expect(speed1).toBeLessThanOrEqual(MAX_BALL_SPEED + 1e-9);
    expect(Number.isFinite(w.ballVx[0])).toBe(true);
    expect(Number.isFinite(w.ballVy[0])).toBe(true);

    // Near-max speed clamps to MAX_BALL_SPEED on tier-2 entry
    const w2 = playingWorld();
    w2.ballVx[0] = 0;
    w2.ballVy[0] = -700;
    idleSteps(w2, 1200);
    const speed2 = Math.hypot(w2.ballVx[0], w2.ballVy[0]);
    expect(speed2).toBeLessThanOrEqual(MAX_BALL_SPEED + 1e-9);
    expect(speed2).toBeCloseTo(Math.min(700 * 1.08, MAX_BALL_SPEED), 6);
  });

  it('tier 3 at 960+480 ticks applies deterministic angle nudge; no Math.random', () => {
    const src = readFileSync(
      join(__dirname, '../src/core/rules/stall.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/Math\.random/);
    expect(src).toMatch(/PHYS-07: no random bounce jitter/);

    const w = playingWorld();
    // Near-horizontal-ish but legal trajectory so nudge + clamp is visible
    w.ballVx[0] = 500;
    w.ballVy[0] = -300;
    idleSteps(w, 1440);
    expect(w.stallTier).toBe(3);
    expect(w.stallIdleTicks).toBe(1440);
    expect(Number.isFinite(w.ballVx[0])).toBe(true);
    expect(Number.isFinite(w.ballVy[0])).toBe(true);
    const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
    expect(speed).toBeGreaterThan(0);
    expect(Math.abs(w.ballVy[0]) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-6,
    );
  });

  it('breakable BRICK_HIT/BREAK resets stallIdleTicks and stallTier to 0', () => {
    const w = playingWorld();
    loadTestGrid(w, [
      { x: 40, y: 80, w: 36, h: 16, hp: 2 },
      { x: 100, y: 80, w: 36, h: 16, hp: 99, unbreakable: true },
    ]);
    idleSteps(w, 960);
    expect(w.stallTier).toBe(1);
    expect(w.stallIdleTicks).toBe(960);

    clearEvents(w);
    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 40, 80);
    stepAntiStall(w);
    expect(w.stallIdleTicks).toBe(0);
    expect(w.stallTier).toBe(0);

    idleSteps(w, 100);
    expect(w.stallIdleTicks).toBe(100);
    clearEvents(w);
    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 40, 80);
    stepAntiStall(w);
    expect(w.stallIdleTicks).toBe(0);
    expect(w.stallTier).toBe(0);

    // Unbreakable BRICK_HIT does not reset
    idleSteps(w, 50);
    clearEvents(w);
    pushEvent(w, EventCode.BRICK_HIT, 0, 1, 100, 80);
    expect((w.brickFlags[1] & BrickFlags.UNBREAKABLE) !== 0).toBe(true);
    stepAntiStall(w);
    expect(w.stallIdleTicks).toBe(51);
    expect(w.stallTier).toBe(0);

    // Wall / paddle only — no reset
    clearEvents(w);
    pushEvent(w, EventCode.WALL_HIT, 0, -1, 0, 100);
    pushEvent(w, EventCode.PADDLE_HIT, 0, -1, 180, 600);
    stepAntiStall(w);
    expect(w.stallIdleTicks).toBe(52);
  });

  it('skipping stepAntiStall (pause/freeze) does not advance stallIdleTicks', () => {
    const w = playingWorld();
    idleSteps(w, 100);
    expect(w.stallIdleTicks).toBe(100);
    const frozen = w.stallIdleTicks;
    // Simulate pause: do not call stepAntiStall / stepRun
    for (let i = 0; i < 100; i++) {
      /* skipped */
    }
    expect(w.stallIdleTicks).toBe(frozen);
    idleSteps(w, 10);
    expect(w.stallIdleTicks).toBe(110);
  });

  it('same seed + intents → identical hashWorld including stall fields', () => {
    const a = playingWorld();
    const b = playingWorld();
    // Same reset seeds already applied; drive identical idle + one breakable hit
    loadTestGrid(a, [{ x: 40, y: 80, w: 36, h: 16, hp: 1 }]);
    loadTestGrid(b, [{ x: 40, y: 80, w: 36, h: 16, hp: 1 }]);

    idleSteps(a, 50);
    idleSteps(b, 50);
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.stallIdleTicks).toBe(b.stallIdleTicks);

    clearEvents(a);
    clearEvents(b);
    pushEvent(a, EventCode.BRICK_HIT, 0, 0, 40, 80);
    pushEvent(b, EventCode.BRICK_HIT, 0, 0, 40, 80);
    stepAntiStall(a);
    stepAntiStall(b);
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.stallIdleTicks).toBe(0);
    expect(b.stallIdleTicks).toBe(0);

    idleSteps(a, 960);
    idleSteps(b, 960);
    expect(a.stallTier).toBe(1);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });
});
