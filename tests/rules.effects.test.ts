/**
 * PWR-02 — paddle expand effect stubs (Wave 0). Implementations land in Plan 03.
 */
import { describe, it } from 'vitest';

describe('effect rules (PWR-02 expand)', () => {
  it.todo('expand sets paddleW = PADDLE_WIDTH * 1.5 for 10s (1200 ticks at FIXED_DT)');
  it.todo('second expand refreshes effectUntilTick without stacking width past 1.5×');
  it.todo('expire restores paddleW = 72 and clamps paddleX in field');
  it.todo('resolvePaddleEnglish uses current paddleW half-width while expanded');
});
