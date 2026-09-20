/**
 * Relative-drag → absolute paddle center (PHYS-01 / D-04).
 * Pure TS — no RNGH / Reanimated / core imports.
 */

export function clampPaddleCenter(
  x: number,
  paddleHalfW: number,
  logicalWidth: number,
): number {
  return Math.min(Math.max(x, paddleHalfW), logicalWidth - paddleHalfW);
}

function isFiniteNumber(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n);
}

export function computeRelativePaddleX(args: {
  anchorPaddleX: number;
  translationXPx: number;
  camScale: number;
  gain: number;
  prevTarget: number;
  smoothAlpha: number;
  paddleHalfW: number;
  logicalWidth: number;
}): number {
  const {
    anchorPaddleX,
    translationXPx,
    camScale,
    gain,
    prevTarget,
    smoothAlpha,
    paddleHalfW,
    logicalWidth,
  } = args;

  if (
    camScale === 0 ||
    !isFiniteNumber(anchorPaddleX) ||
    !isFiniteNumber(translationXPx) ||
    !isFiniteNumber(camScale) ||
    !isFiniteNumber(gain) ||
    !isFiniteNumber(prevTarget) ||
    !isFiniteNumber(smoothAlpha) ||
    !isFiniteNumber(paddleHalfW) ||
    !isFiniteNumber(logicalWidth)
  ) {
    return prevTarget;
  }

  const raw = anchorPaddleX + (translationXPx / camScale) * gain;
  const smoothed = prevTarget + (raw - prevTarget) * smoothAlpha;
  return clampPaddleCenter(smoothed, paddleHalfW, logicalWidth);
}
