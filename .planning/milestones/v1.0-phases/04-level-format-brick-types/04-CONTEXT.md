# Phase 4: Level Format & Brick Types - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Levels become data rather than code — versioned, validated, and expressive enough for the showpiece level and a future editor.

Delivers: versioned authoring JSON (row-strings + per-level brick-type table); JS-thread validate → compile once into World SoA / compiled level; two playable levels (`level-01` migrated from phase3Grid, `level-02` corridor/structural); multi-HP damage readability via lightweight crack/chip cues (non-color) drawn in Skia; unbreakable/structural bricks with fixed steel/hatch appearance that never block win; actionable rejection of invalid/unsupported schema versions; single load pipeline for app and tests; dev-only level switch (no menu).

Does **not** deliver: showpiece ~2–3 minute authored challenge (Phase 8 / LVL-04); level select UI (Phase 6 / LVL-05); score/combo/power-ups/anti-stall (Phase 5); neon glow, particles, destruction animations (Phase 7); full visual Level Editor product (future — format must stay compatible).

</domain>

<decisions>
## Implementation Decisions

### Authoring shape (LVL-01)
- **D-01:** Authoring format is **versioned JSON** with **row-strings** plus a **brick-type table inside each level file** (self-contained, independently editable, human-readable, easy to diff, future Level Editor–compatible).
- **D-02:** Canonical empty cell is **`.`**. Spaces only if the schema explicitly allows them; **never silently trim** row strings.
- **D-03:** Root field **`schemaVersion: 1`**. Unsupported versions are **rejected with actionable validation errors**. Add `migrations/` only when introducing a new schema version.
- **D-04:** **Validate before compile.** Compile into SoA / compiled level **once per level load** on the **JS thread**. Runtime hot path and worklets **never** parse authoring JSON.

### Damage readability (LVL-02)
- **D-05:** Remaining HP is shown with **crack/chip lines** (non-color cue). States must be distinguishable without relying on color alone; keep drawing **lightweight** for dense grids.
- **D-06:** Unbreakable/structural bricks use **steel/gray** plus a **fixed hatch or structural glyph**. They must stay visually distinct from damaged breakables and **must not** morph into “damage” crack states.
- **D-07:** Damage/structural cues render in the **Skia entity layer inside `recordFrame`**. No separate React overlays and no per-frame React state for brick HP visuals.
- **D-08:** Phase 4 visuals stay **minimal**. Neon glow, particles, and destruction animations remain **Phase 7**.

### Second level identity (LVL-01 / LVL-03 proof)
- **D-09:** Ship **exactly two** levels: migrate `phase3Grid` → **`assets/levels/level-01.json`**, and author **`level-02.json`** as a **corridor/channel** layout using unbreakables to force different trajectories.
- **D-10:** Both levels load, validate, compile, and play through the **same code path** with **no physics-engine or rendering-logic forks** per level.
- **D-11:** Level selection in Phase 4 is a **development-only switch** in the host. **No** level-select menu and **no** automatic cycling on Retry.

### Load & fail behavior
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 4 goal + success criteria 1–5
- `.planning/REQUIREMENTS.md` — LVL-01, LVL-02, LVL-03 (LVL-04 is Phase 8)
- `.planning/PROJECT.md` — Core value / non-negotiables
- `.planning/STATE.md` — Current milestone position

### Prior phase decisions
- `.planning/milestones/v1.0-phases/02-headless-core-simulation/02-CONTEXT.md` — D-10 multi-HP/unbreakable API; D-11 level format deferred; SoA brick fields
- `.planning/milestones/v1.0-phases/03-first-playable-render-input-bricks-lives-pause/03-CONTEXT.md` — D-02 color-only HP in P3; D-18 win ignores unbreakable; D-20 hardcoded grid replaced this phase
- `.planning/milestones/v1.0-phases/03-first-playable-render-input-bricks-lives-pause/03-UI-SPEC.md` — Row brick palette (keep color family; add non-color cracks)

### Architecture research (authoring vs runtime)
- `.planning/research/ARCHITECTURE.md` — Level Loader/Compiler; Pattern: authoring JSON → compile → typed arrays; example `schemaVersion` + row-strings; `assets/levels/*.json`
- `.planning/research/SUMMARY.md` — Phase “Level format + brick types” deliverable summary
- `.planning/research/PITFALLS.md` — Do not make authoring format the runtime format
- `docs/layer-contract.md` — core purity / JS-thread vs worklet boundaries (if present)

### Existing code integration
- `src/core/types.ts` — `brickHp`, `brickFlags`, `BrickFlags.UNBREAKABLE`
- `src/core/levels/phase3Grid.ts` — migrate then remove
- `src/render/recordSprites.ts` — extend brick draw with crack/hatch cues
- `app/_components/GameHost.tsx` — wire validate/compile + dev level switch + error overlay

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `World` SoA brick fields + `BrickFlags.UNBREAKABLE` — compile target; no new physics brick model required
- `loadPhase3Grid` / `loadTestGrid` / `assignSpatialBrickCells` — patterns to replace with compile → apply
- `recordSprites` brick fills + Phase 3 row palette — keep colors; add crack/hatch strokes
- `GameHost` + `useGameLoop.retry` — swap grid source to compiled level; add load-error UI state

### Established Patterns
- Authoring ≠ runtime (research Pattern 8)
- Win condition already ignores unbreakables (Phase 2/3)
- Opaque Skia immediate-mode Picture — cues must be worklet-safe draw ops, not React

### Integration Points
- JS thread: fetch/require JSON → `validate` → `compile` → pass compiled blob into reset/init
- UI thread: `recordFrame` reads `brickHp` / flags only
- Tests: Vitest loads the same JSON fixtures through validate/compile (no hardcoded grid helper)

</code_context>

<specifics>
## Specific Ideas

- Prefer editor-ready row-string JSON from day one so a future Level Editor only writes the same schema.
- `level-02` should make structural corridors obvious in play (ball pathing differs from open `level-01`).
- Validation errors should name field/row/char when possible (actionable).

</specifics>

<deferred>
## Deferred Ideas

- Full visual Level Editor product — future phase; Phase 4 only keeps the authoring contract compatible
- Level select menu / Retry level cycling — Phase 6 (LVL-05)
- Showpiece ~2–3 minute challenge level — Phase 8 (LVL-04)
- Neon glow, particles, destruction VFX — Phase 7
- Shared global brick-type catalog file — deferred; Phase 4 keeps types in-file (D-01)

None — discussion stayed within phase scope aside from explicitly deferred future editor/UI/VFX above.

</deferred>

---

*Phase: 04-level-format-brick-types*
*Context gathered: 2026-09-20*
