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
} as const;

/** Brick flag bits (D-10). */
export const BrickFlags = {
  UNBREAKABLE: 1,
} as const;

export type Intent = {
  paddleX: number;
  // reserved flags for Phase 3+; unused in Phase 2
  launch: number; // 0
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
  brickDamagedThisStep: Uint8Array;
  // Effects reserve (D-09) — empty
  effectCount: number;
  effectType: Uint8Array;
  effectUntilTick: Int32Array;
  maxEffects: number;
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
