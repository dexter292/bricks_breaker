/**
 * Serve / resume tap gate predicates (D-11 / D-12 / D-15).
 * Pure TS — no RNGH imports.
 */

export function shouldAcceptServeTap(args: {
  simPhaseDocked: boolean;
  uiPaused: boolean;
  countdown: boolean;
  panActive: boolean;
}): boolean {
  'worklet';
  return (
    args.simPhaseDocked &&
    !args.uiPaused &&
    !args.countdown &&
    !args.panActive
  );
}

export function shouldAcceptResumeTap(args: {
  uiPaused: boolean;
  countdown: boolean;
  fromResumeControl: boolean;
}): boolean {
  'worklet';
  return args.uiPaused && !args.countdown && args.fromResumeControl;
}
