/**
 * RUN-01 — score / combo from event ring (Plan 02).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  clearEvents,
  pushEvent,
  SimPhase,
  EventCode,
  BrickFlags,
} from '../src/core';
import { applyScoringFromEvents } from '../src/core/rules/scoring';

function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

describe('scoring rules (RUN-01)', () => {
  it('BRICK_HIT awards SCORE_HIT * combo then increments combo', () => {
    const w = playingWorld();
    expect(w.combo).toBe(1);
    expect(w.score).toBe(0);

    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(10);
    expect(w.combo).toBe(2);

    clearEvents(w);
    pushEvent(w, EventCode.BRICK_HIT, 0, 1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(30); // 10 + 10*2
    expect(w.combo).toBe(3);
  });

  it('BRICK_BREAK awards (SCORE_HIT + SCORE_BREAK_BONUS) * combo then increments combo', () => {
    const w = playingWorld();
    w.combo = 2;

    pushEvent(w, EventCode.BRICK_BREAK, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(120); // (10+50)*2
    expect(w.combo).toBe(3);
  });

  it('PADDLE_HIT resets combo to 1', () => {
    const w = playingWorld();
    w.combo = 5;
    w.score = 100;

    pushEvent(w, EventCode.PADDLE_HIT, 0, -1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.combo).toBe(1);
    expect(w.score).toBe(100);
  });

  it('unbreakable BRICK_HIT awards no score and does not change combo', () => {
    const w = playingWorld();
    w.brickCount = 1;
    w.brickFlags[0] = BrickFlags.UNBREAKABLE;
    w.combo = 3;
    w.score = 50;

    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(50);
    expect(w.combo).toBe(3);
  });

  it('simultaneous multi-ball brick damage is deterministic (ring order)', () => {
    const w = playingWorld();
    // Two BRICK_HIT in one drain: first awards 10 (combo 1→2), second 20 (combo 2→3)
    pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
    pushEvent(w, EventCode.BRICK_HIT, 1, 1, 0, 0);
    applyScoringFromEvents(w);

    expect(w.score).toBe(30);
    expect(w.combo).toBe(3);
  });
});
