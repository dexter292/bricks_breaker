# Phase D1: Juice & Presentation - Pattern Map

**Mapped:** 2026-09-25  
**Files analyzed:** 18  
**Analogs found:** 18 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/vfx/brickGhosts.ts` | utility | event-driven + transform | `src/vfx/particles.ts` (+ `shake.ts` life) | exact |
| `src/vfx/paddleSquash.ts` | utility | event-driven + transform | `src/vfx/shake.ts` | exact |
| `src/vfx/types.ts` | model | transform | `src/vfx/types.ts` (extend in place) | exact |
| `src/vfx/consumeEvents.ts` | service | event-driven | `src/vfx/consumeEvents.ts` | exact |
| `src/vfx/stepVfx.ts` | service | transform | `src/vfx/stepVfx.ts` | exact |
| `src/vfx/index.ts` | config | — | `src/vfx/index.ts` | exact |
| `src/render/recordSprites.ts` | component | transform | `src/render/recordSprites.ts` | exact |
| `src/services/haptics/types.ts` | model | request-response | `src/services/audio/types.ts` | exact |
| `src/services/haptics/mapping.ts` | utility | transform | `src/services/audio/mapping.ts` | exact |
| `src/services/haptics/expoHapticsService.ts` | service | request-response | `src/services/audio/expoAudioService.ts` | exact |
| `src/services/haptics/index.ts` | config | — | `src/services/audio/index.ts` | exact |
| `app/_components/PlayingHost.tsx` | provider | pub-sub | `app/_components/PlayingHost.tsx` `playBatchRef` | exact |
| `src/runtime/eventBridge.ts` | middleware | pub-sub | `src/runtime/eventBridge.ts` (comment only) | exact |
| `docs/ops/HAPTICS.md` | config | file-I/O | `docs/ops/CRASH-REPORTING.md` | role-match |
| `docs/ops/QUALITY-TIER.md` / `CEILING-CERT.md` | config | file-I/O | same files (amend Mid freeze) | exact |
| `tests/vfx.brick-ghosts.test.ts` | test | transform | `tests/vfx.particles.test.ts` + `tests/vfx.shake.test.ts` | exact |
| `tests/vfx.paddle-squash.test.ts` | test | transform | `tests/vfx.shake.test.ts` | exact |
| `tests/haptics.batch-coalesce.test.ts` | test | request-response | `tests/audio.batch-dedupe.test.ts` | exact |
| `tests/physics.golden-replay.test.ts` | test | — | **guard only** — must stay green; do not edit hash surface | exact |
| `tests/runtime.quality-tiers.test.ts` | test | — | **Mid freeze assert** — `BUDGETS.mid` unchanged | exact |

## Pattern Assignments

### `src/vfx/brickGhosts.ts` (utility, event-driven + transform)

**Analog:** `src/vfx/particles.ts` (pool alloc / step life / FIFO) + geom snapshot idea from `consumeEvents` BRICK_BREAK rgb path

**Imports pattern** (`particles.ts` lines 1–2):
```typescript
import type { VfxState } from './types';
```

**Core SoA spawn + free/evict** (`particles.ts` lines 31–41, 64–90):
```typescript
function findFreeOrEvict(vfx: VfxState): number {
  'worklet';
  if (vfx.freeTop > 0) {
    vfx.freeTop -= 1;
    return vfx.freeStack[vfx.freeTop];
  }
  const slot = vfx.particleOldest % vfx.particleCap;
  vfx.particleOldest = (slot + 1) % vfx.particleCap;
  return slot;
}

