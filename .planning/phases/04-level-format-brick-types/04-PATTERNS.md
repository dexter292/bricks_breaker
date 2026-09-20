# Phase 4: Level Format & Brick Types - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 16
**Analogs found:** 14 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/core/levels/schema.ts` | model | transform | `src/core/types.ts` (`BrickFlags`, SoA brick fields) | role-match |
| `src/core/levels/validate.ts` | utility | transform | RESEARCH hand-roll shape; purity gate `tests/core.purity.test.ts` | partial |
| `src/core/levels/compile.ts` | service | transform | `src/core/levels/phase3Grid.ts` (`loadPhase3Grid` layout loop) | exact |
| `src/core/levels/apply.ts` | service | event-driven (worklet World fill) | `src/core/reset.ts` (`loadTestGrid`) + `assignSpatialBrickCells` | exact |
| `src/core/levels/load.ts` | service | request-response | Host gate in RESEARCH; compose validate→compile | partial |
| `src/core/levels/migrations/index.ts` | utility | transform | none (v1 identity stub) | none |
| `assets/levels/level-01.json` | config | file-I/O (bundled) | `phase3Grid.ts` literals (cols/rows/HP/steel) | exact |
| `assets/levels/level-02.json` | config | file-I/O (bundled) | `phase3Grid.ts` steel placement pattern | role-match |
| `src/render/recordSprites.ts` (modify) | component (Skia) | event-driven (per-frame draw) | same file brick loop + `colors.ts` | exact |
| `src/core/levels/damageCues.ts` (optional) | utility | transform | `src/render/colors.ts` (`brickFill`) | role-match |
| `src/runtime/useGameLoop.ts` (modify) | hook | event-driven | same file first-frame + `retry` load sites | exact |
| `app/_components/GameHost.tsx` (modify) | controller | request-response | same file + `ResultOverlay` chrome | exact |
| `src/runtime/overlays/LevelErrorOverlay.tsx` (new) | component | request-response | `src/runtime/overlays/ResultOverlay.tsx` | exact |
| `tests/levels.validate.test.ts` | test | transform | `tests/levels.phase3-grid.test.ts` Vitest shape | role-match |
| `tests/levels.compile.test.ts` | test | transform | `tests/levels.phase3-grid.test.ts` + `tests/physics.bricks.test.ts` | role-match |
| `tests/levels.apply.test.ts` | test | event-driven | `tests/rules.win.test.ts` (`resetWorld`+`loadTestGrid`) | exact |
| `tests/fixtures/levels/*.json` | config | file-I/O | none — first JSON fixtures; mirror `assets/levels` schema | none |
| `tests/levels.phase3-grid.test.ts` (replace) | test | transform | same file → retarget to `loadAndCompile(level-01)` | exact |
| `src/core/index.ts` (modify) | config | — | existing barrel exports for levels/win | exact |
| DELETE `src/core/levels/phase3Grid.ts` | — | — | move `assignSpatialBrickCells` into `apply.ts` or `spatial.ts` | exact |

## Pattern Assignments

### `src/core/levels/schema.ts` (model, transform)

**Analog:** `src/core/types.ts`

**Imports / flag bits** (lines 17–20):
```typescript
/** Brick flag bits (D-10). */
export const BrickFlags = {
  UNBREAKABLE: 1,
} as const;
```

**SoA brick fields compile must fill** (lines 67–77):
```typescript
  // Bricks
  brickX: Float32Array;
  brickY: Float32Array;
  brickW: Float32Array;
  brickH: Float32Array;
  brickHp: Int16Array;
  brickFlags: Uint8Array;
  brickCount: number;
  gridCols: number;
  gridRows: number;
  cellToBrick: Int16Array;
