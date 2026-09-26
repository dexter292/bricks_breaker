/**
 * Plan 11-05 Task 2 — the endless host: the WON intercept, the in-flight guard,
 * the endless record write, the compile-failure path and the compiled-push guard.
 *
 * These are SOURCE contracts, and deliberately so. Every behaviour below is a
 * property of *statement placement* inside `applyChrome` and the compiled-push
 * effect — which branch comes first, which path returns early, which dependency
 * array a ref was read to stay out of. A behaviour test that only observed the
 * end state could not tell "the endless branch returned before `handleRunEnded`"
 * from "`handleRunEnded` ran and happened to do nothing", and it is precisely the
 * former that SC-1 requires.
 *
 * `codeOnly` strips `//` comments first, so a doc note naming `handleRunEnded`
 * can neither satisfy nor falsify a contract.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = join(process.cwd(), 'app/_components/PlayingHost.tsx');

/** Strip // line comments so doc notes cannot false-positive. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}

describe('PlayingHost endless host (source contract)', () => {
  const code = codeOnly(readFileSync(HOST, 'utf8'));

  /** The memoised WON/LOST reaction site — every ordering claim below lives in here. */
  const applyChrome = (() => {
    const m = code.match(
      /const applyChrome = useCallback\(\s*\(mirror: ChromeMirror\) => \{([\s\S]*?)\n {4}\},\n {4}\[/,
    );
    return m?.[1] ?? '';
  })();

  /**
   * The endless wave-advance branch: anchored on its guard, terminated at its
   * early return. Never assert on the whole file — `setActive` and
   * `handleRunEnded` legitimately appear elsewhere in it.
   */
  const endlessBranch = (() => {
    const m = applyChrome.match(
      /if \(\s*modeRef\.current === 'endless'[\s\S]*?SIM\.WON\s*\)\s*\{([\s\S]*?)\n {8}return;/,
    );
    return m?.[1] ?? '';
  })();

  it('applyChrome parsed — the harness itself is honest', () => {
    expect(
      applyChrome,
      'applyChrome must be extractable, or every ordering contract below is vacuous',
    ).not.toBe('');
  });

  it('the endless WON branch precedes the campaign WON branch and returns early (SC-1)', () => {
    const endlessAt = applyChrome.search(
      /if \(\s*modeRef\.current === 'endless'[\s\S]{0,80}?SIM\.WON/,
    );
    const campaignAt = applyChrome.search(
      /if \(mirror\.phase === SIM\.WON\) \{/,
    );
    expect(
      endlessAt,
      'the endless WON guard must exist in applyChrome (SC-1)',
    ).toBeGreaterThanOrEqual(0);
    expect(
      campaignAt,
      'the campaign WON branch must still exist (campaign is unchanged)',
    ).toBeGreaterThanOrEqual(0);
    expect(
      endlessAt,
      'the endless WON branch must come FIRST — behind the campaign branch it would never run (SC-1)',
    ).toBeLessThan(campaignAt);
    expect(
      endlessBranch,
      'the endless WON branch must be extractable and non-empty (SC-1)',
    ).not.toBe('');
  });

  it('waveAdvanceInFlightRef is a ref, set in the branch and cleared off WON/LOST (Pitfall 5)', () => {
    expect(
      code,
      'waveAdvanceInFlightRef must be a useRef — state is stale inside the memoised applyChrome',
    ).toMatch(/const waveAdvanceInFlightRef = useRef\(/);
    expect(
      endlessBranch,
      'the branch must claim the guard before generating, or a double-delivered WON advances twice',
    ).toMatch(/waveAdvanceInFlightRef\.current = true/);
    const clear = applyChrome.match(
      /if \(\s*mirror\.phase !== SIM\.WON &&\s*mirror\.phase !== SIM\.LOST\s*\)\s*\{([\s\S]*?)\}/,
    );
    expect(
      clear?.[1],
      'the guard must be cleared when the mirror next reports a phase that is neither WON nor LOST',
    ).toMatch(/waveAdvanceInFlightRef\.current = false/);
  });

  /**
   * 11-08 REWROTE this contract rather than deleting it, and kept its property.
   *
   * It was written against a single `store.recordRunEnd(` call whose argument was a
   * ternary selecting the union arm. 11-UI-SPEC § Record Display Contract makes the
   * mode branch happen BEFORE the personal-best comparison — that ordering IS the
   * gap-2 fix — so the one ternary call is now one call per branch. Asserting the
   * old shape would have forbidden the fix instead of protecting D-11, so the three
   * claims below are re-expressed against the branch structure: the arm is still
   * chosen by `modeRef`, the endless arm still carries the wave reached, and the
   * campaign arm still carries `levelId`.
   */
  it('the endless run records through the endless arm of the union, with the wave (N-END-02)', () => {
    const runEnded = code.match(
      /const handleRunEnded = useCallback\(([\s\S]*?)\n {4}\[platform, store, levelId\],/,
    );
    expect(runEnded?.[1], 'handleRunEnded must be extractable').toBeTruthy();
    const body = runEnded![1];

    const gateAt = body.search(/if \(modeRef\.current === 'endless'\) \{/);
    const elseAt = body.search(/\n {6}\} else \{\n/);
    expect(
      gateAt,
      "the endless arm must be selected by mode, not by a caller convention (D-11)",
    ).toBeGreaterThanOrEqual(0);
    expect(
      elseAt,
      'the campaign arm must be the else of that same mode gate',
    ).toBeGreaterThan(gateAt);

    const endlessArm = body.slice(gateAt, elseAt);
    const campaignArm = body.slice(elseAt);
    expect(
      endlessArm,
      'the endless arm must be extractable and non-empty',
    ).not.toBe('');

    expect(
      endlessArm,
      'the endless arm carries the wave reached (N-END-02)',
    ).toMatch(/store\.recordRunEnd\(\{\s*mode: 'endless',\s*wave: runWave,/);
    expect(
      endlessArm,
      'the wave recorded is the live ref, never a stale state read (Pitfall 5)',
    ).toMatch(/const runWave = waveRef\.current;/);
    expect(
      campaignArm,
      'the campaign arm is still reachable and still carries levelId',
    ).toMatch(/store\.recordRunEnd\(\{\s*levelId,\s*mode: 'campaign',/);
    expect(
      endlessArm,
      'the endless arm must NOT record through the campaign arm',
    ).not.toMatch(/mode: 'campaign'/);
  });

  /**
   * The gap-2 regression fence (11-08). `evaluatePersonalBest` compares against
   * `previousBestRef`, which holds `store.getBestForLevel(levelId)` — a CAMPAIGN
   * level best. Calling it on the endless path is the whole defect: it produced the
   * campaign PB as the endless `Best`, `New Record` against an unrelated score, and
   * the write-back that poisoned the campaign ref for the life of the mount.
   */
  it('the campaign comparison is unreachable from the endless arm (gap 2)', () => {
    const runEnded = code.match(
      /const handleRunEnded = useCallback\(([\s\S]*?)\n {4}\[platform, store, levelId\],/,
    );
    const body = runEnded![1];
    const gateAt = body.search(/if \(modeRef\.current === 'endless'\) \{/);
    const elseAt = body.search(/\n {6}\} else \{\n/);
    const endlessArm = body.slice(gateAt, elseAt);
    const campaignArm = body.slice(elseAt);

    expect(
      endlessArm,
      'evaluatePersonalBest compares against a CAMPAIGN best — it must not run in endless',
    ).not.toMatch(/evaluatePersonalBest\s*\(/);
    expect(
      endlessArm,
      'previousBestRef must never be WRITTEN by an endless run (Record Display Contract)',
    ).not.toMatch(/previousBestRef\.current\s*=/);
    expect(
      endlessArm,
      'the endless record is read from its own watermark refs',
    ).toMatch(/endlessBestScoreRef\.current/);
    expect(
      endlessArm,
      'the endless record is read from its own watermark refs',
    ).toMatch(/endlessBestWaveRef\.current/);
    expect(
      campaignArm,
      'the campaign path keeps evaluatePersonalBest and its write-back, unchanged',
    ).toMatch(/evaluatePersonalBest\(/);
    expect(
      campaignArm,
      'the campaign path keeps evaluatePersonalBest and its write-back, unchanged',
    ).toMatch(/previousBestRef\.current = best/);
  });

  it('an endless run skips the campaign star / next-gate follow-up (SC-3)', () => {
    const runEnded = code.match(
      /const handleRunEnded = useCallback\(([\s\S]*?)\n {4}\[platform, store, levelId\],/,
    );
    expect(runEnded?.[1], 'handleRunEnded must be extractable').toBeTruthy();
    const body = runEnded![1];
    const gateAt = body.search(/if \(modeRef\.current === 'endless'\) \{/);
    const starsAt = body.search(/blob\.bestByLevel\[levelId\]/);
    expect(
      gateAt,
      'handleRunEnded must gate the campaign follow-up on the mode (SC-3)',
    ).toBeGreaterThanOrEqual(0);
    expect(
      starsAt,
      'the campaign star read must still exist for campaign runs',
    ).toBeGreaterThanOrEqual(0);
    expect(
      gateAt,
      'the mode gate must come BEFORE the bestByLevel read, or an endless run reads campaign state',
    ).toBeLessThan(starsAt);
  });

  /**
   * 11-07 Task 4 rewrote this contract, and deliberately kept its PROPERTY: a
   * generated-board compile failure must be loud, and `advanceToWave` itself must
   * never fall through into a run-end path — it reports `false` and the CALLER
   * decides what that means. What changed is where "loud" lands. The original
   * routed the failure into `LevelErrorOverlay` via `genIssues`; 11-UI-SPEC
   * § Copywriting → `Error state (board)` forbids exactly that, because
   * `GameScreen` suppresses `showResult` whenever `levelError` is non-null, so the
   * player was left facing a control-less modal in front of a live sim. The
   * replacement is the run-ending branch in `applyChrome`, pinned below.
   *
   * The BEHAVIOUR this shape produces is driven end to end in
   * `PlayingHost.endless-retry.test.tsx` ("a wave that cannot be built ENDS the
   * run"). These contracts pin statement placement and stand in for none of it.
   */
  it('a generated-board compile failure is loud and never falls through to run end (Pitfall 6, as superseded)', () => {
    const m = code.match(
      /const advanceToWave = useCallback\(([\s\S]*?)\n {4}\[/,
    );
    expect(m?.[1], 'advanceToWave must be extractable').toBeTruthy();
    const body = m![1];
    expect(body, 'the failure path must log the issues under the full __DEV__ guard').toMatch(
      /typeof __DEV__ !== 'undefined' && __DEV__/,
    );
    expect(
      body,
      'advanceToWave must never reach the run-end path — it returns false instead (Pitfall 6)',
    ).not.toMatch(/handleRunEnded|setResult\(/);
    expect(
      code,
      'levelError must derive from the CATALOG load alone — a generated board that fails to compile must never render LevelErrorOverlay (11-UI-SPEC Error state (board))',
    ).toMatch(/const levelError = loadResult\.ok \? null : loadResult\.issues;/);
    expect(
      code,
      'genIssues is removed, not merely bypassed — a surviving declaration, setter call or levelError fold is a live route back into the trap (codeOnly strips // only, so these patterns match code forms, never the prose that explains the removal)',
    ).not.toMatch(/const \[genIssues|setGenIssues\(|genIssues \?\?/);
  });

  it('the failed wave build ends the run and releases the guard, inside the endless branch (WR-04 / SC-1)', () => {
    expect(
      endlessBranch,
      'the endless WON branch must be extractable, or every ordering claim here is vacuous',
    ).not.toBe('');
    const failure = endlessBranch.match(
      /if \(advanceToWave\(waveRef\.current \+ 1\)\) \{[\s\S]*?\} else \{([\s\S]*?)\n {10}\}/,
    );
    expect(
      failure?.[1],
      'the returned-false path must be an explicit else branch, not a fall-through',
    ).toBeTruthy();
    const body = failure![1];
    expect(
      body,
      'a latched waveAdvanceInFlightRef swallows every later WON — the failure path must clear it (SC-1)',
    ).toMatch(/waveAdvanceInFlightRef\.current = false/);
    expect(
      body,
      'the wave that could NOT be built is recorded for the copy in 11-08',
    ).toMatch(/setWaveBuildFailedWave\(waveRef\.current \+ 1\)/);
    expect(
      body,
      'the in-flight run must be recorded, through the same runEndedRef funnel (T-09-10)',
    ).toMatch(/runEndedRef\.current = true/);
    expect(
      body,
      "and recorded as abandoned — the player did not lose it",
    ).toMatch(/'abandoned'/);
    expect(
      body,
      'the frame loop must stop, or a live sim runs behind the overlay with keepAwake mounted (T-11-07-04)',
    ).toMatch(/setActive\(false\)/);
    const clearAt = body.search(/waveAdvanceInFlightRef\.current = false/);
    const recordAt = body.search(/handleRunEnded\(/);
    expect(
      clearAt,
      'release the guard BEFORE the record — handleRunEnded is the cold path and must not sit between the failure and the release',
    ).toBeLessThan(recordAt);
  });

  /**
   * A-01, decided `retry-in-place` by the owner on 2026-09-26.
   *
   * 11-09 Task 2 CORRECTED this case in place; it kept its property — both failure
   * returns must report the wave-1 build failure and the remedy must stay live — and
   * rewrote the assertions to the contract that now ships. The old shape pinned the
   * DEFECT: it required `setWaveBuildFailedWave(1)` twice in the preamble and
   * required the preamble NOT to call `setResult`, which is precisely the state
   * `11-VERIFICATION.md` gap 3 measured as unreachable — `result` null and `mode`
   * still campaign meant `GameScreen` never mounted the overlay and the copy could
   * not be read by anybody. Both failure returns now route through
   * `failEndlessStart`, which owns the write and raises the surface.
   *
   * What this case does NOT prove: it proves the statements exist and are ordered,
   * and proves NOTHING about whether the copy reaches a screen. A source contract
   * that proved the WRITE and never the RENDER is the exact mechanism that let gap 3
   * ship green while two thirds of the contract was unreachable. The rendered
   * evidence lives in `tests/ui/PlayingHost.endless-record.test.tsx` § "a failed
   * start from a fresh mount"; do not mistake this for render coverage.
   */
  it('both startEndlessRun failure returns route through failEndlessStart, which raises the surface (A-01)', () => {
    const m = code.match(
      /const startEndlessRun = useCallback\(([\s\S]*?)\n {2}\}, \[/,
    );
    expect(m?.[1], 'startEndlessRun must be extractable').toBeTruthy();
    const body = m![1];
    // Everything before the run is COMMITTED to — past this line the function is
    // building a new run, and clearing chrome is correct.
    const commitAt = body.indexOf("modeRef.current = 'endless'");
    expect(
      commitAt,
      'startEndlessRun must still commit to endless mode, or the anchor below is meaningless',
    ).toBeGreaterThan(0);
    const preamble = body.slice(0, commitAt);

    // (a) both failure returns route through the one helper.
    expect(
      body.match(/failEndlessStart\(\);/g)?.length,
      'BOTH early returns — the readiness guard and the advanceToWave(1) false return — must route through failEndlessStart. Two failure shapes is how the copy became unreachable from two thirds of its call sites',
    ).toBe(2);
    expect(
      preamble.match(/failEndlessStart\(\);/g)?.length,
      'and both must sit in the preamble, above the commit point',
    ).toBe(2);

    // (b) the helper OWNS the failure write, and no wave number is written here.
    expect(
      body.match(/setWaveBuildFailedWave\(/g)?.length,
      'startEndlessRun writes the failure wave exactly once, and it is the success-path CLEAR below — the failure write belongs to failEndlessStart alone',
    ).toBe(1);
    expect(
      preamble,
      'no failure return may write the failure wave itself — a duplicated write is a second failure shape waiting to diverge from the helper',
    ).not.toMatch(/setWaveBuildFailedWave\(/);
    expect(
      body.slice(commitAt),
      'the committed path must CLEAR the failure copy, or a successful Retry after a failed start runs a real run whose eventual loss still reads "could not be built"',
    ).toMatch(/setWaveBuildFailedWave\(null\)/);
    expect(
      body,
      'advanceToWave(1) assigns waveRef on success and pairs it with setWave — a second, unpaired assignment above a failure return is what let the ref and the HUD diverge (gap 2)',
    ).not.toMatch(/waveRef\.current = 1/);

    // (c) the build attempt is atomic: the seed is snapshotted, and the
    //     advanceToWave(1) failure branch restores it BEFORE it ends the run.
    expect(
      preamble,
      'the seed must be snapshotted before the mint, or there is nothing to restore',
    ).toMatch(/const prevSeed = runSeedRef\.current;/);
    const failureBranch = preamble.match(
      /if \(!advanceToWave\(1\)\) \{([\s\S]*?)\n {4}\}/,
    );
    expect(
      failureBranch?.[1],
      'the advanceToWave(1) failure branch must be extractable, or the two pins below are vacuous',
    ).toBeTruthy();
    const restoreAt = failureBranch![1].search(
      /runSeedRef\.current = prevSeed;/,
    );
    const failAt = failureBranch![1].search(/failEndlessStart\(\);/);
    expect(
      restoreAt,
      'a failed start must leave NOTHING of the run identity changed — the seed goes back (gap 2)',
    ).toBeGreaterThanOrEqual(0);
    expect(
      restoreAt,
      'and it must be restored before the run is ended, not after',
    ).toBeLessThan(failAt);

    // (d) the helper itself: endless mode first, the lose result after, and the
    //     record latch that stops a phantom run being written for a start that
    //     never began.
    const helper = code.match(
      /const failEndlessStart = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
    );
    expect(
      helper?.[1],
      'failEndlessStart must be extractable, or every pin below it is vacuous',
    ).toBeTruthy();
    const helperBody = helper![1];
    const modeAt = helperBody.search(/modeRef\.current = 'endless';/);
    const resultAt = helperBody.search(/setResult\('lose'\);/);
    expect(
      modeAt,
      "ResultOverlay nulls waveBuildFailedWave outside endless — the helper must flip the mode",
    ).toBeGreaterThanOrEqual(0);
    expect(
      resultAt,
      'GameScreen mounts the Results overlay only when result != null — the helper must set it',
    ).toBeGreaterThanOrEqual(0);
    expect(
      modeAt,
      'the mode flip comes first: the overlay re-renders on the mode STATE and reads the failure wave through it',
    ).toBeLessThan(resultAt);
    expect(
      helperBody,
      'a start that never began must not be recordable — 11-10 moves recordInFlightEndlessRun inside startEndlessRun, and without this latch a later Retry writes a phantom {wave:1, score:0, abandoned} run (T-11-02)',
    ).toMatch(/runEndedRef\.current = true;/);
  });

  it('the compiled-push effect is a no-op during an endless run, gated by ref (SC-5)', () => {
    const m = code.match(
      /useEffect\(\(\) => \{\n([\s\S]*?)\n {2}\}, \[loadResult, fxReady, compiledSv, setActive, retry\]\);/,
    );
    expect(m?.[1], 'the compiled-push effect must keep its dependency array').toBeTruthy();
    const body = m![1];
    const guardAt = body.search(/if \(modeRef\.current === 'endless'\) \{/);
    const pushAt = body.search(/compiledSv\.value = loadResult\.compiled/);
    expect(
      guardAt,
      'the effect must return early in endless — otherwise it overwrites the generated board and calls retry()',
    ).toBeGreaterThanOrEqual(0);
    expect(guardAt).toBeLessThan(pushAt);
    expect(
      body.slice(guardAt),
      'the guard must return, not merely branch',
    ).toMatch(/if \(modeRef\.current === 'endless'\) \{\s*return;\s*\}/);
  });

  it('the run seed is minted in the app tier and the layer boundaries hold (Pitfall 7 / LC-04)', () => {
    expect(
      code,
      'the run seed must be minted here — src/levelgen bans wall-clock reads (Pitfall 7)',
    ).toMatch(/runSeedRef\.current = Date\.now\(\) >>> 0/);
    expect(code, 'generate must come through the levelgen barrel (LC-16)').toMatch(
      /import \{ generate \} from '\.\.\/\.\.\/src\/levelgen';/,
    );
    expect(code, 'the ramp must come through the endless barrel').toMatch(
      /from '\.\.\/\.\.\/src\/services\/endless'/,
    );
    expect(
      code,
      'the app zone may not import src/core (LC-04) — compileGeneratedLevel is the seam',
    ).not.toMatch(/from '\.\.\/\.\.\/src\/core'/);
    expect(code, 'the generated board reaches the pipeline through the runtime wrapper').toMatch(
      /compileGeneratedLevel/,
    );
  });

  /**
   * 11-07 gap 1 — WHERE the endless run-boundary branches sit.
   *
   * These two contracts pin statement PLACEMENT and nothing more. The five
   * run-boundary BEHAVIOURS are driven through the real host in
   * `PlayingHost.endless-retry.test.tsx`, because `11-VERIFICATION.md` § Gaps Summary
   * is explicit that the existing suite could not see gap 1 and that a source-level
   * shape is what let it ship — so nothing here stands in for a driven case.
   */
  const onRetryBody = (() => {
    const m = code.match(
      /const onRetry = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
    );
    return m?.[1] ?? '';
  })();

  const remountDevSessionBody = (() => {
    const m = code.match(
      /const remountDevSession = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
    );
    return m?.[1] ?? '';
  })();

  /** The dependency array of a named `useCallback`, contents only. */
  function depsOf(name: string): string {
    const m = code.match(
      new RegExp(
        `const ${name} = useCallback\\(\\(\\) => \\{[\\s\\S]*?\\n {2}\\}, \\[([\\s\\S]*?)\\]\\);`,
      ),
    );
    return m?.[1] ?? '';
  }

  it('the run-boundary regions parse — the harness itself is honest', () => {
    expect(
      onRetryBody,
      'onRetry must be extractable, or its ordering contract below is vacuous',
    ).not.toBe('');
    expect(
      remountDevSessionBody,
      'remountDevSession must be extractable, or its ordering contract below is vacuous',
    ).not.toBe('');
  });

  it('onRetry routes an endless Retry to startEndlessRun before the campaign retry() (gap 1)', () => {
    const endlessAt = onRetryBody.search(
      /if \(modeRef\.current === 'endless'\) \{/,
    );
    const retryAt = onRetryBody.search(/\n\s*retry\(\);/);
    const readinessAt = onRetryBody.search(
      /if \(!levelReady \|\| levelError != null \|\| !fxReady\) \{/,
    );
    expect(
      endlessAt,
      'onRetry must branch on the mode — the campaign reset is not a new endless run',
    ).toBeGreaterThanOrEqual(0);
    expect(
      retryAt,
      'the campaign retry() must still exist — campaign behaviour is unchanged',
    ).toBeGreaterThanOrEqual(0);
    expect(
      endlessAt,
      'behind retry() the branch would never run, and lives would refill on the wave-N board',
    ).toBeLessThan(retryAt);
    // 11-10: the HOIST. Pre-11-10 the readiness gate opened the function, so an
    // endless Retry pressed while `fxReady` was false returned SILENTLY — verbatim
    // the `silent-noop` the owner rejected on 2026-09-26, on a third path.
    // `startEndlessRun` owns the endless readiness decision and routes a closed gate
    // to `failEndlessStart()`, which puts the decided copy on screen.
    expect(
      readinessAt,
      'the campaign readiness gate must still exist — campaign behaviour is unchanged',
    ).toBeGreaterThanOrEqual(0);
    expect(
      endlessAt,
      'the endless branch must come FIRST, above the readiness gate — beneath it a Retry against a closed gate is a silent no-op',
    ).toBeLessThan(readinessAt);
    expect(
      onRetryBody,
      'the branch routes to startEndlessRun and RETURNS — it no longer records anything itself (11-10: the funnel moved INSIDE startEndlessRun)',
    ).toMatch(
      /if \(modeRef\.current === 'endless'\) \{\s*startEndlessRun\(\);\s*return;\s*\}/,
    );
    expect(
      onRetryBody,
      'and it must not keep a second copy of the invariant — three readable sites is exactly the condition that let two of five callers be missed (gap 1)',
    ).not.toMatch(/recordInFlightEndlessRun/);
  });

  /**
   * 11-09 Task 3 (IN-01) — the boundary asserted where it is PRODUCED.
   *
   * `waveBuildFailureKind` in `ResultOverlay.tsx` fences the READER: `>= 2` is
   * mid-run, everything below is Retry-time. Its own unit cases prove the function.
   * What they cannot prove is that the two sites which WRITE the number still agree
   * with it — and until this block, neither writer carried any assertion at all, so a
   * Phase-14 resume-at-wave-N change would have left the reader confidently wrong
   * with nothing going red.
   *
   * What these two cases do NOT prove: they prove the two producers and the reader
   * still agree about a NUMBER. They prove nothing about whether any copy reaches a
   * screen. The reader's unit cases in `tests/ui/ResultOverlay.test.tsx` and the
   * behaviour cases in `tests/ui/PlayingHost.endless-record.test.tsx` are what prove
   * that — do not let this block stand in for either.
   */
  const failEndlessStartBody = (() => {
    const m = code.match(
      /const failEndlessStart = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
    );
    return m?.[1] ?? '';
  })();

  const midRunFailureElse = (() => {
    const m = endlessBranch.match(
      /if \(advanceToWave\(waveRef\.current \+ 1\)\) \{[\s\S]*?\} else \{([\s\S]*?)\n {10}\}/,
    );
    return m?.[1] ?? '';
  })();

  it('the two wave-build-failure writers still agree with the reader (IN-01)', () => {
    const startEndlessRunBody = (() => {
      const m = code.match(
        /const startEndlessRun = useCallback\(([\s\S]*?)\n {2}\}, \[/,
      );
      return m?.[1] ?? '';
    })();

    // Non-empty FIRST — a region that failed to extract makes every pin below it
    // vacuously green, which is the failure mode this round exists to stop.
    expect(
      startEndlessRunBody,
      'startEndlessRun must be extractable, or every pin below is vacuous',
    ).not.toBe('');
    expect(
      failEndlessStartBody,
      'failEndlessStart must be extractable, or every pin below is vacuous',
    ).not.toBe('');
    expect(
      midRunFailureElse,
      "applyChrome's advanceToWave failure else must be extractable, or every pin below is vacuous",
    ).not.toBe('');

    // The START-TIME producer: one attempt, at the literal wave 1.
    const attempts = startEndlessRunBody.match(/advanceToWave\([^)]*\)/g) ?? [];
    expect(
      attempts.length,
      'startEndlessRun makes exactly one wave-build attempt',
    ).toBe(1);
    expect(
      attempts[0],
      'and it attempts wave 1 — this literal and the one in failEndlessStart are ONE invariant spread across two functions',
    ).toBe('advanceToWave(1)');

    // The value reported for that attempt, written in the OTHER function.
    const reports =
      failEndlessStartBody.match(/setWaveBuildFailedWave\([^)]*\)/g) ?? [];
    expect(
      reports.length,
      'failEndlessStart reports the failed wave exactly once',
    ).toBe(1);
    expect(
      reports[0],
      'and it reports wave 1 — a resume-at-wave-N change cannot satisfy this and the advanceToWave argument above at once, so it goes RED at the producer instead of silently inverting the body copy the reader selects',
    ).toBe('setWaveBuildFailedWave(1)');

    // The MID-RUN producer, unchanged: the failed wave is one past the last good one.
    expect(
      midRunFailureElse,
      'the mid-run writer reports waveRef.current + 1, which is what keeps mid-run at or above 2 and therefore classifiable as mid',
    ).toMatch(/setWaveBuildFailedWave\(waveRef\.current \+ 1\)/);
  });

  it('the mid-run writer carries a __DEV__ wave-floor tripwire (IN-01)', () => {
    expect(
      midRunFailureElse,
      "applyChrome's advanceToWave failure else must be extractable, or both pins below are vacuous",
    ).not.toBe('');
    expect(
      midRunFailureElse,
      'the mid classification holds only while waveRef.current is at or above the wave floor — a violation must surface at THIS writer, not as inverted copy on the overlay',
    ).toMatch(/waveRef\.current < ENDLESS_WAVE_FLOOR/);
    expect(
      midRunFailureElse,
      'the full typeof idiom, never a bare flag — a bare __DEV__ throws on a runtime that does not define it',
    ).toMatch(/typeof __DEV__ !== 'undefined' && __DEV__/);
    expect(
      code,
      'the floor must be a named constant, so the tripwire states what it is checking',
    ).toMatch(/const ENDLESS_WAVE_FLOOR = 1;/);
  });

  it('remountDevSession routes the same way (gap 1, second half)', () => {
    const endlessAt = remountDevSessionBody.search(
      /if \(modeRef\.current === 'endless'\) \{/,
    );
    const retryAt = remountDevSessionBody.search(/\n\s*retry\(\);/);
    const readinessAt = remountDevSessionBody.search(
      /if \(!levelReady \|\| levelError != null \|\| !fxReady\) \{/,
    );
    expect(
      endlessAt,
      'a DEV tier change during an endless run must not silently discard it',
    ).toBeGreaterThanOrEqual(0);
    expect(
      retryAt,
      'the campaign remount path must still exist',
    ).toBeGreaterThanOrEqual(0);
    expect(endlessAt).toBeLessThan(retryAt);
    expect(
      readinessAt,
      'the campaign readiness gate must still exist — campaign behaviour is unchanged',
    ).toBeGreaterThanOrEqual(0);
    expect(
      endlessAt,
      'the endless branch must come FIRST, above the readiness gate — same hoist as onRetry, same reason',
    ).toBeLessThan(readinessAt);
    expect(
      remountDevSessionBody,
      'the branch routes to startEndlessRun and RETURNS — it no longer records anything itself (11-10)',
    ).toMatch(
      /if \(modeRef\.current === 'endless'\) \{\s*startEndlessRun\(\);\s*return;\s*\}/,
    );
    expect(
      remountDevSessionBody,
      'and it must not keep a second copy of the invariant (gap 1)',
    ).not.toMatch(/recordInFlightEndlessRun/);
  });

  /**
   * 11-10 — `11-VERIFICATION.md` gap 1: WHERE the abandon funnel lives.
   *
   * Round 1 wired `recordInFlightEndlessRun()` at the CALLERS. Two of the five
   * `startEndlessRun` callers were missed, and one of them was the `__DEV__`
   * `Endless` button itself — measured at `recordRunEnd` calls = 0 against the real
   * host. The invariant belongs inside `startEndlessRun`, because that function is
   * what "a new run starts" MEANS, and it is the function Phase 14 promotes to the
   * production endless entry point.
   *
   * What this case does NOT prove: statement order is not evidence that a run reached
   * the store. It pins placement and nothing else. `tests/ui/PlayingHost.endless-retry.test.tsx`
   * is what proves the behaviour, by asserting on the argument `recordRunEnd`
   * actually RECEIVED — do not let this case stand in for it. That substitution, a
   * source contract standing in for a driven one, is exactly how the previous round's
   * gap shipped green.
   */
  it('startEndlessRun opens with the abandon funnel, above every write (gap 1)', () => {
    const body = (() => {
      const m = code.match(
        /const startEndlessRun = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
      );
      return m?.[1] ?? '';
    })();
    // Non-empty FIRST — a region that failed to extract makes every pin below it
    // vacuously green (11-09 Pattern 2).
    expect(
      body,
      'startEndlessRun must be extractable, or every pin below is vacuous',
    ).not.toBe('');

    // The FIRST statement, comments stripped. `waveRef.current` is what the funnel
    // reads to decide the wave it records, so anything able to move the wave — the
    // readiness gate's failEndlessStart, the seed mint, advanceToWave — must follow.
    const firstStatement = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('//'))[0];
    expect(
      firstStatement,
      'the funnel must be the FIRST statement — a run recorded after anything that can move waveRef is recorded at the wrong wave',
    ).toBe('recordInFlightEndlessRun();');
    expect(
      (body.match(/recordInFlightEndlessRun\(\)/g) ?? []).length,
      'exactly once — the invariant must be readable at ONE site, which is the whole correction',
    ).toBe(1);
    expect(
      depsOf('startEndlessRun'),
      'and it must be a declared dependency, or the memoised callback closes over a stale funnel',
    ).toMatch(/\brecordInFlightEndlessRun\b/);

    // The two callers that used to carry their own copy keep startEndlessRun and drop
    // the funnel — both halves, because a leftover dependency on a deleted call is how
    // a "cleaned up" site quietly keeps its second copy.
    for (const name of ['onRetry', 'remountDevSession'] as const) {
      const deps = depsOf(name);
      expect(deps, `${name} deps must be extractable`).not.toBe('');
      expect(
        deps,
        `${name} still routes to startEndlessRun, so it stays a dependency`,
      ).toMatch(/\bstartEndlessRun\b/);
      expect(
        deps,
        `${name} no longer calls the funnel, so it must not list it either`,
      ).not.toMatch(/\brecordInFlightEndlessRun\b/);
    }
  });

  /**
   * 11-10 Task 2 — `Lv` is an explicit EXIT from endless (A-02, owner 2026-09-26).
   *
   * BE PRECISE ABOUT WHAT THIS DOES AND DOES NOT PROVE, because one half of it is a
   * source contract for a measured reason, not for convenience.
   *
   * The BEHAVIOUR — record first, then leave the mode, then hand the next loss to the
   * campaign arm — is driven through the real host in
   * `tests/ui/PlayingHost.endless-retry.test.tsx` (`Lv exits endless (A-02)`), which
   * asserts on the argument `recordRunEnd` actually received. Deleting BOTH mode
   * writers below turns two of those cases red, the arm case with the verifier's own
   * measured message. Nothing here stands in for that.
   *
   * What is NOT behaviourally observable in this repo is the DIRECT `modeRef.current`
   * write, as distinct from `setMode` alone. Measured, not assumed: deleting
   * `modeRef.current = 'campaign'` and keeping `setMode('campaign')` leaves all 17
   * behaviour cases GREEN. The mirroring effect (`useEffect(() => { modeRef.current =
   * mode }, [mode])`) flushes inside the `act()` wrapper around every press, so by the
   * time a jsdom test can deliver the next frame the ref already reads campaign — the
   * test drives every frame itself, so the window the direct write exists to cover
   * never opens.
   *
   * That window is real on device: `applyChrome` and the compiled-push gate effect
   * read `modeRef.current`, and `applyChrome` arrives over a `useAnimatedReaction` →
   * `runOnJS` hop that can land between the synchronous `toggleDevLevel` call and
   * React's post-render effect flush. A frame in that window would read `'endless'`
   * and take the endless branch for a run that has already exited. So the write is
   * pinned HERE, as a source contract, and this comment says why rather than dressing
   * it up as behaviour (11-09 Pattern 1).
   */
  it('toggleDevLevel exits endless: records first, writes BOTH mode writers, arms nothing (A-02)', () => {
    const body = (() => {
      const m = code.match(
        /const toggleDevLevel = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
      );
      return m?.[1] ?? '';
    })();
    expect(
      body,
      'toggleDevLevel must be extractable, or every pin below is vacuous',
    ).not.toBe('');

    const firstStatement = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('//'))[0];
    expect(
      firstStatement,
      'the funnel must come FIRST — it reads waveRef.current, and it latches runEndedRef so the reset below cannot un-latch a run it just recorded',
    ).toBe('recordInFlightEndlessRun();');

    const recordAt = body.search(/recordInFlightEndlessRun\(\);/);
    const modeRefAt = body.search(/modeRef\.current = 'campaign';/);
    const setModeAt = body.search(/setMode\('campaign'\);/);
    expect(
      modeRefAt,
      'the REF write — not observable in jsdom (see this block’s note), load-bearing for any frame that lands before the mirroring effect',
    ).toBeGreaterThanOrEqual(0);
    expect(
      setModeAt,
      'and the STATE write — the W{n} readout is gated on it, so this is what makes the exit visible',
    ).toBeGreaterThanOrEqual(0);
    expect(
      recordAt,
      'record BEFORE the mode leaves, or the funnel finds campaign and no-ops on a live endless run',
    ).toBeLessThan(modeRefAt);

    // The rest of the exit: the run identity returns to 1 in step, and the advance
    // guard is released so a latched in-flight advance cannot swallow the next WON.
    expect(body, 'waveRef and setWave move together or the ref and the HUD diverge').toMatch(
      /waveRef\.current = 1;/,
    );
    expect(body).toMatch(/setWave\(1\);/);
    expect(body).toMatch(/waveAdvanceInFlightRef\.current = false;/);

    // R-24 / R-26, unchanged: the compiled-push gate effect owns arming the loop.
    // `tests/ui/PlayingHost.bake-gate.test.ts:39-46` asserts this too; it is repeated
    // here because THIS task is the one that could plausibly have broken it.
    expect(
      body,
      'the gate effect arms the loop — toggleDevLevel must not (R-26)',
    ).not.toMatch(/setActive\s*\(\s*true\s*\)/);
    expect(body, 'and it must not call retry() either (R-24)').not.toMatch(
      /\n\s*retry\(\);/,
    );

    expect(
      depsOf('toggleDevLevel'),
      'the funnel must be a declared dependency, or the memoised callback closes over a stale one',
    ).toMatch(/\brecordInFlightEndlessRun\b/);

    // The claim that makes A-02 worth closing beyond this control: before it, nothing
    // in the file ever wrote modeRef back to campaign, so the compiled-push gate effect
    // was dead for the life of the mount after the first endless entry.
    expect(
      (code.match(/modeRef\.current = 'campaign';/g) ?? []).length,
      'toggleDevLevel is the ONLY writer returning modeRef to campaign — if a second appears, the A-02 note above needs rewriting',
    ).toBe(1);
  });
});
