/**
 * E2 — deterministic headless bot for balance measurement (N-CNT-01 / N-CNT-03).
 *
 * The paddle tracks the lowest live ball with a fixed lateral offset. Offset 0 is the
 * degenerate case (ball returns straight up, long clears); non-zero offsets inject the
 * angle variety a real player produces. Seeds are explicit so every measurement replays.
 *
 * This is a measuring instrument, not a player model: it never misses on purpose, so its
 * clear time is a *floor* on human duration, and its lives-remaining is always maximal.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepRun,
  FIXED_DT,
  SimPhase,
  SERVE_SPEED,
  MAX_BALL_SPEED,
  loadAndCompile,
  type Intent,
} from '../../src/core';
import type { LevelFileV1 } from '../../src/core/levels/schema';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../../assets/levels');

export const TICKS_PER_SECOND = Math.round(1 / FIXED_DT);

export function readLevelFile(id: string): LevelFileV1 {
  return JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as LevelFileV1;
}

export type BotOutcome = 'WON' | 'LOST' | 'TIMEOUT';

export type BotResult = {
  outcome: BotOutcome;
  ticks: number;
  seconds: number;
  score: number;
  lives: number;
  bricksRemaining: number;
};

export type BotOptions = {
  /** Lateral paddle offset in world units; 0 is the degenerate straight-return case. */
  paddleOffset?: number;
  seedA?: number;
  seedB?: number;
  /** Give up after this many ticks (default 6 simulated minutes). */
  maxTicks?: number;
  /**
   * F-45 experiment only (N-CNT-03). Fraction of SERVE_SPEED added per elapsed second,
   * applied **outside** core after each step and clamped to MAX_BALL_SPEED.
   * Core physics is untouched — this measures what a ramp would buy, nothing ships.
   */
  rampPerSecond?: number;
};

/** F-45 probe: rescale every live ball to the ramped speed. Direction preserved. */
function applyRampProbe(
  w: ReturnType<typeof allocateWorld>,
  elapsedSeconds: number,
  rampPerSecond: number,
): void {
  const target = Math.min(
    SERVE_SPEED * (1 + rampPerSecond * elapsedSeconds),
    MAX_BALL_SPEED,
  );
  for (let i = 0; i < w.ballActive.length; i++) {
    if (w.ballActive[i] !== 1) continue;
    const vx = w.ballVx[i]!;
    const vy = w.ballVy[i]!;
    const spd = Math.hypot(vx, vy);
    if (spd <= 1e-6) continue;
    const k = target / spd;
    w.ballVx[i] = vx * k;
    w.ballVy[i] = vy * k;
  }
}

/** Index of the live ball closest to the bottom, or -1. */
function lowestLiveBall(w: ReturnType<typeof allocateWorld>): number {
  let best = -1;
  let bestY = -Infinity;
  for (let i = 0; i < w.ballActive.length; i++) {
    if (w.ballActive[i] !== 1) continue;
    const y = w.ballY[i]!;
    if (y > bestY) {
      bestY = y;
      best = i;
    }
  }
  return best;
}

function bricksRemaining(w: ReturnType<typeof allocateWorld>): number {
  let n = 0;
  for (let i = 0; i < w.brickCount; i++) {
    if (w.brickHp[i]! > 0 && w.brickHp[i]! < 99) n++;
  }
  return n;
}

/** Play one level to WON / LOST / TIMEOUT and report the run. */
export function runBot(levelId: string, opts: BotOptions = {}): BotResult {
  const { paddleOffset = 0, seedA = 0xace, seedB = 0xbeef, rampPerSecond = 0 } = opts;
  const maxTicks = opts.maxTicks ?? TICKS_PER_SECOND * 360;

  const compiled = loadAndCompile(readLevelFile(levelId));
  if (!compiled.ok) {
    throw new Error(`${levelId} failed to compile: ${JSON.stringify(compiled.issues)}`);
  }

  const w = allocateWorld();
  resetWorld(w, seedA, seedB);
  applyCompiledLevel(w, compiled.compiled);

  let ticks = 0;
  let intent: Intent = { paddleX: w.paddleX, launch: 1 };

  while (ticks < maxTicks) {
    stepRun(w, intent, FIXED_DT);
    ticks++;

    if (rampPerSecond > 0 && w.simPhase === SimPhase.PLAYING) {
      applyRampProbe(w, ticks / TICKS_PER_SECOND, rampPerSecond);
    }

    if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;

    if (w.simPhase === SimPhase.DOCKED) {
      // Serve (cold start and after every life loss).
      intent = { paddleX: w.paddleX, launch: 1 };
      continue;
    }

    const b = lowestLiveBall(w);
    intent = {
      paddleX: b >= 0 ? w.ballX[b]! + paddleOffset : w.paddleX,
      launch: 0,
    };
  }

  const outcome: BotOutcome =
    w.simPhase === SimPhase.WON ? 'WON' : w.simPhase === SimPhase.LOST ? 'LOST' : 'TIMEOUT';

  return {
    outcome,
    ticks,
    seconds: Number((ticks / TICKS_PER_SECOND).toFixed(1)),
    score: w.score,
    lives: w.lives,
    bricksRemaining: bricksRemaining(w),
  };
}

/** Static authored-difficulty facts, independent of any bot run. */
export type LevelStatics = {
  bricks: number;
  totalHp: number;
  steel: number;
  explosive: number;
  rows: number;
  cols: number;
  /** Max score if every HP is removed at combo 1 — the floor of the score ceiling. */
  baseScore: number;
};

export function levelStatics(id: string, scoreHit: number): LevelStatics {
  const raw = readLevelFile(id);
  let bricks = 0;
  let totalHp = 0;
  let steel = 0;
  let explosive = 0;

  for (const row of raw.cells) {
    for (const ch of row) {
      if (ch === '.') continue;
      const def = raw.brickTypes[ch];
      if (def == null) continue;
      if (def.unbreakable === true) {
        steel++;
        continue;
      }
      bricks++;
      totalHp += def.hp;
      if (def.explosive === true) explosive++;
    }
  }

  return {
    bricks,
    totalHp,
    steel,
    explosive,
    rows: raw.grid.rows,
    cols: raw.grid.cols,
    baseScore: totalHp * scoreHit,
  };
}
