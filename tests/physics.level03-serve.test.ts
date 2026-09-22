/**
 * Device-path regression: full stepRun pipeline + real level-03 serve.
 * Vitest runs plain JS; if this fails, physics is still broken in the play path.
 * If it passes but device sticks, suspect worklet/Metro divergence.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepRun,
  FIXED_DT,
  BALL_RADIUS,
  SERVE_SPEED,
  SimPhase,
  loadAndCompile,
  type Intent,
} from '../src/core';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');

function loadLevel(id: string) {
  const raw = JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as unknown;
  const result = loadAndCompile(raw);
  if (!result.ok) {
    throw new Error(`${id} failed: ${JSON.stringify(result.issues)}`);
  }
  return result.compiled;
}

function circleOverlapsExpandedBrick(
  w: ReturnType<typeof allocateWorld>,
  bi: number,
): boolean {
  const cx = w.ballX[0];
  const cy = w.ballY[0];
  const r = w.ballRadius[0] || BALL_RADIUS;
  for (let i = 0; i < w.brickCount; i++) {
    if (w.brickHp[i] <= 0) continue;
    const minX = w.brickX[i] - r;
    const minY = w.brickY[i] - r;
    const maxX = w.brickX[i] + w.brickW[i] + r;
    const maxY = w.brickY[i] + w.brickH[i] + r;
    if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) return true;
  }
  return false;
}

describe('level-03 stepRun serve (device play path)', () => {
  it('compiled level-03 loads with in-playfield bricks', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    const compiled = loadLevel('level-03');
    applyCompiledLevel(w, compiled);
    expect(w.brickCount).toBeGreaterThan(0);
    // Gaps may be < 2r (dense pack is valid for swept CCD). Spot-check bounds.
    for (let i = 0; i < w.brickCount; i++) {
      expect(w.brickX[i]).toBeGreaterThanOrEqual(0);
      expect(w.brickY[i]).toBeGreaterThanOrEqual(0);
      expect(w.brickX[i] + w.brickW[i]).toBeLessThanOrEqual(360 + 1e-6);
      expect(w.brickY[i] + w.brickH[i]).toBeLessThanOrEqual(640 + 1e-6);
    }
  });

  it('serve + 3000 stepRun frames: no long Y-pin while overlapping bricks', () => {
    const w = allocateWorld();
    resetWorld(w, 0xace, 0xbeef);
    applyCompiledLevel(w, loadLevel('level-03'));
    expect(w.simPhase).toBe(SimPhase.DOCKED);

    // Launch (processDocked via stepRun)
    let intent: Intent = { paddleX: w.paddleX, launch: 1 };
    stepRun(w, intent, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.PLAYING);
    expect(w.ballActive[0]).toBe(1);
    const speed0 = Math.hypot(w.ballVx[0], w.ballVy[0]);
    expect(speed0).toBeGreaterThan(SERVE_SPEED * 0.9);

    let maxYPinOverlap = 0;
    let yPinOverlap = 0;
    let lastY = w.ballY[0];
    let maxWindowDy = 0;
    const windowY: number[] = [];
    let scoreRose = false;
    const score0 = w.score;

    for (let s = 0; s < 3000; s++) {
      // Track paddle under ball (player survival)
      intent = { paddleX: w.ballX[0], launch: 0 };
      stepRun(w, intent, FIXED_DT);

      if (w.score > score0) scoreRose = true;

      const dy = Math.abs(w.ballY[0] - lastY);
      const overlapping = circleOverlapsExpandedBrick(w, 0);
      if (w.ballActive[0] === 1 && overlapping && dy < 0.05) {
        yPinOverlap += 1;
        if (yPinOverlap > maxYPinOverlap) maxYPinOverlap = yPinOverlap;
      } else {
        yPinOverlap = 0;
      }

      windowY.push(w.ballY[0]);
      if (windowY.length > 60) windowY.shift();
      if (windowY.length === 60) {
        const span = Math.abs(windowY[59] - windowY[0]);
        if (span > maxWindowDy) maxWindowDy = span;
      }

      // Never let speed die
      if (w.ballActive[0] === 1) {
        const spd = Math.hypot(w.ballVx[0], w.ballVy[0]);
        expect(spd).toBeGreaterThan(1);
      }

      lastY = w.ballY[0];
      if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;
      if (w.simPhase === SimPhase.DOCKED) {
        // life lost — relaunch
        intent = { paddleX: w.paddleX, launch: 1 };
        stepRun(w, intent, FIXED_DT);
      }
    }

    // Must not sit glued to a brick underside for >20 frames
    expect(maxYPinOverlap).toBeLessThan(20);
    // After contact, either score moved or ball traveled vertically in some window
    expect(scoreRose || maxWindowDy > 50).toBe(true);
  });
});
