import type { Intent, World } from './types';
import { SimPhase } from './types';
import { stepWorld } from './step';
import { clearEvents } from './events/ring';
import { processDocked } from './rules/serve';
import { applyLivesFromEvents } from './rules/lives';
import { applyWinCheck } from './rules/win';

/**
 * Orchestrate dock/serve + physics + lives/win for one fixed step.
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

  // PLAYING
  clearEvents(world);
  stepWorld(world, intent, dt);
  applyLivesFromEvents(world);
  applyWinCheck(world);
}
