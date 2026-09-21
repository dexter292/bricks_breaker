/**
 * Soak D-20 — audio release lifecycle stubs (08-W0-04).
 * Later plans fill release() pool/idempotency assertions.
 */
import { describe, it } from 'vitest';

describe('audio.release', () => {
  it.todo('release clears pools and is idempotent');
  it.todo('second release does not throw');
});
