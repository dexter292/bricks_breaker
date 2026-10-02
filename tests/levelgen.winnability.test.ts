/**
 * SC-2 quality backstop — a stratified sample of generated boards is actually winnable.
 *
 * `checkSolvability` proves a breakable cell is *reachable on paper*: the steel mask leaves
 * a 4-connected path to it wide enough for the ball. That is a geometric claim, and the
 * whole sweep asserts it (`tests/levelgen.sweep.test.ts`). This file asserts the stronger,
 * dynamic claim — that the real `stepRun` pipeline can actually clear the board — which is
 * the one that catches a cell that is reachable on paper but practically unhittable.
 *
 * Analog: `tests/balance.curve-e2.test.ts`'s "every campaign level is still winnable by a
 * perfect bot", run through `runBotOnLevel` (plan 10-01 task 1) so a generated board with
 * no file under `assets/levels/` can be played without ever being written to disk.
 *
 * **The bot is a measuring instrument, not a player model.** It tracks the lowest live ball
 * and never misses on purpose, so its clear time is a *floor* on human duration and its
 * lives-remaining is always maximal. `WON` is therefore a **necessary, not sufficient**
 * condition for a human-playable board: a board the bot cannot clear is definitely broken,
 * but a board the bot clears may still be tedious or unfair. Board *feel* stays a judgement
 * call (10-VALIDATION.md, Manual-Only Verifications) — do not promote this file into a
 * proxy for it, and do not pin the dial constants here to "lock in" a feel that was never
 * measured against humans.
 *
 * Why stratified and why a sample: a bot run is seconds of simulated play, not the 0.04 ms
 * a lint check costs, so the full 21 000-board corpus is out of reach inside `npm test`.
 * Sampling across the difficulty range is what keeps the low, mid and high ends all
 * covered rather than over-sampling whichever end the seed order happens to favour.
 *
 * **Why the top of the range is sampled twice as densely.** Bot cost and structural risk
 * both scale with simulated clear time — RESEARCH Q7 measured 47.8 s at `d=0` against
 * 223.3 s at `d=20` — so the ten `D_MAX` seeds buy more evidence per second than ten more
 * `d=0` seeds would.
 *
 * Deliberately NOT built: a "no lonely brick" shape constraint in the generator. RESEARCH
 * measured 0 failures in 15 bot runs and 0 lint failures in 105 000 boards, and plan 10-04
 * widened that to 840 bot runs (40 seeds x all 21 difficulties) with 0 non-wins, so that
 * constraint stays in reserve rather than being built speculatively (Q7 mitigation 2).
 *
 * What that same 840-board scan *did* surface is a clear-time tail, not a correctness
 * problem: p50 108 s, p95 259 s, p99 416 s, worst 1495 s of simulated play for a bot that
 * never misses. Since bot time is a floor on human time, the top of the range is plausibly
 * too long to finish — a **balance** finding for Phase 11's retune, recorded in
 * `docs/ops/BOARD-GENERATOR.md` §Limits. It is deliberately not asserted here: pinning a
 * clear-time ceiling would pin the dial constants by proxy, and those were never
 * calibrated against a human.
 */
import { describe, it, expect } from 'vitest';
import { D_MAX, generate } from '../src/levelgen';
import { TICKS_PER_SECOND, runBotOnLevel } from './helpers/balanceBot';

/**
 * Lateral paddle offset, matching `balance.curve-e2`. Offset 0 is the degenerate case —
 * the ball returns straight up and clears take far longer — so a non-zero offset is what
 * makes the sample representative of real angle variety.
 */
const PADDLE_OFFSET = 12;

/**
 * 1800 simulated seconds, and deliberately generous — see below for why the planned 420 s
 * was wrong.
 *
 * **`maxTicks` and the `it` timeout do different jobs.** The `it` timeout is what turns a
 * genuine hang into a fast, legible failure; it bounds *wall* time. `maxTicks` bounds
 * *simulated* time, and its only real job here is to be high enough that a merely slow
 * board is never misreported as a stuck one. Sizing `maxTicks` as if it were the hang
 * guard is what produces a flaky-looking gate.
 *
 * RESEARCH Q7 sized it at 420 s from 15 prototype runs whose slowest board took 223 s,
 * calling that ~1.9x headroom. Measurement over the shipped generator falsified that: a
 * scan of 840 boards (40 seeds x all 21 difficulties, plan 10-04) found **0 non-wins** but
 * a fat clear-time tail — p50 108 s, p95 259 s, **p99 416 s**, worst **1495 s**. A 420 s
 * budget therefore sits *at the p99* and would false-TIMEOUT roughly one board in a
 * hundred, reporting a perfectly clearable board as broken. Within this pinned 30-board
 * sample the slowest is `s=4 d=15` at 446.2 s, which the planned budget failed outright.
 *
 * 1800 s clears both anchors: ~4x the slowest board in this sample, and above the slowest
 * of the 840 measured. The cost of the generosity is nil — a board that wins stops early,
 * and even a board that burned the whole budget costs ~180 ms, so all 30 stay far inside
 * the 60 s timeout below.
 */
const MAX_TICKS = TICKS_PER_SECOND * 1800;

/**
 * The stratified sample: 5 seeds each at d = 0, 5, 10 and 15, plus 10 at `D_MAX`.
 * 30 boards spanning the whole difficulty range, weighted to the top.
 */
const SAMPLE: readonly { d: number; seeds: readonly number[] }[] = [
  { d: 0, seeds: [0, 1, 2, 3, 4] },
  { d: 5, seeds: [0, 1, 2, 3, 4] },
  { d: 10, seeds: [0, 1, 2, 3, 4] },
  { d: 15, seeds: [0, 1, 2, 3, 4] },
  { d: D_MAX, seeds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

describe('generated board winnability backstop (SC-2, 10-04-01)', () => {
  it(
    'a stratified 30-board sample across the difficulty range is cleared by the bot (10-04-01)',
    () => {
      let boards = 0;

      for (const { d, seeds } of SAMPLE) {
        for (const s of seeds) {
          const label = `s=${s} d=${d}`;
          const r = runBotOnLevel(
            generate(s, d),
            { paddleOffset: PADDLE_OFFSET, maxTicks: MAX_TICKS },
            label,
          );
          expect(r.outcome, `${label} bot outcome (${r.seconds}s)`).toBe('WON');
          expect(r.bricksRemaining, `${label} cleared (${r.seconds}s)`).toBe(0);
          boards++;
        }
      }

      // Pins the sample width: a future edit that thins the loop to speed up a watch run
      // fails here rather than quietly turning SC-2's backstop into three spot checks.
      expect(boards, 'boards played').toBe(30);
    },
    60_000,
  );
});
