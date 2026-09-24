/**
 * R-21 / G2.5 — production EAS profile must never arm CERT / SOAK / cliff / overlay.
 * Restores structural guarantee after CERT_HARNESS dropped the `__DEV__` compile strip.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Env keys that must not appear on the production profile. */
const FORBIDDEN_PRODUCTION_ENV = [
  'EXPO_PUBLIC_CERT',
  'EXPO_PUBLIC_SOAK',
  'EXPO_PUBLIC_CLIFF_RAMP',
  'EXPO_PUBLIC_PERF_OVERLAY',
];

/**
 * @returns list of forbidden keys present in env
 */
export function forbiddenKeysInEnv(env) {
  if (env == null || typeof env !== 'object' || Array.isArray(env)) {
    return [];
  }
  return FORBIDDEN_PRODUCTION_ENV.filter((k) =>
    Object.prototype.hasOwnProperty.call(env, k),
  );
}

function loadEas() {
  const path = join(root, 'eas.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertProductionClean(eas, label) {
  const production = eas?.build?.production;
  if (production == null || typeof production !== 'object') {
    console.error(`${label}: eas.json build.production missing`);
    process.exit(1);
  }
  const bad = forbiddenKeysInEnv(production.env);
  if (bad.length > 0) {
    console.error(
      `${label}: production.env must not set ${bad.join(', ')} (G2.5 / R-21)`,
    );
    process.exit(1);
  }
}

// --- self-check: synthetic production.env with CERT must be detected ---
{
  const syntheticBad = forbiddenKeysInEnv({ EXPO_PUBLIC_CERT: '1' });
  if (!syntheticBad.includes('EXPO_PUBLIC_CERT')) {
    console.error(
      'assert-eas-profiles self-check failed: EXPO_PUBLIC_CERT not detected',
    );
    process.exit(1);
  }
  const syntheticOk = forbiddenKeysInEnv({
    EXPO_PUBLIC_NO_DEV_CLIENT: '1',
    SENTRY_DISABLE_AUTO_UPLOAD: 'true',
  });
  if (syntheticOk.length !== 0) {
    console.error(
      'assert-eas-profiles self-check failed: clean env flagged',
      syntheticOk,
    );
    process.exit(1);
  }
}

const eas = loadEas();
assertProductionClean(eas, 'eas.json');

// Hygiene: profiling may set CERT; production must not (already asserted).
const profilingEnv = eas?.build?.profiling?.env ?? {};
if (
  Object.prototype.hasOwnProperty.call(profilingEnv, 'EXPO_PUBLIC_SOAK')
) {
  console.error(
    'eas.json: profiling.env must not set EXPO_PUBLIC_SOAK (soak stays __DEV__-only)',
  );
  process.exit(1);
}

console.log(
  'assert-eas-profiles: production env clean; profiling SOAK unset OK',
);
