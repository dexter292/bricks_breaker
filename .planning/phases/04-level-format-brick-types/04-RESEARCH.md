# Phase 4: Level Format & Brick Types - Research

**Researched:** 2026-09-20
**Domain:** Versioned level authoring JSON → JS-thread validate/compile → World SoA; Skia crack/hatch brick cues
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Authoring shape (LVL-01)
- **D-01:** Authoring format is **versioned JSON** with **row-strings** plus a **brick-type table inside each level file** (self-contained, independently editable, human-readable, easy to diff, future Level Editor–compatible).
- **D-02:** Canonical empty cell is **`.`**. Spaces only if the schema explicitly allows them; **never silently trim** row strings.
- **D-03:** Root field **`schemaVersion: 1`**. Unsupported versions are **rejected with actionable validation errors**. Add `migrations/` only when introducing a new schema version.
- **D-04:** **Validate before compile.** Compile into SoA / compiled level **once per level load** on the **JS thread**. Runtime hot path and worklets **never** parse authoring JSON.

#### Damage readability (LVL-02)
- **D-05:** Remaining HP is shown with **crack/chip lines** (non-color cue). States must be distinguishable without relying on color alone; keep drawing **lightweight** for dense grids.
- **D-06:** Unbreakable/structural bricks use **steel/gray** plus a **fixed hatch or structural glyph**. They must stay visually distinct from damaged breakables and **must not** morph into “damage” crack states.
- **D-07:** Damage/structural cues render in the **Skia entity layer inside `recordFrame`**. No separate React overlays and no per-frame React state for brick HP visuals.
- **D-08:** Phase 4 visuals stay **minimal**. Neon glow, particles, and destruction animations remain **Phase 7**.

#### Second level identity (LVL-01 / LVL-03 proof)
- **D-09:** Ship **exactly two** levels: migrate `phase3Grid` → **`assets/levels/level-01.json`**, and author **`level-02.json`** as a **corridor/channel** layout using unbreakables to force different trajectories.
- **D-10:** Both levels load, validate, compile, and play through the **same code path** with **no physics-engine or rendering-logic forks** per level.
- **D-11:** Level selection in Phase 4 is a **development-only switch** in the host. **No** level-select menu and **no** automatic cycling on Retry.

#### Load & fail behavior
- **D-12:** Default boot level is **`level-01.json`**.
- **D-13:** On validation failure: **fail loudly** in development — actionable errors in the console **and** an on-screen error overlay. **Never** enter gameplay with invalid or partially loaded level data. Invalid data **must not** mutate the active World SoA.
- **D-14:** Validate + compile the selected level **once** on the JS thread **before** `resetWorld` / gameplay init. JSON parse/compile stay **off** the per-frame hot path. Preserve deterministic simulation.
- **D-15:** After migration, **remove** the hardcoded `phase3Grid.ts` implementation. App and tests use the **same** validate/compile pipeline only.

### Claude's Discretion
- Exact char → type keys in the brick-type table (beyond needing multi-HP + unbreakable)
- Crack line geometry density (must stay readable and cheap)
- Exact corridor layout for `level-02` (must demonstrate structural channels)
- Shape of the on-screen validation error overlay (must be actionable; minimal chrome)
- Exact API names for schema / validate / compile / apply-to-world (must match layer contract: compile on JS thread, fill existing SoA fields)

### Deferred Ideas (OUT OF SCOPE)
- Full visual Level Editor product — future phase; Phase 4 only keeps the authoring contract compatible
- Level select menu / Retry level cycling — Phase 6 (LVL-05)
- Showpiece ~2–3 minute challenge level — Phase 8 (LVL-04)
- Neon glow, particles, destruction VFX — Phase 7
- Shared global brick-type catalog file — deferred; Phase 4 keeps types in-file (D-01)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LVL-01 | Levels load from a versioned data-driven format suitable for a future level editor | Pattern 8 authoring JSON + `schemaVersion` + per-file `brickTypes` + row-string `cells`; validate→compile→`applyCompiledLevel`; Metro `require` JSON; remove `phase3Grid.ts` |
| LVL-02 | Multiple brick types with different HP and readable damage states (color + non-color cue) | Keep Phase 3 row palette; add Skia `drawLine` crack/chip strokes from remaining `brickHp`; no React HP overlays |
| LVL-03 | Unbreakable/structural bricks that channel the ball | `BrickFlags.UNBREAKABLE` already in SoA/physics/win; steel fill + hatch glyph; `level-02` corridor layout; win already ignores steel |
</phase_requirements>

