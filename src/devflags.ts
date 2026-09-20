/**
 * Build-time spike flags (D-03 / D-08).
 * Do NOT gate on `__DEV__` — that hides the overlay in profiling/release builds.
 */
export const PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1';
export const CLIFF_RAMP = process.env.EXPO_PUBLIC_CLIFF_RAMP === '1';
