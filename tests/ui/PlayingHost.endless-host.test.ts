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

  it('the endless run records through the endless arm of the union, with the wave (N-END-02)', () => {
    const call = code.match(/store\.recordRunEnd\(([\s\S]*?)\n {6}\);/);
    expect(call?.[1], 'recordRunEnd must still be called exactly once').toBeTruthy();
    const args = call![1];
    expect(
      args,
      "the endless arm must be selected by mode, not by a caller convention (D-11)",
    ).toMatch(/modeRef\.current === 'endless'/);
    expect(args, 'the endless arm carries the wave reached (N-END-02)').toMatch(
      /mode: 'endless'[\s\S]*?wave: waveRef\.current/,
    );
    expect(args, 'the campaign arm is still reachable and still carries levelId').toMatch(
      /levelId,\s*mode: 'campaign'/,
    );
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

  it('a generated-board compile failure is loud and never falls through to run end (Pitfall 6)', () => {
    const m = code.match(
      /const advanceToWave = useCallback\(([\s\S]*?)\n {4}\[/,
    );
    expect(m?.[1], 'advanceToWave must be extractable').toBeTruthy();
    const body = m![1];
    expect(body, 'the failure path must surface the existing level-error UI').toMatch(
      /setGenIssues\(/,
    );
    expect(body, 'the failure path must log the issues under the full __DEV__ guard').toMatch(
      /typeof __DEV__ !== 'undefined' && __DEV__/,
    );
    expect(
      body,
      'advanceToWave must never reach the run-end path — it returns false instead (Pitfall 6)',
    ).not.toMatch(/handleRunEnded|setResult\(/);
    expect(
      code,
      'genIssues must actually reach levelError, or the error UI never renders',
    ).toMatch(/const levelError = genIssues \?\?/);
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
    expect(
      onRetryBody,
      'the branch must record the in-flight run, route to startEndlessRun, and RETURN',
    ).toMatch(
      /if \(modeRef\.current === 'endless'\) \{\s*recordInFlightEndlessRun\(\);\s*startEndlessRun\(\);\s*return;\s*\}/,
    );
  });

  it('remountDevSession routes the same way (gap 1, second half)', () => {
    const endlessAt = remountDevSessionBody.search(
      /if \(modeRef\.current === 'endless'\) \{/,
    );
    const retryAt = remountDevSessionBody.search(/\n\s*retry\(\);/);
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
      remountDevSessionBody,
      'the branch must record the in-flight run, route to startEndlessRun, and RETURN',
    ).toMatch(
      /if \(modeRef\.current === 'endless'\) \{\s*recordInFlightEndlessRun\(\);\s*startEndlessRun\(\);\s*return;\s*\}/,
    );
  });
});
