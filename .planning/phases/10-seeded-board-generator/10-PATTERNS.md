# Phase 10: Seeded Board Generator - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 17 (13 created · 4 modified)
**Analogs found:** 15 / 17

Every analog path below was checked with `git ls-files` and is tracked source. No mirror or
generated path appears in this document.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/levelgen/index.ts` (new) | barrel / module export | re-export | `src/vfx/index.ts` | exact |
| `src/levelgen/generate.ts` (new) | service (pure domain entry) | transform (args → object) | `src/core/levels/compile.ts` | exact |
| `src/levelgen/grid.ts` (new) | config constants | static table | `src/core/constants.ts` + `assets/levels/level-03.json` | role-match |
| `src/levelgen/schedule.ts` (new) | config table + guard invariant | static table | `src/services/storage/catalog.ts` | exact |
| `src/levelgen/rng.ts` (new) | utility | transform (integer stream) | `src/core/rng/mulberry32.ts` | exact (copy, strip `'worklet'`) |
| `src/levelgen/reachability.ts` (new) | utility (graph flood-fill) | batch / transform | `src/core/levels/solvability.ts:151-191` | exact |
| `tests/helpers/balanceBot.ts` (**modified**) | test helper | file-I/O → object refactor | itself (`:32-34`, `:108-120`, `:172-176`) | exact (in-place split) |
| `tests/levelgen.sweep.test.ts` (new) | test (contract sweep) | batch | `tests/balance.curve-e2.test.ts` + `tests/levels.verb-curve-e1b.test.ts` | exact |
| `tests/levelgen.schedule.test.ts` (new) | test (monotonicity) | batch | `tests/balance.curve-e2.test.ts:30-52` | exact |
| `tests/levelgen.winnability.test.ts` (new) | test (integration, bot) | event-driven sim loop | `tests/balance.curve-e2.test.ts:70-76` | exact |
| `tests/levelgen.determinism.test.ts` (new) | test (golden digest) | batch | `tests/physics.golden-replay.test.ts` (shape only) | role-match |
| `scripts/assert-generated-solvability.mjs` (new) | CI assert script | batch / process-exit | `scripts/assert-level-solvability.mjs` | exact |
| `scripts/lib/*.mjs` twin **(only if a shared `.mjs` helper is extracted)** | utility (ESM, no TS) | transform | `scripts/lib/levelSolvability.mjs` | exact |
| `eslint.config.js` (**modified**) | config | static | itself (`:35-79` restricted-syntax, `:140-244` boundaries) | exact |
| `docs/layer-contract.md` (**modified**) | docs (row table) | static | itself (`:9-17`) | exact |
| `package.json` `test` script (**modified**) | config | static | itself (`:60`) | exact |
| `docs/ops/BOARD-GEN-N-GEN.md` (new, name at planner's call) | docs (ops record) | static | `docs/ops/BALANCE-E2.md`, `docs/ops/LEVEL-VERBS-E1b.md` | exact |
| Hermes A1 device probe (`__DEV__`-gated, app tier) | probe / instrumentation | manual | `src/devflags.ts` + `app/_components/PlayingHost.tsx:215-225` | role-match (see *No Analog Found*) |

---

## Pattern Assignments

### `src/levelgen/generate.ts` (service, transform)

**Analog:** `src/core/levels/compile.ts` — the repo's other "pure function, plain object in,
plain object out, no World, no `'worklet'`" module.

**Header-comment pattern** (`src/core/levels/compile.ts:1-7`) — every core/levels module opens
with a 2-4 line block stating *what thread it runs on* and *which decisions it obeys*. Copy this
shape; `src/levelgen/generate.ts` must state "no `'worklet'`, JS cold path, D-03/N-GEN-01":

```ts
/**
 * Pack validated LevelFileV1 into typed CompiledLevel arrays (JS thread).
 * No World writes; no 'worklet' directive (D-01…D-04).
 */

import { BrickFlags } from '../types';
import type { CompiledLevel, LevelFileV1 } from './schema';

