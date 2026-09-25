# Phase 8: Showpiece Level, Performance Certification & Launch Baseline - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 22
**Analogs found:** 21 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/levels/level-03.json` | config | file-I/O | `assets/levels/level-02.json` | exact |
| `src/runtime/loadLevel.ts` | utility | transform | `src/runtime/loadLevel.ts` (self) | exact |
| `src/runtime/resolveQualityTier.ts` | utility | transform | `src/runtime/useVfxIntensity.ts` + `src/vfx/intensity.ts` | role-match |
| `src/vfx/types.ts` | model | transform | `src/vfx/types.ts` (self — `allocateVfx` / `VfxCaps`) | exact |
| `src/vfx/intensity.ts` | utility | transform | `src/vfx/intensity.ts` (self — `trailLength`) | exact |
| `src/vfx/trails.ts` | utility | event-driven | `src/vfx/trails.ts` (self — `pushTrail`) | exact |
| `src/render/recordSprites.ts` | component | streaming | `src/render/recordSprites.ts` (glow/trail draw) | exact |
| `src/runtime/useGameLoop.ts` | hook | event-driven | `src/runtime/useGameLoop.ts` (`allocateVfx` call site) | exact |
| `app/_components/PlayingHost.tsx` | component | event-driven | `app/_components/PlayingHost.tsx` (DEV level switch) | exact |
| `app/_components/GameHost.tsx` | component | event-driven | `app/_components/GameHost.tsx` (Title↔Playing shell) | exact |
| `src/devflags.ts` (optional SOAK/CERT env) | config | request-response | `src/devflags.ts` (`PERF_OVERLAY`) | exact |
| `app.json` | config | file-I/O | `app.json` (`ios.infoPlist`) | exact |
| `package.json` | config | file-I/O | `package.json` (`expo install` / `assert:skia`) | exact |
| `docs/phase8-certification.md` | config | file-I/O | `docs/phase7-vfx-measurement.md` | exact |
| `docs/store/privacy-policy.md` (+ `.html`) | config | file-I/O | `docs/measurement-methodology.md` (short contract docs) | role-match |
| `docs/store/play-data-safety.md` | config | file-I/O | `docs/device-gate-results.md` (checklist tables) | role-match |
| `docs/store/age-rating.md` | config | file-I/O | `docs/device-gate-results.md` | role-match |
| `docs/store/name-clearance.md` | config | file-I/O | `docs/skia-version-decision.md` | role-match |
| `docs/store/originality-attestation.md` | config | file-I/O | `docs/skia-version-decision.md` | role-match |
| `tests/levels.compile.test.ts` | test | transform | `tests/levels.compile.test.ts` (self) | exact |
| `tests/runtime.quality-tiers.test.ts` | test | transform | `tests/vfx.intensity.test.ts` | role-match |
| `tests/vfx.particles.test.ts` (+ trails/intensity) | test | transform | `tests/vfx.particles.test.ts` / `tests/vfx.intensity.test.ts` | exact |
| `tests/audio.mapping.test.ts` (release asserts) | test | event-driven | `tests/audio.mapping.test.ts` (idempotent `release`) | exact |
| `scripts/assert-privacy-manifest.mjs` | utility | file-I/O | `scripts/assert-skia-version.mjs` | exact |

## Pattern Assignments

### `assets/levels/level-03.json` (config, file-I/O)

**Analog:** `assets/levels/level-02.json`

**Core schema pattern** (full file shape — schema v1 + `X` unbreakable):
```json
{
  "schemaVersion": 1,
  "id": "level-02",
  "name": "Steel Corridor",
  "grid": {
    "cols": 7,
    "rows": 5,
    "originX": 14,
    "originY": 56,
    "brickW": 44,
    "brickH": 18,
    "gapX": 4,
    "gapY": 4
  },
  "brickTypes": {
    "1": { "hp": 1 },
    "2": { "hp": 2 },
    "3": { "hp": 3 },
    "X": { "hp": 99, "unbreakable": true }
  },
  "cells": [
    "X1.1.1X",
    "X22222X",
    "XXXXXXX",
    "X33333X",
    "X1.1.1X"
  ]
}
```

**Copy rules:** Same `brickTypes` keys (`1|2|3|X`); empty cells are `.`; keep `cols*rows ≤ 256` and non-empty brick count ≤ `MAX_BRICKS`. Three-act layout is authoring-only — no schema extensions.

---

### `src/runtime/loadLevel.ts` (utility, transform)

**Analog:** `src/runtime/loadLevel.ts` (extend in place)

**Imports + LevelId + static Metro requires** (lines 6–32):
```typescript
import {
  loadAndCompile,
  type CompiledLevel,
  type ValidationIssue,
} from '../core';

