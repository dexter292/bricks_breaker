import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';

/**
 * Subscribe to OS AppState for auto-pause (PLT-01 / D-15 / T-03-03).
 *
 * On `inactive` | `background` → invoke onAutoPause (freeze + accumulator reset).
 * On `active` → intentionally empty: never auto-resume physics.
 * Returning to foreground must stay frozen until Resume → countdown (Plan 05).
 */
export function subscribeAppStateAutoPause(handlers: {
  onAutoPause: () => void;
  /** Optional F-26: flush pending personal-best write on background. */
  onBackgroundFlush?: () => void;
}): NativeEventSubscription {
  return AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive' || next === 'background') {
      handlers.onAutoPause();
      handlers.onBackgroundFlush?.();
    }
    // active: intentionally empty — never auto-resume (D-15)
  });
}