## Summary

Phase 4 replaces the hardcoded `loadPhase3Grid` worklet with a **JS-thread** pipeline: load authoring JSON → **validate** (actionable errors) → **compile once** into a `CompiledLevel` (typed arrays + grid metadata) → **apply** into the existing World SoA. The UI-thread hot path (`stepRun` / `recordFrame`) continues to read only SoA fields. Shipping **two** JSON levels through that single pipeline proves LVL-01; crack/hatch drawing in `recordFrame` proves LVL-02; corridor steel in `level-02` plus existing win/physics proves LVL-03.

The architecture research already prescribed this seam (Level Loader/Compiler on the RN/JS runtime, never in a worklet). Current code still calls `loadPhase3Grid` inside `useGameLoop`'s first-frame worklet and on `retry` — those call sites are the integration spine to replace. Physics already supports multi-HP and unbreakables; win already ignores `BrickFlags.UNBREAKABLE`. Phase 4 is primarily **data format + load wiring + damage readability**, not a new brick simulation model.

**Primary recommendation:** Implement hand-rolled `validateLevel` / `compileLevel` / `applyCompiledLevel` in `src/core/levels/` (no Zod), ship `assets/levels/level-01.json` + `level-02.json`, delete `phase3Grid.ts`, wire GameHost/`useGameLoop` to compile on JS before any World mutation, and extend `recordFrame` with lightweight crack + hatch strokes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authoring JSON files | CDN / Static (`assets/levels/`) | — | Bundled content; Metro treats `.json` as source |
| Schema types + validate + compile | API / Backend analogue = **`core/` (JS/Node)** | — | Pure TS; Node-testable; LC-01 forbids RN in core |
| Migrations registry | **`core/levels/migrations/`** | — | Version evolution lives with schema, not UI |
| Level asset `require` + load orchestration | Browser / Client = **`app/` + `runtime/`** | — | Host picks file, runs validate/compile once, owns error UI |
| Apply compiled blobs → World SoA | **`core/` apply (worklet-safe)** | `runtime/` schedules timing | Fill existing arrays; never allocate on hot path |
| Brick HP / unbreakable simulation | **`core/` physics + win** | — | Already implemented (Phase 2/3) |
| Crack / hatch visuals | **`render/recordSprites`** | — | Skia immediate-mode; reads SoA only (LC-08) |
| Dev level switch + error overlay | **`app/_components/GameHost`** | thin RN Views | Cold-path React; not per-frame |
| Persistence / menus | — | Deferred Phase 6 | Out of scope |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (PROJECT.md + STACK.md embeds) and `docs/layer-contract.md`:

