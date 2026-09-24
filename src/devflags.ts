/**
 * Build-time spike flags (D-03 / D-08).
 * Do NOT gate PERF_OVERLAY on `__DEV__` — that hides the overlay in profiling/release builds.
 *
 * CERT / SOAK env flags:
 * - Never set EXPO_PUBLIC_CERT or EXPO_PUBLIC_SOAK on the **production** EAS profile.
 * - EXPO_PUBLIC_CERT=1 is allowed on the **profiling** profile so A1 can arm Cert WC
 *   with `__DEV__` false (Instruments ceiling). SOAK stays `__DEV__`-only in GameHost.
 * - Production binaries without the env flag never arm cert/soak paths.
 */
export const PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1';
export const CLIFF_RAMP = process.env.EXPO_PUBLIC_CLIFF_RAMP === '1';
/** Cert harness arm — PlayingHost / GameHost when EXPO_PUBLIC_CERT=1 (profiling OK). */
export const CERT_HARNESS = process.env.EXPO_PUBLIC_CERT === '1';
/** Soak harness arm — GameHost only when `__DEV__` (Plan 04). */
export const SOAK_HARNESS = process.env.EXPO_PUBLIC_SOAK === '1';
