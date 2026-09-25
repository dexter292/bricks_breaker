/**
 * N-FX-03 — haptic batch coalesce (Wave 0 memory + Plan 02 expo soft-fail).
 * Strongest-wins: life lost > break; paddle/other → no fire.
 * Never AND with reduce-motion (D-10).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  coalesceHapticRank,
  hapticRankForCode,
} from '../src/services/haptics/mapping';
import { createMemoryHapticsService } from '../src/services/haptics/memoryHapticsService';
import {
  createDefaultHapticsService,
  createExpoHapticsService,
  ImpactFeedbackStyle,
} from '../src/services/haptics/expoHapticsService';
import type { MemoryHapticsService } from '../src/services/haptics/types';

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
});

describe('haptics expo service (N-FX-03 Plan 02)', () => {
  it('expo playFromBatch(8× break) → 1 impactAsync Light', () => {
    const impact = vi.fn(async () => undefined);
    const svc = createExpoHapticsService(impact);
    svc.playFromBatch(new Array(8).fill(4), 8);
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
  });

  it('expo playFromBatch(break+life) → 1 impactAsync Medium', () => {
    const impact = vi.fn(async () => undefined);
    const svc = createExpoHapticsService(impact);
    svc.playFromBatch([4, 7], 2);
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
  });

  it('expo playFromBatch(paddle only) → 0 impactAsync', () => {
    const impact = vi.fn(async () => undefined);
    const svc = createExpoHapticsService(impact);
    svc.playFromBatch([2, 2, 2], 3);
    expect(impact).toHaveBeenCalledTimes(0);
  });

  it('createDefaultHapticsService soft-falls when ExpoHaptics native missing', () => {
    const svc = createDefaultHapticsService() as MemoryHapticsService;
    expect(svc).toBeDefined();
    expect(() => svc.playFromBatch([4, 7], 2)).not.toThrow();
    // Under Vitest, native probe returns false → memory service with fires
    expect(Array.isArray(svc.fires)).toBe(true);
    expect(svc.fires.length).toBe(1);
    expect(svc.fires[0].style).toBe('medium');
  });

  it('source contract: haptics/* must not import useVfxIntensity / AccessibilityInfo / battery', () => {
    const dir = join(__dirname, '../src/services/haptics');
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts'));
    // Import/require only — comments documenting the ban are allowed.
    const forbiddenImport =
      /(?:from\s+['"]|require\s*\(\s*['"])[^'"]*(?:useVfxIntensity|AccessibilityInfo|intensityFromReduceMotion|expo-battery)/;
    const forbiddenNamed =
      /import\s*\{[^}]*(?:useVfxIntensity|AccessibilityInfo|intensityFromReduceMotion)[^}]*\}/;
    for (const file of files) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src, file).not.toMatch(forbiddenImport);
      expect(src, file).not.toMatch(forbiddenNamed);
    }
  });

  it.todo('PlayingHost playBatch fans out audio + haptics (≤1 scheduleOnRN hop)');
});
