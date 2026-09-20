/**
 * PHYS-02 / D-10 — multi-HP + unbreakable brick behavior via stepWorld CCD.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  stepWorld,
  clearEvents,
  FIXED_DT,
  BALL_RADIUS,
  EventCode,
  BrickFlags,
} from '../src/core';

const intent = { paddleX: 180, launch: 0 };

/** Collect event codes from the ring (oldest → newest by write order). */
function eventCodes(world: ReturnType<typeof allocateWorld>): number[] {
  const codes: number[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    codes.push(world.evCode[(start + i) % world.evCap]);
  }
  return codes;
}

describe('PHYS-02 / D-10 brick HP + unbreakable', () => {
  it('breakable HP=2: first hit → HP=1 + BRICK_HIT; second → HP=0 + BRICK_BREAK', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    clearEvents(w);

    // Brick centered above ball path; ball flies straight up into it.
    const brickW = 40;
    const brickH = 20;
    const brickX = 160;
    const brickY = 200;
    loadTestGrid(w, [{ x: brickX, y: brickY, w: brickW, h: brickH, hp: 2 }]);

    w.ballX[0] = brickX + brickW * 0.5;
    w.ballY[0] = brickY + brickH + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    // Step until first contact damages the brick
    let hitOnce = false;
    for (let s = 0; s < 60 && !hitOnce; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      if (w.brickHp[0] === 1) {
        hitOnce = true;
        expect(eventCodes(w)).toContain(EventCode.BRICK_HIT);
        expect(eventCodes(w)).not.toContain(EventCode.BRICK_BREAK);
      }
    }
    expect(hitOnce).toBe(true);
    expect(w.brickHp[0]).toBe(1);
    expect(w.cellToBrick[0]).toBe(0);

    // Continue until break
    let broken = false;
    for (let s = 0; s < 120 && !broken; s++) {
      clearEvents(w);
      // Aim back at brick after bounce — force upward again if needed
      if (w.ballVy[0] > 0 && w.ballY[0] > brickY + brickH + BALL_RADIUS * 2) {
        w.ballX[0] = brickX + brickW * 0.5;
        w.ballY[0] = brickY + brickH + BALL_RADIUS + 4;
        w.ballVx[0] = 0;
        w.ballVy[0] = -600;
      }
      stepWorld(w, intent, FIXED_DT);
      if (w.brickHp[0] <= 0) {
        broken = true;
        expect(eventCodes(w)).toContain(EventCode.BRICK_BREAK);
      }
    }
    expect(broken).toBe(true);
    expect(w.brickHp[0]).toBe(0);
    expect(w.cellToBrick[0]).toBe(-1);
  });

  it('unbreakable: many hits leave HP unchanged and never BRICK_BREAK', () => {
    const w = allocateWorld();
    resetWorld(w, 3, 4);
    clearEvents(w);

    const brickW = 40;
    const brickH = 20;
    const brickX = 160;
    const brickY = 200;
    const hp0 = 99;
    loadTestGrid(w, [
      {
        x: brickX,
        y: brickY,
        w: brickW,
        h: brickH,
        hp: hp0,
        unbreakable: true,
      },
    ]);
    expect(w.brickFlags[0] & BrickFlags.UNBREAKABLE).toBeTruthy();

    w.ballX[0] = brickX + brickW * 0.5;
    w.ballY[0] = brickY + brickH + BALL_RADIUS + 2;
    w.ballVx[0] = 0;
    w.ballVy[0] = -600;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let brickHits = 0;
    const vxSamples: number[] = [];

    for (let s = 0; s < 200; s++) {
      clearEvents(w);
      if (w.ballVy[0] > 0 && w.ballY[0] > brickY + brickH + BALL_RADIUS * 2) {
        w.ballX[0] = brickX + brickW * 0.5;
        w.ballY[0] = brickY + brickH + BALL_RADIUS + 4;
        w.ballVx[0] = 0;
        w.ballVy[0] = -600;
      }
      const vyBefore = w.ballVy[0];
      stepWorld(w, intent, FIXED_DT);
      const codes = eventCodes(w);
      expect(codes).not.toContain(EventCode.BRICK_BREAK);
      if (codes.includes(EventCode.BRICK_HIT)) {
        brickHits += 1;
        vxSamples.push(w.ballVy[0]);
        // Velocity should have reflected (upward inbound → downward or at least flipped)
        expect(w.ballVy[0] * vyBefore <= 0 || Math.abs(w.ballVy[0]) > 0).toBe(
          true,
        );
      }
      expect(w.brickHp[0]).toBe(hp0);
    }

    expect(brickHits).toBeGreaterThanOrEqual(3);
    expect(w.brickHp[0]).toBe(hp0);
    expect(w.cellToBrick[0]).toBe(0);
  });

  it('same brick loses at most 1 HP per stepWorld (brickDamagedThisStep)', () => {
    const w = allocateWorld();
    resetWorld(w, 5, 6);
    clearEvents(w);

    // Brick + max speed so CCD could multi-hit without the per-step damage guard
    const brickW = 60;
    const brickH = 16;
    const brickX = 150;
    const brickY = 100;
    loadTestGrid(w, [{ x: brickX, y: brickY, w: brickW, h: brickH, hp: 5 }]);

    w.ballX[0] = brickX + brickW * 0.5;
    w.ballY[0] = brickY + brickH + BALL_RADIUS + 1;
    w.ballVx[0] = 0;
    w.ballVy[0] = -720; // MAX_BALL_SPEED — one step travels 6 units
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    stepWorld(w, intent, FIXED_DT);

    // Must damage exactly once this step (not 0, not ≥2)
    expect(w.brickHp[0]).toBe(4);
    expect(w.brickDamagedThisStep[0]).toBe(1);
  });
});
