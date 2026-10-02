/** Seeded board generator barrel (N-GEN-01 / LC-16) — the only surface Phase 11/12 may import. */

export { makeRng, below, shuffleInPlace, hashSeed, mixSeed } from './rng';

export { GRID, BRICK_TYPES } from './grid';

export { D_MAX, SCHEDULE, envelope, type ScheduleEntry } from './schedule';

export { generate } from './generate';

// The __DEV__ device probe (plan 10-05) lives in the app tier and may only reach the
// barrel (LC-16), so the portable digest has to be re-exported here rather than deep-imported.
export { CORPUS_SEEDS, corpusFingerprint } from './fingerprint';
