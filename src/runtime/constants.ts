/** Fixed simulation step (seconds). */
export const FIXED_DT = 1 / 120;

/** Cap substeps per frame to avoid spiral-of-death. */
export const MAX_SUBSTEPS = 5;

/** Clamp wall-clock dt (seconds) after long stalls. */
export const MAX_FRAME_TIME = 0.25;

/**
 * Default sprite count for the FPS harness (D-06 ~200–300).
 * Override locally up to 300 for cliff-ramp research (D-07).
 */
export const SPRITE_CAP = 256;

/** Rolling metrics window (frames). */
export const METRICS_WINDOW = 60;

/** Frames before worklet self-check evaluates tick advancement. */
export const SELF_CHECK_FRAMES = 30;

/** Frame budget threshold (ms) for over-budget counting. */
export const BUDGET_MS = 16.7;