- **Expo SDK 57** — consult https://docs.expo.dev/versions/v57.0.0/ for Expo APIs; stack pins RN 0.86.3, Reanimated 4.5.1, Skia **2.12.0** override.
- **`core/` purity (LC-01 / LC-06):** no React, RN, Skia, Reanimated, Expo imports; Vitest + ESLint enforce.
- **LC-07:** no `runOnJS` / `scheduleOnRN` on the per-frame hot path.
- **LC-08:** `render/` must not mutate World.
- **Offline MVP:** levels ship as bundled assets; no network fetch required.
- **Determinism:** no `Math.random` / wall-clock in `core/`; invalid levels must not partially mutate World.
- **Vitest** for core/level parsing tests (already in repo: `vitest@5.0.1`).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `~6.0.3` [VERIFIED: package.json] | Schema types + compile | Project pin; Expo template |
| Vitest | `5.0.1` [VERIFIED: package.json / npm] | Validate/compile/apply unit tests | Already runs pure `core/` in Node |
| `@shopify/react-native-skia` | `2.12.0` [VERIFIED: package.json] | `canvas.drawLine` crack/hatch in `recordFrame` | Existing render path; `drawLine` in Canvas API [VERIFIED: node_modules types] |
| Metro / Expo bundler | SDK 57 | `require('./level.json')` → plain object | JSON is a Metro `sourceExts` default [CITED: docs.expo.dev/guides/customizing-metro, metrobundler.dev] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `fs` (tests only) | — | Optional fixture load | Prefer `import x from '...json'` with `resolveJsonModule: true` [VERIFIED: tsconfig] |
| `fast-check` | `4.10.2` [VERIFIED: package.json] | Optional property tests for validator fuzz | Nice-to-have; not required for Wave 0 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled validator | Zod `4.6.5` [VERIFIED: npm view] | Zod helps evolving schemas, but default errors are not row/char-specific without custom refinements; adds a dep to `core/`. **Reject for Phase 4** — schema is small; actionable path messages matter more. |
| Hand-rolled validator | Ajv + JSON Schema | Heavier; codegen friction; same actionable-message problem. |
| Metro `require` JSON | `expo-asset` + FileSystem read | Wrong for `.json` — Metro already inlines JSON as a JS object; Asset path is for binary assets [CITED: StackOverflow/Metro sourceExts]. |
| Shared global brick catalog | Per-level `brickTypes` | Locked deferred (D-01 / deferred ideas). |

**Installation:**

```bash
# No new runtime dependencies required for Phase 4.
# Levels: create assets/levels/*.json and core/levels/{schema,validate,compile,apply,migrations}.
```

**Version verification:** `vitest@5.0.1`, `zod@4.6.5` (not adopted), `@shopify/react-native-skia@2.12.0`, `expo@~57.0.24` — checked 2026-09-20 via package.json / `npm view`.

## Architecture Patterns

### System Architecture Diagram

```
┌─ JS thread (cold path) ─────────────────────────────────────────────┐
│  assets/levels/level-0N.json                                        │
│           │ Metro require (parsed object)                           │
│           ▼                                                         │
│  validateLevel(raw) ──fail──► console.error + LevelErrorOverlay     │
│           │ ok                      (no World mutation)             │
│           ▼                                                         │
│  migrateLevel(raw)   // v1 identity; reject unsupported versions    │
│           │                                                         │
│           ▼                                                         │
│  compileLevel(LevelFileV1) → CompiledLevel (typed arrays)           │
│           │                                                         │
│           ▼                                                         │
│  SharedValue / host holds CompiledLevel                             │
│  GameHost: default level-01; __DEV__ switch reloads pipeline        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ apply only after success
════════════════════════════════╪═════════════════════════════════════
┌─ UI thread (hot path) ────────▼─────────────────────────────────────┐
│  resetWorld(world) → applyCompiledLevel(world, compiled)            │
│       → assignSpatialBrickCells when gridRows > 1                   │
│  stepRun / physics / win  ←── read brickHp, brickFlags only         │
│  recordFrame ←── fill + crack lines (HP) / hatch (UNBREAKABLE)      │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
assets/levels/
├── level-01.json              # migrated phase3Grid layout
└── level-02.json              # corridor / channels with steel

src/core/levels/
├── schema.ts                  # LevelFileV1, BrickTypeDef, SCHEMA_VERSION=1
├── validate.ts                # ValidationIssue[] / Result; no silent trim
├── compile.ts                 # LevelFileV1 → CompiledLevel
├── apply.ts                   # applyCompiledLevel(world, compiled) 'worklet'
├── load.ts                    # loadAndCompile(raw|unknown) = validate→migrate→compile
├── migrations/
│   ├── index.ts               # migrate(raw): only accepts schemaVersion===1 for now
│   └── README.md              # how to add v1→v2 (optional short note)
└── (DELETE phase3Grid.ts — keep assignSpatialBrickCells in apply.ts or spatial.ts)

src/runtime/useGameLoop.ts     # consume CompiledLevel SharedValue; drop loadPhase3Grid
app/_components/GameHost.tsx   # require JSON, load pipeline, dev switch, error overlay
tests/
├── levels.validate.test.ts
├── levels.compile.test.ts
├── levels.apply.test.ts
└── fixtures/levels/           # invalid + valid JSON copies if needed
```