```

**Copy:** Export `SCHEMA_VERSION = 1`, `LevelFileV1`, `BrickTypeDef`, `CompiledLevel` as plain TS types (no Zod). Map `unbreakable: true` → `BrickFlags.UNBREAKABLE` at compile time. Cap brick count against `MAX_BRICKS` / `allocateWorld` default 256 (`src/core/allocate.ts` lines 23–36, `src/core/constants.ts`).

---

### `src/core/levels/validate.ts` (utility, transform)

**Analog:** RESEARCH recommended Result shape (no codebase validator yet); purity constraints from `tests/core.purity.test.ts`

**Purity gate** (lines 6–23) — new `core/levels/*` must stay free of RN/Skia/Expo:
```typescript
const FORBIDDEN =
  /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;
```

**Core pattern to implement** (from RESEARCH; planner should paste into plan actions):
```typescript
export type ValidationIssue = { path: string; message: string };

export function validateLevel(
  raw: unknown,
): { ok: true; value: LevelFileV1 } | { ok: false; issues: ValidationIssue[] } {
  // Reject non-object; schemaVersion !== 1 with path 'schemaVersion'
  // cells.length === rows; each cells[r].length === cols — NEVER trim
  // each char ∈ brickTypes keys or '.' ; disallow spaces (D-02)
  // finite grid numbers; brickCount ≤ maxBricks
}
```

**Copy:** Actionable `path` strings (`cells[2]`, `brickTypes.X`, `schemaVersion`). Fail closed — no World mutation here.

---

### `src/core/levels/compile.ts` (service, transform)

**Analog:** `src/core/levels/phase3Grid.ts` — layout math + steel/HP encoding (delete after migration)

**Imports pattern** (lines 1–2):
```typescript
import type { World } from '../types';
import { loadTestGrid, type TestBrickSpec } from '../reset';
```

**Core layout loop** (lines 73–124) — bake these literals into `level-01.json` / drive `compileLevel`:
```typescript
export function loadPhase3Grid(world: World): void {
  'worklet';
  const cols = 7;
  const rows = 5;
  const brickW = 44;
  const brickH = 18;
  const gapX = 4;
  const gapY = 4;
  const fieldW = 360;
  const topMargin = 56;
  const totalW = cols * brickW + (cols - 1) * gapX;
  const originX = (fieldW - totalW) * 0.5;

  const hpByRow = [3, 2, 2, 1, 1];
  // steel: (r===0 && (c===0 || c===cols-1)) || (r===2 && c===Math.floor(cols/2))
  // → push TestBrickSpec { x, y, w, h, hp, unbreakable? }
  loadTestGrid(world, specs);
}
```

**Copy into compile (JS thread, no `'worklet'`):** Same nested `r`/`c` scan; skip `.`; look up `brickTypes[ch]`; pack into `CompiledLevel` typed arrays. Do **not** call `loadTestGrid` from compile — that stays for synthetic physics tests only.

**level-01 migration fingerprint:** 7×5, originX centered on 360, originY=56, brick 44×18, gap 4, HP rows `[3,2,2,1,1]`, steel at corners of row 0 + center of row 2 → `brickCount === 35`.

---

### `src/core/levels/apply.ts` (service, worklet World fill)

**Analog:** `src/core/reset.ts` `loadTestGrid` + `phase3Grid.ts` `assignSpatialBrickCells`

**SoA fill pattern** (reset.ts lines 85–105):
```typescript
export function loadTestGrid(world: World, bricks: TestBrickSpec[]): void {
  'worklet';
  const n = bricks.length < world.brickX.length ? bricks.length : world.brickX.length;
  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
    world.brickDamagedThisStep[i] = 0;
  }
  for (let i = 0; i < n; i++) {
    const b = bricks[i];
    world.brickX[i] = b.x;
    world.brickY[i] = b.y;
    world.brickW[i] = b.w;
    world.brickH[i] = b.h;
    world.brickHp[i] = b.hp;
    world.brickFlags[i] = b.unbreakable ? BrickFlags.UNBREAKABLE : 0;
    world.cellToBrick[i] = i;
  }
  world.brickCount = n;
  world.gridCols = n;
  world.gridRows = n > 0 ? 1 : 0;
}
```

**Spatial broadphase** (phase3Grid.ts lines 11–66) — call after apply when `rows > 1`:
```typescript
export function assignSpatialBrickCells(
  world: World,
  cols: number,
  rows: number,
): void {
  'worklet';
  // … map brick AABBs into cellToBrick; set world.gridCols/gridRows
}
```

**stepWorld gate** (`src/core/step.ts` lines 208–211) — playable data levels must leave `gridRows > 1`:
```typescript
      const useSpatial =
        world.gridRows > 1 &&
        world.gridCols > 1 &&
        world.gridCols * world.gridRows >= world.brickCount;
```

**Copy:** `applyCompiledLevel(world, compiled)` is `'worklet'`, caps at `world.brickX.length`, copies typed arrays, then `assignSpatialBrickCells(world, compiled.gridCols, compiled.gridRows)`. Move `assignSpatialBrickCells` out of deleted `phase3Grid.ts`. Keep `loadTestGrid` for unit physics — do not remove (RESEARCH open Q3).

**Call order with reset** (reset.ts lines 7–9 comment):
```typescript
 * Clears bricks — callers invoke loadPhase3Grid(world) or loadTestGrid for a playable layout.
```
→ Update callers to `resetWorld` → `applyCompiledLevel` (never apply before validate success).

---

### `src/core/levels/load.ts` (service, request-response)

**Analog:** None in-repo; compose validate → migrate → compile. Host wiring mirrors GameHost cold path.

**Core pattern:**
```typescript
export function loadAndCompile(raw: unknown): 
  | { ok: true; compiled: CompiledLevel }
  | { ok: false; issues: ValidationIssue[] } {
  const v = validateLevel(raw);
  if (!v.ok) return v;
  const migrated = migrateLevel(v.value); // v1 identity
  return { ok: true, compiled: compileLevel(migrated) };
}
```

**Copy:** Single entry used by GameHost **and** Vitest (D-15). No World mutation.

---

### `assets/levels/level-01.json` / `level-02.json` (config, file-I/O)

**Analog:** `phase3Grid.ts` for level-01; steel channeling from same file for level-02

**Asset require pattern** — `GameHost` already loads bundled assets (lines 35–37):
```typescript
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
```

**Copy for levels (JS thread only):**
```typescript
require('../../assets/levels/level-01.json');
require('../../assets/levels/level-02.json');
```

Path alias `@/assets/*` exists in `tsconfig.json` — prefer relative `require` matching GameHost font style for Metro consistency. JSON is Metro source (no `expo-asset`).

**level-01:** Encode phase3 layout as row-strings + in-file `brickTypes` (`1`/`2`/`3`/`X`). Bake numeric `originX`/`originY` (do not recompute at runtime).

**level-02:** Same schema; corridor/channel with more `X` steel; must compile through identical pipeline (D-10).

---

### `src/render/recordSprites.ts` (modify — damage/structural cues)

**Analog:** Same file brick loop + `src/render/colors.ts`

**Fill branch (flags first)** — recordSprites.ts lines 38–51:
```typescript
function brickFillLocal(hp: number, flags: number): string {
  'worklet';
  if ((flags & 1) !== 0) {
    return '#6B7280';
  }
  if (hp >= 3) {
    return '#C44569';
  }
  if (hp === 2) {
    return '#E07A5F';
  }
  return '#F2CC8F';
}
```

**Brick draw loop** (lines 94–109) — extend **after** `drawRect`, still LC-08 (read-only World):
```typescript
  for (let i = 0; i < brickCount; i++) {
    const hp = world.brickHp[i];
    if (hp <= 0) {
      continue;
    }
    tools.paint.setColor(Skia.Color(brickFillLocal(hp, world.brickFlags[i])));
    tools.entityRect.setXYWH(
      world.brickX[i],
      world.brickY[i],
      world.brickW[i],
      world.brickH[i],
    );
    canvas.drawRect(tools.entityRect, tools.paint);
    // Phase 4: stroke crack/hatch here — flags first, never crack UNBREAKABLE
  }
```

**Palette tokens** (`colors.ts` lines 6–21) — keep fills; add stroke color locally (do not introduce React HP overlays):
```typescript
export const BRICK_HP3 = '#C44569';
export const BRICK_HP2 = '#E07A5F';
export const BRICK_HP1 = '#F2CC8F';
export const BRICK_UNBREAKABLE = '#6B7280';
```

**Copy:** Branch `(flags & 1) !== 0` → hatch `drawLine`s; else `hp===2` one chip, `hp===1` two cracks; `hp>=3` none. Inline in worklet (same reason as `brickFillLocal` — avoid JS remotes). Optional pure `damageCues.ts` in `core/` for stroke-count unit tests without Skia.

---

### `src/runtime/useGameLoop.ts` (modify — CompiledLevel apply sites)

**Analog:** Same file — replace `loadPhase3Grid` call sites

**Imports to change** (lines 10–18):
```typescript
import {
  allocateWorld,
  dockBall,
  loadPhase3Grid,  // → applyCompiledLevel
  resetWorld,
  stepRun,
  SimPhase,
  type World,
} from '../core';
```

**First-frame load** (lines 148–156) — must stop compiling/loading authoring inside worklet:
```typescript
    if (!w) {
      w = allocateWorld();
      resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
      loadPhase3Grid(w);  // → applyCompiledLevel(w, compiledSv.value)
      …
    }
```

**retry** (lines 234–249) — JS-thread discrete reset; keep pattern, swap grid source:
```typescript
  const retry = useCallback(() => {
    const w = world.value;
    if (!w) {
      return;
    }
    resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
    loadPhase3Grid(w);  // → applyCompiledLevel(w, compiled)
    dockBall(w);
    …
  }, […]);
```

**Copy:** Accept `compiled: SharedValue<CompiledLevel | null>` (or host-applied world). On null/missing compiled → skip gameplay (host shows error). **Never** `require`/`validate`/`JSON.parse` under `'worklet'`. Retry reloads **current** level only (D-11).

---

### `app/_components/GameHost.tsx` (modify — load gate + dev switch + error UI)

**Analog:** Same file composition + `ResultOverlay` for error chrome

**Host composition** (GameHost lines 32–92) — cold-path React owns load:
```typescript
export function GameHost() {
  // … uiPhase / lives / result state …
  const { picture, surfaceSize, setActive, retry } = useGameLoop({…});
```

**Retry keeps current level** (lines 158–167):
```typescript
  const onRetry = useCallback(() => {
    clearCountdown();
    setResult(null);
    …
    retry();
    setActive(true);
  }, [clearCountdown, retry, setActive]);
```

**Copy:**
1. `useState` for `levelId` (`'level-01'` default D-12) + `levelError: ValidationIssue[] | null`.
2. `useEffect` / explicit load: `require` JSON → `loadAndCompile` → on fail `console.error` + set overlay + **do not** `setActive(true)` / do not mutate world; on ok clear error, push compiled into loop, then allow active.
3. `__DEV__`-only level switch control (no menu, no Retry cycling — D-11).
4. Gate `setActive(true)` until first successful compile.

---

### `src/runtime/overlays/LevelErrorOverlay.tsx` (component, request-response)

**Analog:** `src/runtime/overlays/ResultOverlay.tsx`

**Imports + scrim panel** (lines 1–46, 49–62):
```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// … StyleSheet.absoluteFillObject scrim, #12121f panel, SpaceMono text …
```

**Copy:** Absolute-fill scrim, actionable issue list (`path: message`), minimal chrome. Wire from `GameScreen` chrome layer (same pattern as Pause/Result overlays in `GameScreen.tsx` lines 7–9, 76–77). No playfield interaction while error shown.

**GameScreen overlay slot pattern** (lines 46–50):
```typescript
  const showPauseOverlay = uiPhase === 'paused' && result == null;
  const showCountdown =
    uiPhase === 'countdown' && result == null && countdownNumeral != null;
```
→ Add `levelError != null` branch that blocks pause/result chrome.

---

### Tests: `tests/levels.*.test.ts` + fixtures

**Analog:** `tests/levels.phase3-grid.test.ts`, `tests/rules.win.test.ts`, `tests/physics.bricks.test.ts`, `tests/core.purity.test.ts`

**Vitest import shape** (phase3-grid lines 5–14):
```typescript
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadPhase3Grid, // → loadAndCompile + applyCompiledLevel
  stepWorld,
  BrickFlags,
  SimPhase,
  type Intent,
} from '../src/core';
```

**Win ignores steel** — do **not** reimplement; keep using `tests/rules.win.test.ts` (lines 17–57) + `src/core/rules/win.ts`:
```typescript
export function countBreakableAlive(world: World): number {
  'worklet';
  // hp>0 && (flags & UNBREAKABLE) === 0
}
```

**Apply + hash guard pattern** (win/physics tests):
```typescript
    const w = allocateWorld();
    resetWorld(w, 1, 2);
    loadTestGrid(w, […]); // synthetic only
```
For playable layouts:
```typescript
    const raw = /* import or read fixture */;
    const result = loadAndCompile(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      applyCompiledLevel(w, result.compiled);
      expect(w.gridRows).toBeGreaterThan(1); // spatial path — update old gridRows===1 assert
    }
