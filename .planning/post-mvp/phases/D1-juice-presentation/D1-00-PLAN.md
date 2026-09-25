---
phase: D1-juice-presentation
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - src/vfx/types.ts
  - src/vfx/brickGhosts.ts
  - src/vfx/paddleSquash.ts
  - src/vfx/index.ts
  - src/services/haptics/types.ts
  - src/services/haptics/mapping.ts
  - src/services/haptics/memoryHapticsService.ts
  - src/services/haptics/index.ts
  - tests/vfx.brick-ghosts.test.ts
  - tests/vfx.paddle-squash.test.ts
  - tests/haptics.batch-coalesce.test.ts
  - .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md
autonomous: true
requirements:
  - N-FX-01
  - N-FX-03
must_haves:
  truths:
    - "VfxState allocates ghost SoA (cap ≥16) + paddleSquashT without touching World / hash.ts"
    - "spawnBrickGhost / stepBrickGhosts and punchPaddleSquash / stepPaddleSquash are callable worklets with GREEN unit tests"
    - "Memory HapticsService coalesce: 8× break → 1 Light; break+life → 1 Medium; paddle-only → 0"
    - "Wave 0 Vitest files exist so Plans 01–03 have automated verify targets; VALIDATION wave_0_complete"
  artifacts:
    - path: "src/vfx/brickGhosts.ts"
      provides: "spawnBrickGhost + stepBrickGhosts SoA pool"
      exports: ["GHOST_CAP", "GHOST_LIFE_MAX", "spawnBrickGhost", "stepBrickGhosts"]
    - path: "src/vfx/paddleSquash.ts"
      provides: "punch/step paddle squash scalar"
      exports: ["PADDLE_SQUASH_T_MAX", "punchPaddleSquash", "stepPaddleSquash"]
    - path: "src/services/haptics/memoryHapticsService.ts"
      provides: "recordable coalesce for Vitest"
      exports: ["createMemoryHapticsService"]
    - path: "tests/vfx.brick-ghosts.test.ts"
      provides: "N-FX-01 Nyquist spawn/step/cascade stubs"
    - path: "tests/haptics.batch-coalesce.test.ts"
      provides: "N-FX-03 strongest-wins GREEN"
  key_links:
    - from: "D1-VALIDATION.md Wave 0"
      to: "tests/vfx.brick-ghosts.test.ts + tests/haptics.batch-coalesce.test.ts"
      via: "automated vitest path resolves"
      pattern: "brick-ghosts|batch-coalesce|paddle-squash"
    - from: "brickGhosts.ts"
      to: "VfxState ghost fields"
      via: "allocateVfx initializes arrays"
      pattern: "ghostCap|ghostActive|spawnBrickGhost"
---

<objective>
Wave 0 contracts: lock VFX ghost/squash SoA + pure step APIs, ship memory HapticsService with strongest-wins coalesce GREEN, create Nyquist Vitest files (`it` where APIs exist; `it.todo` for consume/draw/wire), mark VALIDATION Wave 0 complete.

Purpose: Later plans must not invent ghost pool shape, squash scalar, or haptic rank map; Nyquist files must exist before consume/draw/expo-haptics/PlayingHost work.
Output: `brickGhosts.ts` + `paddleSquash.ts` + `src/services/haptics/*` (memory) + three test files + VALIDATION `wave_0_complete: true`.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-PATTERNS.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-UI-SPEC.md
@src/vfx/types.ts
@src/vfx/particles.ts
@src/vfx/shake.ts
@src/vfx/index.ts
@src/services/audio/types.ts
@src/services/audio/mapping.ts
@src/services/audio/expoAudioService.ts
@tests/vfx.particles.test.ts
@tests/vfx.shake.test.ts
@tests/audio.batch-dedupe.test.ts

<preconditions>
**B3 / §5c:** Ceiling Cert WC re-run already **PASS** (`docs/ops/CEILING-CERT.md` §5c, 2026-09-25). Do **not** add a blocking human Cert gate in any D1 plan. Second Cert only if render load changes (Plan 03 docs note).
</preconditions>

<interfaces>
<!-- Contracts this plan CREATES — implement exactly (D-01, D-12…D-15, D-17). Do NOT wire consumeEvents / recordSprites / PlayingHost / expo-haptics yet (Plans 01–03). -->

