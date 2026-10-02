/**
 * Plan 11-20 Task 1 — the cert-request wiring, pinned at source.
 *
 * WHAT THIS FILE IS FOR. Round 5 wrote, into an ops document, a source comment, an
 * assertion message and the phase record, that a `Cert WC` press from a mounted
 * Results panel applies the worst-case load to the run that has just ended. The
 * shipped code does not do that. `injectCertWorstCase` bumps a SharedValue counter;
 * the only thing that consumes that counter lives inside `onFrame`; the frame
 * callback is stopped on that branch; and nothing anywhere resets the counter at a
 * run boundary. So the load is QUEUED, and it applies on the first frame of the NEXT
 * run that arms the loop — below the retry-reset block, onto the freshly reset world.
 * The five `it(` cases below are that sentence, one link each.
 *
 * WHAT THIS INSTRUMENT CAN OBSERVE. It reads `src/runtime/useGameLoop.ts` off disk
 * and proves the SHAPE OF THE WIRING: which call sites exist, how many, and in which
 * order they sit inside the file. Every claim it makes is a claim about placement,
 * and placement is exactly what it reads.
 *
 * WHAT THIS INSTRUMENT CANNOT OBSERVE, stated plainly because the failure this file
 * exists to repair was a claim made against an instrument that could not see it: THIS
 * INSTRUMENT READS SOURCE AND CANNOT PRODUCE A FRAME. `onFrame` is a Reanimated
 * worklet driven by `useFrameCallback`, and nothing in this repo can run it —
 * `tests/runtime.reset-request.test.ts` is the proof: it exercises the very same
 * world helpers (`applyRetryWorldReset`, `applyCertWorstCaseInject`) by calling them
 * directly on a `World`, never through the frame callback, because there is no way
 * to drive it. For the same reason a call count on the `vi.fn()` injector in
 * `tests/ui/PlayingHost.endless-retry.test.tsx` can only ever show that the host
 * called the injector; it cannot show where the load went.
 *
 * WHO CITES THIS FILE. The four artifacts corrected in plan 11-20 Tasks 2 and 3 —
 * `app/_components/PlayingHost.tsx`, `tests/ui/PlayingHost.endless-retry.test.tsx`,
 * `.planning/phases/11-endless-mode/11-17-SUMMARY.md` and
 * `docs/ops/ENDLESS-MODE.md` — each name this file as the backing for the corrected
 * sentence. NONE of them may describe that sentence as a frame-level measurement. It
 * is a source contract, and the paragraph above is the limit of what it proves.
 *
 * WHAT THE REPO GETS FOR FREE. Link 4 binds the documentation to the code. If anyone
 * ever adds a second `certApplied.value =` assignment — clearing the request at the
 * retry-reset boundary is the fix the round-5 verifier floated, and plan 11-20 flags
 * it for Phase 14 — this file goes RED, and its message sends the author to the four
 * sentences that have to change with it.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOOP = join(process.cwd(), 'src/runtime/useGameLoop.ts');

/** Strip // line comments so a doc note can neither satisfy nor falsify a contract. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}

describe('cert-request wiring (source contract over src/runtime/useGameLoop.ts)', () => {
  const code = codeOnly(readFileSync(LOOP, 'utf8'));

  /** The injector body, anchored on its declaration and terminated at its dep array. */
  const injectorBody = (() => {
    const m = code.match(
      /const injectCertWorstCase = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[/,
    );
    return m?.[1] ?? '';
  })();

  const applyCalls = (code.match(/applyCertWorstCaseInject\(/g) ?? []).length;
  const certAppliedAssignments = (code.match(/certApplied\.value =/g) ?? []).length;

  const onFrameIdx = code.indexOf('const onFrame = useCallback(');
  const frameCallbackIdx = code.indexOf('useFrameCallback(onFrame, false)');
  const certApplyIdx = code.indexOf('applyCertWorstCaseInject(');
  const retryBlockIdx = code.indexOf('if (resetRequest.value !== resetApplied.value)');
  const certBlockIdx = code.indexOf('if (certRequest.value !== certApplied.value)');
  const lastRetryResetIdx = code.lastIndexOf('applyRetryWorldReset(');

  it('extraction guard: the injector body was found and is not empty (anchor drift is RED, not vacuously green)', () => {
    expect(
      injectorBody.length,
      'the `const injectCertWorstCase = useCallback(() => {` anchor or its `}, [` terminator drifted in src/runtime/useGameLoop.ts. Every count below is taken over this extraction, so an empty match would pass them all for the wrong reason. Re-anchor before trusting anything in this file.',
    ).toBeGreaterThan(0);
  });

  it('link 1: the injector applies nothing — it bumps the request and returns', () => {
    expect(
      (injectorBody.match(/certRequest\.value =/g) ?? []).length,
      'measured base 1. `injectCertWorstCase` holds exactly one assignment to `certRequest.value` and that is its whole body. A different count means the injector grew a second statement and link 1 of the queued-load claim needs re-reading.',
    ).toBe(1);
    expect(
      (injectorBody.match(/applyCertWorstCaseInject/g) ?? []).length,
      'measured base 0. If the apply helper appears inside the injector body then the press applies the load ITSELF, synchronously, and the corrected sentences in docs/ops/ENDLESS-MODE.md, app/_components/PlayingHost.tsx, tests/ui/PlayingHost.endless-retry.test.tsx and 11-17-SUMMARY.md are all wrong in the other direction.',
    ).toBe(0);
  });

  it('link 2: the one and only consumer of the request sits inside onFrame', () => {
    expect(
      applyCalls,
      'measured base 1. Exactly one `applyCertWorstCaseInject(` call site exists in the whole file. A second consumer would mean the request can be discharged somewhere other than a frame, and the single-consumer link of the queued-load claim is false.',
    ).toBe(1);
    expect(onFrameIdx, 'anchor `const onFrame = useCallback(` not found').toBeGreaterThanOrEqual(0);
    expect(frameCallbackIdx, 'anchor `useFrameCallback(onFrame, false)` not found').toBeGreaterThanOrEqual(0);
    expect(certApplyIdx, 'anchor `applyCertWorstCaseInject(` not found').toBeGreaterThanOrEqual(0);
    expect(
      certApplyIdx > onFrameIdx && certApplyIdx < frameCallbackIdx,
      'the apply call must sit between the `onFrame` declaration and the `useFrameCallback(` registration that follows it — i.e. inside the frame callback. If it moved outside, the load no longer needs a frame and the queued-load claim is false.',
    ).toBe(true);
  });

  it('link 3: the frame callback starts inactive, so onFrame cannot run until setActive(true)', () => {
    expect(
      (code.match(/useFrameCallback\(onFrame, false\)/g) ?? []).length,
      'measured base 1. The autostart argument is `false`: the callback is registered stopped and only `setActive` arms it. If this reads 0 the callback may autostart, `onFrame` can run with no host gate, and link 3 — the link that makes a press on a stopped loop apply nothing NOW — is false.',
    ).toBe(1);
  });

  it('link 4: certApplied is assigned exactly once, at the consume site — nothing resets it at a run boundary', () => {
    expect(
      certAppliedAssignments,
      'measured base 1. This is the link that lets a request OUTLIVE the run that created it, and it is the one most likely to change: adding `certApplied.value = certRequest.value;` to the retry-reset block is the fix the round-5 verifier floated and plan 11-20 flagged for Phase 14. If you added it deliberately, four sentences must change with it — docs/ops/ENDLESS-MODE.md (the run-boundary table row and § Limits item 2), the `runCertWorstCase` comment block in app/_components/PlayingHost.tsx, and the assertion message in tests/ui/PlayingHost.endless-retry.test.tsx — because the request would then NOT survive the run boundary.',
    ).toBe(1);
    expect(certBlockIdx, 'anchor `if (certRequest.value !== certApplied.value)` not found').toBeGreaterThanOrEqual(0);
    expect(
      code.indexOf('certApplied.value =') > certBlockIdx,
      'the single assignment must sit inside the consume block that tests the request against it. Anywhere else and it is a reset, not a consume.',
    ).toBe(true);
  });

  it('link 5: the retry-reset block runs ABOVE the cert consume, so a queued load lands on the freshly reset world', () => {
    expect(retryBlockIdx, 'anchor `if (resetRequest.value !== resetApplied.value)` not found').toBeGreaterThanOrEqual(0);
    expect(certBlockIdx, 'anchor `if (certRequest.value !== certApplied.value)` not found').toBeGreaterThanOrEqual(0);
    expect(lastRetryResetIdx, 'anchor `applyRetryWorldReset(` not found').toBeGreaterThanOrEqual(0);
    expect(
      retryBlockIdx < certBlockIdx,
      'measured base: the reset consume precedes the cert consume in `onFrame`. On a frame where both fire the world is reset FIRST and the worst-case load is applied to the reset world. Reverse the order and the load is wiped by the reset instead, which is the opposite operator consequence to the one docs/ops/ENDLESS-MODE.md § Limits item 2 now states.',
    ).toBe(true);
    expect(
      lastRetryResetIdx < certApplyIdx,
      'the last `applyRetryWorldReset(` call must still precede the cert apply. If a reset moved below it, the queued load is discarded rather than applied and the corrected operator consequence needs revisiting.',
    ).toBe(true);
  });
});
