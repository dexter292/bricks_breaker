export { allocateWorld, type WorldCapacities } from './allocate';
export { resetWorld, loadTestGrid, type TestBrickSpec } from './reset';
export { stepWorld } from './step';
export { hashWorld } from './hash';
export { nextU32, nextFloat } from './rng/mulberry32';
export { pushEvent, clearEvents } from './events/ring';
export type { World, Intent, Hit } from './types';
export { EventCode, BrickFlags, HitKind } from './types';
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
} from './constants';
