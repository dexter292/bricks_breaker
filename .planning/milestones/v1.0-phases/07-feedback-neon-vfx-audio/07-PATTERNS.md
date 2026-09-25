# Phase 7: Feedback — Neon VFX & Audio - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 30
**Analogs found:** 26 / 30

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/vfx/types.ts` | model | transform | `src/core/types.ts` (SoA World + EventCode) | role-match |
| `src/vfx/intensity.ts` | utility | transform | `src/services/storage/compareBest.ts` | role-match |
| `src/vfx/trails.ts` | utility | event-driven | `src/core/events/ring.ts` + `src/core/allocate.ts` | role-match |
| `src/vfx/particles.ts` | utility | event-driven | `src/core/rules/pickups.ts` (fixed slot pool) + `allocate.ts` | role-match |
| `src/vfx/shake.ts` | utility | transform | `src/runtime/freeze.ts` (pure step/reset math) | role-match |
| `src/vfx/stepVfx.ts` | utility | transform | `src/core/stepRun.ts` (compose sub-steps) + PATTERNS barrel note | role-match |
| `src/vfx/consumeEvents.ts` | service | event-driven | `src/core/rules/scoring.ts` | exact |
| `src/vfx/audioBatch.ts` | utility | event-driven | `src/core/events/ring.ts` (fixed SoA ring + drop-newest) + RESEARCH Pattern 1 (batch after each stepRun) | role-match |
| `src/vfx/index.ts` | utility | transform | `src/services/storage/index.ts` | exact |
| `src/render/textures/bakeGlowSprites.ts` | utility | batch | `src/runtime/loadLevel.ts` (JS cold-path bake before play) | partial |
| `src/render/recordSprites.ts` | utility | transform | `src/render/recordSprites.ts` (self — evolve) | exact |
| `src/render/colors.ts` | utility | transform | `src/render/colors.ts` (self — add cyan rim) | exact |
| `src/services/audio/types.ts` | model | request-response | `src/services/storage/types.ts` + `platform/types.ts` | exact |
| `src/services/audio/expoAudioService.ts` | service | event-driven | `src/services/storage/asyncStorageStore.ts` | role-match |
| `src/services/audio/mapping.ts` | utility | transform | `src/services/storage/compareBest.ts` + `scoring.ts` code switch | role-match |
| `src/services/audio/index.ts` | utility | transform | `src/services/storage/index.ts` | exact |
| `src/runtime/useVfxIntensity.ts` | hook | event-driven | `src/runtime/appStatePause.ts` | role-match |
| `src/runtime/eventBridge.ts` | middleware | pub-sub | — (new LC-07 exception; RESEARCH Pattern 1) | none |
| `src/runtime/useGameLoop.ts` | hook | event-driven | `src/runtime/useGameLoop.ts` (self — evolve) | exact |
| `src/core/types.ts` | model | — | `src/core/types.ts` (self — extend EventCode) | exact |
| `src/core/rules/pickups.ts` | service | event-driven | `src/core/step.ts` (`pushEvent` sites) | exact |
| `src/core/rules/lives.ts` | service | event-driven | `src/core/step.ts` + `lives.ts` (self) | exact |
| `src/core/rules/win.ts` | service | event-driven | `src/core/rules/win.ts` (self) | exact |
| `src/core/index.ts` | utility | transform | `src/core/index.ts` (self — re-export codes) | exact |
| `app/_components/PlayingHost.tsx` | provider | event-driven | `app/_components/PlayingHost.tsx` (self — preload + wire) | exact |
| `eslint.config.js` | config | — | `eslint.config.js` (self — LC matrix) | exact |
| `docs/layer-contract.md` | config | — | `docs/layer-contract.md` (self) | exact |
| `app.json` | config | — | `app.json` (self — plugins array) | exact |
| `assets/sfx/*` | config | file-I/O | `assets/fonts/SpaceMono-Regular.ttf` (`require` bundling) | partial |
| `tests/vfx.*.test.ts` / `tests/audio.*.test.ts` / `tests/events.fx.test.ts` / `tests/runtime.event-drain.test.ts` | test | transform | `tests/rules.scoring.test.ts` + `tests/storage.personal-best.test.ts` | exact |

**Install touch (not source):** `npx expo install expo-audio` → `~57.0.5`; plugin mic-off in `app.json`.

---

## Pattern Assignments

### `src/vfx/types.ts` (model, transform)

**Analog:** `src/core/types.ts`

**Imports / enum pattern** (lines 8–15):

```typescript
/** Fixed event codes pushed into the World event ring (D-08). */
export const EventCode = {
  WALL_HIT: 1,
  PADDLE_HIT: 2,
  BRICK_HIT: 3,
  BRICK_BREAK: 4,
  BALL_OUT: 5,
} as const;
```

**SoA shape pattern** (lines 60–131) — copy fixed typed-array fields, no heap objects:

```typescript
export type World = {
  ballX: Float32Array;
  // …
  evCode: Uint16Array;
  evA: Int16Array;
  evB: Int16Array;
  evX: Float32Array;
  evY: Float32Array;
  evHead: number;
  evCount: number;
  evCap: number;
  evOverflow: number;
};
```

**Apply:** Define `VfxState` the same way (`trailX/Y/Head`, `px/py/vx/vy/life/rgba/active`, `shakeAmp`, pool caps). Keep `'worklet'`-safe plain data — no React types.

---

### `src/vfx/intensity.ts` (utility, transform)

**Analog:** `src/services/storage/compareBest.ts`

**Pure mapping pattern** (lines 1–9):

```typescript
export function evaluatePersonalBest(
  runScore: number,
  previousBest: number,
): { best: number; isNewRecord: boolean } {
  const isNewRecord = runScore > previousBest;
  return {
    best: isNewRecord ? runScore : previousBest,
    isNewRecord,
  };
}
```

**Apply:** Export pure `intensityFromReduceMotion(enabled: boolean): number` and `trailLength(intensity: number): number` (clamp ≥2). Unit-test in Node like `compareBest` — no RN imports.

**RESEARCH defaults to encode:**

```typescript
export function intensityFromReduceMotion(enabled: boolean): number {
  return enabled ? 0.2 : 1.0;
}

