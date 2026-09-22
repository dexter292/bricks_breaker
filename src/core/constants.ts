/**
 * Core simulation constants.
 * Coordinate system: y increases downward (matches screen / Phase 1 spike).
 * Worklet bodies must inline matching literals — do not close over these bindings.
 */

/** Fixed simulation step (seconds). */
export const FIXED_DT = 1 / 120;

/** Cap substeps per frame to avoid spiral-of-death. */
export const MAX_SUBSTEPS = 5;

/** Clamp wall-clock dt (seconds) after long stalls. */
export const MAX_FRAME_TIME = 0.25;

/** Logical play-field width. */
export const LOGICAL_WIDTH = 360;

/** Logical play-field height. */
export const LOGICAL_HEIGHT = 640;

/** Ball collision radius. */
export const BALL_RADIUS = 6;

/** Paddle AABB width. */
export const PADDLE_WIDTH = 72;

/** Paddle AABB height. */
export const PADDLE_HEIGHT = 12;

/** Maximum designed ball speed (logical units / second). */
export const MAX_BALL_SPEED = 720;

/** Paddle bounce angle clamp from vertical (degrees). */
export const PADDLE_ANGLE_CLAMP_DEG = 62;

/** Paddle bounce angle clamp from vertical (radians). */
export const PADDLE_ANGLE_CLAMP_RAD = (PADDLE_ANGLE_CLAMP_DEG * Math.PI) / 180;

/**
 * Minimum |vy|/speed after paddle english (≈ cos(clamp)).
 * Prevents near-horizontal trajectories (D-03).
 */
export const MIN_VERTICAL_RATIO = Math.cos(PADDLE_ANGLE_CLAMP_RAD);

/** N-ball SoA capacity (Phase 2 activates exactly one). */
export const MAX_BALLS = 8;

/** Brick SoA capacity. */
export const MAX_BRICKS = 256;

/** Fixed event ring capacity (D-08). */
export const EVENT_RING_CAPACITY = 128;

/** Power-up effect reserve capacity (D-09; unused in Phase 2). */
export const MAX_EFFECTS = 16;

/** Max CCD iterations per ball per step. */
export const MAX_CCD_ITERATIONS = 5;

/** Nudge off surface after reflect. */
export const SEPARATION_EPS = 1e-4;

/** Starting lives per run (D-17). */
export const DEFAULT_LIVES = 3;

/** Serve launch speed (MAX_BALL_SPEED * 0.5). */
export const SERVE_SPEED = 360;

// --- Phase 5 run rules / power-ups / anti-stall (worklets must inline matching literals) ---

/** Points awarded per brick hit (D-01 / A1). */
export const SCORE_HIT = 10;

/** Extra points when a brick breaks (D-01 / A1). */
export const SCORE_BREAK_BONUS = 50;

/** Chance a broken brick drops a pickup (D-09). */
export const DROP_CHANCE = 0.2;

/** After drop chance, roll < this → multiball; else expand (A2). */
export const DROP_TYPE_MULTIBALL_THRESHOLD = 0.5;

/** Pickup SoA capacity. */
export const MAX_PICKUPS = 16;

/** Pickup flat AABB width. */
export const PICKUP_WIDTH = 20;

/** Pickup flat AABB height. */
export const PICKUP_HEIGHT = 12;

/** Constant pickup fall speed (logical units / second; y-down positive). */
export const PICKUP_FALL_SPEED = 120;

/** Paddle expand width multiplier (D-08). */
export const EXPAND_SCALE = 1.5;

/** Expand effect duration in seconds (D-08). */
export const EXPAND_DURATION_SEC = 10;

/** Expand effect duration in ticks (10 / FIXED_DT). */
export const EXPAND_DURATION_TICKS = 1200;

/** Effects SoA type code for expand paddle. */
export const EFFECT_TYPE_EXPAND = 1;

/** Pickup type code: multiball (D-06). */
export const PICKUP_TYPE_MULTIBALL = 1;

/** Pickup type code: expand (D-06). */
export const PICKUP_TYPE_EXPAND = 2;

/** Multiball spawn angle A from vertical (degrees; D-14 / A3). */
export const MULTIBALL_ANGLE_A_DEG = 18;

/** Multiball spawn angle B from vertical (degrees; D-14 / A3). */
export const MULTIBALL_ANGLE_B_DEG = 36;

/** Idle seconds before stall tier 1 (D-15). */
export const STALL_IDLE_SEC = 8;

/** Idle ticks before stall tier 1 (8 / FIXED_DT). */
export const STALL_IDLE_TICKS = 960;

/** Extra ticks after tier 1 before tier 2 (+2s; A4). */
export const STALL_TIER2_EXTRA_TICKS = 240;

/** Extra ticks after tier 1 before tier 3 (+4s; A4). */
export const STALL_TIER3_EXTRA_TICKS = 480;

/** Stall speed multiplier applied on intervention (A4). */
export const STALL_SPEED_MULT = 1.08;

/** Stall angle nudge in degrees (within paddle clamp). */
export const STALL_ANGLE_NUDGE_DEG = 8;

/**
 * Minimum |vx|/speed after paddle english / reflect (≈ sin(8°)).
 * Prevents near-vertical trajectories (PHYS-04 / NF-2).
 */
export const MIN_HORIZONTAL_RATIO = Math.sin(
  (STALL_ANGLE_NUDGE_DEG * Math.PI) / 180,
);

/** Re-apply tier-3 intervention every N idle ticks while stuck at tier 3 (F-27). */
export const STALL_TIER3_REPEAT_TICKS = 240;
