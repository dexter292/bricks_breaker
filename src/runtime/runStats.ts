/**
 * N-STAT-01 — read-only per-run telemetry reducer (Phase 9).
 *
 * Drains the World event ring into a flat counter record. Strictly read-only:
 * never writes a `world.*` field, never calls `clearEvents` (stepRun owns clear
 * policy — the same contract `consumeEventsForVfx` follows).
 *
 * Decision anchors (`.planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md`):
 *   D-06 base counters · D-07 per-pickup-type counts · D-08 largest explosive cascade
 *   D-10 `longestRally` (consecutive paddle hits without losing a life) is a SURVIVAL
 *        streak and is deliberately NOT `bestCombo` (consecutive brick hits without
 *        paddle contact, an AGGRESSION streak) — the two must never be collapsed.
 *
 * Research pitfalls (09-RESEARCH.md):
 *   1. Cascade attribution is grid-adjacency, never substep co-occurrence (see below).
 *   2. "ticks played" is `world.tick`, read at the run boundary — deliberately NOT a
 *      field here.
 *   3. `livesLost` counts LIFE_LOST events, never `startingLives - world.lives` (the
 *      extra-life pickup raises `world.lives` mid-run).
 *
 * **Why grid-adjacency for `largestCascade`:** it feeds a Phase 13 achievement trigger
 * (D-08), so overcounting — firing an unearned unlock — is the harmful direction. The
 * cheaper "any BRICK_BREAK co-occurring with an EXPLOSIVE break in the same substep is
 * one cascade" heuristic overcounts during ordinary multiball play (up to MAX_BALLS = 8
 * balls resolve per substep). Grouping by 8-neighbor lattice adjacency — the same rule
 * `explodeAtCell` itself uses — is exact for every real playable level.
 */
import type { World } from '../core/types';
import { BrickFlags, EventCode, PickupType } from '../core/types';

export type RunStats = {
  bricksBroken: number;
  bestCombo: number;
  pickupMultiball: number;
  pickupExpand: number;
  pickupExtraLife: number;
  pickupSlow: number;
  pickupFireball: number;
  livesLost: number;
  /** Paddle hits since the last LIFE_LOST — the live streak, not the record (D-10). */
  rallyCurrent: number;
  longestRally: number;
  largestCascade: number;
};

/** All-zero counters for a fresh run (D-01: every retry is a new run). */
export function allocateRunStats(): RunStats {
  'worklet';
  return {
    bricksBroken: 0,
    bestCombo: 0,
    pickupMultiball: 0,
    pickupExpand: 0,
    pickupExtraLife: 0,
    pickupSlow: 0,
    pickupFireball: 0,
    livesLost: 0,
    rallyCurrent: 0,
    longestRally: 0,
    largestCascade: 0,
  };
}

/** Zero every field IN PLACE — callers hold the reference (mirrors the flashSv reset). */
export function resetRunStats(stats: RunStats): void {
  'worklet';
  stats.bricksBroken = 0;
  stats.bestCombo = 0;
  stats.pickupMultiball = 0;
  stats.pickupExpand = 0;
  stats.pickupExtraLife = 0;
  stats.pickupSlow = 0;
  stats.pickupFireball = 0;
  stats.livesLost = 0;
  stats.rallyCurrent = 0;
  stats.longestRally = 0;
  stats.largestCascade = 0;
}

/**
 * Plain-object snapshot for the JS-thread run boundary. Deliberately NOT a worklet —
 * only ever called from the JS side, where one allocation is free.
 */
export function cloneRunStats(stats: RunStats | null): RunStats {
  if (stats == null) {
    return allocateRunStats();
  }
  return {
    bricksBroken: stats.bricksBroken,
    bestCombo: stats.bestCombo,
    pickupMultiball: stats.pickupMultiball,
    pickupExpand: stats.pickupExpand,
    pickupExtraLife: stats.pickupExtraLife,
    pickupSlow: stats.pickupSlow,
    pickupFireball: stats.pickupFireball,
    livesLost: stats.livesLost,
    rallyCurrent: stats.rallyCurrent,
    longestRally: stats.longestRally,
    largestCascade: stats.largestCascade,
  };
}

/*
 * Module-level cascade-grouping scratch — mutated in place, never reallocated, so the
 * per-substep reducer allocates zero heap on the 120Hz path. This mirrors the
 * `_sweepScratch` / `_velScratch` precedent in `src/core/physics/{sweep,resolve}.ts`:
 * a stable array reference read from inside a `'worklet'` function is fine (the
 * "worklets cannot close over module constants" rule concerns primitive tuned literals
 * like SPEED_RAMP_PER_SECOND, not stable object/array references).
 *
 * Length is the event-ring capacity: the ring holds at most that many events between
 * clears, so one call can never observe more BRICK_BREAK events than this.
 */
const CASCADE_SCRATCH_LEN = 128; // EVENT_RING_CAPACITY (src/core/constants.ts)
const _cascadeCol = new Int16Array(CASCADE_SCRATCH_LEN);
const _cascadeRow = new Int16Array(CASCADE_SCRATCH_LEN);
const _cascadeHasLattice = new Uint8Array(CASCADE_SCRATCH_LEN);
const _cascadeExplosive = new Uint8Array(CASCADE_SCRATCH_LEN);
const _cascadeGroup = new Int16Array(CASCADE_SCRATCH_LEN);
const _cascadeGroupSize = new Int16Array(CASCADE_SCRATCH_LEN);
const _cascadeGroupExplosive = new Uint8Array(CASCADE_SCRATCH_LEN);

/**
 * Fold one substep's event-ring segment into `stats`. Call once per substep, after the
 * VFX/audio drains and before the next `stepRun` clears the ring.
 */