export function compileLevel(level: LevelFileV1): CompiledLevel {
  const { cols, rows, originX, originY, brickW, brickH, gapX, gapY } = level.grid;
```

**Loop shape to mirror** (`compile.ts:19-24`): `for r → row = level.cells[r] → for c → ch = row[c]`,
with `'.'` short-circuited first. The generator builds the same `rows × cols` char lattice in
reverse; keeping the identical traversal order keeps the two mentally checkable against each other.

**Entry-point signature pattern** (`src/core/levels/load.ts:11-20`) — the repo's one existing
"cold-path pipeline entry". Note it takes `raw: unknown` and returns a discriminated union rather
than throwing:

```ts
export function loadAndCompile(
  raw: unknown,
): { ok: true; compiled: CompiledLevel } | { ok: false; issues: ValidationIssue[] } {
  const v = validateLevel(raw);
  if (!v.ok) {
    return v;
  }
  const migrated = migrateLevel(v.value);
  return { ok: true, compiled: compileLevel(migrated) };
}
```

**Divergence the planner must state explicitly:** `generate` returns a bare `LevelFileV1`, **not**
an `ok`-union, because D-03 makes failure structurally impossible — there is no error branch to
report. `generate` must **never** call `validateLevel` or `checkSolvability` (RESEARCH
anti-pattern #1: that inverts the dependency and destroys the "by construction" claim).

**Freshness rule (Pitfall 3) — no analog in-repo, this is new discipline:** return a spread copy of
`GRID` and a freshly-literal `brickTypes` on every call. `compileLevel` gets away with reading a
shared `level.grid` because it only *reads*; `generate` hands its object to a caller.

---

### `src/levelgen/reachability.ts` (utility, batch)

**Analog:** `src/core/levels/solvability.ts` — same algorithm, one strength level up.

**The flood-fill to copy verbatim in shape** (`src/core/levels/solvability.ts:151-191`):

```ts
export function checkSolvability(level: LevelFileV1): SolvabilityResult {
  const { cols, rows } = level.grid;
  const reachable = new Uint8Array(cols * rows);
  const queue: number[] = [];

  // Seed: open space below the grid enters any passable cell on the bottom row.
  const bottom = rows - 1;
  if (bottom >= 0) {
    const bottomRow = level.cells[bottom]!;
    for (let c = 0; c < cols; c++) {
      if (isPassable(level, bottomRow[c]!)) {
        const i = bottom * cols + c;
        reachable[i] = 1;
        queue.push(i);
      }
    }
  }

  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const r = (i / cols) | 0;
    const c = i - r * cols;
    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (reachable[ni]) continue;
      if (!isPassable(level, level.cells[nr]![nc]!)) continue;
      reachable[ni] = 1;
      queue.push(ni);
    }
  }
```

Carry over exactly: `Uint8Array` seen-set, `number[]` queue with a `head` index (never `shift()`),
`(i / cols) | 0` row decode, the 4-neighbour `as const` table, bottom-row seeding.

**The predicate that licences content-independence** (`solvability.ts:37-53` — quote this in the
plan, it is the proof's load-bearing line):

```ts
const EMPTY = '.';

function isBreakable(level: LevelFileV1, ch: string): boolean {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable !== true;
}

function isPassable(level: LevelFileV1, ch: string): boolean {
  return ch === EMPTY || isBreakable(level, ch);
}
```

**Deliberate divergences (must be commented in the new file, per RESEARCH Pattern 2):**
1. Input is a `Uint8Array` steel mask, **not** a `LevelFileV1` — the generator has no level object
   yet at stage 1.
2. Success condition is `found === target` over *all* non-steel cells, **stronger** than the lint's
   "every breakable is reachable". The comment must say a reader may not weaken it back.
3. No corridor-warning pass (`solvability.ts:80-145`) — the generator does not need it, and the
   fixed grid (D-02) makes the span constant.

**Cross-reference idiom** (`solvability.ts:1-7`): the header names its twin and the test that pins
them together (`CI twin: scripts/lib/levelSolvability.mjs — keep in sync (R-16 parity test)`).
`reachability.ts` must carry the inverse note: *not* the lint, intentionally stronger, see D-03.

---

### `src/levelgen/rng.ts` (utility, transform)

**Analog:** `src/core/rng/mulberry32.ts:1-14` — copy the algorithm, drop the `'worklet'` and the
`Uint32Array` slot plumbing.

```ts
/**
 * Dual mulberry32 streams live on World slots (D-13).
 * Never share rngGameplay and rngCosmetic — pass the correct slot.
 */

