import type { World } from './types';

export type WorldCapacities = {
  maxBalls?: number;
  maxBricks?: number;
  eventCap?: number;
  maxEffects?: number;
};

/**
 * Allocate a mutable SoA World once (D-07…D-09 / D-13).
 * Deterministic seeds only — no host RNG or wall-clock reads.
 */
export function allocateWorld(capacities?: WorldCapacities): World {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const logicalWidth = 360;
  const logicalHeight = 640;
  const ballRadius = 6;
  const paddleW = 72;
  const paddleH = 12;
  const defaultMaxBalls = 8;
  const defaultMaxBricks = 256;
  const defaultEventCap = 128;
  const defaultMaxEffects = 16;
  const seedGameplay = 0xc0ffee01;
  const seedCosmetic = 0xbadc0de2;

  const maxBalls = Math.max(
    2,
    Math.floor(capacities?.maxBalls ?? defaultMaxBalls),
  );
  const maxBricks = Math.max(
    1,
    Math.floor(capacities?.maxBricks ?? defaultMaxBricks),
  );
  const eventCap = Math.max(
    1,
    Math.floor(capacities?.eventCap ?? defaultEventCap),
  );
  const maxEffects = Math.max(
    1,
    Math.floor(capacities?.maxEffects ?? defaultMaxEffects),
  );

  const ballX = new Float32Array(maxBalls);
  const ballY = new Float32Array(maxBalls);
  const ballVx = new Float32Array(maxBalls);
  const ballVy = new Float32Array(maxBalls);
  const ballRadiusArr = new Float32Array(maxBalls);
  const ballActive = new Uint8Array(maxBalls);

  const brickX = new Float32Array(maxBricks);
  const brickY = new Float32Array(maxBricks);
  const brickW = new Float32Array(maxBricks);
  const brickH = new Float32Array(maxBricks);
  const brickHp = new Int16Array(maxBricks);
  const brickFlags = new Uint8Array(maxBricks);
  const brickDamagedThisStep = new Uint8Array(maxBricks);
  const cellToBrick = new Int16Array(maxBricks);
  for (let i = 0; i < maxBricks; i++) {
    cellToBrick[i] = -1;
  }

  const effectType = new Uint8Array(maxEffects);
  const effectUntilTick = new Int32Array(maxEffects);

  const rngGameplay = new Uint32Array(1);
  const rngCosmetic = new Uint32Array(1);
  rngGameplay[0] = seedGameplay >>> 0;
  rngCosmetic[0] = seedCosmetic >>> 0;

  const evCode = new Uint16Array(eventCap);
  const evA = new Int16Array(eventCap);
  const evB = new Int16Array(eventCap);
  const evX = new Float32Array(eventCap);
  const evY = new Float32Array(eventCap);

  // Paddle at bottom center
  const paddleX = logicalWidth * 0.5;
  const paddleY = logicalHeight - paddleH * 2;

  // Docked ball on paddle (vx=vy=0); callers set velocity for free-flight fixtures
  ballX[0] = paddleX;
  ballY[0] = paddleY - ballRadius - 1;
  ballVx[0] = 0;
  ballVy[0] = 0;
  ballRadiusArr[0] = ballRadius;
  ballActive[0] = 1;
  for (let i = 1; i < maxBalls; i++) {
    ballRadiusArr[i] = ballRadius;
    ballActive[i] = 0;
  }

  return {
    ballX,
    ballY,
    ballVx,
    ballVy,
    ballRadius: ballRadiusArr,
    ballActive,
    activeBallCount: 1,
    maxBalls,
    paddleX,
    paddleY,
    paddleW,
    paddleH,
    lives: 3,
    simPhase: 0, // SimPhase.DOCKED
    brickX,
    brickY,
    brickW,
    brickH,
    brickHp,
    brickFlags,
    brickCount: 0,
    gridCols: 0,
    gridRows: 0,
    cellToBrick,
    latticeOriginX: 0,
    latticeOriginY: 0,
    latticePitchX: 0,
    latticePitchY: 0,
    brickDamagedThisStep,
    effectCount: 0,
    effectType,
    effectUntilTick,
    maxEffects,
    rngGameplay,
    rngCosmetic,
    tick: 0,
    accumulator: 0,
    evCode,
    evA,
    evB,
    evX,
    evY,
    evHead: 0,
    evCount: 0,
    evCap: eventCap,
    evOverflow: 0,
  };
}