export function reduceRunTelemetry(world: World, stats: RunStats): void {
  'worklet';
  // bestCombo reads straight off world.combo (D-06) and must update even on a substep
  // that emitted no events — Pitfall 2: never gate it behind evCount.
  if (world.combo > stats.bestCombo) {
    stats.bestCombo = world.combo;
  }

  const n = world.evCount;
  if (n <= 0) {
    return;
  }

  // Cascade groups never span calls: explodeAtCell's recursive chain resolves entirely
  // inside one stepWorld call, so a chain's breaks always land in one ring segment.
  let breakCount = 0;
  const ringCap = 128; // EVENT_RING_CAPACITY — scratch bound, defensive only

  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];

    if (code === EventCode.BRICK_BREAK) {
      stats.bricksBroken += 1;
      const brickIndex = world.evB[idx];
      const inRange = brickIndex >= 0 && brickIndex < world.brickCount;
      // brickFlags / brickX / brickY are NOT cleared on break (only brickHp and
      // cellToBrick are), so they stay safe to read post-break for attribution.
      const flags = inRange ? world.brickFlags[brickIndex] : 0;
      if (breakCount < ringCap) {
        const pitchX = world.latticePitchX;
        const pitchY = world.latticePitchY;
        if (pitchX > 0 && pitchY > 0 && inRange) {
          // Same formula as brickLatticeCell (src/core/rules/brickDamage.ts) — that
          // helper is private to core, so it is re-implemented here read-only. Brick
          // POSITION is exact; the event's evX/evY hit point is only an approximation.
          const c = Math.round(
            (world.brickX[brickIndex] - world.latticeOriginX) / pitchX,
          );
          const r = Math.round(
            (world.brickY[brickIndex] - world.latticeOriginY) / pitchY,
          );
          if (c >= 0 && r >= 0 && c < world.gridCols && r < world.gridRows) {
            _cascadeCol[breakCount] = c;
            _cascadeRow[breakCount] = r;
            _cascadeHasLattice[breakCount] = 1;
          } else {
            _cascadeHasLattice[breakCount] = 0;
          }
        } else {
          // Dense/legacy fixture with no lattice: this entry unions with nothing, so it
          // forms its own singleton group. It can undercount, never overcount.
          _cascadeHasLattice[breakCount] = 0;
        }
        _cascadeExplosive[breakCount] =
          (flags & BrickFlags.EXPLOSIVE) !== 0 ? 1 : 0;
        breakCount += 1;
      }
      continue;
    }

    if (code === EventCode.POWERUP_CATCH) {
      const type = world.evA[idx];
      if (type === PickupType.MULTIBALL) {
        stats.pickupMultiball += 1;
      } else if (type === PickupType.EXPAND) {
        stats.pickupExpand += 1;
      } else if (type === PickupType.EXTRA_LIFE) {
        stats.pickupExtraLife += 1;
      } else if (type === PickupType.SLOW) {
        stats.pickupSlow += 1;
      } else if (type === PickupType.FIREBALL) {
        stats.pickupFireball += 1;
      }
      continue;
    }

    if (code === EventCode.LIFE_LOST) {
      // Pitfall 3: count the event, never diff livesRemaining.
      stats.livesLost += 1;
      stats.rallyCurrent = 0;
      continue;
    }

    if (code === EventCode.PADDLE_HIT) {
      stats.rallyCurrent += 1;
      if (stats.rallyCurrent > stats.longestRally) {
        stats.longestRally = stats.rallyCurrent;
      }
    }
  }

  if (breakCount <= 0) {
    return;
  }

  // Union-find over 8-neighbor lattice adjacency (Chebyshev distance <= 1).
  for (let i = 0; i < breakCount; i++) {
    _cascadeGroup[i] = i;
  }
  for (let i = 0; i < breakCount; i++) {
    if (_cascadeHasLattice[i] === 0) {
      continue;
    }
    for (let j = i + 1; j < breakCount; j++) {
      if (_cascadeHasLattice[j] === 0) {
        continue;
      }
      const dc = _cascadeCol[i] - _cascadeCol[j];
      const dr = _cascadeRow[i] - _cascadeRow[j];
      if (dc < -1 || dc > 1 || dr < -1 || dr > 1) {
        continue;
      }
      let rootI = i;
      while (_cascadeGroup[rootI] !== rootI) {
        rootI = _cascadeGroup[rootI];
      }
      let rootJ = j;
      while (_cascadeGroup[rootJ] !== rootJ) {
        rootJ = _cascadeGroup[rootJ];
      }
      if (rootI === rootJ) {
        continue;
      }
      if (rootI < rootJ) {
        _cascadeGroup[rootJ] = rootI;
      } else {
        _cascadeGroup[rootI] = rootJ;
      }
    }
  }
  for (let i = 0; i < breakCount; i++) {
    let root = i;
    while (_cascadeGroup[root] !== root) {
      root = _cascadeGroup[root];
    }
    _cascadeGroup[i] = root;
  }
  for (let i = 0; i < breakCount; i++) {
    _cascadeGroupSize[i] = 0;
    _cascadeGroupExplosive[i] = 0;
  }
  for (let i = 0; i < breakCount; i++) {
    const root = _cascadeGroup[i];
    _cascadeGroupSize[root] += 1;
    if (_cascadeExplosive[i] === 1) {
      _cascadeGroupExplosive[root] = 1;
    }
  }
  // Only root slots are examined — exactly one visit per group, no double-counting.
  for (let i = 0; i < breakCount; i++) {
    if (
      _cascadeGroup[i] === i &&
      _cascadeGroupExplosive[i] === 1 &&
      _cascadeGroupSize[i] > stats.largestCascade
    ) {
      stats.largestCascade = _cascadeGroupSize[i];
    }
  }
}
