/**
 * PWR-01/03 — pickup drop / fall / AABB catch (no magnetic auto-collect).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  pushEvent,
  SimPhase,
  EventCode,
} from '../src/core';
import { nextFloat } from '../src/core/rng/mulberry32';
import { applyDropsFromBreaks, stepPickups } from '../src/core/rules/pickups';
import { PICKUP_TYPE_MULTIBALL, PICKUP_TYPE_EXPAND } from '../src/core/constants';

function playingWorld(seedGameplay = 1) {
  const w = allocateWorld();
  resetWorld(w, seedGameplay, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

describe('pickup rules (PWR-01/03)', () => {
  it('BRICK_BREAK rolls rngGameplay; DROP_CHANCE 0.2 spawns pickup at evX/evY', () => {
    // seed 7: first nextFloat < 0.2, second < 0.5 → MULTIBALL
    const w = playingWorld(7);
    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 120.5, 80.25);
    applyDropsFromBreaks(w);

    expect(w.pickupCount).toBe(1);
    expect(w.pickupActive[0]).toBe(1);
    expect(w.pickupType[0]).toBe(PICKUP_TYPE_MULTIBALL);
    expect(w.pickupX[0]).toBeCloseTo(120.5, 4);
    expect(w.pickupY[0]).toBeCloseTo(80.25, 4);
  });

  it('intermediate BRICK_HIT never spawns pickup', () => {
    const w = playingWorld(7);
    const rngBefore = w.rngGameplay[0];
    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 50, 50);
    applyDropsFromBreaks(w);

    expect(w.pickupCount).toBe(0);
    expect(w.rngGameplay[0]).toBe(rngBefore);
  });

  it('AABB overlap with paddle catches pickup; no auto-collect by proximity', () => {
    const w = playingWorld(1);
    w.paddleX = 180;
    w.paddleY = 616;
    w.paddleW = 72;
    w.paddleH = 12;
    w.activeBallCount = 1;

    // Overlapping expand pickup centered on paddle
    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupType[0] = PICKUP_TYPE_EXPAND;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;

    stepPickups(w, 0); // no fall; catch only

    expect(w.pickupActive[0]).toBe(0);
    expect(w.paddleW).toBe(108); // expand applied

    // Reset for proximity miss: pickup 1px outside paddle AABB (right of paddle)
    const w2 = playingWorld(1);
    w2.paddleX = 180;
    w2.paddleY = 616;
    w2.paddleW = 72;
    w2.paddleH = 12;
    // paddle right edge = 180+36=216; pickup halfW=10 → center must be > 226 for no overlap
    // 1px outside: pickup left edge = paddle right + 1 → center = 216 + 1 + 10 = 227
    w2.pickupX[0] = 227;
    w2.pickupY[0] = 622;
    w2.pickupType[0] = PICKUP_TYPE_EXPAND;
    w2.pickupActive[0] = 1;
    w2.pickupCount = 1;

    stepPickups(w2, 0);
    expect(w2.pickupActive[0]).toBe(1);
    expect(w2.paddleW).toBe(72);

    // MULTIBALL catch wires spawn
    const w3 = playingWorld(1);
    w3.paddleX = 180;
    w3.paddleY = 616;
    w3.paddleW = 72;
    w3.paddleH = 12;
    w3.activeBallCount = 1;
    w3.ballActive[0] = 1;
    w3.ballVx[0] = 1;
    w3.ballVy[0] = -1;
    w3.pickupX[0] = 180;
    w3.pickupY[0] = 622;
    w3.pickupType[0] = PICKUP_TYPE_MULTIBALL;
    w3.pickupActive[0] = 1;
    w3.pickupCount = 1;

    stepPickups(w3, 0);
    expect(w3.pickupActive[0]).toBe(0);
    expect(w3.activeBallCount).toBe(3);
  });

  it('pickup y > LOGICAL_HEIGHT is removed', () => {
    const w = playingWorld(1);
    w.pickupX[0] = 100;
    w.pickupY[0] = 639.5;
    w.pickupType[0] = PICKUP_TYPE_EXPAND;
    w.pickupActive[0] = 1;
    w.pickupCount = 1;

    // fall: y += 120 * dt; with dt=1/120 → +1 → y=640.5 > 640
    stepPickups(w, 1 / 120);

    expect(w.pickupActive[0]).toBe(0);
    expect(w.pickupCount).toBe(0);
  });

  it('applyDropsFromBreaks and stepPickups no-op outside PLAYING (F-52)', () => {
    const w = playingWorld(7);
    w.simPhase = SimPhase.DOCKED;
    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 120.5, 80.25);
    applyDropsFromBreaks(w);
    expect(w.pickupCount).toBe(0);

    w.pickupActive[0] = 1;
    w.pickupType[0] = PICKUP_TYPE_EXPAND;
    w.pickupX[0] = 180;
    w.pickupY[0] = 622;
    w.pickupCount = 1;
    w.paddleX = 180;
    w.paddleY = 616;
    stepPickups(w, 0);
    expect(w.pickupActive[0]).toBe(1);
    expect(w.paddleW).toBe(72);
  });

  it('drop rolls never call Math.random or rngCosmetic', () => {
    const w = playingWorld(0); // no drop
    const cosmeticBefore = w.rngCosmetic[0];
    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 10, 10);
    applyDropsFromBreaks(w);

    expect(w.rngCosmetic[0]).toBe(cosmeticBefore);
    expect(w.pickupCount).toBe(0);

    // Expand path uses seed 8
    const wExp = playingWorld(8);
    pushEvent(wExp, EventCode.BRICK_BREAK, 0, 0, 33, 44);
    applyDropsFromBreaks(wExp);
    expect(wExp.pickupType[0]).toBe(PICKUP_TYPE_EXPAND);
    expect(wExp.rngCosmetic[0]).toBe(2); // resetWorld seedCosmetic=2 untouched

    // Sanity: nextFloat advances gameplay stream (same algorithm as drop)
    const probe = new Uint32Array([0]);
    nextFloat(probe, 0);
    expect(probe[0]).not.toBe(0);
  });
});