### Pattern 1: Authoring ≠ Runtime (locked)

**What:** Versioned row-string JSON compiles to flat typed arrays; simulation never sees authoring objects.
**When to use:** Always for level load (D-04, architecture Pattern 8).
**Example schema (recommended defaults — Claude discretion on exact keys):**

```json
{
  "schemaVersion": 1,
  "id": "level-01",
  "name": "Phase 3 Grid",
  "grid": {
    "cols": 7,
    "rows": 5,
    "originX": 26,
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
    "X333333X",
    "2222222",
    "22X2222",
    "1111111",
    "1111111"
  ]
}
```

> Note: exact `cells` must match `cols`/`rows` after migration from `phase3Grid.ts` (7×5 with steel corners + mid steel). Do not pad/trim; reject length mismatches. [CITED: ARCHITECTURE.md Pattern 8; CONTEXT D-01–D-03]

```ts
// Source: adapted from .planning/research/ARCHITECTURE.md Pattern 8
export type CompiledLevel = {
  brickCount: number;
  x: Float32Array;
  y: Float32Array;
  w: Float32Array;
  h: Float32Array;
  hp: Int16Array;
  flags: Uint8Array;
  gridCols: number;
  gridRows: number;
  // Optional: precomputed cellToBrick for apply; or rebuild via assignSpatialBrickCells
};
```

### Pattern 2: Validate → Compile → Apply (ordered gates)

**What:** Three pure functions; apply is the only World mutator among them.
**When to use:** Every load path (app boot, dev switch, Vitest).
**Rules:**
1. `validate` returns `{ ok:false, issues }` without throwing into gameplay, **or** throws only after host decides not to apply — either way, **no World writes**.
2. `compile` assumes validated `LevelFileV1`.
3. `applyCompiledLevel` is `'worklet'`-safe, copies into existing SoA, caps at `world.brickX.length` (default maxBricks 256 [VERIFIED: allocate.ts]).

### Pattern 3: Damage cues from remaining HP (no maxHp SoA yet)

**What:** Crack density from current `brickHp` for breakables (`hp>=3` none, `hp===2` one chip, `hp===1` two cracks); hatch only when `(flags & UNBREAKABLE)`.
**When to use:** Phase 4 types with max HP ∈ {1,2,3} starting at max — remaining HP equals damage state. [ASSUMED: no brick types with max>3 in Phase 4]
**Why not brickMaxHp yet:** World SoA lacks `brickMaxHp`/`typeId`; avoid schema expansion until Phase 5 score/types need it.

### Pattern 4: Spatial broadphase for real grids

**What:** After apply, call `assignSpatialBrickCells(world, cols, rows)` when `rows > 1` so `stepWorld` uses spatial path (`gridRows > 1`). [VERIFIED: step.ts + phase3Grid comments]
**When to use:** Both shipped levels (5-row layouts). Do **not** leave packed `gridRows===1` for playable data levels — that was a Phase 3 tunneling workaround for the hardcoded helper.

### Anti-Patterns to Avoid

