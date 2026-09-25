---
phase: D1-juice-presentation
plan: 01
type: execute
wave: 1
depends_on:
  - "D1-00"
files_modified:
  - src/vfx/consumeEvents.ts
  - src/vfx/stepVfx.ts
  - src/render/recordSprites.ts
  - tests/vfx.brick-ghosts.test.ts
  - tests/vfx.paddle-squash.test.ts
  - tests/physics.golden-replay.test.ts
autonomous: true
requirements:
  - N-FX-01
must_haves:
  truths:
    - "Every BRICK_BREAK (incl. explosive cascade members) spawns a ghost; live hp<=0 bricks stay skipped"
    - "Ghosts draw as flat scale/alpha quads after live bricks, before ball; no new particles / glow blit"
    - "PADDLE_HIT punches squash; recordSprites scales paddle draw only — paddleW unchanged"
    - "hashWorld / golden-replay suite stays green; Mid particleCap 128 unchanged"
  artifacts:
    - path: "src/vfx/consumeEvents.ts"
      provides: "spawnBrickGhost on BRICK_BREAK; punchPaddleSquash on PADDLE_HIT"
      contains: "spawnBrickGhost|punchPaddleSquash"
    - path: "src/vfx/stepVfx.ts"
      provides: "stepBrickGhosts + stepPaddleSquash in stepVfx"
    - path: "src/render/recordSprites.ts"
      provides: "ghost quads + squashed paddle draw under ball"
      contains: "ghostActive|paddleSquashT"
  key_links:
    - from: "consumeEventsForVfx BRICK_BREAK"
      to: "spawnBrickGhost"
      via: "after spawnBurst; snapshot world.brickX/Y/W/H + rgb"
      pattern: "spawnBrickGhost|BRICK_BREAK"
    - from: "recordSprites"
      to: "vfx.ghost* / paddleSquashT"
      via: "draw order: live bricks → ghosts → … → paddle → ball LAST"
      pattern: "ghostActive|paddleSquashT|ball"
    - from: "D1 juice"
      to: "hashWorld"
      via: "no World writes — golden-replay green"
      pattern: "hashWorld"
---

<objective>
Wire brick destroy ghosts + paddle squash through event consume, stepVfx, and recordSprites — VFX-only, Mid freeze, ball last.

Purpose: Deliver N-FX-01 break presentation and FC-F04 paddle squash without fill-rate bumps or determinism breaks (D-01, D-13…D-17).
Output: consume/step/draw path green; cascade all members fade; golden-replay still green.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-PATTERNS.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-UI-SPEC.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-00-SUMMARY.md
@src/vfx/brickGhosts.ts
@src/vfx/paddleSquash.ts
@src/vfx/consumeEvents.ts
@src/vfx/stepVfx.ts
@src/vfx/types.ts
@src/render/recordSprites.ts
@src/core/hash.ts
@tests/vfx.brick-ghosts.test.ts
@tests/vfx.paddle-squash.test.ts
@tests/physics.golden-replay.test.ts

<interfaces>
<!-- From D1-00 — use as-is. Do not add World fields. -->