export function trailLength(intensity: number): number {
  return Math.max(2, Math.min(5, Math.round(3 + 2 * intensity)));
}
```

---

### `src/vfx/trails.ts` (utility, event-driven)

**Analog:** `src/core/events/ring.ts` + `src/core/allocate.ts`

**Ring write pattern** (`ring.ts` lines 7–28):

```typescript
export function pushEvent(
  world: World,
  code: number,
  a: number,
  b: number,
  x: number,
  y: number,
): void {
  'worklet';
  if (world.evCount >= world.evCap) {
    world.evOverflow = 1;
    return;
  }
  const i = world.evHead;
  world.evCode[i] = code;
  // …
  world.evHead = (i + 1) % world.evCap;
  world.evCount += 1;
}
```

**SoA allocation pattern** (`allocate.ts` lines 52–57, 84–88):

```typescript
const ballX = new Float32Array(maxBalls);
const ballY = new Float32Array(maxBalls);
// …
const evCode = new Uint16Array(eventCap);
const evX = new Float32Array(eventCap);
const evY = new Float32Array(eventCap);
```

**Apply:** `allocateVfx` / `pushTrail` with `Float32Array` length `maxBalls * TRAIL_MAX * 2`, head per ball, modulus `len = trailLength(intensity)` never 0. Mark `'worklet'`. No React state.

---

### `src/vfx/particles.ts` (utility, event-driven)

**Analog:** `src/core/rules/pickups.ts` (fixed-slot pool + spawn)

**Free-slot + spawn pattern** (lines 20–71):

```typescript
function findFreePickupSlot(world: World): number {
  'worklet';
  for (let i = 0; i < world.maxPickups; i++) {
    if (world.pickupActive[i] === 0) {
      return i;
    }
  }
  return -1;
}