```typescript
// src/vfx/types.ts — EXTEND VfxState + allocateVfx (never World / hash.ts)
export const GHOST_CAP_DEFAULT = 16; // cascade-safe; separate from particleCap (D-01)

// Add to VfxState:
ghostCap: number;
ghostX: Float32Array;
ghostY: Float32Array;
ghostW: Float32Array;
ghostH: Float32Array;
ghostR: Float32Array;
ghostG: Float32Array;
ghostB: Float32Array;
ghostLife: Float32Array;
ghostLifeMax: Float32Array;
ghostActive: Uint8Array;
ghostOldest: number; // FIFO when full
paddleSquashT: number; // seconds remaining; 0 = idle

// src/vfx/brickGhosts.ts — NEW (mirror particles.ts pool)
export const GHOST_LIFE_MAX = 0.15; // Discretion; UI-SPEC ≤~150–250ms — keep short
export function spawnBrickGhost(
  vfx: VfxState,
  geom: { x: number; y: number; w: number; h: number; r: number; g: number; b: number },
  lifeMax?: number,
): void; // 'worklet'; FIFO if full; active=1
export function stepBrickGhosts(vfx: VfxState, dt: number): void; // life -= dt; release at ≤0

// src/vfx/paddleSquash.ts — NEW (mirror shake punch/decay)
export const PADDLE_SQUASH_T_MAX = 0.1;
export function punchPaddleSquash(vfx: VfxState): void; // max-merge to T_MAX
export function stepPaddleSquash(vfx: VfxState, dt: number): void; // decay toward 0

// src/services/haptics/types.ts — NEW
export type HapticStyle = 'light' | 'medium';
export interface HapticsService {
  playFromBatch(codes: ArrayLike<number>, count: number): void;
  release(): void;
}
export type MemoryHapticsService = HapticsService & {
  fires: Array<{ style: HapticStyle }>;
};

// src/services/haptics/mapping.ts — numeric literals ONLY (no core import) — D-11
// 4 → rank 1 (break/Light); 7 → rank 2 (life/Medium); else 0
export function hapticRankForCode(code: number): 0 | 1 | 2;
export function coalesceHapticRank(codes: ArrayLike<number>, count: number): 0 | 1 | 2;
// strongest wins: any 7 → 2; else any 4 → 1; else 0

// src/services/haptics/memoryHapticsService.ts
export function createMemoryHapticsService(): MemoryHapticsService;
// playFromBatch pushes ≤1 fire from coalesceHapticRank; release clears
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Ghost + squash SoA contracts + GREEN unit tests</name>
  <files>src/vfx/types.ts, src/vfx/brickGhosts.ts, src/vfx/paddleSquash.ts, src/vfx/index.ts, tests/vfx.brick-ghosts.test.ts, tests/vfx.paddle-squash.test.ts</files>
  <read_first>.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md, .planning/post-mvp/phases/D1-juice-presentation/D1-PATTERNS.md, src/vfx/types.ts, src/vfx/particles.ts, src/vfx/shake.ts, tests/vfx.particles.test.ts, tests/vfx.shake.test.ts</read_first>
  <behavior>
    - allocateVfx() → ghostCap === 16; all ghost arrays length 16; paddleSquashT === 0
    - spawnBrickGhost ×1 → one active; life ≈ lifeMax; geom/rgb copied
    - spawnBrickGhost ×8 (cascade) → 8 active (≤ cap)
    - stepBrickGhosts over lifeMax → all inactive
    - PARTICLE_POOL_DEFAULT still 128 (Mid freeze D-01 — no particle bump)
    - punchPaddleSquash → paddleSquashT === PADDLE_SQUASH_T_MAX; step decays toward 0
    - No World / hash.ts imports in new vfx modules
  </behavior>
  <action>
Per **D-01, D-13, D-14, D-15, D-17** and PATTERNS particles/shake analogs:

1. Extend `VfxState` + `allocateVfx` with ghost SoA (`GHOST_CAP_DEFAULT = 16`) and `paddleSquashT = 0`. Do **not** change `PARTICLE_POOL_DEFAULT` / `PARTICLE_POOL_HARD_MAX` / glowScale defaults.

2. Create `brickGhosts.ts` with `'worklet'` `spawnBrickGhost` (FIFO when full) and `stepBrickGhosts`. Snapshot geom/rgb only — never read/write World inside this module (caller passes geom).

3. Create `paddleSquash.ts` with `punchPaddleSquash` / `stepPaddleSquash`. Never reference `paddleW`.

4. Export new symbols from `src/vfx/index.ts`.

5. Create `tests/vfx.brick-ghosts.test.ts` with real expects for allocate/spawn/step/8-cascade. Add `it.todo` for Plan 01:
   - `consumeEventsForVfx: each BRICK_BREAK spawns a ghost (incl. cascade members)`
   - `recordSprites draws ghosts under ball; flat fill only`

6. Create `tests/vfx.paddle-squash.test.ts` with punch/step GREEN + `it.todo` for Plan 01:
   - `PADDLE_HIT punches squash; World.paddleW unchanged`
   - `recordSprites scales draw only`

Avoid: editing `consumeEvents.ts` / `recordSprites.ts` / `stepVfx.ts` (Plan 01); `hash.ts`; particleCap bumps; confetti; expo-haptics install.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/vfx.particles.test.ts tests/runtime.quality-tiers.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "ghostCap|paddleSquashT|spawnBrickGhost|punchPaddleSquash" src/vfx/` matches
    - `rg "PARTICLE_POOL_DEFAULT = 128" src/vfx/types.ts` still matches
    - `rg "from ['\\\"].*core" src/vfx/brickGhosts.ts src/vfx/paddleSquash.ts` finds nothing (or only type-only if needed — prefer zero)
    - Vitest exits 0; ≥1 `it.todo` each in brick-ghosts + paddle-squash for Plan 01
    - No edits under `src/core/`
  </acceptance_criteria>
  <done>Ghost/squash SoA + step APIs tested green; consume/draw todos reserved for Plan 01.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Memory haptics coalesce + VALIDATION Wave 0</name>
  <files>src/services/haptics/types.ts, src/services/haptics/mapping.ts, src/services/haptics/memoryHapticsService.ts, src/services/haptics/index.ts, tests/haptics.batch-coalesce.test.ts, .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md, .planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md, src/services/audio/types.ts, src/services/audio/mapping.ts, tests/audio.batch-dedupe.test.ts</read_first>
  <behavior>
    - hapticRankForCode(4)→1; (7)→2; (2|3|…)→0
    - coalesce 8×4 → 1; [4,7] → 2; [2,3] → 0
    - memory playFromBatch(8× break) → fires.length===1 style light
    - memory playFromBatch(break+life) → 1 fire medium
    - memory playFromBatch(paddle only) → fires.length===0
    - haptics modules do not import useVfxIntensity / AccessibilityInfo
  </behavior>
  <action>