export type LevelId = 'level-01' | 'level-02';

const LEVEL_MODULES: Record<LevelId, unknown> = {
  // Metro static requires — keep literal paths (D-12 default is level-01).
  'level-01': require('../../assets/levels/level-01.json'),
  'level-02': require('../../assets/levels/level-02.json'),
};

export function loadLevelById(id: LevelId = 'level-01'): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}
```

**Phase 8 delta:** Add `'level-03'` to `LevelId` + literal `require('../../assets/levels/level-03.json')`; change default arg to `'level-03'`. Never use dynamic `require(path)`.

---

### `src/runtime/resolveQualityTier.ts` (utility, transform)

**Analog:** `src/vfx/intensity.ts` (pure mapping) + `src/runtime/useVfxIntensity.ts` (RN capability → SharedValue cold path)

**Pure mapping pattern** from `src/vfx/intensity.ts` (lines 3–16):
```typescript
export function intensityFromReduceMotion(enabled: boolean): number {
  'worklet';
  return enabled ? 0.2 : 1.0;
}

export function trailLength(intensity: number): number {
  'worklet';
  return Math.max(2, Math.min(5, Math.round(5 * intensity)));
}
```

**RN capability cold-path soft-fail** from `src/runtime/useVfxIntensity.ts` (lines 14–27):
```typescript
export function useVfxIntensity(): SharedValue<number> {
  const vfxIntensity = useSharedValue(1.0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        vfxIntensity.value = intensityFromReduceMotion(enabled);
      })
      .catch(() => {
        // Soft-fail: keep default full intensity
        vfxIntensity.value = 1.0;
      });
```

**Copy rules for new file:**
- Keep `tierFromMemory` / `BUDGETS` as **plain TS** (testable in Vitest without RN), same spirit as `intensity.ts`.
- Import `expo-device` only from this runtime module (or PlayingHost wiring) — **never** from `src/core/`.
- Insufficient / null memory → conservative `'low'` (D-10), mirroring soft-fail defaults.
- Optional: resolve once in PlayingHost with `useMemo`, pass numeric `VfxBudget` into `useGameLoop` / `allocateVfx`.

---

### `src/vfx/types.ts` (model, transform)

**Analog:** `src/vfx/types.ts` — extend `VfxCaps` / `allocateVfx`

**Existing caps + allocate** (lines 17–82):
```typescript
export type VfxCaps = {
  maxBalls?: number;
  particleCap?: number;
};

