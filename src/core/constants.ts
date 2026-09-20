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
