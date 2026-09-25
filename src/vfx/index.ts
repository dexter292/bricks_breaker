/** Deletable cosmetic VFX layer barrel (D-02). */

export {
  TRAIL_MAX,
  PARTICLE_POOL_DEFAULT,
  PARTICLE_POOL_HARD_MAX,
  GHOST_CAP_DEFAULT,
  CHIP_SPARKS_AT_1,
  DESTROY_SPARKS_AT_1,
  SHAKE_CAP,
  SHAKE_DECAY,
  SHAKE_EPSILON,
  IMPULSE_DESTROY,
  IMPULSE_LIFE_LOST,
  allocateVfx,
  type VfxState,
  type VfxCaps,
} from './types';

export {
  intensityFromReduceMotion,
  trailLength,
  clampIntensity,
} from './intensity';

export { pushTrail, allocateTrails, clearTrailBall, clearTrailsFromIndex } from './trails';

export {
  spawnBurst,
  stepParticles,
  countActiveParticles,
  type SpawnKind,
  type SpawnBurstOpts,
} from './particles';

export { punchShake, stepShake, shakeOffset } from './shake';

export {
  GHOST_CAP,
  GHOST_LIFE_MAX,
  spawnBrickGhost,
  stepBrickGhosts,
  type BrickGhostGeom,
} from './brickGhosts';

export {
  PADDLE_SQUASH_T_MAX,
  punchPaddleSquash,
  stepPaddleSquash,
} from './paddleSquash';

export { stepVfx } from './stepVfx';

export {
  consumeEventsForVfx,
  defaultResolveBrickRgb,
  rgbFromBrickHp,
  type BrickRgb,
  type ConsumeVfxOpts,
} from './consumeEvents';

export {
  createAudioBatch,
  resetAudioBatch,
  appendEventsForAudio,
  type AudioBatchSoA,
} from './audioBatch';