/** Advance state[i] and return a u32 in [0, 2^32). */
export function nextU32(state: Uint32Array, i: number): number {
  'worklet';
  state[i] = (state[i] + 0x6d2b79f5) | 0;
  let t = state[i];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
```

**Three mandatory divergences:**
- **Drop `'worklet'`.** `scripts/assert-worklet-closures.mjs` is in the `npm test` chain and
  task 10-04-02 asserts `src/levelgen/**` contains none.
- **Closure state, not a World slot.** `let s = seed | 0` — keeps the generator core-free.
- **Never port `nextFloat` (`mulberry32.ts:17-24`).** The `/ 4294967296` is the only float in the
  file and every generator decision must stay in integer space (RESEARCH §Q5).

**FNV-1a integer hashing idiom already in-repo** (`src/core/hash.ts:3-13`) — reuse the constants and
the `Math.imul(...) >>> 0` mixing shape for `hashSeed`, do not invent a new mixer:

```ts
const FNV_OFFSET = 2166136261;

function mixU32(h: number, v: number): number {
  return Math.imul(h ^ (v >>> 0), 16777619) >>> 0;
}
```

**Known trap to encode as a comment (RESEARCH Pitfall 2):** in `below(rng, n)` write
`const lim = 4294967296 - (4294967296 % n);` — adding `>>> 0` maps `2**32` to `0` and hangs the
suite on every power-of-two `n`, which Fisher-Yates hits on every shuffle.

---

### `src/levelgen/schedule.ts` (config table)

**Analog:** `src/services/storage/catalog.ts:1-19` — the repo's existing "ordered table whose
ordering is itself the contract", complete with the doc-comment style that names its guard test.

```ts
/**
 * Playable campaign catalog order (N-PROG-01 / D-01).
 * Matches PlayingHost DEV cycle — never includes level-02.
 *
 * Order is the E2 difficulty curve (N-CNT-01), not the file-name order: it is monotone
 * non-decreasing in both brick count (32 → 48 → 55 → 68 → 94) and total HP
 * (55 → 64 → 94 → 132 → 173). ... Guarded by
 * `tests/balance.curve-e2.test.ts`; measurements in `docs/ops/BALANCE-E2.md`.
 */
import type { LevelId } from '../../core';

export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01',
  ...
] as const;
```

Copy: `readonly ... as const`, the header naming the requirement ID, the monotone series spelled
out as literal numbers in prose, and the two back-references (guard test + ops doc).
`SCHEDULE` must name `tests/levelgen.schedule.test.ts` and the new `docs/ops/` record the same way.

Per RESEARCH §Q4 and VALIDATION's manual-verification note, monotonicity must be made **structural**
via an `envelope()` cumulative max rather than hand-tuned constants — and **no test may pin the
literal dial constants** (VALIDATION, Manual-Only Verifications, "Board feel").

---

### `src/levelgen/grid.ts` (config constants)

**Analogs:** `src/core/constants.ts:1-20` for the export style, `assets/levels/level-04.json:5-20`
for the exact object shape a `LevelFileV1.grid` / `brickTypes` must have.

```ts
/**
 * Core simulation constants.
 * Coordinate system: y increases downward (matches screen / Phase 1 spike).
 */

/** Logical play-field width. */
export const LOGICAL_WIDTH = 360;

/** Logical play-field height. */
export const LOGICAL_HEIGHT = 640;
```

One `export const` per value, each with its own `/** */` line. The grid object and brick-type
template are shaped exactly like the shipped asset (`assets/levels/level-04.json`):

```json
  "grid": { "cols": 9, "rows": 8, "originX": 2, "originY": 52,
            "brickW": 36, "brickH": 16, "gapX": 4, "gapY": 3 },
  "brickTypes": {
    "1": { "hp": 1 }, "2": { "hp": 2 }, "3": { "hp": 3 },
    "E": { "hp": 1, "explosive": true }, "X": { "hp": 99, "unbreakable": true }
  },
```

All five keys are declared even when a level places none of a type — `level-01` ships `E` unused.
Keep that: a constant key set is what makes the golden JSON hash meaningful (RESEARCH Pattern 1).
Import `LOGICAL_WIDTH` / `LOGICAL_HEIGHT` from `src/core/constants.ts` rather than re-typing `360`.

---

### `src/levelgen/index.ts` (barrel)

**Analog:** `src/vfx/index.ts:1-18`.

```ts
/** Deletable cosmetic VFX layer barrel (D-02). */

