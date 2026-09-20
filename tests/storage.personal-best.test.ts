// tests/storage.personal-best.test.ts — RUN-04 / 06-W0-01 Wave 0 stubs
import { describe, it } from 'vitest';

describe('personal best (Wave 0 stubs)', () => {
  it.todo(
    'evaluatePersonalBest: strict greater-than sets isNewRecord and best = runScore',
  );
  it.todo('evaluatePersonalBest: equal score is not a new record');
  it.todo('evaluatePersonalBest: lower runScore keeps previous best');
  it.todo('memoryStore getBest/setBest round-trip');
  it.todo(
    'parsePersonalBestBlob: corrupt JSON / wrong v / non-finite / negative → 0',
  );
});
