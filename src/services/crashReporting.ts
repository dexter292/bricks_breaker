/**
 * Optional Sentry crash reporting (N-OPS-01).
 * No-ops unless EXPO_PUBLIC_SENTRY_DSN is set — keeps offline/privacy posture
 * until the owner provisions a project (see docs/ops/CRASH-REPORTING.md).
 */

import * as Sentry from '@sentry/react-native';

let initialized = false;

export function isCrashReportingEnabled(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  return typeof dsn === 'string' && dsn.length > 0;
}

/** Call once at app root, before other JS side effects. */
export function initCrashReporting(): void {
  if (initialized) return;
  initialized = true;

  if (!isCrashReportingEnabled()) {
    if (__DEV__) {
      console.info(
        '[crash] Sentry disabled — set EXPO_PUBLIC_SENTRY_DSN to enable (N-OPS-01)',
      );
    }
    return;
  }

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    // Privacy: no PII by default; crashes only.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableLogs: false,
    environment:
      process.env.EAS_BUILD_PROFILE ??
      (typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production'),
  });
}

/** DEV / verification helper — throws a tagged error for dashboard confirmation. */
export function triggerTestCrash(reason = 'N-OPS-01 verification crash'): void {
  if (!isCrashReportingEnabled()) {
    throw new Error(
      `${reason} (Sentry DSN unset — enable EXPO_PUBLIC_SENTRY_DSN first)`,
    );
  }
  Sentry.captureException(new Error(reason));
  // Also throw so native fatal path is exercised on demand.
  throw new Error(reason);
}

export { Sentry };
