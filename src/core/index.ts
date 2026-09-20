export { allocateWorld, type WorldCapacities } from './allocate';
export { resetWorld, loadTestGrid, type TestBrickSpec } from './reset';
export { stepWorld } from './step';
export { stepRun } from './stepRun';
export { hashWorld } from './hash';
export { nextU32, nextFloat } from './rng/mulberry32';
export { pushEvent, clearEvents } from './events/ring';
export type { World, Intent, Hit } from './types';
export { EventCode, BrickFlags, HitKind, SimPhase } from './types';
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
} from './constants';
export { loadPhase3Grid } from './levels/phase3Grid';
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
export { migrateLevel } from './levels/migrations';
export { compileLevel } from './levels/compile';
export { loadAndCompile } from './levels/load';
export {
  planBrickDamageCues,
  type BrickCueStroke,
} from './levels/damageCues';
export { dockBall, applyServe, processDocked } from './rules/serve';
export { applyLivesFromEvents } from './rules/lives';
export { countBreakableAlive, applyWinCheck } from './rules/win';
export { sweepCircleAabb } from './physics/sweep';
export { forEachBrickCandidate } from './physics/broadphase';
export { advanceBall } from './physics/integrate';
export { resolvePaddleEnglish, reflectVelocity } from './physics/resolve';
