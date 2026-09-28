import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';

/**
 * Subscribe to OS AppState for auto-pause (PLT-01 / D-15 / T-03-03).
 *
 * On `inactive` | `background` → invoke onAutoPause (freeze + accumulator reset).
 *
 * On `active` → **never resume physics.** The invariant this file has always asserted
 * is: returning to the foreground must never resume the simulation, never mark the loop
 * active, never move the UI phase and never touch the frame accumulator. The frame loop
 * stays frozen until the player presses Resume and its 3·2·1 countdown elapses.
 *
 * That invariant is requirement PLT-01 ("app auto-pauses on OS background/interruption
 * and resumes with a countdown — no physics catch-up spiral") and threat T-03-03
 * ("AppState freeze, no auto-resume"). The `D-15` in the citation triad above is
 * **Phase 3's** D-15 ("Never auto-resume gameplay after an OS interruption"), kept
 * verbatim so the provenance is not lost — it is NOT Phase 12's D-15, which is the
 * bounded daily-history window and has no bearing on this branch at all.
 *
 * The branch is no longer EMPTY (12-05): it invokes an optional foreground
 * notification. The invariant is stronger for it rather than weaker, because what that
 * notification does is decided entirely by the caller — this helper holds no physics
 * handle, no active flag, no UI-phase value and no accumulator, so it could not resume
 * the simulation even if it wanted to.
 */
export function subscribeAppStateAutoPause(handlers: {
  onAutoPause: () => void;
  /** Optional F-26: flush pending personal-best write on background. */
  onBackgroundFlush?: () => void;
  /**
   * Optional 12-05: the app returned to the foreground.
   *
   * A pure notification. Its caller uses it to re-derive "what local calendar date is
   * it" and to recompute the daily countdown from a fresh clock read; nothing in this
   * module knows or cares. See the never-resume paragraph above for why threading a
   * callback through here cannot weaken the invariant.
   */
  onForeground?: () => void;
}): NativeEventSubscription {
  return AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive' || next === 'background') {
      handlers.onAutoPause();
      handlers.onBackgroundFlush?.();
      return;
    }
    // active: notify only — never resume the simulation, never mark the loop active,
    // never move the UI phase, never touch the frame accumulator. Frozen until the
    // player presses Resume and its countdown elapses (PLT-01 / T-03-03).
    if (next === 'active') {
      handlers.onForeground?.();
    }
  });
}