export function spawnBurst(vfx: VfxState, opts: SpawnBurstOpts): void {
  'worklet';
  // … write typed-array slots; set active=1 …
}
```

**Life decay + alpha fade** (`particles.ts` lines 122–140):
```typescript
export function stepParticles(vfx: VfxState, dt: number): void {
  'worklet';
  for (let i = 0; i < vfx.particleCap; i++) {
    if (vfx.active[i] === 0) continue;
    vfx.life[i] -= dt;
    if (vfx.life[i] <= 0) {
      releaseSlot(vfx, i);
      continue;
    }
    const fade = vfx.life[i] < 0.08 ? vfx.life[i] / 0.08 : 1;
    vfx.a[i] = fade;
  }
}
```

**Ghost-specific:** On `BRICK_BREAK`, snapshot `world.brickX/Y/W/H` + RGB into ghost SoA (geom arrays remain valid even when `brickHp[i]===0`). Cap pool ≥16 (cascade-safe). Do **not** write World.

---

### `src/vfx/paddleSquash.ts` (utility, event-driven + transform)

**Analog:** `src/vfx/shake.ts` — scalar punch + dt decay

**Core punch / max-merge** (`shake.ts` lines 8–16):
```typescript
export function punchShake(
  vfx: VfxState,
  impulse: number,
  intensity: number,
): void {
  'worklet';
  const scaled = impulse * intensity;
  vfx.shakeAmp = Math.min(2.5, Math.max(vfx.shakeAmp, scaled));
}
```

**Core step / decay** (`shake.ts` lines 22–34):
```typescript
export function stepShake(vfx: VfxState, _intensity: number, dt?: number): void {
  'worklet';
  const frameDt =
    dt != null && Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
  const factor = Math.pow(0.85, frameDt * 60);
  let amp = vfx.shakeAmp * factor;
  if (amp < 0.05) {
    amp = 0;
  }
  vfx.shakeAmp = amp;
}
```

**Also mirror:** `punchDestroyFlash` life timer in `useGameLoop.ts` lines 66–76 / 94–102 for a simple `paddleSquashT` / `lifeMax` pair if a single scalar is enough (no pool).

**Hard rule:** never assign `world.paddleW` / `world.paddleH` — draw-only scale in `recordSprites`.

---

### `src/vfx/types.ts` (model, transform)

**Analog:** same file — extend `VfxState` + `allocateVfx` like particle/shake fields

**Pattern** (`types.ts` lines 26–61, 66–116): fixed typed arrays allocated once; no per-frame heap growth; cosmetic-only comment block.

```typescript
export type VfxState = {
  // … existing trails / particles / shake …
  shakeAmp: number;
  shakePhase: number;
  // D1 ADD: ghost SoA + paddleSquashT (never World fields)
};
```

Copy `allocateVfx` free-stack init pattern for ghost pool if using free-list (lines 84–111).

---

### `src/vfx/consumeEvents.ts` (service, event-driven)

**Analog:** same file — extend BRICK_BREAK / add PADDLE_HIT branch

**Imports + event scan** (lines 1–11, 55–80):
```typescript
import type { World } from '../core/types';
import { EventCode, BrickFlags } from '../core/types';
import type { VfxState } from './types';
import { spawnBurst } from './particles';
import { punchShake } from './shake';

