// tests/input.paddle-intent.test.ts — PHYS-01 relative-drag pure math
import { describe, it, expect } from 'vitest';
import {
  clampPaddleCenter,
  computeRelativePaddleX,
} from '../src/input/paddleIntent';
import { PADDLE_GAIN, SMOOTH_ALPHA, LOGICAL_WIDTH_VU } from '../src/input/constants';

const HALF_W = 40;

describe('clampPaddleCenter', () => {
  it('clamps to [paddleHalfW, logicalWidth - paddleHalfW]', () => {
    expect(clampPaddleCenter(0, HALF_W, LOGICAL_WIDTH_VU)).toBe(HALF_W);
    expect(clampPaddleCenter(360, HALF_W, LOGICAL_WIDTH_VU)).toBe(
      LOGICAL_WIDTH_VU - HALF_W,
    );
    expect(clampPaddleCenter(180, HALF_W, LOGICAL_WIDTH_VU)).toBe(180);
  });
});

describe('computeRelativePaddleX', () => {
  const base = {
    camScale: 2,
    gain: PADDLE_GAIN,
    smoothAlpha: SMOOTH_ALPHA,
    paddleHalfW: HALF_W,
    logicalWidth: LOGICAL_WIDTH_VU,
  };

  it('re-press with zero translation returns ~anchor (no finger-X snap)', () => {
    const result = computeRelativePaddleX({
      ...base,
      anchorPaddleX: 180,
      translationXPx: 0,
      prevTarget: 180,
    });
    expect(result).toBeCloseTo(180, 5);
  });

  it('applies translation/camScale * gain from anchor, then EMA toward prevTarget', () => {
    // raw = 180 + (40 / 2) * 1.25 = 180 + 25 = 205
    // smoothed = 180 + (205 - 180) * 0.45 = 180 + 11.25 = 191.25
    const result = computeRelativePaddleX({
      ...base,
      anchorPaddleX: 180,
      translationXPx: 40,
      prevTarget: 180,
    });
    expect(result).toBeCloseTo(191.25, 5);
  });

  it('clamps result to paddle half-width bounds', () => {
    const result = computeRelativePaddleX({
      ...base,
      anchorPaddleX: 180,
      translationXPx: 10_000,
      prevTarget: 180,
      smoothAlpha: 1, // fully track raw so clamp is visible
    });
    expect(result).toBe(LOGICAL_WIDTH_VU - HALF_W);
  });

  it('returns prevTarget unchanged for non-finite translation or scale (T-03-01)', () => {
    expect(
      computeRelativePaddleX({
        ...base,
        anchorPaddleX: 180,
        translationXPx: Number.NaN,
        prevTarget: 150,
      }),
    ).toBe(150);

    expect(
      computeRelativePaddleX({
        ...base,
        anchorPaddleX: 180,
        translationXPx: 10,
        camScale: 0,
        prevTarget: 150,
      }),
    ).toBe(150);

    expect(
      computeRelativePaddleX({
        ...base,
        anchorPaddleX: 180,
        translationXPx: 10,
        camScale: Number.POSITIVE_INFINITY,
        prevTarget: 150,
      }),
    ).toBe(150);
  });
});
