/** Achievement policy barrel (N-ACH-01 / N-ACH-02 / LC-16) — the only surface for this policy. */

export {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_NAME_MAX,
  isKnownAchievementId,
  type Achievement,
  type AchievementCounters,
  type AchievementSnapshot,
} from './catalog';
export { qualifyingAchievements, newlyUnlockedAchievements } from './evaluate';