// On BRICK_BREAK: find slot → write SoA → pickupCount++
const slot = findFreePickupSlot(world);
if (slot < 0) {
  continue;
}
world.pickupX[slot] = world.evX[idx];
world.pickupY[slot] = world.evY[idx];
world.pickupActive[slot] = 1;
```

**Apply:** Same for sparks — hard cap 128 (max 192) with oldest-eviction when full; chip vs destroy spawn counts × intensity. Step with frame `dt` (cosmetic). Use `world.rngCosmetic` / VFX-local RNG — never `rngGameplay` (`mulberry32.ts` dual-stream rule).

**Cosmetic RNG pattern** (`mulberry32.ts` lines 1–4):

```typescript
/**
 * Dual mulberry32 streams live on World slots (D-13).
 * Never share rngGameplay and rngCosmetic — pass the correct slot.
 */
```

---

### `src/vfx/shake.ts` (utility, transform)

**Analog:** `src/runtime/freeze.ts` (pure numeric helpers + Vitest)

**Apply:** Pure `'worklet'` functions `punchShake` / `stepShake` / `shakeOffset` — no World mutation. Cap 2.5, decay ~0.85, impulses destroy 1.2 / life 2.0 × intensity. Mirror RESEARCH:

```typescript
export function punchShake(s: ShakeState, impulse: number, intensity: number): void {
  'worklet';
  const capped = Math.min(2.5, Math.max(s.amp, impulse));
  s.amp = capped * intensity;
}
```

Test like `tests/runtime.accumulator-reset.test.ts` — import pure helpers, no Skia.

---

### `src/vfx/consumeEvents.ts` (service, event-driven)

**Analog:** `src/core/rules/scoring.ts` — **exact** event-ring consumer

**Ring scan pattern** (lines 16–55):

```typescript
export function applyScoringFromEvents(world: World): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];
    if (code === EventCode.BRICK_HIT) { /* … */ }
    if (code === EventCode.BRICK_BREAK) { /* … */ }
  }
}
```

**Apply:** Same scan → spawn particles / punch shake. **Do not clear** the ring (`stepRun` owns `clearEvents`). Call **after each** `stepRun` inside the accumulator loop (Pitfall 1).

**Also copy** `stall.ts` / `pickups.ts` ring iteration for breakable checks when mapping brick color from `evB`.

---

### `src/vfx/index.ts` (utility, transform)

**Analog:** `src/services/storage/index.ts` (lines 1–13)

```typescript
export {
  PERSONAL_BEST_VERSION,
  PERSONAL_BEST_KEY,
  type PersonalBestBlob,
  type PersonalBestStore,
} from './types';
export { evaluatePersonalBest } from './compareBest';
// …
```

**Apply:** Barrel-export types + `allocateVfx` / `stepVfx` / `consumeEventsForVfx` / `appendEventsForAudio` / intensity helpers. `stepVfx` lives in `src/vfx/stepVfx.ts` (Plan 02) and must be re-exported here. Keep layer deletable: consumers import from `../vfx` only.

---

### `src/render/textures/bakeGlowSprites.ts` (utility, batch)

**Analog:** `src/runtime/loadLevel.ts` + PlayingHost cold-path gate (JS before `setActive(true)`)

**Cold-path gate pattern** (`PlayingHost.tsx` lines 153–166):

```typescript
useEffect(() => {
  if (!loadResult.ok) {
    compiledSv.value = null;
    setActive(false);
    return;
  }
  compiledSv.value = loadResult.compiled;
  retry();
  setActive(true);
}, [loadResult, compiledSv, setActive, retry]);
```

**Color source** (`colors.ts` lines 7–10, 18–29):

```typescript
export const BRICK_HP3 = '#C44569';
export const BRICK_HP2 = '#E07A5F';
export const BRICK_HP1 = '#F2CC8F';
export const BRICK_UNBREAKABLE = '#6B7280';

