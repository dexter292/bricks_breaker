/**
 * NK-6 — anti-stall angle floors must run through World.scratchVel (*Into).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  SimPhase,
  MIN_VERTICAL_RATIO,
  MIN_HORIZONTAL_RATIO,
} from '../src/core';
import { stepAntiStall } from '../src/core/rules/stall';

describe('anti-stall scratch floors (NK-6)', () => {
  it('tier-2 boost enforces |vx|/speed and |vy|/speed floors via scratchVel', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    clearEvents(w);
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    // Near-horizontal: tiny vertical component before floors.
    w.ballVx[0] = 500;
    w.ballVy[0] = 1;
    // One tick before tier-2 threshold (idleTier2 = 1200).
    w.stallIdleTicks = 1199;
    w.stallTier = 1;

    const scratch = w.scratchVel;
    stepAntiStall(w);

    expect(w.stallTier).toBe(2);
    expect(w.scratchVel).toBe(scratch);

    const vx = w.ballVx[0];
    const vy = w.ballVy[0];
    const speed = Math.hypot(vx, vy);
    expect(speed).toBeGreaterThan(0);
    expect(Math.abs(vx) / speed).toBeGreaterThanOrEqual(
      MIN_HORIZONTAL_RATIO - 1e-6,
    );
    expect(Math.abs(vy) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-6,
    );
  });

  it('tier-3 nudge enforces both angle floors via scratchVel', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    clearEvents(w);
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.ballVx[0] = 720;
    w.ballVy[0] = 0.5;
    // One tick before tier-3 threshold (idleTier3 = 1440).
    w.stallIdleTicks = 1439;
    w.stallTier = 2;

    const scratch = w.scratchVel;
    stepAntiStall(w);

    expect(w.stallTier).toBe(3);
    expect(w.scratchVel).toBe(scratch);

    const vx = w.ballVx[0];
    const vy = w.ballVy[0];
    const speed = Math.hypot(vx, vy);
    expect(speed).toBeGreaterThan(0);
    expect(Math.abs(vx) / speed).toBeGreaterThanOrEqual(
      MIN_HORIZONTAL_RATIO - 1e-6,
    );
    expect(Math.abs(vy) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-6,
    );
  });
});
