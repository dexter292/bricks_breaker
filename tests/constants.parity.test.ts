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
  BALL_RADIUS,
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

  it('recordSprites palette hex matches render/colors.ts', () => {
    const src = read('src/render/recordSprites.ts');
    expect(src).toContain(BRICK_HP3);
    expect(src).toContain(BRICK_HP2);
    expect(src).toContain(BRICK_HP1);
    expect(src).toContain(BRICK_UNBREAKABLE);
    expect(BALL_RADIUS).toBe(6);
  });

  it('PlayingHost LOGICAL mirrors core', () => {
    const src = read('app/_components/PlayingHost.tsx');
    expect(src).toContain(`const LOGICAL_W = ${LOGICAL_WIDTH}`);
    expect(src).toContain(`const LOGICAL_H = ${LOGICAL_HEIGHT}`);
  });
});