export function brickFill(hp: number, flags: number): string {
  'worklet';
  // …
}
```

**Apply:** Bake on JS at level/app warm-up into `SkImage` map keyed by HP/color (≤2 radius variants). Hand off via SharedValue/ref before active play — same lifecycle as fonts. **Forbidden:** `BlurMask` in the brick draw loop (D-05). No close codebase bake helper — use RESEARCH Pattern 3 + Skia `drawAsImage`.

---

### `src/render/recordSprites.ts` (utility, transform) — evolve

**Analog:** self (`recordSprites.ts`)

**Letterbox + save/restore** (lines 127–143) — insert shake translate **inside** this save block:

```typescript
canvas.save();
canvas.translate(ox, oy);
canvas.scale(scale, scale);
// ← add cosmetic shake: canvas.translate(shakeX, shakeY) here only
tools.paint.setColor(Skia.Color('#1a1a2e'));
```

**Current draw order** (lines 145–221) — extend to UI-SPEC Game Token Priority:

```
letterbox → navy → bricks(+glow) → damage cues → particles/flash → pickups → paddle → trail ghosts → balls
```

**Worklet-local color** (lines 38–51) — keep `brickFillLocal` inline (imported helpers can be JS remotes). Add cyan rim `#67E8F9` as local literal for trail stroke.

**LC-08:** read World + VfxState only — never mutate simulation coords for shake.

---

### `src/render/colors.ts` (utility, transform) — evolve

**Analog:** self

**Apply:** Add `TRAIL_CYAN = '#67E8F9'` (UI-SPEC; distinct from Phase 1 cliff `#00ffaa`). Keep existing HP palette for particle inheritance. Export for JS bake path; worklet draw may still inline literals.

---

### `src/services/audio/types.ts` (model, request-response)

**Analog:** `src/services/storage/types.ts` + `src/services/platform/types.ts`

**Interface seam pattern** (`storage/types.ts` lines 10–13):

```typescript
export interface PersonalBestStore {
  getBest(): Promise<number>;
  setBest(bestScore: number): Promise<void>;
}
```

**Event payload pattern** (`platform/types.ts` lines 1–8):

```typescript
export type RunEndedPayload = {
  score: number;
  outcome: 'win' | 'lose';
  isNewRecord?: boolean;
};

export interface AdService {
  onRunEnded(payload: RunEndedPayload): void;
}
```

**Apply:**

```typescript
export type SfxId =
  | 'paddle_hit'
  | 'brick_chip'
  | 'brick_break'
  | 'powerup_catch'
  | 'life_lost'
  | 'win'
  | 'lose';

export interface AudioService {
  preload(): Promise<void>;
  playBatch(codes: number[] /* or compact SoA */): void;
  release(): void;
}
```

---

### `src/services/audio/expoAudioService.ts` (service, event-driven)

**Analog:** `src/services/storage/asyncStorageStore.ts` — factory + soft-fail + lazy native

**Factory + soft-fail pattern** (lines 40–86):

```typescript
export function createDefaultPersonalBestStore(): PersonalBestStore {
  const AsyncStorage = loadAsyncStorage();
  if (!AsyncStorage) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[storage] …');
    }
    return createMemoryPersonalBestStore();
  }
  return createAsyncStoragePersonalBestStoreFrom(AsyncStorage);
}

async setBest(bestScore: number): Promise<void> {
  try {
    await AsyncStorage.setItem(/* … */);
  } catch {
    // Soft-fail persistence (UI-SPEC / D-13)
  }
}
```

**Host wiring analog** (`PlayingHost.tsx` lines 74–75, 104–116):

```typescript
const store = useMemo(() => createDefaultPersonalBestStore(), []);
useEffect(() => {
  void store.getBest().then(/* … */).catch(() => { /* soft */ });
}, [store]);
```

**Apply:** `createExpoAudioService()` / `createDefaultAudioService()` with `createAudioPlayer` pools (not `useAudioPlayer`), `preload` before `setActive(true)`, `setAudioModeAsync({ playsInSilentMode: true })`, `release()` on PlayingHost unmount. Preload failure → fail soft (silent SFX), never block play (UI-SPEC). Vitest: inject mock players (memory/noop impl) like memory store.

**Voice pool defaults (D-23):** chip/break 3; paddle 2; catch 2; life/win/lose 1. Round-robin / oldest reuse at limit.

---

### `src/services/audio/mapping.ts` (utility, transform)

**Analog:** `compareBest.ts` (pure) + `scoring.ts` EventCode switch

