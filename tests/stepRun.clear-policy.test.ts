/**
 * F-08 — stepRun clears the event ring on every phase branch.
 * Stale LIFE_LOST / WIN / LOSE must not survive into DOCKED / terminal frames.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  pushEvent,
  stepRun,
  EventCode,
  SimPhase,
} from '../src/core';

const idleIntent = { paddleX: 180, launch: 0 };

function codes(world: ReturnType<typeof allocateWorld>): number[] {
  const out: number[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    out.push(world.evCode[(start + i) % world.evCap]);
  }
  return out;
}

describe('stepRun clear policy (F-08)', () => {
  it('DOCKED steps leave evCount === 0 even if ring had LIFE_LOST', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.DOCKED;
    pushEvent(w, EventCode.LIFE_LOST, 2, 0, 0, 0);
    expect(w.evCount).toBe(1);

    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);
    expect(codes(w)).toEqual([]);

    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);
  });

  it('WON / LOST steps clear stale terminal events every frame', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);

    w.simPhase = SimPhase.WON;
    pushEvent(w, EventCode.WIN, 0, 0, 0, 0);
    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);

    w.simPhase = SimPhase.LOST;
    pushEvent(w, EventCode.LOSE, 0, 0, 0, 0);
    pushEvent(w, EventCode.LIFE_LOST, 0, 0, 0, 0);
    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);
  });

  it('PLAYING → LIFE_LOST → DOCKED emits LIFE_LOST once then clears', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    w.simPhase = SimPhase.PLAYING;
    w.lives = 2;
    w.activeBallCount = 0;
    w.ballActive[0] = 0;
    clearEvents(w);

    // Mimic lives rule: push once, then transition to DOCKED
    pushEvent(w, EventCode.LIFE_LOST, 1, 0, 0, 0);
    expect(codes(w)).toEqual([EventCode.LIFE_LOST]);

    w.simPhase = SimPhase.DOCKED;
    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);

    stepRun(w, idleIntent, 1 / 60);
    expect(w.evCount).toBe(0);
  });
});
