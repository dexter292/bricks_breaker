/**
 * NK-2 self-check: useAnimatedReaction callback is an implicit worklet root
 * (Reanimated auto-workletize) even without a 'worklet' directive.
 * Guard must FAIL if it only scans explicit directives.
 */
import { nonWorkletHelper } from './nonWorkletHelper';

/** Local stub — guard looks at AST call shape, not runtime. */
function useAnimatedReaction(
  prepare: () => unknown,
  react: () => unknown,
): void {
  prepare();
  react();
}

export function setup(): void {
  useAnimatedReaction(
    () => nonWorkletHelper(),
    () => {
      /* react */
    },
  );
}