export function allocateVfx(caps?: VfxCaps): VfxState {
  'worklet';
  const maxBalls = Math.max(1, Math.floor(caps?.maxBalls ?? 8));
  let particleCap = Math.floor(caps?.particleCap ?? PARTICLE_POOL_DEFAULT);
  if (particleCap < 1) particleCap = PARTICLE_POOL_DEFAULT;
  if (particleCap > PARTICLE_POOL_HARD_MAX) particleCap = PARTICLE_POOL_HARD_MAX;

  const trailSlots = maxBalls * TRAIL_MAX;
  // … typed arrays sized to particleCap / trailSlots …
}
```

**Phase 8 delta:** Extend `VfxCaps` with `trailMax?: number` and `glowScale?: number` (or store on `VfxState`); clamp `trailMax` ∈ [2, `TRAIL_MAX`]; keep particle clamp against `PARTICLE_POOL_HARD_MAX`. Reallocate only on PlayingHost mount — not mid-frame.

---

### `src/vfx/intensity.ts` + `src/vfx/trails.ts` (utility, transform / event-driven)

**Analog:** same files

**trailLength floor ≥2** (`intensity.ts` lines 13–16) — must remain when tier `trailMax` is applied:
```typescript
export function trailLength(intensity: number): number {
  'worklet';
  return Math.max(2, Math.min(5, Math.round(5 * intensity)));
}
```

**pushTrail ring clamp** (`trails.ts` lines 7–24):
```typescript
export function pushTrail(
  vfx: VfxState,
  ballIndex: number,
  x: number,
  y: number,
  len: number,
): void {
  'worklet';
  if (ballIndex < 0 || ballIndex >= vfx.maxBalls) {
    return;
  }
  const ringLen = len < 2 ? 2 : len > TRAIL_MAX ? TRAIL_MAX : len | 0;
  const head = vfx.trailHead[ballIndex] % ringLen;
  const base = ballIndex * TRAIL_MAX;
  // …
}
```

**Phase 8 delta:** Effective trail length = `min(trailLength(intensity), caps.trailMax)` with hard floor 2; optionally thread `trailMax` through `pushTrail` / callers instead of hardcoding `TRAIL_MAX` only.

---

### `src/render/recordSprites.ts` (component, streaming)

**Analog:** same file — glow blit + trail draw

**Glow intensity gate** (lines 201–210):
```typescript
if (vfx != null && glowAtlas != null && intensity > 0) {
  const variant = glowAtlas[fill];
  if (variant != null) {
    const img: SkImage = variant.soft;
    tools.paint.setStyle(0);
    tools.paint.setAlphaf(intensity);
    canvas.drawImage(img, bx - GLOW_PAD_SOFT, by - GLOW_PAD_SOFT, tools.paint);
    tools.paint.setAlphaf(1);
  }
}
```

**Trail draw** (lines 298–301) — today hardcodes `trailMax = 5`:
```typescript
if (vfx != null) {
  const ringLen = trailLength(intensity);
  const trailMax = 5;
```

**Phase 8 delta:** Multiply glow alpha by `glowScale` (or skip blit when `glowScale === 0`); replace literal `5` with cap/`TRAIL_MAX` from VFX state. Keep worklet-safe literals; no React imports.

---

### `src/runtime/useGameLoop.ts` (hook, event-driven)

**Analog:** same file — allocate once

**allocateVfx call site** (lines 284–287):
```typescript
if (!vfx) {
  vfx = allocateVfx({ maxBalls: w.maxBalls });
  vfxSv.value = vfx;
}
```

**Phase 8 delta:** Pass `particleCap` / `trailMax` / `glowScale` from PlayingHost-resolved budget into this call. Do not re-allocate every frame or when DEV tier toggles mid-run — remount session instead (CONTEXT / RESEARCH Pitfall 5).

---

### `app/_components/PlayingHost.tsx` (component, event-driven)

**Analog:** same file — default level + `__DEV__` switch

**Default levelId + load** (lines 77–100):
```typescript
const [levelId, setLevelId] = useState<LevelId>('level-01');
// …
const loadResult = useMemo(() => loadLevelById(levelId), [levelId]);
```

**DEV-only toggle** (lines 390–417):
```typescript
const toggleDevLevel = useCallback(() => {
  setLevelId((prev) => (prev === 'level-01' ? 'level-02' : 'level-01'));
}, []);

const devLevelSwitch =
  typeof __DEV__ !== 'undefined' && __DEV__ ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch level, current ${levelId}`}
      onPress={toggleDevLevel}
      // …
    >
      <Text style={styles.devSwitchLabel}>
        {levelId === 'level-01' ? 'Lv 01' : 'Lv 02'}
      </Text>
    </Pressable>
  ) : null;
```

**Audio release on unmount** (lines 178–182):
```typescript
return () => {
  cancelled = true;
  playBatchRef.current = null;
  audio.release();
};
```

**Phase 8 delta:**
- Initial `levelId` → `'level-03'`; cycle DEV switch through `01 → 02 → 03`.
- Resolve quality tier once (`useMemo`); DEV-only tier force UI beside level switch; production = auto only.
- Optional DEV “Cert worst-case” control — discrete Pressable, not frame callback.
- Keep soft-fail audio/glow patterns when wiring tiers.

---

### `app/_components/GameHost.tsx` (component, event-driven)

**Analog:** same file — Title↔Playing mount/unmount

**Shell pattern** (lines 15–40):
```typescript
export function GameHost() {
  const [shellPhase, setShellPhase] = useState<ShellPhase>('title');
  // …
  if (shellPhase === 'title') {
    return (
      <TitleScreen best={best} onPlay={() => setShellPhase('playing')} />
    );
  }

  return <PlayingHost onMenu={() => setShellPhase('title')} />;
}
```

**Phase 8 delta:** DEV soak driver flips `shellPhase` with discrete `setTimeout` / `InteractionManager` (100 cycles then 15 min play). Gate with `__DEV__` and/or `EXPO_PUBLIC_SOAK=1` (see `devflags`). Never put soak logic in `useFrameCallback`.

---

### `src/devflags.ts` (config, request-response) — optional SOAK/CERT env

**Analog:** `src/devflags.ts`

```typescript
/**
 * Build-time spike flags (D-03 / D-08).
 * Do NOT gate on `__DEV__` — that hides the overlay in profiling/release builds.
 */
export const PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1';
export const CLIFF_RAMP = process.env.EXPO_PUBLIC_CLIFF_RAMP === '1';
```

**Copy rules:** Env flags for profiling builds that must survive `__DEV__ === false`; UI overrides (level/tier) stay on `__DEV__`. Prefer env for soak so profiling APK can run harness without shipping toggle UI to production.

---

### `app.json` (config, file-I/O)

**Analog:** existing `ios` block (lines 10–16)

```json
"ios": {
  "bundleIdentifier": "com.dexter292.bricksbreaker",
  "icon": "./assets/expo.icon",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

**Phase 8 delta:** Add `privacyManifests` under `ios` (NSPrivacyTracking false, empty collected types, UserDefaults `CA92.1` + FileTimestamp `C617.1`). Do **not** check in a hand-written `ios/PrivacyInfo.xcprivacy` (CNG duplicate risk — RESEARCH Don't Hand-Roll).

---

### `package.json` (config, file-I/O)

**Analog:** `scripts.assert:skia` + expo install exclude pattern

```json
"scripts": {
  "test": "vitest run",
  "assert:skia": "node scripts/assert-skia-version.mjs"
}
```

**Phase 8 delta:** `npx expo install expo-device` (~57.0.2); optional `"assert:privacy-manifest": "node scripts/assert-privacy-manifest.mjs"`.

---

### `docs/phase8-certification.md` (config, file-I/O)

**Analog:** `docs/phase7-vfx-measurement.md`

**Structure to copy** (verdict tools + package + worst-case + Results table):
```markdown
## Verdict tools (not the overlay)
| Tool | Role |
| adb shell dumpsys gfxinfo | **Android gate** |
| Instruments | iOS evidence |

## Worst-case scene (VFX-on)
1. Multi-ball ≥3
2. Particle pool near cap
3. Destroy shake decaying
4. Full glow atlas visible

## Results
| Run | Device | Build | Tool | Scene notes | Frame evidence | Result |
| _TBD_ | Pixel 6a | profiling | gfxinfo | … | … | OPEN |
```

**Phase 8 delta:** Anchor on **level-03 + Mid tier**; lock operational numeric pass bar; close Phase 7 OPEN Pixel row; cite `measurement-methodology.md` as authoritative contract.

---

### `docs/store/*` (config, file-I/O)

**Analogs:**
- Policy prose / HTTPS checklist → `docs/measurement-methodology.md` (short authoritative contract)
- Form answer tables → `docs/device-gate-results.md` (Devices / Builds / Results tables)
- Name / originality notes → `docs/skia-version-decision.md` (decision attestation style)

**Copy rules:** Markdown tables with explicit Pass/Fail or Yes/No; document MVP reality (offline, local high score, no ads/IAP/accounts); record live privacy URL when hosted; no `eas submit` instructions as done criteria.

---

### `tests/levels.compile.test.ts` (test, transform)

**Analog:** same file

**Fingerprint + loadAndCompile pattern** (lines 16–78):
```typescript
function loadLevelJson(name: string): unknown {
  return JSON.parse(readFileSync(join(levelsDir, name), 'utf8')) as unknown;
}

function structuralFingerprint(compiled: CompiledLevel, cells: string[]): string {
  // … UNBREAKABLE indices …
  return `${cells.join('|')}#${steel.join(',')}`;
}

it('level-01 vs level-02 structural fingerprint differs', () => {
  // loadAndCompile both; expect fingerprints unequal; unbreakable ≥1
});
```

**Phase 8 delta:** Add level-03 compile (brickCount, UNBREAKABLE present, `cols*rows` within cap); assert fingerprint ≠ 01 and ≠ 02; keep 01/02 fixtures green.

---

### `tests/runtime.quality-tiers.test.ts` (test, transform)

**Analog:** `tests/vfx.intensity.test.ts`

```typescript
describe('vfx intensity (FX-02)', () => {
  it('intensityFromReduceMotion(false) === 1.0', () => {
    expect(intensityFromReduceMotion(false)).toBe(1.0);
  });
  it('trailLength(0.2) === 2', () => {
    expect(trailLength(0.2)).toBe(2);
  });
});
```

**Copy rules:** Pure function unit tests — null/invalid memory → `low`; ~6 GB → `mid`; budgets table assertions; no Expo Device mock required if memory heuristic is injectable.

---

### `tests/vfx.particles.test.ts` (+ intensity/trails) (test, transform)

**Analog:** `tests/vfx.particles.test.ts` lines 59–80 (`particleCap` hard max)

```typescript
it('hard cap 128 with oldest-eviction; never exceeds 192', () => {
  const vfx = allocateVfx({ particleCap: PARTICLE_POOL_HARD_MAX });
  // … spawn bursts …
  expect(countActiveParticles(vfx)).toBeLessThanOrEqual(PARTICLE_POOL_HARD_MAX);
});
```

**Phase 8 delta:** Assert Low budget `particleCap: 48` respected; trail clamp ≥2 with reduced `trailMax`; optional glowScale skip path if modeled in pure helpers.

---

### `tests/audio.mapping.test.ts` (test, event-driven) — release / soak unit seam

**Analog:** same file — idempotent release (lines 52–60)

```typescript
it('createDefaultAudioService preload soft-fails and never throws', async () => {
  const svc = createDefaultAudioService();
  await expect(svc.preload()).resolves.toBeUndefined();
  expect(() => {
    svc.release();
    svc.release();
  }).not.toThrow();
});
```

**Service release pattern** (`src/services/audio/expoAudioService.ts` lines 148–162):
```typescript
release(): void {
  if (released) return;
  released = true;
  for (const voices of pools.values()) {
    for (const p of voices) {
      try {
        p.release();
      } catch {
        // ignore
      }
    }
  }
  pools.clear();
  cursors.clear();
}
```

**Phase 8 delta:** Extend with memory-service asserts that pools/cursors clear and post-release `playBatch` is no-op; complements PlayingHost unmount (`audio.release()`).

---

### `scripts/assert-privacy-manifest.mjs` (utility, file-I/O)

**Analog:** `scripts/assert-skia-version.mjs`

```javascript
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('@shopify/react-native-skia/package.json');

if (version !== '2.12.0') {
  console.error(`Expected @shopify/react-native-skia@2.12.0, got ${version}`);
  process.exit(1);
}
console.log(`@shopify/react-native-skia@${version} OK`);
```

**Phase 8 delta:** Read `app.json`, assert `expo.ios.privacyManifests` exists with `NSPrivacyTracking === false` and required API reason arrays; `process.exit(1)` on miss.

---

## Shared Patterns

### DEV-only UI gates (must not ship to production)
**Source:** `app/_components/PlayingHost.tsx` lines 404–417  
**Apply to:** Level switch, tier force, cert worst-case button, soak controls  
```typescript
typeof __DEV__ !== 'undefined' && __DEV__ ? ( /* Pressable */ ) : null;
```

### Soft-fail optional native / FX
**Source:** `PlayingHost.tsx` audio/glow try/catch (lines 82–90, 151–167)  
**Apply to:** `expo-device` reads if any throw; glow bake when `glowScale > 0`  
```typescript
try {
  return createDefaultAudioService();
} catch (err) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[audio] … soft-fail', err);
  }
  return createMemoryAudioService();
}
```

### Core purity (no Device / tier in `core/`)
**Source:** `tests/core.purity.test.ts` lines 6–23  
**Apply to:** Quality tier + any new runtime modules — keep `expo-device` out of `src/core`  
```typescript
const FORBIDDEN =
  /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;