```typescript
// consumeEvents BRICK_BREAK hook (after spawnBurst / punchShake):
spawnBrickGhost(vfx, {
  x: world.brickX[brickIndex],
  y: world.brickY[brickIndex],
  w: world.brickW[brickIndex],
  h: world.brickH[brickIndex],
  r: rgb.r, g: rgb.g, b: rgb.b,
});
// Cascade: every BRICK_BREAK in the ring scan gets a ghost (D-14) — no root-only filter.

// consumeEvents PADDLE_HIT branch (EventCode.PADDLE_HIT === 2):
punchPaddleSquash(vfx);
// Do not gate squash on intensity for existence; draw may multiply alpha by intensity (discretion).

// stepVfx.ts:
stepBrickGhosts(vfx, dt);
stepPaddleSquash(vfx, dt);

// recordSprites draw order (locked):
// live bricks (hp>0) → ghost flat fills (scale from life/lifeMax; alphaf) → particles/flash
// → pickups → paddle rect × squash (read paddleW/H only) → trails → ball LAST
// Ghosts: NO glow atlas blit (D-13 / Mid freeze).
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Spawn ghosts + squash from events; step in stepVfx</name>
  <files>src/vfx/consumeEvents.ts, src/vfx/stepVfx.ts, tests/vfx.brick-ghosts.test.ts, tests/vfx.paddle-squash.test.ts</files>
  <read_first>.planning/post-mvp/phases/D1-juice-presentation/D1-00-SUMMARY.md, src/vfx/consumeEvents.ts, src/vfx/stepVfx.ts, src/vfx/brickGhosts.ts, src/vfx/paddleSquash.ts, docs/ops/EXPLOSIVE-BRICKS.md</read_first>
  <behavior>
    - Synthetic World ring with 1× BRICK_BREAK → ghostCount active === 1 after consumeEventsForVfx
    - Ring with 8× BRICK_BREAK (cascade) → 8 ghosts active
    - After stepVfx for GHOST_LIFE_MAX → ghosts inactive
    - PADDLE_HIT → paddleSquashT > 0; World.paddleW identical before/after consume
    - Existing particle/shake paths still fire on break (do not remove spawnBurst)
  </behavior>
  <action>
Per **D-13, D-14, D-15, D-17** and PATTERNS consumeEvents/stepVfx:

1. In `consumeEventsForVfx` `BRICK_BREAK` branch: after `spawnBurst` + `punchShake`, call `spawnBrickGhost` with geom from `world.brickX/Y/W/H[brickIndex]` (valid even when hp already 0) and rgb already resolved. Guard invalid brickIndex.

2. Add `PADDLE_HIT` branch → `punchPaddleSquash(vfx)` only. No extra particles.

3. In `stepVfx`, call `stepBrickGhosts` and `stepPaddleSquash` after existing particle/shake steps.

4. Flip Wave 0 `it.todo`s for consume/spawn paths to real GREEN tests (allocate World fixture + push events + consume). Keep recordSprites todos for Task 2 if still open.

Avoid: writing `brickFadeT` / any field on World; mutating `paddleW`/`paddleH`; raising spark counts; haptics; editing `hash.ts`.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/vfx.particles.test.ts tests/vfx.shake.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "spawnBrickGhost" src/vfx/consumeEvents.ts` matches inside BRICK_BREAK path
    - `rg "punchPaddleSquash" src/vfx/consumeEvents.ts` matches
    - `rg "stepBrickGhosts|stepPaddleSquash" src/vfx/stepVfx.ts` matches
    - `rg "paddleW\\s*=" src/vfx/` finds no assignments (read-only)
    - Vitest exits 0; cascade 8-break ghost assert present
  </acceptance_criteria>
  <done>Every break (incl. cascade) spawns a ghost; paddle hit punches squash; step decays both.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Draw ghosts + squashed paddle under ball; golden-replay guard</name>
  <files>src/render/recordSprites.ts, tests/vfx.brick-ghosts.test.ts, tests/vfx.paddle-squash.test.ts</files>
  <read_first>src/render/recordSprites.ts, .planning/post-mvp/phases/D1-juice-presentation/D1-UI-SPEC.md, src/core/hash.ts, tests/physics.golden-replay.test.ts, tests/physics.hash-canonical.test.ts</read_first>
  <behavior>
    - Ghost draw uses life/lifeMax → scale shrink + alphaf; intensity may dampen visual only
    - Draw order places ghosts before ball; paddle squash uses center-scale from world.paddleW/H without writing them
    - Pure helper optional: scaleAlphaFromLife(t) unit-tested
    - `npx vitest run tests/physics.golden-replay.test.ts` exits 0 unchanged
    - No new full-screen Skia layers; no glow blit on ghosts
  </behavior>
  <action>
Per **D-01, D-13, D-15, D-17**, UI-SPEC motion, PATTERNS recordSprites:

1. After live-brick loop (which still `continue`s on `hp <= 0`), draw active ghosts: center-scale from `life/lifeMax` (e.g. `scale = 0.85 + 0.15 * t`), `setAlphaf(t * intensity)`, flat `drawRect` only — **no** glow atlas.

2. When drawing paddle, compute squash factor from `vfx.paddleSquashT / PADDLE_SQUASH_T_MAX` (e.g. width * (1+k), height * (1−k), k small ≤0.15). Use `world.paddleW/H` as source dimensions only — **never assign** them.

3. Keep ball draw **last**. Do not add parallax/scanlines/confetti.

4. Convert remaining recordSprites-related todos to GREEN where testable without Skia canvas (pure scale/alpha helpers and/or assert no World mutation around draw prep). Run golden-replay as acceptance — **do not edit expected hashes** or `hash.ts`.

Avoid: particleCap/glowScale bumps; second full-screen pass; World juice fields; PlayingHost/haptics (Plans 02–03).
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/physics.golden-replay.test.ts tests/physics.hash-canonical.test.ts tests/runtime.quality-tiers.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "ghostActive|ghostLife" src/render/recordSprites.ts` matches
    - `rg "paddleSquashT" src/render/recordSprites.ts` matches
    - `rg "glowAtlas|drawAtlas" src/render/recordSprites.ts` — ghost loop must not call glow blit for ghosts
    - `git diff --name-only -- src/core/hash.ts` empty (no hash surface change)
    - Golden-replay + quality-tiers exit 0; BUDGETS.mid still `{ particleCap: 128, trailMax: 4, glowScale: 1 }`
  </acceptance_criteria>
  <done>Ghosts + squash visible on draw path under ball; Mid freeze + hashWorld identity held.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| World event ring → VFX | Read-only consume; must not mutate gameplay SoA |
| VFX → Skia canvas | Cosmetic draws only; ball readability is trust for playability |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-D1-05 | Tampering | recordSprites / consumeEvents | mitigate | Never write World; assert paddleW identity in tests; golden-replay gate |
| T-D1-06 | Denial of service | Ghost pool / fill | mitigate | Fixed cap 16; flat fill only; no particle/glow bumps (D-01) |
| T-D1-07 | Elevation of privilege | N/A offline | accept | Single-player cosmetic layer |
</threat_model>

<verification>
VFX + golden-replay + quality-tiers suites green; ghosts spawn on cascade; squash draw-only; no `src/core/hash.ts` diff.
</verification>

<success_criteria>
N-FX-01 presentation path complete in VFX/render; Mid freeze held; `hashWorld` unchanged; ball remains last in draw order.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/D1-juice-presentation/D1-01-SUMMARY.md`
</output>
