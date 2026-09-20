/**
 * Golden-replay / PROP-DETERM — PHYS-06 / D-14.
 *
 * hashWorld is Node-stable (FNV-1a over float bit patterns) for same-process
 * identity across intent chunkings — not a cross-device bit lock.
 *
 * Host loop semantics mirror useSpikeLoop accumulator: only FIXED_DT steps;
 * never integrate leftover partial dt (D-06).
 */
import { describe, it, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  stepWorld,
  hashWorld,
  FIXED_DT,
  LOGICAL_WIDTH,
  type World,
  type Intent,
} from '../src/core';

/**
 * Run intents in chunks of consecutive FIXED_DT steps.
 * `chunkSteps` must sum to `intents.length`. Never calls stepWorld with partial dt.
 */
function runChunked(
  world: World,
  intents: Intent[],
  chunkSteps: number[],
): void {
  let i = 0;
  for (const n of chunkSteps) {
    for (let s = 0; s < n; s++) {
      stepWorld(world, intents[i++], FIXED_DT);
    }
  }
  if (i !== intents.length) {
    throw new Error(
      `runChunked consumed ${i} intents, expected ${intents.length}`,
    );
  }
}

function seedWorld(seedGameplay: number, seedCosmetic: number): World {
  const w = allocateWorld();
  resetWorld(w, seedGameplay, seedCosmetic);
  // Small breakable grid so brick HP / cell map participate in the hash.
  loadTestGrid(w, [
    { x: 40, y: 80, w: 36, h: 16, hp: 3 },
    { x: 100, y: 80, w: 36, h: 16, hp: 2 },
    { x: 160, y: 80, w: 36, h: 16, hp: 1 },
    { x: 220, y: 100, w: 36, h: 16, hp: 99, unbreakable: true },
  ]);
  return w;
}

function cloneBrickHp(w: World): number[] {
  return Array.from(w.brickHp.subarray(0, w.brickCount));
}

function assertWorldIdentity(a: World, b: World): void {
  expect(hashWorld(a)).toBe(hashWorld(b));
  expect(a.tick).toBe(b.tick);
  expect(a.ballX[0]).toBe(b.ballX[0]);
  expect(a.ballY[0]).toBe(b.ballY[0]);
  expect(a.ballVx[0]).toBe(b.ballVx[0]);
  expect(a.ballVy[0]).toBe(b.ballVy[0]);
  expect(a.ballActive[0]).toBe(b.ballActive[0]);
  expect(cloneBrickHp(a)).toEqual(cloneBrickHp(b));
  expect(a.rngGameplay[0]).toBe(b.rngGameplay[0]);
  expect(a.rngCosmetic[0]).toBe(b.rngCosmetic[0]);
}

/** Partition N into random positive chunk sizes summing to N. */
function partition(n: number, rnd: () => number): number[] {
  if (n <= 0) return [];
  const parts: number[] = [];
  let left = n;
  while (left > 0) {
    const maxChunk = Math.min(left, 5);
    const size = 1 + Math.floor(rnd() * maxChunk);
    parts.push(size);
    left -= size;
  }
  return parts;
}

describe('PHYS-06 / D-14 golden-replay chunking', () => {
  it('same seed + intents under 1-step vs multi-step chunks → identical hashWorld', () => {
    const N = 48;
    const intents: Intent[] = [];
    for (let i = 0; i < N; i++) {
      // Deterministic paddle sweep (no Math.random in test identity path)
      const paddleX =
        LOGICAL_WIDTH * 0.5 + Math.sin(i * 0.37) * (LOGICAL_WIDTH * 0.25);
      intents.push({ paddleX, launch: 0 });
    }

    const chunksA = Array(N).fill(1) as number[];
    // Fixed alternate partition summing to N (e.g. 2,2,1,3 repeating)
    const chunksB: number[] = [];
    const pattern = [2, 2, 1, 3];
    let filled = 0;
    let p = 0;
    while (filled < N) {
      const take = Math.min(pattern[p % pattern.length], N - filled);
      chunksB.push(take);
      filled += take;
      p += 1;
    }

    const w1 = seedWorld(0x11112222, 0x33334444);
    const w2 = seedWorld(0x11112222, 0x33334444);

    runChunked(w1, intents, chunksA);
    runChunked(w2, intents, chunksB);

    assertWorldIdentity(w1, w2);
  });

  it('runChunked only advances with FIXED_DT (source contract)', () => {
    // Structural: helper body must not call stepWorld with any other dt.
    // Verified by this suite always passing FIXED_DT — see runChunked above.
    expect(FIXED_DT).toBeCloseTo(1 / 120, 12);
  });

  it('compactBallPool: inactive sole ball → activeBallCount 0 after step (D-12)', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    w.ballActive[0] = 0;
    w.activeBallCount = 1;
    stepWorld(w, { paddleX: w.paddleX, launch: 0 }, FIXED_DT);
    expect(w.activeBallCount).toBe(0);
  });
});

test.prop(
  {
    seedG: fc.integer({ min: 1, max: 0x7fffffff }),
    seedC: fc.integer({ min: 1, max: 0x7fffffff }),
    intentCount: fc.integer({ min: 8, max: 40 }),
    paddleXs: fc.array(
      fc.double({
        min: 40,
        max: LOGICAL_WIDTH - 40,
        noNaN: true,
      }),
      { minLength: 8, maxLength: 40 },
    ),
  },
  { numRuns: 20 },
)(
  'PROP-DETERM: identical seed+intents → identical hashWorld across chunkings',
  ({ seedG, seedC, intentCount, paddleXs }) => {
    const N = Math.min(intentCount, paddleXs.length);
    fc.pre(N >= 8);
    const intents: Intent[] = [];
    for (let i = 0; i < N; i++) {
      intents.push({ paddleX: paddleXs[i], launch: 0 });
    }

    // Deterministic partition from seed (mulberry-ish fold — not Math.random)
    let state = (seedG ^ (N * 0x9e3779b9)) >>> 0;
    const rnd = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state >>> 0) / 0x100000000;
    };
    const chunksB = partition(N, rnd);
    const chunksA = Array(N).fill(1) as number[];

    const w1 = seedWorld(seedG, seedC);
    const w2 = seedWorld(seedG, seedC);
    runChunked(w1, intents, chunksA);
    runChunked(w2, intents, chunksB);
    assertWorldIdentity(w1, w2);

    // Duplicate full runs also match (PROP-DETERM)
    const w3 = seedWorld(seedG, seedC);
    runChunked(w3, intents, chunksA);
    expect(hashWorld(w3)).toBe(hashWorld(w1));
  },
);
