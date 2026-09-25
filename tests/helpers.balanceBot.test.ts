/**
 * Plan 10-01 task 1 — the `balanceBot` object/id split is behaviour-preserving.
 *
 * `levelStatics` and `runBot` are the E2-locked measuring instruments (N-CNT-01 /
 * N-CNT-03). Phase 10 needs them to weigh and play a *generated* board, which has no
 * file under `assets/levels/`, so each is split into an object-taking core plus the
 * id-taking wrapper the campaign tests already consume (RESEARCH Pitfall 1).
 *
 * This file is the equivalence proof: the core and the wrapper must agree, so
 * `tests/balance.curve-e2.test.ts` keeps measuring exactly what it measured before the
 * split. Without it, "the refactor is behaviour-preserving" is a claim nobody asserts.
 *
 * Analog: `tests/balance.curve-e2.test.ts` — the consumer that must not change.
 *
 * NOT covered here: anything about generated boards. No `src/levelgen` symbol exists yet
 * (plan 10-02) and an unresolved import would fail the whole file rather than skip a todo.
 * Winnability of generated boards is `tests/levelgen.winnability.test.ts` (10-04-01);
 * authored weight of generated boards is `tests/levelgen.sweep.test.ts` (10-03-01).
 */
import { describe, it, expect } from 'vitest';
import { SCORE_HIT } from '../src/core';
import { PLAYABLE_LEVEL_ORDER } from '../src/services/storage/catalog';
import type { LevelFileV1 } from '../src/core/levels/schema';
import {
  runBot,
  runBotOnLevel,
  levelStatics,
  levelStaticsOf,
  readLevelFile,
  TICKS_PER_SECOND,
} from './helpers/balanceBot';

describe('balanceBot object/id split (10-01-01)', () => {
  it('levelStaticsOf(raw) deep-equals levelStatics(id) for every campaign level', () => {
    for (const id of PLAYABLE_LEVEL_ORDER) {
      expect(
        levelStaticsOf(readLevelFile(id), SCORE_HIT),
        `${id} authored weight must survive the split`,
      ).toEqual(levelStatics(id, SCORE_HIT));
    }
  });

  it('runBotOnLevel(raw) replays identically to runBot(id)', () => {
    const opts = { paddleOffset: 12, maxTicks: TICKS_PER_SECOND * 420 } as const;
    const viaId = runBot('level-01', opts);
    const viaObject = runBotOnLevel(readLevelFile('level-01'), opts, 'level-01');

    // Outcome, remaining bricks and tick count together pin the whole run: the bot is
    // deterministic, so an identical tick count means an identical trajectory.
    expect(viaObject.outcome).toBe(viaId.outcome);
    expect(viaObject.bricksRemaining).toBe(viaId.bricksRemaining);
    expect(viaObject.ticks).toBe(viaId.ticks);
  }, 120000);

  it('names the supplied label when a board fails to compile', () => {
    // A 21 000-board sweep that throws `undefined failed to compile` cannot say which
    // (seed, difficulty) produced the bad board.
    const notALevel = {} as unknown as LevelFileV1;
    expect(() => runBotOnLevel(notALevel, {}, 'seed-7@d12')).toThrow(/seed-7@d12/);
  });
});