export function consumeEventsForVfx(
  world: World,
  vfx: VfxState,
  intensity: number,
  opts?: ConsumeVfxOpts,
): void {
  'worklet';
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];
    // …
  }
}
```

**BRICK_BREAK hook site** (lines 101–123) — after `spawnBurst` / `punchShake`, call `spawnBrickGhost(vfx, world, brickIndex, …)` using same `rgb` / `brickIndex` already resolved. Cascade: every `BRICK_BREAK` in the scan gets a ghost (D-14).

**PADDLE_HIT:** new branch → `punchPaddleSquash(vfx)` (EventCode 2). Do **not** gate on intensity for squash decay identity if product wants full feel at reduce-motion — visual scale in draw may still multiply by intensity (discretion).

**Does NOT clear ring** — comment at lines 1–3 stays law.

---

### `src/vfx/stepVfx.ts` (service, transform)

**Analog:** same file

```typescript
export function stepVfx(vfx: VfxState, dt: number, intensity: number): void {
  'worklet';
  stepParticles(vfx, dt);
  stepShake(vfx, intensity, dt);
  // D1 ADD:
  // stepBrickGhosts(vfx, dt);
  // stepPaddleSquash(vfx, dt);
}
```

---

### `src/render/recordSprites.ts` (component, transform)

**Analog:** same file — brick skip, particle alphaf, paddle rect, ball last

**Live bricks skip dead HP** (lines 295–298) — why ghosts are required:
```typescript
const hp = world.brickHp[i];
if (hp <= 0) {
  continue;
}
```

**Particle alphaf draw** (lines 369–386) — ghost flat-fill mirrors this style:
```typescript
tools.paint.setAlphaf(vfx.a[pi]);
canvas.drawCircle(vfx.px[pi], vfx.py[pi], 2, tools.paint);
```

**Flash life fraction** (lines 388–399) — scale/alpha from `life/lifeMax`:
```typescript
const t = flash.life / lifeMax;
const flashAlpha = peak * (t > 1 ? 1 : t < 0 ? 0 : t);
```

**Paddle draw today** (lines 434–443) — wrap with cosmetic scale around center; **read** `paddleW/H`, never write:
```typescript
const paddleHalfW = world.paddleW * 0.5;
tools.entityRect.setXYWH(
  world.paddleX - paddleHalfW,
  world.paddleY,
  world.paddleW,
  world.paddleH,
);
canvas.drawRect(tools.entityRect, tools.paint);
```

**Draw order (locked):** live bricks → **ghost quads** → particles/flash → pickups → **squashed paddle** → trails → **ball LAST** (lines 445–507). Ghosts flat fill only — no glow blit (D-13 / Mid freeze).

**Trail alpha ramp** (lines 458–468) is a secondary ghost-alpha precedent under the ball.

---

### `src/services/haptics/*` (service, request-response)

**Analog cluster:** `src/services/audio/{types,mapping,expoAudioService,index}.ts`

#### `types.ts` — interface + injectable seam

```typescript
// audio/types.ts lines 10–14
export interface AudioService {
  preload(): Promise<void>;
  playBatch(codes: ArrayLike<number>, count: number): void;
  release(): void;
}
```

Haptics equivalent: `playFromBatch(codes, count)` (+ optional `release`). No `preload` required unless desired for symmetry.

#### `mapping.ts` — numeric EventCode literals, **no core import**

```typescript
// audio/mapping.ts lines 9–28
export function mapEventToSfx(code: number): SfxId | null {
  switch (code) {
    case 2: // PADDLE_HIT
      return 'paddle_hit';
    case 4: // BRICK_BREAK
      return 'brick_break';
    case 7: // LIFE_LOST
      return 'life_lost';
    // …
    default:
      return null;
  }
}
```

Haptics map: rank only — `4 → Light (1)`, `7 → Medium (2)`; ignore paddle/chip/win/lose for D-11 minimal map.

#### `expoHapticsService.ts` — soft native probe + memory fallback + batch coalesce

**Batch dedupe / coalesce template** (`expoAudioService.ts` lines 180–198):
```typescript
playBatch(codes: ArrayLike<number>, count: number): void {
  if (released) return;
  try {
    const n = Math.min(count, codes.length);
    // F-34: count identical sfxId → one play
    const tallies = new Map<SfxId, number>();
    for (let i = 0; i < n; i++) {
      const sfxId = mapEventToSfx(codes[i]!);
      if (!sfxId) continue;
      tallies.set(sfxId, (tallies.get(sfxId) ?? 0) + 1);
    }
    for (const [sfxId, hits] of tallies) {
      playSfx(sfxId, DEDUPE_GAIN[Math.min(hits, 3) - 1]!);
    }
  } catch {
    // Soft-fail play — never throw into gameplay
  }
}
```

**Haptics variant (strongest-wins, ≤1 fire):** scan ranks; `life (2) > break (1)`; ignore others; one `impactAsync`.

**Native soft probe** (`expoAudioService.ts` lines 270–295, 323–340):
```typescript
function isExpoAudioNativeAvailable(): boolean {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return requireOptionalNativeModule('ExpoAudio') != null;
  } catch {
    return false;
  }
}

export function createDefaultAudioService(): AudioService {
  try {
    const audio = loadExpoAudio();
    if (!audio) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[audio] ExpoAudio native module missing — …');
      }
      return createMemoryAudioService();
    }
    return createExpoAudioService();
  } catch (err) {
    return createMemoryAudioService();
  }
}
```

Mirror for `ExpoHaptics` / `expo-haptics` + `createMemoryHapticsService()` recording fires for Vitest.

**Never import** `useVfxIntensity` / `AccessibilityInfo` / `intensityFromReduceMotion` (D-10).

---

### `app/_components/PlayingHost.tsx` (provider, pub-sub)

**Analog:** same file — `playBatchRef` fan-out (LC-07 host side)

**Ref + stable callback** (lines 236–244, 311):
```typescript
const playBatchRef = useRef<PlayBatchFn | null>(null);
const playBatchOnJS = useCallback<PlayBatchFn>((codes, count) => {
  playBatchRef.current?.(codes, count);
}, []);
// … useGameLoop({ playBatch: playBatchOnJS, … })
```

**Assign wrapper after bake** (lines 367–369) — **extend here**, do not add second `scheduleOnRN`:
```typescript
playBatchRef.current = (codes, count) => {
  audio.playBatch(codes, count);
  // D1: haptics.playFromBatch(codes, count);
};
```

Create haptics beside audio (same soft-fail try/catch pattern as lines 181–190). Release on cleanup with `audio.release()`.

---

### `src/runtime/eventBridge.ts` (middleware, pub-sub)

**Analog:** same file — **do not add a second hop**

```typescript
/**
 * LC-07 sole exception: ≤1 batched scheduleOnRN / frame for audio drain.
 * Host passes a JS-thread-bound playBatch — runtime must not import services/.
 */
