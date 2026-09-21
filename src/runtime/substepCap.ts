/**
 * Pure helper for F-51 substep-cap remainder policy (testable without worklets).
 * After a frame drains up to `maxSubsteps`, zero the accumulator only when it
 * still holds ≥ one full fixed step (true backlog). Keep fractional remainder.
 */
export function remainderAfterSubstepCap(
  accumulatorAfterLoop: number,
  stepsTaken: number,
  maxSubsteps: number,
  fixedDt: number,
): number {
  if (
    stepsTaken >= maxSubsteps &&
    Number.isFinite(accumulatorAfterLoop) &&
    accumulatorAfterLoop >= fixedDt
  ) {
    return 0;
  }
  return accumulatorAfterLoop;
}
