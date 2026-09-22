/**
 * Regression: ball must not freeze on brick contact in tight rows (gapY < 2r).
 * Symptom: "bóng vừa chạm là đứng luôn" — stuck flush against brick underside.
 *
 * Root cause #1 (partial): separating inside contacts reflected.
 * Root cause #2: pre-CCD all-brick depenetration with gapY/gapX < 2r pushes
 * the ball out of one solid into a neighbor → permanent Y-pin (horizontal
 * slide can mask total-displacement checks).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepWorld,
  clearEvents,
  FIXED_DT,
  BALL_RADIUS,
  EventCode,
  SimPhase,
  loadAndCompile,
  loadTestGrid,
  sweepCircleAabb,
  type Intent,
} from '../src/core';

const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../assets/levels');
const intent: Intent = { paddleX: 180, launch: 0 };

function loadLevel(id: string) {
  const raw = JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as unknown;
  const result = loadAndCompile(raw);
  if (!result.ok) {
    throw new Error(`${id} failed: ${JSON.stringify(result.issues)}`);
  }
  return result.compiled;
}

/** True if circle center is strictly inside a live brick's solid AABB. */
function centerInsideAnySolidBrick(w: ReturnType<typeof allocateWorld>): boolean {
  const cx = w.ballX[0];
  const cy = w.ballY[0];
  for (let i = 0; i < w.brickCount; i++) {
    if (w.brickHp[i] <= 0) continue;
    const x0 = w.brickX[i];
    const y0 = w.brickY[i];
    const x1 = x0 + w.brickW[i];
    const y1 = y0 + w.brickH[i];
    if (cx > x0 && cx < x1 && cy > y0 && cy < y1) return true;
  }
  return false;
}