```

**Replace** `tests/levels.phase3-grid.test.ts`:
- Drop assertion `expect(w.gridRows).toBe(1)` (lines 44–51) — that was packed `loadTestGrid` workaround.
- Keep multi-HP + unbreakable fingerprint + tunneling smoke against compiled `level-01`.
- Assert `brickCount === 35` still holds after migration.

**Purity:** New `src/core/levels/**` automatically covered by `tests/core.purity.test.ts` walk.

**Fixtures:** `tests/fixtures/levels/invalid-*.json` — unsupported `schemaVersion`, bad row length, unknown char, space in row. Valid copies may import from `assets/levels/` when `resolveJsonModule` works in Vitest.

**Run:** `npm run test:core` (`vitest run src/core tests`).

---

### `src/core/index.ts` (modify — barrel)

**Analog:** Same file lines 30–33

```typescript
export { loadPhase3Grid, assignSpatialBrickCells } from './levels/phase3Grid';
export { countBreakableAlive, applyWinCheck } from './rules/win';
```

**Copy:** Remove `loadPhase3Grid`; export `validateLevel`, `compileLevel`, `applyCompiledLevel`, `loadAndCompile`, `assignSpatialBrickCells`, schema types. Keep `loadTestGrid` / `resetWorld` exports unchanged.

## Shared Patterns

### Core purity (LC-01)
**Source:** `tests/core.purity.test.ts`, `docs/layer-contract.md` (via RESEARCH)
**Apply to:** `schema.ts`, `validate.ts`, `compile.ts`, `apply.ts`, `load.ts`, `migrations/*`, optional `damageCues.ts`
- No React / RN / Skia / Expo / Reanimated imports in `src/core/**`.
- No `Math.random` / `Date.now` / `performance.now`.

### Worklet-safe World mutation
**Source:** `src/core/reset.ts`, `src/core/levels/phase3Grid.ts`
**Apply to:** `apply.ts`, call sites in `useGameLoop`
```typescript
export function …(world: World, …): void {
  'worklet';
  // mutate existing typed arrays only — zero alloc on hot path
}
```

### Flags-first brick branching
**Source:** `recordSprites.ts` `brickFillLocal`, `win.ts` `countBreakableAlive`, `step.ts` unbreakable check
**Apply to:** crack/hatch drawing, compile flag packing, win (already done)
```typescript
if ((flags & BrickFlags.UNBREAKABLE) !== 0) { /* steel / hatch / ignore win */ }
```

### Cold-path load vs hot-path step/draw
**Source:** RESEARCH diagram; `useGameLoop` first-frame anti-pattern to fix
**Apply to:** GameHost + `load.ts` + `useGameLoop`
- Validate/compile on JS once before gameplay.
- UI thread: `applyCompiledLevel` + `stepRun` + `recordFrame` read SoA only.

### Vitest core test harness
**Source:** `tests/levels.phase3-grid.test.ts`, `tests/rules.win.test.ts`
**Apply to:** all new `tests/levels.*`
```typescript
import { describe, it, expect } from 'vitest';
import { allocateWorld, resetWorld, … } from '../src/core';
```

### React chrome overlays
**Source:** `ResultOverlay.tsx` + `GameScreen.tsx` absolute chrome
**Apply to:** LevelErrorOverlay + optional `__DEV__` level switch in HUD
- Safe-area insets, SpaceMono, absolute fill, block playfield when modal.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/core/levels/validate.ts` | utility | transform | No existing schema validator; use RESEARCH Result/`ValidationIssue` shape + purity tests |
| `src/core/levels/migrations/index.ts` | utility | transform | No migration registry yet — v1 identity + reject unsupported versions (D-03) |
| `tests/fixtures/levels/*.json` | config | file-I/O | First JSON fixtures in repo; mirror `assets/levels` schema from RESEARCH example |

## Metadata

**Analog search scope:** `src/core/levels/`, `src/core/reset.ts`, `src/core/rules/win.ts`, `src/core/step.ts`, `src/core/index.ts`, `src/render/recordSprites.ts`, `src/render/colors.ts`, `src/runtime/useGameLoop.ts`, `src/runtime/GameScreen.tsx`, `src/runtime/overlays/`, `app/_components/GameHost.tsx`, `tests/`
**Files scanned:** ~58 (`src` 42 + `tests` 16)
**Pattern extraction date:** 2026-09-20
