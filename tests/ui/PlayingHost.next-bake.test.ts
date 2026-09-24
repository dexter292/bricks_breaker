/**
 * D-03 — PlayingHost Next / levelId bake-gate Nyquist stubs (Plan 03).
 *
 * Wave 0: file exists + todos. Behavioral + source contracts land in Plan 03.
 *
 * @vitest-environment node
 */
import { describe, it } from 'vitest';

describe('PlayingHost Next bake gate (C2 Plan 03 todos)', () => {
  it.todo(
    'after Next / levelId change, setActive(true) is the last call (mock useGameLoop)',
  );
  it.todo(
    'Next callback source must not contain setActive(true) (gate owns arm)',
  );
});