export {
  TRAIL_MAX,
  PARTICLE_POOL_DEFAULT,
  ...
  allocateVfx,
  type VfxState,
  type VfxCaps,
} from './types';
```

One-line header naming the layer and its decision ID; grouped named re-exports per source module
with inline `type` specifiers. `src/core/index.ts:80-99` shows the same grouping for the levels
subtree. The barrel is the only surface Phase 11/12 may import from.

---

### `tests/helpers/balanceBot.ts` (test helper — **modified in place**)

**Analog:** itself. This is a behaviour-preserving extract-and-delegate; the id-taking wrappers must
survive byte-compatibly because `tests/balance.curve-e2.test.ts` is not allowed to change
(VALIDATION task 10-00-02).

**The file-reading seam to split** (`:28-34`):

```ts
const levelsDir = join(dirname(fileURLToPath(import.meta.url)), '../../assets/levels');

export function readLevelFile(id: string): LevelFileV1 {
  return JSON.parse(readFileSync(join(levelsDir, `${id}.json`), 'utf8')) as LevelFileV1;
}
```

**`runBot` — the two lines that bind it to the filesystem** (`:108-119`); everything below `const w
= allocateWorld()` is already object-agnostic and moves wholesale into `runBotOnLevel`:

```ts
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
```

Target split: `runBotOnLevel(raw: LevelFileV1, opts)` holds the body (with a label string for the
throw message), and `runBot(levelId, opts) => runBotOnLevel(readLevelFile(levelId), opts)`.

**`levelStatics` — the authored-weight definition (E2-locked; do not restate it anywhere else)**
(`:172-192`):

```ts
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
```

Same split: `levelStaticsOf(raw, scoreHit)` takes the body from `let bricks = 0` down;
`levelStatics(id, scoreHit) => levelStaticsOf(readLevelFile(id), scoreHit)`.

**Warning sign the planner should forbid outright (RESEARCH Pitfall 1):** any task that writes a
generated board into `assets/levels/` for a test. That directory is swept by
`scripts/assert-level-solvability.mjs:23-27` and any extra file there must pass the lint while
`level-02.json` must keep failing it.

---

### `tests/levelgen.sweep.test.ts` (test, batch)

**Analogs:** `tests/balance.curve-e2.test.ts` (both guards it must generalise) and
`tests/levels.verb-curve-e1b.test.ts` (the assert-against-real-pipeline idiom).

**Bounds guard — copy the expression exactly** (`tests/balance.curve-e2.test.ts:54-68`), swapping the
local literals for `LOGICAL_WIDTH` / `LOGICAL_HEIGHT` from `src/core`:

```ts
  it('every campaign level fits inside the 360x640 playfield', () => {
    // level-04 and level-05 shipped 4 units wide: the right brick column was clipped
    // off-screen and no test covered it, because bounds were only asserted for level-03.
    const LOGICAL_W = 360;
    const LOGICAL_H = 640;
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const { grid } = readLevelFile(id);
      const right = grid.originX + (grid.cols - 1) * (grid.brickW + grid.gapX) + grid.brickW;
      const bottom = grid.originY + (grid.rows - 1) * (grid.brickH + grid.gapY) + grid.brickH;
      expect(grid.originX, `${id} left edge`).toBeGreaterThanOrEqual(0);
      expect(grid.originY, `${id} top edge`).toBeGreaterThanOrEqual(0);
      expect(right, `${id} right edge`).toBeLessThanOrEqual(LOGICAL_W);
      expect(bottom, `${id} bottom edge`).toBeLessThanOrEqual(LOGICAL_H);
    }
  });
```

**Failure-message pattern, applied to every assertion in the sweep:** the second `expect` argument
carries the identifying context (`` `${id} right edge` ``). With 21 000 boards this is the
difference between a usable failure and a needle hunt — use `` `s=${s} d=${d}` ``.

**Real-pipeline idiom** (`tests/levels.verb-curve-e1b.test.ts:108-114`) — run the artefact through
`loadAndCompile` and assert `.ok`, never a shape check:

```ts
  it('every playable level still compiles', () => {
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const result = loadAndCompile(readLevel(id));
      expect(result.ok, `${id} must compile`).toBe(true);
    }
  });
