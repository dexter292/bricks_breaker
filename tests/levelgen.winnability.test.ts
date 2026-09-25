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
 * Nothing here may import `generate`, `SCHEDULE` or `D_MAX` yet — they land in plan 10-02,
 * and an unresolved import fails the whole file rather than skipping a todo.
 */
import { describe, it } from 'vitest';

describe('generated board winnability backstop (SC-2, 10-04-01)', () => {
  it.todo(
    'a stratified 30-board sample across the difficulty range is cleared by the bot (10-04-01)',
  );
});