describe('ball freeze on brick contact (regression)', () => {
  it('sweep does not report a hit when overlapping but velocity already separates', () => {
    const r = BALL_RADIUS;
    const brickX = 160;
    const brickY = 200;
    const brickW = 40;
    const brickH = 20;
    const hit = sweepCircleAabb(
      brickX + brickW * 0.5,
      brickY + brickH + r * 0.5,
      r,
      0,
      400 * FIXED_DT,
      brickX,
      brickY,
      brickX + brickW,
      brickY + brickH,
    );
    expect(hit.hit).toBe(false);
  });

  it('unbreakable adjacent rows (gapY=2): ball keeps moving after underside contact', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    const brickH = 14;
    const gapY = 2;
    const y0 = 100;
    const y1 = y0 + brickH + gapY;
    loadTestGrid(w, [
      { x: 160, y: y0, w: 40, h: brickH, hp: 99, unbreakable: true },
      { x: 160, y: y1, w: 40, h: brickH, hp: 99, unbreakable: true },
    ]);

    w.ballX[0] = 180;
    w.ballY[0] = y0 + brickH + BALL_RADIUS;
    w.ballVx[0] = 40;
    w.ballVy[0] = -360;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let maxConsecutiveStuck = 0;
    let stuck = 0;
    let lastX = w.ballX[0];
    let lastY = w.ballY[0];

    for (let s = 0; s < 120; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      const moved = Math.hypot(w.ballX[0] - lastX, w.ballY[0] - lastY);
      const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
      expect(speed).toBeGreaterThan(1);
      if (moved < 0.05) {
        stuck += 1;
        if (stuck > maxConsecutiveStuck) maxConsecutiveStuck = stuck;
      } else {
        stuck = 0;
      }
      lastX = w.ballX[0];
      lastY = w.ballY[0];
    }

    expect(maxConsecutiveStuck).toBeLessThan(8);
  });

  it('level-03: after first brick contact, ball is not position-pinned', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    applyCompiledLevel(w, loadLevel('level-03'));

    const bi = Math.min(17, w.brickCount - 1);
    const bx = w.brickX[bi] + w.brickW[bi] * 0.5;
    const by = w.brickY[bi];
    const bh = w.brickH[bi];
    const r = w.ballRadius[0] || BALL_RADIUS;

    w.ballX[0] = bx;
    w.ballY[0] = by + bh + r + 30;
    w.ballVx[0] = 40;
    w.ballVy[0] = -480;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.simPhase = SimPhase.PLAYING;

    let contacted = false;
    let frozenFrames = 0;
    let lastX = w.ballX[0];
    let lastY = w.ballY[0];

    for (let s = 0; s < 300; s++) {
      clearEvents(w);
      const hpBefore = w.brickHp[bi];
      stepWorld(w, intent, FIXED_DT);

      const hitBrick =
        w.brickHp[bi] < hpBefore ||
        (() => {
          const n = w.evCount;
          const start = (w.evHead - n + w.evCap) % w.evCap;
          for (let i = 0; i < n; i++) {
            const c = w.evCode[(start + i) % w.evCap];
            if (c === EventCode.BRICK_HIT || c === EventCode.BRICK_BREAK) return true;
          }
          return false;
        })();

      if (hitBrick) contacted = true;

      if (contacted && w.ballActive[0] === 1) {
        const speed = Math.hypot(w.ballVx[0], w.ballVy[0]);
        const moved = Math.hypot(w.ballX[0] - lastX, w.ballY[0] - lastY);
        expect(speed).toBeGreaterThan(1);
        if (moved < 1e-4) frozenFrames += 1;
        else frozenFrames = 0;
        expect(frozenFrames).toBeLessThan(8);
      }

      lastX = w.ballX[0];
      lastY = w.ballY[0];
      if (w.ballActive[0] === 0) break;
    }

    expect(contacted).toBe(true);
  });

  /**
   * HARDER: dense steel grid with gapX/gapY << 2r.
   * Horizontal slide can mask total-displacement freezes — assert Y escape
   * from the cluster and no long solid-embed streak.
   * Before root-cause #2 fix this stays Y-pinned near ~110 for hundreds of steps.
   */
  it('dense 2×3 steel (gapY=2,gapX=4): escapes cluster — no long Y-pin or solid embed', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    const brickW = 32;
    const brickH = 14;
    const gapX = 4;
    const gapY = 2;
    const y0 = 100;
    const y1 = y0 + brickH + gapY;
    const clusterTop = y0;
    const clusterBot = y1 + brickH;
    loadTestGrid(w, [
      { x: 100, y: y0, w: brickW, h: brickH, hp: 99, unbreakable: true },
      { x: 100 + brickW + gapX, y: y0, w: brickW, h: brickH, hp: 99, unbreakable: true },
      { x: 100 + 2 * (brickW + gapX), y: y0, w: brickW, h: brickH, hp: 99, unbreakable: true },
      { x: 100, y: y1, w: brickW, h: brickH, hp: 99, unbreakable: true },
      { x: 100 + brickW + gapX, y: y1, w: brickW, h: brickH, hp: 99, unbreakable: true },
      { x: 100 + 2 * (brickW + gapX), y: y1, w: brickW, h: brickH, hp: 99, unbreakable: true },
    ]);

    // Flush under middle top brick (same geometry as device underside stick).
    w.ballX[0] = 100 + brickW + gapX + brickW * 0.5;
    w.ballY[0] = y0 + brickH + BALL_RADIUS;
    w.ballVx[0] = 20;
    w.ballVy[0] = -360;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;

    let maxYPin = 0;
    let yPin = 0;
    let maxEmbed = 0;
    let embed = 0;
    let escaped = false;
    let lastY = w.ballY[0];

    for (let s = 0; s < 300; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      const dy = Math.abs(w.ballY[0] - lastY);
      if (dy < 0.05) {
        yPin += 1;
        if (yPin > maxYPin) maxYPin = yPin;
      } else {
        yPin = 0;
      }
      if (centerInsideAnySolidBrick(w)) {
        embed += 1;
        if (embed > maxEmbed) maxEmbed = embed;
      } else {
        embed = 0;
      }
      // Escaped below or above the two-row cluster
      if (w.ballY[0] > clusterBot + BALL_RADIUS + 2 || w.ballY[0] < clusterTop - BALL_RADIUS - 2) {
        escaped = true;
        break;
      }
      lastY = w.ballY[0];
    }

    expect(escaped).toBe(true);
    expect(maxYPin).toBeLessThan(12);
    expect(maxEmbed).toBeLessThan(8);
  });

  it('level-03 dense mid pack 600 steps: no long solid-embed streak after contact', () => {
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    applyCompiledLevel(w, loadLevel('level-03'));

    // Find a brick in the dense mid band (rows with HP≥2 pack).
    let target = -1;
    for (let i = 0; i < w.brickCount; i++) {
      if (w.brickHp[i] < 2) continue;
      const cy = w.brickY[i] + w.brickH[i] * 0.5;
      if (cy > 150 && cy < 250 && w.brickX[i] > 80 && w.brickX[i] < 280) {
        target = i;
        break;
      }
    }
    expect(target).toBeGreaterThanOrEqual(0);

    const bx = w.brickX[target] + w.brickW[target] * 0.5;
    const by = w.brickY[target] + w.brickH[target];
    w.ballX[0] = bx;
    w.ballY[0] = by + BALL_RADIUS + 10;
    w.ballVx[0] = 50;
    w.ballVy[0] = -420;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.simPhase = SimPhase.PLAYING;

    let hpSum0 = 0;
    for (let i = 0; i < w.brickCount; i++) {
      if (w.brickHp[i] > 0) hpSum0 += w.brickHp[i];
    }

    let contacted = false;
    let maxEmbed = 0;
    let embed = 0;
    let maxYPin = 0;
    let yPin = 0;
    let lastY = w.ballY[0];

    for (let s = 0; s < 600; s++) {
      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);
      let hpSum1 = 0;
      for (let i = 0; i < w.brickCount; i++) {
        if (w.brickHp[i] > 0) hpSum1 += w.brickHp[i];
      }
      if (hpSum1 < hpSum0) contacted = true;

      const dy = Math.abs(w.ballY[0] - lastY);
      if (w.ballActive[0] && dy < 0.05) {
        yPin += 1;
        if (yPin > maxYPin) maxYPin = yPin;
      } else {
        yPin = 0;
      }
      if (centerInsideAnySolidBrick(w)) {
        embed += 1;
        if (embed > maxEmbed) maxEmbed = embed;
      } else {
        embed = 0;
      }
      lastY = w.ballY[0];
      if (!w.ballActive[0]) break;
    }

    // Either damaged bricks or left the field — must not sit embedded.
    expect(contacted || w.ballActive[0] === 0).toBe(true);
    expect(maxEmbed).toBeLessThan(10);
    expect(maxYPin).toBeLessThan(30);
  });
});
