/** Daily date policy barrel (N-DAILY-01 / N-DAILY-03 / LC-16) — the only surface for this policy. */

export {
  localDateKey,
  nextLocalMidnightMs,
  previousDateKey,
  isValidDateKey,
  DAILY_DIFFICULTY,
} from './dateKey';
export { hasResultFor, streakFrom, endedStreakLength } from './streak';
