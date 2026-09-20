import type { Intent, World } from './types';
import { SimPhase } from './types';
import { stepWorld } from './step';
import { clearEvents } from './events/ring';
import { processDocked } from './rules/serve';
import { applyScoringFromEvents } from './rules/scoring';
import { applyDropsFromBreaks, stepPickups } from './rules/pickups';
import { stepEffects } from './rules/effects';
import { stepAntiStall } from './rules/stall';
import { applyLivesFromBallCount } from './rules/lives';
import { applyWinCheck } from './rules/win';

/**
 * Orchestrate dock/serve + physics + Phase 5 run rules for one fixed step.
 * Pause / AppState freeze stay in runtime — not here.
 */
export function stepRun(world: World, intent: Intent, dt: number): void {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const logicalWidth = 360;
  const serveSpeed = 360; // SERVE_SPEED

  const phase = world.simPhase;
  if (phase === SimPhase.WON || phase === SimPhase.LOST) {
    return;
  }

  if (phase === SimPhase.DOCKED) {
    // Apply finite paddleX so docked ball rides drag (T-03-01)
    // Uses current paddleW (base after life-reset; expand-aware if docked mid-expand)
    const px = intent.paddleX;
    if (Number.isFinite(px)) {
      const half = world.paddleW * 0.5;
      let x = px;
      if (x < half) x = half;
      else if (x > logicalWidth - half) x = logicalWidth - half;
      world.paddleX = x;
    }
    processDocked(world, intent, serveSpeed);
    world.tick += 1;
    return;
  }

  // PLAYING — score → drops → pickups → effects → stall → win → lives
  // Win before lives: cleared board + last-ball miss same step → WON, not LOST/DOCKED.
  clearEvents(world);
  stepWorld(world, intent, dt);
  applyScoringFromEvents(world);
  applyDropsFromBreaks(world);
  stepPickups(world, dt);
  stepEffects(world);
  stepAntiStall(world);
  applyWinCheck(world);
  if (world.simPhase === SimPhase.PLAYING) {
    applyLivesFromBallCount(world);
  }
}