Per **D-08…D-12** and audio service analog (memory-only this plan):

1. Create `src/services/haptics/{types,mapping,memoryHapticsService,index}.ts` per `<interfaces>`. Mapping uses numeric `4` / `7` only — **no** `from '../core'` / `from '../../core'`.

2. `createMemoryHapticsService().playFromBatch` uses `coalesceHapticRank` → push at most one `{ style }` (`1→light`, `2→medium`). Soft no-op if rank 0. `release()` clears fires / marks released.

3. Create `tests/haptics.batch-coalesce.test.ts` GREEN for cases above. Add `it.todo` for Plan 02/03:
   - `createDefaultHapticsService soft-falls when ExpoHaptics native missing`
   - `PlayingHost playBatch fans out audio + haptics (≤1 scheduleOnRN hop)`
   - `source contract: haptics/* must not import useVfxIntensity`

4. Update `D1-VALIDATION.md`:
   - Frontmatter: `wave_0_complete: true` (leave `nyquist_compliant: false` until Plan 03)
   - Align test filenames to `tests/vfx.brick-ghosts.test.ts`, `tests/vfx.paddle-squash.test.ts`, `tests/haptics.batch-coalesce.test.ts`
   - Check Wave 0 boxes; note §5c Cert already PASS — no second Cert unless render-load delta
   - Mark Phase Requirements → Test Map File Exists ✅ for new files

Avoid: `npx expo install expo-haptics` (Plan 02); PlayingHost wire (Plan 03); reduce-motion gating; OS System Haptics query; in-app mute.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; test -f tests/haptics.batch-coalesce.test.ts && rg -n "wave_0_complete: true" .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md && npx vitest run tests/haptics.batch-coalesce.test.ts tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "createMemoryHapticsService|coalesceHapticRank|playFromBatch" src/services/haptics/` matches
    - `rg "useVfxIntensity|AccessibilityInfo|expo-haptics" src/services/haptics/` finds nothing in Wave 0
    - `rg "from ['\\\"].*core" src/services/haptics/mapping.ts` finds nothing
    - VALIDATION `wave_0_complete: true`
    - Vitest exits 0
  </acceptance_criteria>
  <done>Memory haptics strongest-wins green; Nyquist Wave 0 documented complete.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Event code ArrayLike → haptic rank | Untrusted numeric codes from ring/audio batch — clamp via ignore-unknown |
| VFX SoA ↔ World | Juice must not cross into World writes (enforced by module separation) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-D1-01 | Denial of service | Haptic coalesce | mitigate | ≤1 fire/batch via `coalesceHapticRank`; ignore non-break/life codes (D-11/D-12) |
| T-D1-02 | Tampering | Ghost/squash state | mitigate | State only on `VfxState`; no `hash.ts` / World field adds (D-15) |
| T-D1-03 | Information disclosure | OS haptics query | mitigate | Wave 0 has no OS/battery query APIs; keep none (D-09) |
| T-D1-04 | Spoofing | Privacy manifest | accept | No native module yet; Plan 02 must not add data-collection types (D-08) |
</threat_model>

<verification>
`npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/haptics.batch-coalesce.test.ts` exits 0; VALIDATION `wave_0_complete: true`; Mid particleCap still 128; no `src/core/` diffs.
</verification>

<success_criteria>
Wave 0 complete: ghost/squash APIs + memory haptics coalesce green; Plan 01–03 todos present; VALIDATION updated; §5c noted as already PASS.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/D1-juice-presentation/D1-00-SUMMARY.md`
</output>