- **Authoring JSON on the hot path:** parsing or validating inside `useFrameCallback` — violates D-04/D-14.
- **Silent `.trim()` / padding rows:** hides authoring bugs; violates D-02.
- **Partial apply on error:** mutating some bricks then failing — violates D-13; clears determinism.
- **Per-level physics forks:** special-case corridor bounce — violates D-10.
- **React Text for HP:** overlays or state for cracks — violates D-07.
- **Keeping `loadPhase3Grid` as test helper:** violates D-15; tests must use JSON fixtures + same pipeline.
- **Neon/particles in Phase 4:** deferred D-08 / Phase 7.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swept collision / multi-HP damage | New brick physics | Existing `stepWorld` + `BrickFlags` | Already proven Phase 2/3 |
| Win condition for steel | Custom win rules | `countBreakableAlive` / `applyWinCheck` | Already ignores UNBREAKABLE [VERIFIED: win.ts] |
| JSON bundling | Custom asset downloader | Metro `require` / `import` of `.json` | JSON is source, not Asset registry |
| Schema evolution process | Ad-hoc renames in place | `schemaVersion` + `migrations/` folder | Locked D-03; architecture Pattern 8 |
| Complex third-party schema DSL | — | **Do** hand-roll this small validator | Domain errors need `cells[r][c]` paths |

**Key insight:** Hand-roll the **level validator** (small, message-critical); do **not** hand-roll physics, win, bundling, or a second render path.

## Common Pitfalls

### Pitfall 1: Compiling inside the worklet
**What goes wrong:** First-frame `loadPhase3Grid`-style JSON work reappears; worklets cannot safely use rich validators; determinism and LC purity suffer.
**Why it happens:** Current `useGameLoop` allocates World and loads grid inside the frame callback [VERIFIED: useGameLoop.ts].
**How to avoid:** Compile on JS in `GameHost`/`useEffect` before `setActive(true)`; pass `CompiledLevel` in; worklet only `applyCompiledLevel`.
**Warning signs:** `JSON.parse`, `validate`, or `require` appearing under `'worklet'`.

### Pitfall 2: Invalid file still touches World
**What goes wrong:** Half-loaded bricks; flaky golden hashes; win/lose nonsense.
**Why it happens:** Apply interleaved with validate; or reset+apply without gating.
**How to avoid:** Host holds previous good `CompiledLevel`; on failure show overlay and **skip** `resetWorld`/`apply` entirely (D-13).
**Warning signs:** `brickCount` changes when overlay shows an error.

### Pitfall 3: Row-string length bugs
**What goes wrong:** Silent misalignment; columns shift; “empty” cells that were spaces.
**Why it happens:** Editors pad with spaces; `trim` hides it.
**How to avoid:** Reject if `cells.length !== rows` or any `cells[r].length !== cols`; reject unknown chars; reject space unless schema adds an explicit space meaning (Phase 4: **disallow spaces**).
**Warning signs:** Validation without per-row length checks.

### Pitfall 4: Exhaustive vs spatial broadphase regression
**What goes wrong:** Tunneling or missed hits after leaving packed 1-row layout.
**Why it happens:** Phase 3 tests asserted `gridRows===1` [VERIFIED: levels.phase3-grid.test.ts].
**How to avoid:** Apply + `assignSpatialBrickCells`; update tests to expect `gridRows === level.grid.rows`; keep a tunneling smoke test against compiled `level-01`.
**Warning signs:** Reintroducing `gridRows = 1` for “safety.”

### Pitfall 5: Unbreakable drawn as damaged
**What goes wrong:** Steel shows crack lines → players think it will break.
**Why it happens:** Crack code keys only on `hp` and ignores flags.
**How to avoid:** Branch flags first (same as `brickFillLocal`); hatch only for unbreakable; never crack steel (D-06).
**Warning signs:** Cracks on `#6B7280` bricks.

### Pitfall 6: Dev switch / Retry cycling levels
**What goes wrong:** Scope creep into LVL-05.
**Why it happens:** Convenient QA behavior.
**How to avoid:** `__DEV__`-only control; Retry reloads **current** compiled level only (D-11).

## Code Examples

### Validate with actionable paths

