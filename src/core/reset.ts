import type { World } from './types';
import { BrickFlags, SimPhase } from './types';

/**
 * Reset mutable World fields in place (zero alloc) for tests (D-11 / D-13).
 * Seeds both RNG streams from the provided values.
 *
 * Docks ball on paddle (vx=vy=0, simPhase=DOCKED). Clears bricks —
 * callers invoke applyCompiledLevel(world, compiled) or loadTestGrid.
 */
export function resetWorld(
  world: World,
  seedGameplay: number,
  seedCosmetic: number,
): void {
  'worklet';
  const logicalWidth = 360;
  const logicalHeight = 640;
  const ballRadius = 6;
  const paddleW = 72;
  const paddleH = 12;

  world.paddleW = paddleW;
  world.paddleH = paddleH;
  world.paddleX = logicalWidth * 0.5;
  world.paddleY = logicalHeight - paddleH * 2;

  for (let i = 0; i < world.maxBalls; i++) {
    world.ballX[i] = 0;
    world.ballY[i] = 0;
    world.ballVx[i] = 0;
    world.ballVy[i] = 0;
    world.ballRadius[i] = ballRadius;
    world.ballActive[i] = 0;
  }
  // Docked: snap above paddle center (match serve.dockBall gap)
  world.ballX[0] = world.paddleX;
  world.ballY[0] = world.paddleY - ballRadius - 1;
  world.ballVx[0] = 0;
  world.ballVy[0] = 0;
  world.ballActive[0] = 1;
  world.activeBallCount = 1;

  world.lives = 3;
  world.simPhase = SimPhase.DOCKED;

  world.brickCount = 0;
  world.gridCols = 0;
  world.gridRows = 0;
  world.latticeOriginX = 0;
  world.latticeOriginY = 0;
  world.latticePitchX = 0;
  world.latticePitchY = 0;
  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
    world.brickHp[i] = 0;
    world.brickFlags[i] = 0;
    world.brickDamagedThisStep[i] = 0;
  }

  world.effectCount = 0;
  for (let i = 0; i < world.maxEffects; i++) {
    world.effectType[i] = 0;
    world.effectUntilTick[i] = 0;
  }

  world.rngGameplay[0] = seedGameplay >>> 0;
  world.rngCosmetic[0] = seedCosmetic >>> 0;
  world.tick = 0;
  world.accumulator = 0;
  world.evHead = 0;
  world.evCount = 0;
  world.evOverflow = 0;
}

export type TestBrickSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  unbreakable?: boolean;
};

/**
 * Load an inline test brick grid into existing arrays (D-11).
 * Mutates only — no allocation. cellToBrick[i] = brick index for packed layout.
 */
export function loadTestGrid(world: World, bricks: TestBrickSpec[]): void {
  'worklet';
  const n = bricks.length < world.brickX.length ? bricks.length : world.brickX.length;
  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
    world.brickDamagedThisStep[i] = 0;
  }
  for (let i = 0; i < n; i++) {
    const b = bricks[i];
    world.brickX[i] = b.x;
    world.brickY[i] = b.y;
    world.brickW[i] = b.w;
    world.brickH[i] = b.h;
    world.brickHp[i] = b.hp;
    world.brickFlags[i] = b.unbreakable ? BrickFlags.UNBREAKABLE : 0;
    world.cellToBrick[i] = i;
  }
  world.brickCount = n;
  world.gridCols = n;
  world.gridRows = n > 0 ? 1 : 0;
  world.latticeOriginX = 0;
  world.latticeOriginY = 0;
  world.latticePitchX = 0;
  world.latticePitchY = 0;
}