**Apply:** Pure `eventCodeToSfx(code): SfxId | null` + volume table matching D-22 hierarchy. Unit-test without expo-audio. Map:

| EventCode | SfxId |
|-----------|-------|
| PADDLE_HIT | paddle_hit |
| BRICK_HIT | brick_chip |
| BRICK_BREAK | brick_break |
| POWERUP_CATCH | powerup_catch |
| LIFE_LOST | life_lost |
| WIN | win |
| LOSE | lose |

Ignore WALL_HIT / BALL_OUT for SFX.

---

### `src/services/audio/index.ts` (utility, transform)

**Analog:** `src/services/storage/index.ts` / `platform/index.ts`

```typescript
export type { AudioService, SfxId } from './types';
export { mapEventToSfx, SFX_VOLUME } from './mapping';
export { createExpoAudioService, createDefaultAudioService } from './expoAudioService';
```

---

### `src/runtime/useVfxIntensity.ts` (hook, event-driven)

**Analog:** `src/runtime/appStatePause.ts`

**Subscribe pattern** (lines 14–22):

```typescript
export function subscribeAppStateAutoPause(handlers: {
  onAutoPause: () => void;
}): NativeEventSubscription {
  return AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive' || next === 'background') {
      handlers.onAutoPause();
    }
  });
}
```

**Apply:** Cold-path hook:

```typescript
AccessibilityInfo.isReduceMotionEnabled().then(/* write SharedValue */);
const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', …);
```

Write `vfxIntensity` SharedValue via `intensityFromReduceMotion`. Prefer AccessibilityInfo over `useReducedMotion()` alone (RESEARCH — hook does not update live). Wire into `useGameLoop` / PlayingHost.

---

### `src/runtime/eventBridge.ts` (middleware, pub-sub) — **no analog**

**Reason:** LC-07 currently bans all `scheduleOnRN` in `runtime/`/`render/` (`eslint.config.js` lines 80–95). Phase 7 needs **exactly one** batched hop/frame.

**RESEARCH Pattern 1 to implement:**

```typescript
// After each stepRun: appendEventsForAudio(world, audioBatch)
// End of frame: scheduleOnRN(playAudioBatch, audioBatch) // once
```

**Also update:**

- `eslint.config.js`: allow `runtime → vfx`; `render → vfx`; file-scoped exception for `eventBridge.ts` (or named allowlist) for one `scheduleOnRN`
- `docs/layer-contract.md`: amend LC-07 to “≤1 batched hop/frame for audio drain”; document `runtime → vfx`

**Current ban** (`eslint.config.js` lines 80–94):

```javascript
files: ['src/runtime/**/*.{ts,tsx}', 'src/render/**/*.{ts,tsx}'],
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.name='scheduleOnRN']",
      message: 'LC-07: No scheduleOnRN on the per-frame hot path (D-14).',
    },
  ],
},
```

**Current boundaries** — `runtime` cannot import `vfx`/`services` today (lines 127–133); `vfx` already may import `vfx|render|core` (lines 171–177). Planner must widen:

```
runtime → core | runtime | render | vfx
render  → core | render | vfx
```

Keep `runtime → services` **disallowed** — audio stays behind `scheduleOnRN` → JS callback owned by app/host or bridge that receives a prebound `playBatch`.

---

### `src/runtime/useGameLoop.ts` (hook, event-driven) — evolve

**Analog:** self

**Substep loop** (lines 195–210) — insert snapshot **inside** the while:

```typescript
while (w.accumulator >= fixedDt && steps < maxSubsteps) {
  stepRun(w, intent, fixedDt);
  // Phase 7: consumeEventsForVfx(w, vfx); appendEventsForAudio(w, audioBatch);
  if (launchFlag.value !== 0) {
    launchFlag.value = 0;
  }
  w.accumulator -= fixedDt;
  steps += 1;
}
// After loop: stepVfx(vfx, dt, intensity); scheduleOnRN once via eventBridge
picture.value = recordFrame(w, /* + vfx */, m, size.width, size.height, …);
```

**Critical:** `stepRun` already `clearEvents` at start (`stepRun.ts` line 46) — end-of-frame-only drain drops intermediate substeps.

