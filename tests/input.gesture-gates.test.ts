// tests/input.gesture-gates.test.ts — D-11 serve/resume gate predicates
import { describe, it, expect } from 'vitest';
import {
  shouldAcceptServeTap,
  shouldAcceptResumeTap,
} from '../src/input/gestureGates';

describe('shouldAcceptServeTap', () => {
  const ok = {
    simPhaseDocked: true,
    uiPaused: false,
    countdown: false,
    panActive: false,
  };

  it('accepts only when docked, unpaused, no countdown, and pan idle', () => {
    expect(shouldAcceptServeTap(ok)).toBe(true);
  });

  it('rejects when not docked', () => {
    expect(shouldAcceptServeTap({ ...ok, simPhaseDocked: false })).toBe(false);
  });

  it('rejects when ui paused', () => {
    expect(shouldAcceptServeTap({ ...ok, uiPaused: true })).toBe(false);
  });

  it('rejects during countdown', () => {
    expect(shouldAcceptServeTap({ ...ok, countdown: true })).toBe(false);
  });

  it('rejects while pan is active (D-11)', () => {
    expect(shouldAcceptServeTap({ ...ok, panActive: true })).toBe(false);
  });
});

describe('shouldAcceptResumeTap', () => {
  it('accepts only from Resume control while paused and not in countdown', () => {
    expect(
      shouldAcceptResumeTap({
        uiPaused: true,
        countdown: false,
        fromResumeControl: true,
      }),
    ).toBe(true);
  });

  it('rejects playfield tap (fromResumeControl false)', () => {
    expect(
      shouldAcceptResumeTap({
        uiPaused: true,
        countdown: false,
        fromResumeControl: false,
      }),
    ).toBe(false);
  });

  it('rejects when not paused', () => {
    expect(
      shouldAcceptResumeTap({
        uiPaused: false,
        countdown: false,
        fromResumeControl: true,
      }),
    ).toBe(false);
  });

  it('rejects during countdown', () => {
    expect(
      shouldAcceptResumeTap({
        uiPaused: true,
        countdown: true,
        fromResumeControl: true,
      }),
    ).toBe(false);
  });
});
