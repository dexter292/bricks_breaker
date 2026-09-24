export { allocateWorld, type WorldCapacities } from './allocate';
export { resetWorld, loadTestGrid, type TestBrickSpec } from './reset';
export { stepWorld } from './step';
export { stepRun } from './stepRun';
export { hashWorld } from './hash';
export { nextU32, nextFloat } from './rng/mulberry32';
export { pushEvent, clearEvents } from './events/ring';
export type { World, Intent, Hit } from './types';
export {
  EventCode,
  BrickFlags,
  HitKind,
  SimPhase,
  PickupType,
  EffectType,
} from './types';
export {
  FIXED_DT,
  MAX_SUBSTEPS,
  MAX_FRAME_TIME,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  BALL_RADIUS,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  MAX_BALL_SPEED,
  PADDLE_ANGLE_CLAMP_DEG,
  MAX_BALLS,
  MAX_BRICKS,
  EVENT_RING_CAPACITY,
  MAX_EFFECTS,
  MAX_CCD_ITERATIONS,
  SEPARATION_EPS,
  DEFAULT_LIVES,
  SERVE_SPEED,
  SCORE_HIT,
  SCORE_BREAK_BONUS,
  DROP_CHANCE,
  DROP_TYPE_MULTIBALL_THRESHOLD,
  MAX_PICKUPS,
  PICKUP_WIDTH,
  PICKUP_HEIGHT,
  PICKUP_FALL_SPEED,
  EXPAND_SCALE,
  EXPAND_DURATION_SEC,
  EXPAND_DURATION_TICKS,
  EFFECT_TYPE_EXPAND,
  PICKUP_TYPE_MULTIBALL,
  PICKUP_TYPE_EXPAND,
  MULTIBALL_ANGLE_A_DEG,
  MULTIBALL_ANGLE_B_DEG,
  STALL_IDLE_SEC,
  STALL_IDLE_TICKS,
  STALL_TIER2_EXTRA_TICKS,
  STALL_TIER3_EXTRA_TICKS,
  STALL_SPEED_MULT,
  STALL_ANGLE_NUDGE_DEG,
  STALL_TIER3_REPEAT_TICKS,
  MIN_VERTICAL_RATIO,
  MIN_HORIZONTAL_RATIO,
} from './constants';
export { assignSpatialBrickCells } from './levels/spatial';
export { applyCompiledLevel } from './levels/apply';
export { SCHEMA_VERSION } from './levels/schema';
export type {
  BrickTypeDef,
  LevelFileV1,
  CompiledLevel,
  ValidationIssue,
} from './levels/schema';
export { validateLevel } from './levels/validate';
export {
  checkSolvability,
  MIN_BALL_CORRIDOR,
  type SolvabilityResult,
  type UnreachableBreakable,
  type CorridorWarning,
} from './levels/solvability';
export { migrateLevel } from './levels/migrations';
export { compileLevel } from './levels/compile';
export { loadAndCompile } from './levels/load';
export {
  planBrickDamageCues,
  type BrickCueStroke,
} from './levels/damageCues';
export { dockBall, applyServe, processDocked } from './rules/serve';
export { applyLivesFromBallCount } from './rules/lives';
export { applyScoringFromEvents } from './rules/scoring';
export { applyDropsFromBreaks, stepPickups } from './rules/pickups';
export {
  applyOrRefreshExpand,
  stepEffects,
  derivePaddleWidth,
} from './rules/effects';
export { spawnMultiballFromPaddle } from './rules/multiball';
export { countBreakableAlive, applyWinCheck } from './rules/win';
export { stepAntiStall } from './rules/stall';
export { sweepCircleAabb } from './physics/sweep';
export { collectBrickCandidatesInto } from './physics/broadphase';
export { advanceBall } from './physics/integrate';
export {
  resolvePaddleEnglish,
  reflectVelocity,
  enforceMinVerticalRatio,
  enforceMinHorizontalRatio,
} from './physics/resolve';