```ts
// Recommended shape — implement in src/core/levels/validate.ts
export type ValidationIssue = { path: string; message: string };

export function validateLevel(raw: unknown): { ok: true; value: LevelFileV1 } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, issues: [{ path: '', message: 'Level root must be an object' }] };
  }
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) {
    issues.push({
      path: 'schemaVersion',
      message: `Unsupported schemaVersion ${String(o.schemaVersion)}; supported: 1`,
    });
  }
  // … type checks …
  // cells[r]: length === cols; each char in brickTypes or '.'
  // NEVER trim cells[r]
  return issues.length ? { ok: false, issues } : { ok: true, value: o as LevelFileV1 };
}
```

### Compile once on JS thread

```ts
// Source pattern: .planning/research/ARCHITECTURE.md Pattern 8
export function compileLevel(level: LevelFileV1): CompiledLevel {
  const bricks: Array<{ x: number; y: number; w: number; h: number; hp: number; flags: number }> = [];
  const { cols, rows, originX, originY, brickW, brickH, gapX, gapY } = level.grid;
  for (let r = 0; r < rows; r++) {
    const row = level.cells[r];
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      const t = level.brickTypes[ch];
      bricks.push({
        x: originX + c * (brickW + gapX),
        y: originY + r * (brickH + gapY),
        w: brickW,
        h: brickH,
        hp: t.hp,
        flags: t.unbreakable ? BrickFlags.UNBREAKABLE : 0,
      });
    }
  }
  // pack into typed arrays → CompiledLevel
  return pack(bricks, cols, rows);
}
```

### Crack / hatch in recordFrame

```ts
// Source: Skia Canvas.drawLine typings @shopify/react-native-skia 2.12.0
// Inside brick loop after fill rect; paint style stroke; light gray/white lines
if ((flags & 1) !== 0) {
  // steel hatch: 2–3 diagonals clipped to brick AABB
  canvas.drawLine(x, y, x + w, y + h, tools.paint);
  canvas.drawLine(x + w * 0.5, y, x + w, y + h * 0.5, tools.paint);
} else if (hp === 2) {
  canvas.drawLine(x + 4, y + h * 0.5, x + w - 4, y + h * 0.35, tools.paint);
} else if (hp === 1) {
  canvas.drawLine(x + 4, y + h * 0.35, x + w - 4, y + h * 0.55, tools.paint);
  canvas.drawLine(x + 6, y + h * 0.65, x + w - 8, y + h * 0.45, tools.paint);
}
```

Keep Phase 3 fills: HP3 `#C44569`, HP2 `#E07A5F`, HP1 `#F2CC8F`, steel `#6B7280` [CITED: 03-UI-SPEC.md].

### Host load gate