```

### Level cold path (validate → compile → SharedValue)
**Source:** `src/runtime/loadLevel.ts` + `PlayingHost` `useMemo(loadLevelById)`  
**Apply to:** All three levels — no per-level physics/render forks (D-08)

### Measurement documentation contract
**Source:** `docs/measurement-methodology.md` + `docs/phase7-vfx-measurement.md`  
**Apply to:** `docs/phase8-certification.md` — profiling build, gfxinfo/Instruments, ≥2×≥30s, worse run, RN Perf Monitor invalid

### Idempotent resource release on unmount
**Source:** `PlayingHost` cleanup + `expoAudioService.release`  
**Apply to:** Soak Title↔Playing cycles (GameHost remount tears down PlayingHost)

### VFX caps as hard ceilings; intensity dampens within
**Source:** CONTEXT D-09…D-12 + `useVfxIntensity` / `allocateVfx({ particleCap })`  
**Apply to:** Tier budgets — never push tier into `core/`; intensity remains reduce-motion scalar

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Live hosted privacy URL (external HTTPS page) | config | request-response | No in-repo static host pipeline yet — author `docs/store/privacy-policy.md`/`.html` then publish via Pages/Cloudflare; verification is `curl` + docs URL row |

All other Phase 8 files have in-repo analogs above.

## Metadata

**Analog search scope:** `assets/levels/`, `src/runtime/`, `src/vfx/`, `src/render/`, `app/_components/`, `src/services/audio/`, `src/devflags.ts`, `tests/`, `docs/`, `scripts/`, `app.json`, `package.json`  
**Files scanned:** ~70 (levels, runtime, vfx, render, app shell, tests, docs, scripts, config)  
**Pattern extraction date:** 2026-09-21
