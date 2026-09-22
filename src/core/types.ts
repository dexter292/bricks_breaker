/** Hit surface kinds for CCD results (Wave 2+). */
export const HitKind = {
  WALL: 0,
  PADDLE: 1,
  BRICK: 2,
} as const;

/** Fixed event codes pushed into the World event ring (D-08). */
export const EventCode = {
  WALL_HIT: 1,
  PADDLE_HIT: 2,
  BRICK_HIT: 3,
  BRICK_BREAK: 4,
  BALL_OUT: 5,
  POWERUP_CATCH: 6,
  LIFE_LOST: 7,
  WIN: 8,
  LOSE: 9,
} as const;

/** Brick flag bits (D-10). */
export const BrickFlags = {
  UNBREAKABLE: 1,
} as const;

/** Run-state machine phases (Phase 3 serve / lives / win). */
export const SimPhase = {
  DOCKED: 0,
  PLAYING: 1,
  WON: 2,
  LOST: 3,
} as const;

/** Pickup type codes in pickup SoA (D-06). */
export const PickupType = {
  MULTIBALL: 1,
  EXPAND: 2,
} as const;

/** Active effect type codes in effects SoA. */
export const EffectType = {
  EXPAND: 1,
} as const;

export type Intent = {
  paddleX: number;
  /** Consumed once while docked (tap launch); ignored while playing. */
  launch: number;
};

export type Hit = {
  hit: boolean;
  t: number; // TOI in [0,1] of remaining displacement
  nx: number;
  ny: number;
  kind: number; // wall | paddle | brick
  index: number; // brick index or -1
};

/**
 * Preallocated SoA simulation world (D-07…D-09).
 * Coordinate system: y increases downward (screen space).
 */
export type World = {
  // Balls (SoA)
  ballX: Float32Array;
  ballY: Float32Array;
  ballVx: Float32Array;
  ballVy: Float32Array;
  ballRadius: Float32Array;
  ballActive: Uint8Array;
  activeBallCount: number;
  maxBalls: number;
  // Paddle
  paddleX: number;
  paddleY: number;
  paddleW: number;
  paddleH: number;
  // Run state (Phase 3)
  lives: number;
  simPhase: number;
  // Score / combo (Phase 5)
  score: number;
  combo: number;
  // Bricks
  brickX: Float32Array;
  brickY: Float32Array;
  brickW: Float32Array;
  brickH: Float32Array;
  brickHp: Int16Array;
  brickFlags: Uint8Array;
  brickCount: number;
  gridCols: number;
  gridRows: number;
  cellToBrick: Int16Array;
  /**
   * Scratch for CCD broadphase candidate indices (NF-10).
   * Ephemeral — not part of hashWorld / replay identity.
   */
  brickCandidateScratch: Int16Array;
  /**
   * Lattice broadphase (playable levels): world→cell uses origin + pitch.
   * pitchX/Y <= 0 → legacy full-field division (dense physics fixtures).
   */
  latticeOriginX: number;
  latticeOriginY: number;
  latticePitchX: number;
  latticePitchY: number;
  brickDamagedThisStep: Uint8Array;
  // Effects reserve (D-09) — empty until power-ups
  effectCount: number;
  effectType: Uint8Array;
  effectUntilTick: Int32Array;
  maxEffects: number;
  // Pickups SoA (Phase 5)
  pickupX: Float32Array;
  pickupY: Float32Array;
  pickupType: Uint8Array;
  pickupActive: Uint8Array;
  pickupCount: number;
  maxPickups: number;
  // Anti-stall (Phase 5 / PHYS-07)
  stallIdleTicks: number;
  stallTier: number;
  // RNG + time
  rngGameplay: Uint32Array; // length 1
  rngCosmetic: Uint32Array; // length 1
  tick: number;
  accumulator: number;
  // Events
  evCode: Uint16Array;
  evA: Int16Array;
  evB: Int16Array;
  evX: Float32Array;
  evY: Float32Array;
  evHead: number;
  evCount: number;
  evCap: number;
  evOverflow: number;
};
