/**
 * Build-time spike flags (D-03 / D-08).
 * Do NOT gate PERF_OVERLAY on `__DEV__` — that hides the overlay in profiling/release builds.
 *
 * CERT / SOAK env flags are DEV hygiene only:
 * - Env alone must NOT enable UI in production profiles.
 * - Cert / soak UI still requires `__DEV__` (Pressable primary; env may auto-arm only when `__DEV__`).
 * - Never set EXPO_PUBLIC_CERT or EXPO_PUBLIC_SOAK on the production EAS profile.
 */
export const PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1';
export const CLIFF_RAMP = process.env.EXPO_PUBLIC_CLIFF_RAMP === '1';
/** Phase 8 cert harness arm (DEV + optional auto-arm). Consumed by PlayingHost. */
export const CERT_HARNESS = process.env.EXPO_PUBLIC_CERT === '1';
/** Phase 8 soak harness arm — consumed by Plan 04 GameHost. */
export const SOAK_HARNESS = process.env.EXPO_PUBLIC_SOAK === '1';
