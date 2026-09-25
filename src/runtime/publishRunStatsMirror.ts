/**
 * Run-telemetry UI→JS mirror (N-STAT-01).
 *
 * `RunStats` lives in a SharedValue that `reduceRunTelemetry` mutates **in place on the
 * UI runtime**. Reanimated does not propagate in-place mutation of a held object back to
 * the JS thread — a JS-side `runStats.value.bricksBroken` read returns the value the
 * object had when it crossed, not the live count. Device UAT caught exactly that: a run
 * that scored 60, destroyed a brick and lost a life persisted `bricksBroken: 0`,
 * `livesLost: 0`, `ticks: 2`, while `wallClockMs` — the one field read from a plain React
 * ref — was correct.
 *
 * So the counters cross the boundary the way every other UI→JS value in this file's
 * neighbourhood does: publish into a stable mirror on the UI thread, bump a scalar seq,
 * and let a `useAnimatedReaction` ship plain numbers with `runOnJS`
 * (same shape as `publishChromeMirror` / `publishCertMetricsMirror`).
 *
 * Dirty-checked, so the seq bumps only when a counter actually moves — roughly once per
 * gameplay event, not once per frame. Zero allocation on the hot path.
 */
import type { RunStats } from './runStats';

export type RunStatsMirror = {
  bricksBroken: number;
  bestCombo: number;
  pickupMultiball: number;
  pickupExpand: number;
  pickupExtraLife: number;
  pickupSlow: number;
  pickupFireball: number;
  livesLost: number;
  longestRally: number;
  largestCascade: number;
  /** Simulated time (`world.tick`) — crosses here for the same reason the counters do. */
  ticksPlayed: number;
};

export function createRunStatsMirror(): RunStatsMirror {
  'worklet';
  return {
    bricksBroken: 0,
    bestCombo: 0,
    pickupMultiball: 0,
    pickupExpand: 0,
    pickupExtraLife: 0,
    pickupSlow: 0,
    pickupFireball: 0,
    livesLost: 0,
    longestRally: 0,
    largestCascade: 0,
    ticksPlayed: 0,
  };
}

/**
 * Copy live counters into `mirror` when they differ.
 * @returns 1 if any field changed (caller bumps the seq), else 0.
 */
export function publishRunStatsMirror(
  mirror: RunStatsMirror,
  stats: RunStats,
  ticksPlayed: number,
): number {
  'worklet';
  let dirty = 0;
  if (mirror.bricksBroken !== stats.bricksBroken) {
    mirror.bricksBroken = stats.bricksBroken;
    dirty = 1;
  }
  if (mirror.bestCombo !== stats.bestCombo) {
    mirror.bestCombo = stats.bestCombo;
    dirty = 1;
  }
  if (mirror.pickupMultiball !== stats.pickupMultiball) {
    mirror.pickupMultiball = stats.pickupMultiball;
    dirty = 1;
  }
  if (mirror.pickupExpand !== stats.pickupExpand) {
    mirror.pickupExpand = stats.pickupExpand;
    dirty = 1;
  }
  if (mirror.pickupExtraLife !== stats.pickupExtraLife) {
    mirror.pickupExtraLife = stats.pickupExtraLife;
    dirty = 1;
  }
  if (mirror.pickupSlow !== stats.pickupSlow) {
    mirror.pickupSlow = stats.pickupSlow;
    dirty = 1;
  }
  if (mirror.pickupFireball !== stats.pickupFireball) {
    mirror.pickupFireball = stats.pickupFireball;
    dirty = 1;
  }
  if (mirror.livesLost !== stats.livesLost) {
    mirror.livesLost = stats.livesLost;
    dirty = 1;
  }
  if (mirror.longestRally !== stats.longestRally) {
    mirror.longestRally = stats.longestRally;
    dirty = 1;
  }
  if (mirror.largestCascade !== stats.largestCascade) {
    mirror.largestCascade = stats.largestCascade;
    dirty = 1;
  }
  if (mirror.ticksPlayed !== ticksPlayed) {
    mirror.ticksPlayed = ticksPlayed;
    dirty = 1;
  }
  return dirty;
}