export function flushAudioBatchOnJS(
  playBatch: (codes: ArrayLike<number>, count: number) => void,
  codes: ArrayLike<number>,
  count: number,
): void {
  'worklet';
  // … copy Int16Array … scheduleOnRN(playBatch, copy, n);
}
```

D1: comment that host `playBatch` may fan-out to audio **and** haptics. No new `scheduleOnRN` call sites.

---

### Mid freeze asserts (`tests/runtime.quality-tiers.test.ts` + budgets)

**Analog:** existing Mid lock — do not change numbers

```typescript
// resolveQualityTier.ts lines 21–25
export const BUDGETS: Record<QualityTier, VfxBudget> = {
  low: { particleCap: 48, trailMax: 2, glowScale: 0 },
  mid: { particleCap: 128, trailMax: 4, glowScale: 1 },
  high: { particleCap: 192, trailMax: 5, glowScale: 1 },
};

// tests/runtime.quality-tiers.test.ts lines 56–66
expect(BUDGETS.mid).toEqual({
  particleCap: 128,
  trailMax: 4,
  glowScale: 1,
});
```

D1 acceptance: suite stays green; no confetti / no particleCap bump / no glowScale bump / no new full-screen layers. Ghost pool is separate from `particleCap` (not Mid particle budget).

---

### Golden-replay / `hashWorld` guard

**Analog:** `src/core/hash.ts` + `tests/physics.golden-replay.test.ts` + `tests/physics.hash-canonical.test.ts`

**Hashed paddle width** (`hash.ts` lines 68–71) — why squash must not mutate World:
```typescript
h = mixF32(h, world.paddleX);
h = mixF32(h, world.paddleY);
h = mixF32(h, world.paddleW);
h = mixF32(h, world.paddleH);
```

**Brick HP in hash** (lines 73–78) — fade must not invent World fade fields.

**Cosmetic RNG excluded** (`hash.ts` lines 109–110; hash-canonical test lines 16–23):
```typescript
// F-32: gameplay RNG only — cosmetic stream must not affect golden/replay hash.
h = mixU32(h, world.rngGameplay[0]);
```

**Guard tests (do not change expected determinism surface):**
- `tests/physics.golden-replay.test.ts` — chunked intent identity via `hashWorld`
- `tests/physics.hash-canonical.test.ts` — cosmetic divergence must not change hash

**D1 rule:** no edits to `hash.ts` / World types for juice; VFX-only state; run golden-replay as acceptance gate.

---

### `tests/vfx.brick-ghosts.test.ts` (test, transform)

**Analog:** `tests/vfx.particles.test.ts` + `tests/vfx.shake.test.ts`

- Allocate via `allocateVfx`
- Spawn on synthetic BRICK_BREAK path / direct `spawnBrickGhost`
- Assert active count; step decays life; cascade of 8 breaks → 8 ghosts (≤ pool)
- Assert `particleCap` / Mid constants unchanged (cross-check)

Particle Mid freeze excerpt (`vfx.particles.test.ts` lines 60–62):
```typescript
expect(PARTICLE_POOL_DEFAULT).toBe(128);
expect(PARTICLE_POOL_HARD_MAX).toBe(192);
```

---

### `tests/vfx.paddle-squash.test.ts` (test, transform)

**Analog:** `tests/vfx.shake.test.ts`

```typescript
// shake.test.ts lines 8–16, 68–74
it('punchShake merges with max then caps at 2.5', () => { /* … */ });
it('stepVfx advances shake decay without clearing gameplay', () => {
  punchShake(vfx, IMPULSE_DESTROY, 1.0);
  stepVfx(vfx, 1 / 60, 1.0);
  // …
});
```

Add: punch on PADDLE_HIT path; after punch `paddleW` identity on a World fixture unchanged; decay via `stepVfx`.

---

### `tests/haptics.batch-coalesce.test.ts` (test, request-response)

**Analog:** `tests/audio.batch-dedupe.test.ts`

```typescript
it('batch of 8 BRICK_BREAK plays at most once (dedupe)', async () => {
  const codes = new Array(8).fill(EventCode.BRICK_BREAK);
  svc.playBatch(codes, 8);
  expect(playCalls).toBe(1);
});
```

Haptics cases:
- 8× break → 1 Light fire
- break + life → 1 Medium fire
- paddle/chip only → 0 fires
- memory service records `{ style, count }` for spies

Use numeric codes or `EventCode` from core in **tests only** (service mapping stays core-free).

---

### `docs/ops/HAPTICS.md` (config, file-I/O)

**Analog:** `docs/ops/CRASH-REPORTING.md` — status table, rebuild smoke, privacy notes

Structure to copy:
- Status / date / gate line
- What shipped (file locations table)
- Owner setup: `npx expo install expo-haptics` + `npx expo run:ios --device`
- OS semantics (D-09): no System Haptics query; OS no-ops when disabled / Low Power
- Coalesce rule (D-12); never AND reduce-motion (D-10)
- Soft-fail stale binary (mirror audio warn)

Amend `QUALITY-TIER.md` / `CEILING-CERT.md` with Mid freeze + “no second Cert WC unless render-load delta” (D-05).

---

## Shared Patterns

### VFX reads World, never writes
**Source:** `src/vfx/consumeEvents.ts` header; `src/vfx/stepVfx.ts` lines 5–8; Phase 7 D-02  
**Apply to:** `brickGhosts`, `paddleSquash`, `consumeEvents`, `recordSprites`  
Ghost/squash state lives only on `VfxState`.

### Event drain → cosmetic side effects
**Source:** `consumeEventsForVfx` ring scan (lines 78–129)  
**Apply to:** ghost spawn on every `BRICK_BREAK`; squash on `PADDLE_HIT`; existing sparks/shake stay.

### One UI→JS hop (LC-07)
**Source:** `src/runtime/eventBridge.ts` + PlayingHost `playBatchRef`  
**Apply to:** haptics piggyback inside host `playBatch` only — never second `scheduleOnRN`.

### Soft-fail native modules
**Source:** `createDefaultAudioService` / `requireOptionalNativeModule`  
**Apply to:** `expo-haptics` missing → memory no-op + `__DEV__` warn; never block play.

### Services must not import `core/`
**Source:** `src/services/audio/mapping.ts` numeric literals  
**Apply to:** `src/services/haptics/mapping.ts`.

### Reduce-motion is visual-only
**Source:** `src/runtime/useVfxIntensity.ts`  
**Apply to:** haptics modules must **not** import intensity helpers (D-10). Visual ghost/squash may dampen via existing `vfxIntensity` in `recordSprites`.

### Mid budget freeze (A1 / D-01)
**Source:** `BUDGETS.mid` + `tests/runtime.quality-tiers.test.ts`  
**Apply to:** no particle/glow/shake cap bumps; ghost pool ≠ particle budget.

### Golden-replay identity
**Source:** `hashWorld` + `tests/physics.golden-replay.test.ts`  
**Apply to:** all D1 plans — acceptance gate green; no `hash.ts` / World juice fields.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All planned D1 surfaces have in-repo Phase 7 / audio / cert analogs |

*(New filenames under `src/services/haptics/` and `src/vfx/brickGhosts.ts` are new paths but exact role-matches exist.)*

## Metadata

**Analog search scope:** `src/vfx/`, `src/render/`, `src/services/audio/`, `src/runtime/`, `src/core/hash.ts`, `app/_components/PlayingHost.tsx`, `tests/vfx.*`, `tests/audio.*`, `tests/physics.*`, `tests/runtime.quality-tiers.test.ts`, `docs/ops/`  
**Files scanned:** ~45 primary + related tests  
**Pattern extraction date:** 2026-09-25
