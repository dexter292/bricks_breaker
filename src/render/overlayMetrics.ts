/**
 * Read-only metrics view for overlay drawing (render layer).
 * Structurally compatible with `SpikeMetrics` in runtime/ — no runtime import (LC-03).
 */
export type OverlayMetrics = {
  lastMs: number;
  lastSubsteps: number;
  maxSubsteps: number;
  overBudget: number;
  rollingFps: number;
  p95Ms: number;
  p99Ms: number;
  spriteCount: number;
  sampleCount: number;
  workletPass: boolean;
  selfCheckReady: boolean;
};
