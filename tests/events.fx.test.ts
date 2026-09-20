/**
 * FX-03 — EventCode taxonomy + push sites for catch / life / win / lose.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  EventCode,
  SimPhase,
  applyLivesFromBallCount,
  applyWinCheck,
  stepPickups,
  PICKUP_TYPE_EXPAND,
} from '../src/core';

/** Collect event codes from the ring (oldest → newest). */
function eventCodes(world: ReturnType<typeof allocateWorld>): number[] {
  const codes: number[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    codes.push(world.evCode[(start + i) % world.evCap]);
  }
  return codes;
}

function playingWorld(seedGameplay = 1) {
  const w = allocateWorld();
  resetWorld(w, seedGameplay, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

describe('events fx (FX-03)', () => {
  it('EventCode includes POWERUP_CATCH LIFE_LOST WIN LOSE with stable values', () => {
    expect(EventCode.WALL_HIT).toBe(1);
    expect(EventCode.PADDLE_HIT).toBe(2);
    expect(EventCode.BRICK_HIT).toBe(3);
    expect(EventCode.BRICK_BREAK).toBe(4);
    expect(EventCode.BALL_OUT).toBe(5);
    expect(EventCode.POWERUP_CATCH).toBe(6);
    expect(EventCode.LIFE_LOST).toBe(7);
    expect(EventCode.WIN).toBe(8);
    expect(EventCode.LOSE).toBe(9);
  });

  it('pickup catch pushes POWERUP_CATCH at pickup position', () => {
    const w = playingWorld(1);
    w.paddleX = 180;
    w.paddleY = 616;
    w.paddleW = 72;
    w.paddleH = 12;
    w.activeBallCount = 1;

    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupType[0] = PICKUP_TYPE_EXPAND;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;

    stepPickups(w, 0);

    expect(eventCodes(w)).toContain(EventCode.POWERUP_CATCH);
    const start = (w.evHead - w.evCount + w.evCap) % w.evCap;
    let found = false;
    for (let i = 0; i < w.evCount; i++) {
      const idx = (start + i) % w.evCap;
      if (w.evCode[idx] === EventCode.POWERUP_CATCH) {
        expect(w.evX[idx]).toBeCloseTo(180, 4);
        expect(w.evY[idx]).toBeCloseTo(622, 4);
        expect(w.evA[idx]).toBe(PICKUP_TYPE_EXPAND);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('life decrement pushes LIFE_LOST; mid-life dock does not push LOSE', () => {
    const w = playingWorld();
    w.lives = 3;
    w.activeBallCount = 0;
    for (let i = 0; i < w.maxBalls; i++) {
      w.ballActive[i] = 0;
    }

    applyLivesFromBallCount(w);

    const codes = eventCodes(w);
    expect(codes).toContain(EventCode.LIFE_LOST);
    expect(codes).not.toContain(EventCode.LOSE);
    expect(w.lives).toBe(2);
    expect(w.simPhase).toBe(SimPhase.DOCKED);
  });

  it('applyWinCheck pushes WIN; final life pushes LOSE', () => {
    // WIN
    const wWin = playingWorld();
    wWin.brickCount = 0;
    applyWinCheck(wWin);
    expect(wWin.simPhase).toBe(SimPhase.WON);
    expect(eventCodes(wWin)).toContain(EventCode.WIN);

    // LOSE (final life)
    const wLose = playingWorld();
    wLose.lives = 1;
    wLose.activeBallCount = 0;
    for (let i = 0; i < wLose.maxBalls; i++) {
      wLose.ballActive[i] = 0;
    }
    applyLivesFromBallCount(wLose);
    expect(wLose.simPhase).toBe(SimPhase.LOST);
    expect(wLose.lives).toBe(0);
    const loseCodes = eventCodes(wLose);
    expect(loseCodes).toContain(EventCode.LIFE_LOST);
    expect(loseCodes).toContain(EventCode.LOSE);
  });
});