```ts
// GameHost / thin loader module (JS thread)
const raw = levelId === 'level-02'
  ? require('../../assets/levels/level-02.json')
  : require('../../assets/levels/level-01.json');

const result = loadAndCompile(raw); // validate → migrate → compile
if (!result.ok) {
  console.error('[level]', result.issues);
  setLevelError(result.issues);
  return; // do not touch world / do not setActive(true)
}
setLevelError(null);
compiledSv.value = result.compiled;
retry(); // resetWorld + applyCompiledLevel(compiled)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `phase3Grid.ts` in worklet | Authoring JSON → validate → compile → apply | Phase 4 (this phase) | Editor-ready; second level without code changes |
| Color-only HP (Phase 3 D-02) | Color + crack/chip strokes | Phase 4 LVL-02 | Non-color readability |
| Packed `gridRows===1` for playable grid | Spatial `assignSpatialBrickCells` for data levels | Phase 4 | Correct broadphase for multi-row layouts |
| Zod/Ajv for every schema | Hand-rolled path-aware validator for tiny level DSL | Phase 4 choice | Fewer deps; better error UX |

**Deprecated/outdated:**
- `loadPhase3Grid` / `src/core/levels/phase3Grid.ts` — remove after migration (D-15).
- Treating authoring JSON as runtime format — architecture anti-pattern #8 [CITED: ARCHITECTURE.md].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 4 brick types only need max HP ∈ {1,2,3}; remaining `brickHp` suffices for crack states without `brickMaxHp` SoA | Pattern 3 | Higher-HP types would show wrong crack stages — add `brickMaxHp` or `typeId` |
| A2 | Reanimated `SharedValue` can hold a `CompiledLevel` of TypedArrays created on JS for UI-thread `apply` | Architecture diagram | If sharing fails, apply on JS during discrete retry (current retry already mutates `world.value` from JS) [VERIFIED: useGameLoop.retry] |
| A3 | Disallowing spaces in row-strings is compatible with future editor (editor writes `.` only) | Pitfall 3 | Editor might emit spaces — then schema must define space semantics explicitly |
| A4 | Empty `migrations/` with identity `migrate()` + reject-unsupported satisfies roadmap SC-5 “migration path” until v2 exists | D-03 | Auditors may want a documented stub README — include short migrations README |

## Open Questions (RESOLVED)

1. **Exact `level-01` cell encoding after migration** — RESOLVED: Bake numeric `originX`/`originY` into JSON (phase3 uses centered formula; bake `originX=14` and matching `originY` literals so compile stays dumb and deterministic). Layout remains 7×5, HP by row `[3,2,2,1,1]`, steel at (0,0),(0,6),(2,3).

2. **Dev switch UX** — RESOLVED: `__DEV__` “Lv 01|02” text control in GameHost chrome (D-11 — no menu).

3. **Whether `loadTestGrid` remains for non-level physics unit tests** — RESOLVED: Keep `loadTestGrid` for synthetic AABBs in physics tests; playable layouts use JSON validate→compile→apply only; ban reintroducing hardcoded playable grids.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest level tests | ✓ | v25.6.0 (engines ask `>=24 <25` — note drift) | Use Node 24 for CI if engines enforced |
| npm / vitest | Validation suite | ✓ | vitest 5.0.1 | — |
| Metro JSON require | Bundled levels | ✓ | Expo SDK 57 defaults | — |
| Zod / Ajv | — | n/a (not used) | — | Hand-rolled validator |
| Device / EAS | Not required for Phase 4 acceptance | ✓ existing | — | Simulator OK for format work |

**Missing dependencies with no fallback:** None for Phase 4 implementation.

**Missing dependencies with fallback:** None.

**Note:** Project `engines.node` is `>=24 <25` but shell reports Node 25.6.0 — flag for CI alignment; does not block research.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` [VERIFIED].

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.1 |
| Config file | default Vitest (package scripts); tests under `tests/` |
| Quick run command | `npm run test:core` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LVL-01 | `schemaVersion` 1 accepted; unsupported rejected with path `schemaVersion` | unit | `npx vitest run tests/levels.validate.test.ts` | ❌ Wave 0 |
| LVL-01 | Valid level-01/02 compile to brickCount > 0; unknown char / bad row length rejected | unit | `npx vitest run tests/levels.validate.test.ts tests/levels.compile.test.ts` | ❌ Wave 0 |
| LVL-01 | App/tests load via same `loadAndCompile` (no `loadPhase3Grid`) | unit + grep | `npx vitest run tests/levels.apply.test.ts` + ensure phase3Grid gone | ❌ Wave 0 |
| LVL-01 | Second level fixture differs structurally (steel corridor vs open grid) | unit | assert layout fingerprints differ | ❌ Wave 0 |
| LVL-02 | Breakable HP 3/2/1 produce distinct crack stroke counts (pure helper optional) | unit | `tests/levels.damage-cues.test.ts` or render-helper unit | ❌ Wave 0 |
| LVL-02 | Color palette unchanged for HP bands (optional snapshot of fill helper) | unit | existing colors helper | ✅ `src/render/colors.ts` |
| LVL-03 | Unbreakable compiles with `BrickFlags.UNBREAKABLE`; hatch path not using crack helper | unit | compile + flag assert | ❌ Wave 0 |
| LVL-03 | Win with only steel left → WON | unit | existing `tests/rules.win.test.ts` | ✅ |
| LVL-03 | level-02 contains ≥1 unbreakable channeling pattern | unit | fixture assert | ❌ Wave 0 |
| Cross | Invalid compile never changes `hashWorld` / brickCount of an already-loaded world | unit | apply-guard test | ❌ Wave 0 |
| Cross | Compiled level-01 no-tunnel smoke (replace phase3 grid test) | unit | migrate `tests/levels.phase3-grid.test.ts` | ⚠️ replace |
| Cross | `core` purity still holds with new levels modules | unit | `tests/core.purity.test.ts` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run test:core`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`; manual: boot level-01, `__DEV__` switch to level-02, confirm play + steel bounce; inject broken JSON in dev build and confirm overlay (no playfield).