**Inline worklet helpers** (lines 31–38) — prefer local `'worklet'` functions in this module if imported VFX helpers fail Babel workletization (same comment as clampFrameDtLocal).

---

### `src/core/types.ts` + event push sites (model / service)

**Analog:** self + `src/core/step.ts` push sites

**Extend EventCode:**

```typescript
export const EventCode = {
  WALL_HIT: 1,
  PADDLE_HIT: 2,
  BRICK_HIT: 3,
  BRICK_BREAK: 4,
  BALL_OUT: 5,
  POWERUP_CATCH: 6, // NEW
  LIFE_LOST: 7,     // NEW
  WIN: 8,           // NEW
  LOSE: 9,          // NEW
} as const;
```

**Existing push pattern** (`step.ts` ~292–370):

```typescript
pushEvent(world, EventCode.PADDLE_HIT, bi, -1, hx, hy);
pushEvent(world, EventCode.BRICK_BREAK, bi, bIdx, hx, hy);
```

**Mutation sites without events today — add `pushEvent`:**

| Site | File | When |
|------|------|------|
| POWERUP_CATCH | `pickups.ts` ~125–133 (AABB overlap) | On catch before type apply |
| LIFE_LOST | `lives.ts` ~20–48 | When `lives` decremented and `lives > 0` |
| LOSE | `lives.ts` ~49–51 | When `simPhase = LOST` |
| WIN | `win.ts` ~23–25 | When `simPhase = WON` |

**Import ring** like scoring:

```typescript
import { pushEvent } from '../events/ring';
import { EventCode } from '../types';
```

Re-export new codes from `src/core/index.ts`.

---

### `app/_components/PlayingHost.tsx` (provider, event-driven) — evolve

**Analog:** self

**Service factory** (lines 74–75):

```typescript
const store = useMemo(() => createDefaultPersonalBestStore(), []);
const platform = useMemo(() => defaultPlatformServices(), []);
```

**Apply:**

```typescript
const audio = useMemo(() => createDefaultAudioService(), []);
useEffect(() => {
  void audio.preload().catch(() => {}); // soft-fail
  return () => audio.release();
}, [audio]);
// Gate setActive(true) until preload settles OR soft-fail after timeout — UI-SPEC: never block with modal
```

Pass `playBatch` into game-loop bridge (JS thread). Mount `useVfxIntensity`. Do **not** add settings UI.

---

### `eslint.config.js` / `docs/layer-contract.md` / `app.json` (config)

**Analogs:** selves

**`app.json` plugins pattern** (lines 31–49) — append:

```json
[
  "expo-audio",
  {
    "microphonePermission": false,
    "recordAudioAndroid": false,
    "enableBackgroundPlayback": false
  }
]
```

**Layer contract:** Document LC amendment for batched audio drain + `runtime→vfx` / `render→vfx`. Keep LC-08 (render never mutates World). Keep LC-01 (core purity).

---

### `assets/sfx/*` (assets, file-I/O)

**Analog:** `assets/fonts/SpaceMono-Regular.ttf` via `require` in PlayingHost

```typescript
useFonts({
  SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
});
```

**Apply:** Original short m4a/wav under `assets/sfx/`; `require('../../assets/sfx/brick_break.m4a')` in audio service. No third-party packs.

---

### Tests

**Analog:** `tests/rules.scoring.test.ts` (event ring + pushEvent) + `tests/storage.personal-best.test.ts` (pure service mapping)

**Scoring test harness** (lines 20–52):

```typescript
function playingWorld() {
  const w = allocateWorld();
  resetWorld(w, 1, 2);
  w.simPhase = SimPhase.PLAYING;
  clearEvents(w);
  return w;
}

pushEvent(w, EventCode.BRICK_HIT, 0, 0, 0, 0);
applyScoringFromEvents(w);
```

**Apply to Wave 0 files:**

