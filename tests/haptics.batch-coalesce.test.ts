/**
 * N-FX-03 — haptic batch coalesce (Wave 0 memory service).
 * Strongest-wins: life lost > break; paddle/other → no fire.
 */
import { describe, expect, it } from 'vitest';
import {
  coalesceHapticRank,
  hapticRankForCode,
} from '../src/services/haptics/mapping';
import { createMemoryHapticsService } from '../src/services/haptics/memoryHapticsService';

describe('haptics batch coalesce (N-FX-03 Wave 0)', () => {
  it('hapticRankForCode: break→1, life→2, else→0', () => {
    expect(hapticRankForCode(4)).toBe(1);
    expect(hapticRankForCode(7)).toBe(2);
    expect(hapticRankForCode(2)).toBe(0);
    expect(hapticRankForCode(3)).toBe(0);
    expect(hapticRankForCode(1)).toBe(0);
  });

  it('coalesce: 8× break → 1; break+life → 2; paddle-only → 0', () => {
    expect(coalesceHapticRank(new Array(8).fill(4), 8)).toBe(1);
    expect(coalesceHapticRank([4, 7], 2)).toBe(2);
    expect(coalesceHapticRank([2, 3], 2)).toBe(0);
  });

  it('memory playFromBatch(8× break) → 1 light fire', () => {
    const svc = createMemoryHapticsService();
    svc.playFromBatch(new Array(8).fill(4), 8);
    expect(svc.fires.length).toBe(1);
    expect(svc.fires[0].style).toBe('light');
  });

  it('memory playFromBatch(break+life) → 1 medium fire', () => {
    const svc = createMemoryHapticsService();
    svc.playFromBatch([4, 7], 2);
    expect(svc.fires.length).toBe(1);
    expect(svc.fires[0].style).toBe('medium');
  });

  it('memory playFromBatch(paddle only) → no fire', () => {
    const svc = createMemoryHapticsService();
    svc.playFromBatch([2, 2, 2], 3);
    expect(svc.fires.length).toBe(0);
  });

  it('release clears fires', () => {
    const svc = createMemoryHapticsService();
    svc.playFromBatch([4], 1);
    expect(svc.fires.length).toBe(1);
    svc.release();
    expect(svc.fires.length).toBe(0);
  });

  it.todo('createDefaultHapticsService soft-falls when ExpoHaptics native missing');
  it.todo('PlayingHost playBatch fans out audio + haptics (≤1 scheduleOnRN hop)');
  it.todo('source contract: haptics/* must not import useVfxIntensity');
});
