/**
 * NF-2 / F-27 — near-vertical soft-lock guards (PHYS-04).
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
  clearEvents,
  FIXED_DT,
  MIN_HORIZONTAL_RATIO,
  PADDLE_ANGLE_CLAMP_DEG,
  EventCode,
  SimPhase,
  loadAndCompile,
  resolvePaddleEnglish,
  type Intent,
} from '../src/core';

const CLAMP_RAD = (PADDLE_ANGLE_CLAMP_DEG * Math.PI) / 180;
const MIN_HORIZ_RAD = (8 * Math.PI) / 180;

function angleFromUp(vx: number, vy: number): number {
  return Math.atan2(vx, -vy);
}

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');

function loadLevel(id: string) {
  const raw = JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as unknown;
  const result = loadAndCompile(raw);
  if (!result.ok) {
    throw new Error(`${id} failed: ${JSON.stringify(result.issues)}`);
  }
  return result.compiled;
}

describe('near-vertical guards (NF-2 / F-27)', () => {
  it('center paddle hit enforces |vx|/speed >= MIN_HORIZONTAL_RATIO', () => {
    const out = resolvePaddleEnglish(180, 180, 36, 0, 400);
    const speed = Math.hypot(out.vx, out.vy);
    expect(speed).toBeGreaterThan(0);
    expect(Math.abs(out.vx) / speed).toBeGreaterThanOrEqual(
      MIN_HORIZONTAL_RATIO - 1e-6,
    );
  });

  it('paddle map is strictly monotonic — no flat dead zone at 8° (NG-1)', () => {
    const paddleCx = 180;
    const halfW = 36;
    const speed = 420;
    const center = { ...resolvePaddleEnglish(paddleCx, paddleCx, halfW, 0, speed) };
    const mid = {
      ...resolvePaddleEnglish(paddleCx + 4.6, paddleCx, halfW, 0, speed),
    };
    const edge = {
      ...resolvePaddleEnglish(
        paddleCx + halfW,
        paddleCx,
        halfW,
        0,
        speed,
      ),
    };

    const centerAngle = angleFromUp(center.vx, center.vy);
    const midAngle = angleFromUp(mid.vx, mid.vy);
    const edgeAngle = angleFromUp(edge.vx, edge.vy);

    expect(centerAngle).toBeCloseTo(MIN_HORIZ_RAD, 3);
    expect(midAngle).toBeGreaterThan(centerAngle + 1e-6);
    expect(edgeAngle).toBeCloseTo(CLAMP_RAD, 3);
  });

  it('level-03 center-track: no hundreds-long near-vertical streak after paddle contact', () => {
    const w = allocateWorld();
    resetWorld(w, 0xace, 0xbeef);
    applyCompiledLevel(w, loadLevel('level-03'));

    let intent: Intent = { paddleX: w.paddleX, launch: 1 };
    stepRun(w, intent, FIXED_DT);
    expect(w.simPhase).toBe(SimPhase.PLAYING);

    let sawPaddle = false;
    let nearVerticalStreak = 0;
    let maxNearVerticalStreak = 0;
    const floor = MIN_HORIZONTAL_RATIO - 1e-6;

    for (let s = 0; s < 2000; s++) {
      clearEvents(w);
      intent = { paddleX: w.ballX[0], launch: 0 };
      stepRun(w, intent, FIXED_DT);

      for (let i = 0; i < w.evCount; i++) {
        const idx = (w.evHead - w.evCount + i + w.evCap) % w.evCap;
        if (w.evCode[idx] === EventCode.PADDLE_HIT) {
          sawPaddle = true;
        }
      }

      if (w.ballActive[0] === 1 && sawPaddle) {
        const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
        if (speed > 0 && Math.abs(w.ballVx[0]) / speed < floor) {
          nearVerticalStreak += 1;
          if (nearVerticalStreak > maxNearVerticalStreak) {
            maxNearVerticalStreak = nearVerticalStreak;
          }
        } else {
          nearVerticalStreak = 0;
        }
      }

      if (w.simPhase === SimPhase.DOCKED) {
        intent = { paddleX: w.paddleX, launch: 1 };
        stepRun(w, intent, FIXED_DT);
      }
      if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) {
        break;
      }
    }

    expect(sawPaddle).toBe(true);
    expect(maxNearVerticalStreak).toBeLessThan(100);
  });
});
