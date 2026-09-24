/**
 * Playable campaign level ids (N-LVL-01 / NH-2 / N-PROG).
 * Domain type — lives in core so services/storage may depend on it (LC boundaries).
 *
 * level-02.json remains on disk as a compile/solvability negative fixture but is
 * NOT a LevelId.
 */
export type LevelId =
  | 'level-01'
  | 'level-03'
  | 'level-04'
  | 'level-05'
  | 'level-06';
