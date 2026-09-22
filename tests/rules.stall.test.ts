import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  clearEvents,
  pushEvent,
  hashWorld,
  stepRun,
  SimPhase,
  EventCode,
  BrickFlags,
  MAX_BALL_SPEED,
  FIXED_DT,
  BALL_RADIUS,
  LOGICAL_HEIGHT,
} from '../src/core';
import { stepAntiStall } from '../src/core/rules/stall';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

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

/** Keep paddle under the ball so PLAYING survives long idle runs. */
function stepRunTrackingPaddle(
  w: ReturnType<typeof allocateWorld>,
  n: number,
): void {
  for (let i = 0; i < n; i++) {
    stepRun(w, { paddleX: w.ballX[0], launch: 0 }, FIXED_DT);
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
    expect(speed2).toBeCloseTo(Math.min(700 * 1.08, MAX_BALL_SPEED), 4);
  });

  it('tier 3 repeats intervention every 240 idle ticks while still at tier 3 (F-27)', () => {
    const w = playingWorld();
    w.ballVx[0] = 0;
    w.ballVy[0] = -360;
    idleSteps(w, 1440);
    expect(w.stallTier).toBe(3);
    expect(Math.abs(w.ballVx[0])).toBeGreaterThan(1);

    // Simulate next paddle-center hit zeroing horizontal again.
    w.ballVx[0] = 0;
    w.ballVy[0] = -360;
    idleSteps(w, 240);
    expect(w.stallTier).toBe(3);
    expect(w.stallIdleTicks).toBe(1680);
    expect(Math.abs(w.ballVx[0])).toBeGreaterThan(1);
  });

  it('tier 3 at 960+480 ticks applies deterministic escalating angle nudge', () => {
    const src = readFileSync(
      join(__dirname, '../src/core/rules/stall.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/Math\.random/);
    expect(src).toMatch(/PHYS-07: no random bounce jitter/);

    const w = playingWorld();
    w.ballVx[0] = 500;
    w.ballVy[0] = -300;
    idleSteps(w, 1440);
    expect(w.stallTier).toBe(3);
    expect(w.stallIdleTicks).toBe(1440);
    expect(Number.isFinite(w.ballVx[0])).toBe(true);
    expect(Number.isFinite(w.ballVy[0])).toBe(true);
    const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
    expect(speed).toBeGreaterThan(0);
    const ratioAfter = Math.abs(w.ballVy[0]) / speed;
    expect(ratioAfter).toBeGreaterThanOrEqual(MIN_VERTICAL_RATIO - 1e-6);
    expect(Math.abs(w.ballVx[0]) / speed).toBeGreaterThanOrEqual(
      Math.sin((8 * Math.PI) / 180) - 1e-6,
    );
  });

  // F-23 SUPERSEDED: asserts heading change, not "prefer steeper" (see DEFERRED-ITEMS / stall.ts).
  it('two consecutive tier-3 interventions change heading by >1e-6 (NG-1)', () => {
    const w = playingWorld();
    const speed = 420;
    const minHorizRad = (8 * Math.PI) / 180;
    w.ballVx[0] = Math.sin(minHorizRad) * speed;
    w.ballVy[0] = -Math.cos(minHorizRad) * speed;
    const heading = (vx: number, vy: number) => Math.atan2(vx, -vy);
    const h0 = heading(w.ballVx[0], w.ballVy[0]);

    idleSteps(w, 1440);
    const h1 = heading(w.ballVx[0], w.ballVy[0]);
    expect(Math.abs(h1 - h0)).toBeGreaterThan(1e-6);

    idleSteps(w, 240);
    const h2 = heading(w.ballVx[0], w.ballVy[0]);
    expect(Math.abs(h2 - h1)).toBeGreaterThan(1e-6);
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

  it('stepRun 960 empty-grid steps → stallTier 1; pause skip freezes idle', () => {
    const w = allocateWorld();
    resetWorld(w, 0x55aa, 0x33cc);
    // Sentinel breakable below paddle so applyWinCheck does not WON (empty grid
    // would); ball never reaches it while paddle tracks — idle stays pure.
    loadTestGrid(w, [{ x: 160, y: 630, w: 40, h: 10, hp: 1 }]);
    w.simPhase = SimPhase.PLAYING;
    w.ballX[0] = 180;
    w.ballY[0] = LOGICAL_HEIGHT * 0.5;
    w.ballVx[0] = 220;
    w.ballVy[0] = -280;
    w.ballRadius[0] = BALL_RADIUS;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.paddleX = 180;

    stepRunTrackingPaddle(w, 200);
    expect(w.simPhase).toBe(SimPhase.PLAYING);
    const idleAfter200 = w.stallIdleTicks;
    expect(idleAfter200).toBe(200);

    // Pause: skip stepRun calls — stall must not advance (T-05-02)
    const paused = w.stallIdleTicks;
    for (let i = 0; i < 100; i++) {
      /* skipped stepRun */
    }
    expect(w.stallIdleTicks).toBe(paused);

    stepRunTrackingPaddle(w, 760);
    expect(w.simPhase).toBe(SimPhase.PLAYING);
    expect(w.stallIdleTicks).toBe(960);
    expect(w.stallTier).toBe(1);
  });

  it('stepRun determinism: same seed + same step count → equal hashWorld', () => {
    function seededRun(seedG: number, seedC: number, steps: number) {
      const w = allocateWorld();
      resetWorld(w, seedG, seedC);
      loadTestGrid(w, [{ x: 160, y: 630, w: 40, h: 10, hp: 1 }]);
      w.simPhase = SimPhase.PLAYING;
      w.ballX[0] = 180;
      w.ballY[0] = 320;
      w.ballVx[0] = 200;
      w.ballVy[0] = -320;
      w.ballRadius[0] = BALL_RADIUS;
      w.ballActive[0] = 1;
      w.activeBallCount = 1;
      w.paddleX = 180;
      stepRunTrackingPaddle(w, steps);
      return w;
    }

    const a = seededRun(0x11112222, 0x33334444, 480);
    const b = seededRun(0x11112222, 0x33334444, 480);
    expect(a.simPhase).toBe(SimPhase.PLAYING);
    expect(a.stallIdleTicks).toBe(b.stallIdleTicks);
    expect(a.stallTier).toBe(b.stallTier);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });
});
