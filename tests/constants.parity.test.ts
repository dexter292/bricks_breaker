/**
 * F-37 / F-63 — inline worklet literals must stay in sync with exported constants.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  SERVE_SPEED,
  MAX_BALL_SPEED,
  MAX_CCD_ITERATIONS,
  SEPARATION_EPS,
  FIXED_DT,
  MAX_SUBSTEPS,
  PADDLE_ANGLE_CLAMP_DEG,
  MIN_VERTICAL_RATIO,
  MIN_HORIZONTAL_RATIO,
  STALL_TIER3_REPEAT_TICKS,
  BALL_RADIUS,
  EVENT_RING_CAPACITY,
} from '../src/core';
import { BRICK_HP1, BRICK_HP2, BRICK_HP3, BRICK_UNBREAKABLE } from '../src/render/colors';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('constants parity (F-37 / F-63)', () => {
  it('step.ts CCD / separation literals match exports', () => {
    const src = read('src/core/step.ts');
    expect(src).toContain(`const maxCcd = ${MAX_CCD_ITERATIONS}`);
    expect(src).toMatch(/const sepEps = 1e-4/);
    expect(SEPARATION_EPS).toBe(1e-4);
    expect(src).toContain(`const logicalWidth = ${LOGICAL_WIDTH}`);
    expect(src).toContain(`const logicalHeight = ${LOGICAL_HEIGHT}`);
  });

  it('runStats.ts ring-capacity literals match EVENT_RING_CAPACITY — BOTH of them', () => {
    // WHY THIS ROW WAS MISSING, AND WHY IT MATTERS.
    // `EVENT_RING_CAPACITY` is exported from `src/core/constants.ts` and read by NOTHING in
    // production: `src/runtime/runStats.ts` hard-codes 128 twice instead, each time with a
    // comment naming the constant. Measured 2026-09-29 — the only production occurrences of
    // the identifier are its declaration and the `src/core` barrel re-export. So the link
    // the two comments assert exists only in prose, and editing the constant would silently
    // leave them behind and turn both comments into lies.
    //
    // The hard-coding itself is CORRECT and is not what this fixes: `reduceRunTelemetry` is
    // a worklet and the file's own header records the rule that worklets cannot close over
    // primitive tuned literals. This file is the instrument that makes such a literal
    // honest, and it already pins five sibling constants the same way — this one was simply
    // never added. The phase-13 code review found the same shape in
    // `ACHIEVEMENT_LINES_MAX`, which was documented by three artifacts as the single place
    // its number lived and was read by nothing.
    const src = read('src/runtime/runStats.ts');

    expect(
      src,
      'the cascade scratch arrays are sized by the ring capacity — a ring that outgrew them would overflow the scratch before it overflowed itself',
    ).toContain(`const CASCADE_SCRATCH_LEN = ${EVENT_RING_CAPACITY};`);
    expect(
      src,
      'and the defensive read bound in the reducer uses the same number. Both sites, not one: an edit that fixed only the first would leave a reducer reading past its own scratch',
    ).toContain(`const ringCap = ${EVENT_RING_CAPACITY};`);
    expect(
      EVENT_RING_CAPACITY,
      'pinned to its measured value as well, so raising the constant is a deliberate act that reds this row rather than a silent widening',
    ).toBe(128);
  });

  it('stepRun serveSpeed matches SERVE_SPEED', () => {
    const src = read('src/core/stepRun.ts');
    expect(src).toContain(`const serveSpeed = ${SERVE_SPEED}`);
    expect(SERVE_SPEED).toBe(360);
    expect(SERVE_SPEED).toBe(MAX_BALL_SPEED * 0.5);
  });

  it('useGameLoop / substepCap use FIXED_DT and MAX_SUBSTEPS', () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120, 6);
    expect(MAX_SUBSTEPS).toBe(5);
  });

  it('MIN_VERTICAL_RATIO === cos(PADDLE_ANGLE_CLAMP)', () => {
    const rad = (PADDLE_ANGLE_CLAMP_DEG * Math.PI) / 180;
    expect(MIN_VERTICAL_RATIO).toBeCloseTo(Math.cos(rad), 10);
  });

  it('MIN_HORIZONTAL_RATIO and STALL_TIER3_REPEAT_TICKS match worklet literals', () => {
    const stallSrc = read('src/core/rules/stall.ts');
    expect(stallSrc).toContain('const tier3Repeat = 240; // STALL_TIER3_REPEAT_TICKS');
    expect(STALL_TIER3_REPEAT_TICKS).toBe(240);
    const resolveSrc = read('src/core/physics/resolve.ts');
    expect(resolveSrc).toContain('STALL_ANGLE_NUDGE_DEG = 8');
    expect(resolveSrc).toMatch(/Math\.sin\(\(8 \* Math\.PI\) \/ 180\)/);
    expect(MIN_HORIZONTAL_RATIO).toBeCloseTo(Math.sin((8 * Math.PI) / 180), 10);
  });

  it('recordSprites palette hex matches render/colors.ts', () => {
    const src = read('src/render/recordSprites.ts');
    expect(src).toContain(BRICK_HP3);
    expect(src).toContain(BRICK_HP2);
    expect(src).toContain(BRICK_HP1);
    expect(src).toContain(BRICK_UNBREAKABLE);
    expect(BALL_RADIUS).toBe(6);
  });

  it('PlayingHost LOGICAL mirrors core via recordSprites export (NG-20)', () => {
    const host = read('app/_components/PlayingHost.tsx');
    expect(host).toMatch(/import\s*\{[^}]*LOGICAL_W[^}]*\}\s*from\s*['\"][^'\"]*recordSprites['\"]/);
    expect(host).toMatch(/import\s*\{[^}]*LOGICAL_H[^}]*\}\s*from\s*['\"][^'\"]*recordSprites['\"]/);
    const sprites = read('src/render/recordSprites.ts');
    expect(sprites).toContain(`const LOGICAL_W = ${LOGICAL_WIDTH}`);
    expect(sprites).toContain(`const LOGICAL_H = ${LOGICAL_HEIGHT}`);
    expect(sprites).toContain('export { LOGICAL_W, LOGICAL_H }');
  });

  it('input LOGICAL_WIDTH_VU matches core LOGICAL_WIDTH and recordSprites LOGICAL_W', async () => {
    const { LOGICAL_WIDTH_VU } = await import('../src/input/constants');
    expect(LOGICAL_WIDTH_VU).toBe(LOGICAL_WIDTH);
    expect(LOGICAL_WIDTH_VU).toBe(360);
    const sprites = read('src/render/recordSprites.ts');
    expect(sprites).toContain(`const LOGICAL_W = ${LOGICAL_WIDTH_VU}`);
  });
});