```

**Import style for tests** (`tests/levels.verb-curve-e1b.test.ts:15-27`): a single grouped import
from `'../src/core'` (the barrel) with `type` imports pulled from the deep path only when the barrel
does not re-export them. `checkSolvability`, `validateLevel`, `loadAndCompile`, `LOGICAL_WIDTH`,
`SCORE_HIT` are all on the barrel (`src/core/index.ts:80-99`).

**Anti-shrink guard (RESEARCH Pitfall 7, no in-repo analog):** export `SWEEP_SEEDS` and assert
`expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000)` inside the test.

---

### `tests/levelgen.schedule.test.ts` (test, monotonicity)

**Analog:** `tests/balance.curve-e2.test.ts:30-52` — the exact monotone-weight guard, over
`PLAYABLE_LEVEL_ORDER` instead of `0..D_MAX`:

```ts
describe('E2 difficulty curve (N-CNT-01)', () => {
  it('authored weight is monotone non-decreasing along the campaign order', () => {
    const curve = PLAYABLE_LEVEL_ORDER.map((id) => ({
      id,
      ...levelStatics(id, SCORE_HIT),
    }));

    for (let i = 1; i < curve.length; i++) {
      const prev = curve[i - 1]!;
      const cur = curve[i]!;
      expect(
        cur.bricks,
        `${cur.id} must not have fewer bricks than ${prev.id}`,
      ).toBeGreaterThanOrEqual(prev.bricks);
      expect(
        cur.totalHp,
        `${cur.id} must not have less HP than ${prev.id}`,
      ).toBeGreaterThanOrEqual(prev.totalHp);
    }
```

Keep the `prev`/`cur` pairwise loop and the "must not have fewer X than" message wording — it is the
same claim one layer up. In the generated case the stronger form is available and should be used in
the sweep (`levelStaticsOf(generate(s,d))` **equals** `SCHEDULE[d]`, task 10-03-02); this file keeps
the `>=` pairwise walk over the table itself.

---

### `tests/levelgen.winnability.test.ts` (test, integration)

**Analog:** `tests/balance.curve-e2.test.ts:70-76` — including the explicit long timeout as the
third `it()` argument:

```ts
  it('every campaign level is still winnable by a perfect bot', () => {
    for (const id of PLAYABLE_LEVEL_ORDER) {
      const r = runBot(id, { paddleOffset: 12, maxTicks: TICKS_PER_SECOND * 420 });
      expect(r.outcome, `${id} bot outcome (${r.seconds}s)`).toBe('WON');
      expect(r.bricksRemaining, `${id} cleared`).toBe(0);
    }
  }, 300000);
```

Carry over: `paddleOffset: 12` (non-degenerate), the explicit `maxTicks`, asserting **both**
`outcome === 'WON'` and `bricksRemaining === 0`, the `(${r.seconds}s)` in the message, and the
trailing timeout. Substitute `runBotOnLevel(generate(s, d), …)` and a stratified `(s, d)` sample —
VALIDATION budgets ~100 boards at ~20 ms each.

---

### `tests/levelgen.determinism.test.ts` (test, golden digest)

**Analog:** `tests/physics.golden-replay.test.ts` — shape only (see *No Analog Found* for the gap).

Reusable from it: the "build the artefact twice by two routes and assert equality" structure
(`:90-91`, `:182`), and the header comment that states precisely *what kind* of determinism is being
claimed and what is **not** covered — `physics.golden-replay.test.ts:1-8`:

```ts
/**
 * Golden-replay / PROP-DETERM — PHYS-06 / D-14.
 *
 * hashWorld is Node-stable (FNV-1a over float bit patterns) for same-process
 * identity across intent chunkings — not a cross-device bit lock.
 */
```

The new file's header must make the same honest scope statement: the pinned SHA-256 is **Node-
verified across processes, not Hermes-verified** (CONTEXT: assumption A1 is carried as a required
task, not an assumption). `node:crypto` `createHash` is used nowhere in `tests/` today — this is new,
but it is plain Node stdlib and `vitest.config.ts` already runs `environment: 'node'`.

---

### `scripts/assert-generated-solvability.mjs` (CI assert script)

**Analog:** `scripts/assert-level-solvability.mjs` — same role, same data flow, same `npm test` slot.

**Header + import pattern** (`:1-21`) — states the exit contract up front and names the parity
obligation:

```js
/**
 * N-LVL-03 CI guard: solvability lint over assets/levels/*.json.
 *
 * Exit 0 when:
 *   - level-02.json FAILS reachability (negative fixture / self-check)
 *   - every other level PASSES reachability
 * Exit 1 otherwise (including structural validation failure).
 *
 * Algorithm lives in `./lib/levelSolvability.mjs` — must match
 * `src/core/levels/solvability.ts` (R-16 parity test).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSolvability } from './lib/levelSolvability.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
```

**Exit-code pattern to copy verbatim in shape** (`:85-148`): a `let failed = false` accumulator,
`console.error` per failure (never throw), one summary line, then a single exit:

```js
let failed = false;
...
if (failed) {
  console.error('assert-level-solvability: FAILED');
  process.exit(1);
}

console.log('assert-level-solvability: OK (ship levels pass; level-02 fails)');
process.exit(0);
```

**The two-implementation discipline (R-16), which this script inherits:** the `.mjs` side must not
import TypeScript. `scripts/lib/levelSolvability.mjs:1-11` shows how the duplication is declared and
how mirrored constants are re-exported *so a test can pin them*:

```js
/**
 * N-LVL-03 solvability core for the CI gate (plain ESM, no TS imports).
 * Must stay behavior-identical to `src/core/levels/solvability.ts` — guarded by
 * `tests/levels.solvability-parity.test.ts` (R-16).
 *
 * Constants mirrored from `src/core/constants.ts` (BALL_RADIUS, SEPARATION_EPS).
 */

export const BALL_RADIUS = 6;
export const SEPARATION_EPS = 1e-4;
export const MIN_BALL_CORRIDOR = 2 * (BALL_RADIUS + SEPARATION_EPS);
```

**Parity-test pattern if the script re-implements `generate`** (`tests/levels.solvability-parity.test.ts:10-25, 71-98`):

```ts
import {
  checkSolvability as checkTs,
  MIN_BALL_CORRIDOR as MIN_TS,
} from '../src/core/levels/solvability';
import {
  checkSolvability as checkMjs,
  MIN_BALL_CORRIDOR as MIN_MJS,
} from '../scripts/lib/levelSolvability.mjs';

describe('solvability parity (R-16)', () => {
  it('mjs constants match core exports', () => {
    expect(MIN_MJS).toBe(MIN_TS);
  });

  it('TS lib and CI mjs agree on every assets/levels/*.json', () => {
    ...
      expect(mjs.ok, `${file} ok`).toBe(ts.ok);
```

The `as checkTs` / `as checkMjs` aliasing and the per-artefact `expect(…, label)` are the idiom.

**Cheaper alternative the planner should weigh:** VALIDATION task 10-02-04 only requires "the `.mjs`
CI twin agrees over the same corpus". Reusing the *existing* `scripts/lib/levelSolvability.mjs`
against boards the script obtains from a pinned corpus (rather than a second `generate`
implementation in ESM) satisfies R-16 discipline without creating a third algorithm to keep in sync
— RESEARCH's "Don't Hand-Roll" table explicitly warns that a third flood-fill would need a third
parity test.

**`npm test` wiring** (`package.json:60`) — append, do not reorder:

```json
    "test": "vitest run && node scripts/assert-worklet-closures.mjs && node scripts/assert-level-solvability.mjs && node scripts/assert-eas-profiles.mjs && node scripts/assert-brand-name.mjs",
```

Every assert script also gets a standalone alias (`"assert:solvability": "node scripts/assert-level-solvability.mjs"`);
add the matching `assert:generated-solvability` alias.

---

### `eslint.config.js` (**modified** — two separate edits)

**Analog:** itself. Both edits have an in-file template.

**Edit 1 — the ambient-input block.** Copy the `src/core/**` flat-config object wholesale
(`eslint.config.js:35-79`), re-target `files`, and extend the selector list with `Math.pow` / `**` /
trig (RESEARCH Pitfall 6):

```js
  {
    // LC-01 / LC-06: core/ stays pure TypeScript (D-11)
    // D-13 / PHYS-06: no Math.random / wall-clock in core/
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'performance',
          message: 'D-13 / PHYS-06: no wall-clock in core/ — use seeded PRNG streams and FIXED_DT only.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'D-13: use World mulberry32 streams, not Math.random()',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'D-13: no Date.now() in core/',
        },
        ...
```

Note the house convention visible here: **every rule message opens with the decision/contract ID**
(`D-13:`, `LC-07:`). The new block's messages must open with `N-GEN-01:`.
Note also the `no-restricted-imports` `patterns: [{ group: FORBIDDEN_IN_CORE, ... }]` form at
`:41-51` — reuse the module-level `FORBIDDEN_IN_CORE` array (`:6-20`) to ban React Native/Expo from
`src/levelgen/**` as well.

**Edit 2 — the boundaries registration (this is the hole RESEARCH Pitfall 5 proved is open).**
Element list (`:144-152`):

```js
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/**' },
        { type: 'runtime', pattern: 'src/runtime/**' },
        ...
        { type: 'services', pattern: 'src/services/**' },
      ],
```

Policy entry — the `services` policy (`:231-239`) is the closest template, being the other
"may reach core, nothing else" layer:

```js
            {
              // Services may use core domain types (e.g. LevelId) — never runtime.
              from: { element: { type: 'services' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['services', 'core'] } },
                },
              },
            },
```

Copy it as `{ from: { element: { type: 'levelgen' } }, allow: { to: { element: { types: { anyOf: ['levelgen', 'core'] } } } } }`,
keep the leading `//` comment citing the new LC row, and widen the `app` policy (`:192-208`) so the
app tier may reach `levelgen` in Phase 11/14. `default: 'disallow'` (`:165`) means every consumer
direction must be added explicitly.

---

### `docs/layer-contract.md` (**modified** — add LC-15)

**Analog:** the allowed-crossings rows at `:9-17`:

```markdown
| ID | From → To | Mechanism | Notes | Enforced |
|----|-----------|-----------|-------|----------|
| LC-02 | `runtime/` → `core/` | Direct `'worklet'` call | Frame callback invokes `allocateWorld` / `step*` | ESLint boundaries |
| LC-03 | `render/` → `core/` | Read-only world view | Skia draw reads SoA fields; never mutates | ESLint boundaries |
| LC-04 | `app/` → `runtime/`, `render/`, `services/` | Mount / unmount / cold I/O | Thin Expo host; AsyncStorage + platform seams from app only | ESLint boundaries |
```

Five columns, backticked layer names with trailing slash, `Enforced` reads exactly
`ESLint boundaries`. Next free id is **LC-15**. Consider a **banned** row too (`:21-27` format) for
`levelgen/ → runtime|render|React Native`, which is what SC-6 actually guarantees:

```markdown
| ID | Crossing | Why | Enforced |
|----|----------|-----|----------|
| LC-01 | `core/` → React / RN / Skia / Reanimated / Expo / `@react-native*` | Simulation must run unchanged in Node (D-09, D-11, D-12) | ESLint `no-restricted-imports` + Vitest purity |
```

The `## How to verify` block (`:29-35`) ends the file with runnable commands — append
`npx eslint src/levelgen` there.

---

### `docs/ops/BOARD-GEN-*.md` (new ops record)

**Analogs:** `docs/ops/BALANCE-E2.md:1-20` and `docs/ops/LEVEL-VERBS-E1b.md:1-12`.

House front-matter (not YAML — a bolded key block):

```markdown
# Balance pass (Phase E2)

**Status:** Implemented 2026-09-25
**Requirements:** N-CNT-01 (difficulty curve) · N-CNT-02 (drop rates / star score bands) ·
N-CNT-03 (F-45 ball speed ramp — ship or reject)
**Owner sign-off:** **not obtained** — the playtest cohort (A3) was skipped by the owner...
```

House sections in order: `# Title (Phase X)` → bold status/requirements/deps block → **"Why this
phase existed"** (`LEVEL-VERBS-E1b.md:8`) → the instrument or mechanism → measured tables → a
closing **`## Limits`** section that states plainly what evidence was *not* obtained
(`BALANCE-E2.md`, final section). For Phase 10 the `## Limits` section is mandatory and must carry
the A1/Hermes status and the fact that no human play calibrated the dial constants.

---

## Shared Patterns

### Purity / no-ambient-input
**Source:** `eslint.config.js:52-77` (the rule), `src/core/rng/mulberry32.ts` (the sanctioned
alternative), `tests/core.purity.test.ts` (the test-side twin).
**Apply to:** every file under `src/levelgen/**`, plus the eslint edit that makes it enforceable.
The rule block and the code must land in the same wave — a `src/levelgen/` created without the
eslint registration is exempt from both the layer matrix and the ambient-input ban (RESEARCH
Pitfall 5, probed and confirmed).

### Header comment stating thread + contract IDs
**Source:** `src/core/levels/compile.ts:1-4`, `src/core/levels/solvability.ts:1-7`,
`tests/helpers/balanceBot.ts:1-10`.
**Apply to:** all six new `src/levelgen/*.ts`, all four new tests, the new `.mjs` script.
Every module in this repo opens with 2-10 lines answering: which requirement, which thread, which
twin file must stay in sync, and what the module is *not*. The generator's modules must each name
D-03/N-GEN-01 and state "no `'worklet'`; never called on the sim or render hot path".

### Labelled `expect` assertions
**Source:** `tests/balance.curve-e2.test.ts:41-47, 63-66`, `tests/levels.solvability-parity.test.ts:88-96`,
`tests/levels.verb-curve-e1b.test.ts:113`.
**Apply to:** every assertion in all four new test files. The second `expect` argument always
carries the identifying context of the artefact under test. At 21 000 boards this is load-bearing.

### Artefact-driven iteration, never a fixture
**Source:** `tests/levels.verb-curve-e1b.test.ts:108-114`, `tests/balance.curve-e2.test.ts:59`,
`tests/levels.solvability-parity.test.ts:80-83` (`expect(files.length).toBeGreaterThanOrEqual(5)`).
**Apply to:** the sweep, schedule and winnability tests. Note the parity test asserts the corpus is
non-trivially sized before iterating it — the generated equivalent is the `SWEEP_SEEDS` floor
assertion (Pitfall 7).

### Single source of truth for a contract
**Source:** the R-16 pair (`src/core/levels/solvability.ts` ↔ `scripts/lib/levelSolvability.mjs`
pinned by `tests/levels.solvability-parity.test.ts`), and `levelStatics` as the sole authored-weight
definition (`tests/helpers/balanceBot.ts:172-203`).
**Apply to:** every task. The repo's rule is that a second implementation of an existing contract
must come with a parity test that pins it. Corollaries for this phase: do not re-implement
`validateLevel`, do not write a third flood-fill, do not define a second notion of "weight", do not
add `gen-*` ids to `LevelId` (that union lives in locked core).

### Fresh objects out of a pure function
**Source:** no positive in-repo analog — `compileLevel` allocates fresh typed arrays
(`src/core/levels/compile.ts:44-52`) but only because it must.
**Apply to:** `generate.ts`. Spread `GRID`, rebuild `brickTypes` and `cells` per call. RESEARCH
Pitfall 3: an aliased module constant makes determinism failures order-dependent across test files.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/levelgen.determinism.test.ts` (the *pinned-digest* half) | test | batch | No test in the repo pins a literal hash constant. `src/core/hash.ts` `hashWorld` is compared **against itself** across runs (`tests/physics.golden-replay.test.ts:182`), never against a checked-in digest, and `createHash`/`sha256` appear nowhere in `tests/` or `scripts/`. The "build twice, compare" half has a good analog; the "compare to a pinned constant" half is new. Use RESEARCH §Q5 (the executed cross-process SHA-256 procedure) as the reference, and document in the test header that the pin is Node-verified only. |
| Hermes A1 on-device probe (task 10-04-04) | probe / instrumentation | manual | No device-side determinism probe exists. The closest idioms are the `__DEV__` guard form `if (typeof __DEV__ !== 'undefined' && __DEV__) { console.log('[cert] …'); }` (`app/_components/PlayingHost.tsx:215-225`) and the env-flag arm pattern in `src/devflags.ts:11-16` (`EXPO_PUBLIC_CERT`, `EXPO_PUBLIC_SOAK`, each with a comment saying exactly which profile may set it). Follow the bracket-tag console convention (`[levelgen]`) and, if the probe needs arming, add a flag to `src/devflags.ts` rather than a bare `__DEV__` branch. The probe lives in the **app** tier (LC-04) — `src/levelgen/**` must stay free of it. |

---

## Metadata

**Analog search scope:** `src/core/levels/`, `src/core/rng/`, `src/core/`, `src/vfx/`,
`src/services/storage/`, `tests/`, `tests/helpers/`, `scripts/`, `scripts/lib/`, `docs/ops/`,
`docs/`, `assets/levels/`, `eslint.config.js`, `package.json`
**Files scanned:** 21 read in full or in targeted ranges; 82 test files and 12 script files enumerated
**Tracked-source gate:** all 16 cited analog paths confirmed via `git ls-files`
**Pattern extraction date:** 2026-09-25