### Wave 0 Gaps

- [ ] `tests/levels.validate.test.ts` — covers LVL-01 rejection/acceptance
- [ ] `tests/levels.compile.test.ts` — covers compile packing + flags
- [ ] `tests/levels.apply.test.ts` — covers SoA fill + spatial grid + no-mutate-on-failure
- [ ] `tests/fixtures/levels/invalid-*.json` — unsupported version, bad row length, unknown char, space in row
- [ ] Replace `tests/levels.phase3-grid.test.ts` to use `assets/levels/level-01.json` pipeline
- [ ] Optional: `src/core/levels/damageCues.ts` pure stroke-plan helper for unit-testing crack counts without Skia

## Security Domain

> Offline game; `security_enforcement` not disabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | `validateLevel` before compile/apply; reject unknown keys/chars; bound brickCount ≤ maxBricks; finite numbers only |
| V6 Cryptography | no | — |

### Known Threat Patterns for level JSON + SoA

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed / huge level JSON | Denial of Service | Cap cols×rows and brickCount against `maxBricks` (256); fail closed |
| NaN / Infinity in grid metrics | Tampering | Reject non-finite numbers in validate |
| Partial World corruption | Tampering | No apply on validation failure (D-13) |
| Prototype pollution via `__proto__` keys in brickTypes | Tampering | Iterate with `Object.hasOwn` / explicit key allowlist; don't merge into arbitrary objects |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/04-level-format-brick-types/04-CONTEXT.md` — locked decisions D-01…D-15
- `.planning/research/ARCHITECTURE.md` — Pattern 8 authoring→compile; Level Loader on JS thread; anti-pattern #8
- `.planning/research/PITFALLS.md` — hardcoded levels debt; Jest/worklet testing guidance
- `docs/layer-contract.md` — LC-01…LC-08
- Codebase: `phase3Grid.ts`, `useGameLoop.ts`, `recordSprites.ts`, `win.ts`, `reset.ts`, `allocate.ts`
- `@shopify/react-native-skia` Canvas.d.ts — `drawLine` API
- Expo Metro docs — JSON as source extension [CITED: docs.expo.dev/guides/customizing-metro]
- npm registry — zod 4.6.5, vitest 5.0.1 (2026-09-20)

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — level format deliverable (note: research phase numbering differs from ROADMAP; ROADMAP Phase 4 is canonical)
- `.planning/phases/03-…/03-UI-SPEC.md` — brick palette tokens
- Metro bundler `sourceExts` defaults including `json` [CITED: metrobundler.dev/docs/configuration]

### Tertiary (LOW confidence)

- Community StackOverflow on Expo JSON require vs Asset.fromModule — used only to confirm “don't use Asset for JSON”

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; Metro JSON + Vitest + Skia drawLine verified
- Architecture: HIGH — locked CONTEXT + existing SoA/win/physics + architecture Pattern 8
- Pitfalls: HIGH — several map directly to current `useGameLoop` / phase3Grid call sites

**Research date:** 2026-09-20  
**Valid until:** 2026-10-20 (30 days; format stack is stable)
