/**
 * Build-time spike flags (D-03 / D-08).
 * Do NOT gate PERF_OVERLAY on `__DEV__` — that hides the overlay in profiling/release builds.
 *
 * CERT / SOAK env flags:
 * - Never set EXPO_PUBLIC_CERT or EXPO_PUBLIC_SOAK on the **production** EAS profile.
 * - EXPO_PUBLIC_CERT=1 is allowed on the **profiling** profile so A1 can arm Cert WC
 *   with `__DEV__` false (Instruments ceiling). SOAK stays `__DEV__`-only in GameHost.
 * - Production binaries without the env flag never arm cert/soak paths.
 *
 * LEVELGEN_PROBE env flag:
 * - Never set EXPO_PUBLIC_LEVELGEN_PROBE on the **production** EAS profile, and unlike
 *   EXPO_PUBLIC_CERT it is not allowed on **profiling** either: the probe is `__DEV__`-only
 *   in GameHost, so arming it anywhere else only ships a dead 4 200-board loop's worth of
 *   reachable code with no way to observe it.
 * - Armed, it costs one corpus fingerprint (4 200 generated boards, ~140 ms on Node and more
 *   on Hermes) once at shell mount. Unarmed, it does zero work.
 */
export const PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1';
export const CLIFF_RAMP = process.env.EXPO_PUBLIC_CLIFF_RAMP === '1';
/** Cert harness arm — PlayingHost / GameHost when EXPO_PUBLIC_CERT=1 (profiling OK). */
export const CERT_HARNESS = process.env.EXPO_PUBLIC_CERT === '1';
/** Soak harness arm — GameHost only when `__DEV__` (Plan 04). */
export const SOAK_HARNESS = process.env.EXPO_PUBLIC_SOAK === '1';
/**
 * A1 determinism probe arm — GameHost only, and only when `__DEV__` (Phase 10 plan 05).
 * Logs the device JS engine's own `corpusFingerprint()` so Hermes byte-identity with Node
 * can be falsified for the cost of one app launch. Never set on production or profiling.
 */
export const LEVELGEN_PROBE = process.env.EXPO_PUBLIC_LEVELGEN_PROBE === '1';