| Test file | Mirror |
|-----------|--------|
| `tests/vfx.trails.test.ts` | intensity length bounds; ring modulus |
| `tests/vfx.particles.test.ts` | cap / eviction / chip vs destroy counts |
| `tests/vfx.shake.test.ts` | max+cap / decay / intensity→0 |
| `tests/vfx.intensity.test.ts` | dampen not zero |
| `tests/events.fx.test.ts` | new codes + push at lives/win/pickups |
| `tests/audio.mapping.test.ts` | EventCode→SfxId + voice reuse (mock pool) |
| `tests/runtime.event-drain.test.ts` | multi-`stepRun` snapshot retains events across clears |

Keep `npm run test:core` green with VFX deleted (D-02 / cross-req).

---

## Shared Patterns

### Worklet-safe pure core / SoA

**Source:** `src/core/events/ring.ts`, `src/core/allocate.ts`, `src/core/rules/scoring.ts`  
**Apply to:** All `src/vfx/*` math, event consume, trails/particles/shake

- `'worklet'` on hot functions
- Fixed typed arrays; no per-frame alloc / React state
- Ring scan: `(evHead - n + evCap) % evCap`
- Do not clear events in consumers

### Event ring as sole outbound channel

**Source:** `src/core/step.ts` + `scoring.ts` + `stepRun.ts`  
**Apply to:** VFX spawn, audio batch, new FX-03 codes

- Only `core/` may `pushEvent`
- Snapshot after **each** `stepRun` (clearEvents at step start)
- Audio never called from worklets — batch → one `scheduleOnRN`

### Modular services outside `core/`

**Source:** `src/services/storage/*`, `src/services/platform/*`  
**Apply to:** `src/services/audio/*`

- Interface in `types.ts`
- Factory `createDefault*` + soft-fail
- Barrel `index.ts`
- Host owns lifecycle via `useMemo` + `useEffect` cleanup
- Vitest tests pure mapping without native modules

### Immediate-mode Skia Picture

**Source:** `src/render/recordSprites.ts`  
**Apply to:** glow blit, trails, particles, flash, shake translate

- Single `recordFrame` → `SkPicture`
- Letterbox save/restore; cosmetic shake inside transform only
- Draw order: particles under paddle/ball; trails under live ball
- Inline color literals in worklets when imports stay JS remotes

### Accessibility / cold-path RN APIs

**Source:** `src/runtime/appStatePause.ts`, PlayingHost preload patterns  
**Apply to:** `useVfxIntensity`, audio `preload`

- Subscribe on JS; write SharedValues
- Never put `AccessibilityInfo` / `expo-audio` inside frame callback
- Fail soft — gameplay continues

### Layer boundaries

**Source:** `eslint.config.js`, `docs/layer-contract.md`  
**Apply to:** all Phase 7 files

- `vfx` element already registered — widen allow edges
- File-scoped LC-07 exception for batched drain only
- Deleting `src/vfx` + audio wiring must leave physics/`hashWorld` tests green

### Measurement gate

**Source:** `docs/measurement-methodology.md`  
**Apply to:** every VFX merge claim

- Overlay = loop cross-check; verdict = Pixel 6a `dumpsys gfxinfo` profiling build
- Worst-case: multi-ball × particle cap × glow

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/runtime/eventBridge.ts` | middleware | pub-sub | No existing `scheduleOnRN` usage; Phase 1 banned hops — invent allowlisted bridge per RESEARCH |
| `src/render/textures/bakeGlowSprites.ts` | utility | batch | No Skia texture bake helper yet; closest is JS cold-path level load, not image bake |
| `assets/sfx/*` | assets | file-I/O | No SFX assets; only font/`require` bundling pattern |
| `expo-audio` pool impl details | service | event-driven | Package not installed; follow Expo v57 docs + RESEARCH Code Examples (storage soft-fail is structural analog only) |

Planner should use `07-RESEARCH.md` Patterns 1–7 and Expo SDK 57 audio docs for these four.

---

## Metadata

**Analog search scope:** `src/core/**`, `src/render/**`, `src/runtime/**`, `src/services/**`, `app/**`, `tests/**`, `eslint.config.js`, `docs/layer-contract.md`, `app.json`, `assets/**`  
**Files scanned:** ~95 (`src` 68 + `tests` 27 + config/docs)  
**Pattern extraction date:** 2026-09-20
