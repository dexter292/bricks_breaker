---
phase: 07-feedback-neon-vfx-audio
fixed_at: 2026-09-21T03:46:00Z
review_path: .planning/phases/07-feedback-neon-vfx-audio/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-09-21T03:46:00Z  
**Source review:** `.planning/phases/07-feedback-neon-vfx-audio/07-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01, WR-02, IN-01…IN-04)
- Fixed: 5
- Skipped: 1
- Prior WR commits reused (no re-fix): `ec594fe`, `b0f2f16`
- New IN commits: `6641b99`, `6f01eb8`, `bfb3d94`

## Fixed Issues

### WR-01: `stepVfx` uses `fixedDt` per frame, flash uses wall `dt`

**Files modified:** `src/runtime/useGameLoop.ts`  
**Commit:** `ec594fe` (prior pass — verified still applied)  
**Applied fix:** Pass wall-clock frame `dt` into `stepVfx` (same value as `decayFlash`) so particle/shake lifetime matches destroy flash under dropped FPS.

### WR-02: `seekTo(0)` not awaited before `play()`

**Files modified:** `src/services/audio/expoAudioService.ts`, `tests/audio.mapping.test.ts`  
**Commit:** `b0f2f16` (prior pass — verified still applied)  
**Applied fix:** Chain `play()` after `Promise.resolve(player.seekTo(0))` with soft-fail catch so async seek completes before retrigger.

### IN-01: Duplicate particle pool literals

**Files modified:** `src/vfx/particles.ts`  
**Commit:** `6641b99`  
**Applied fix:** Removed duplicate `128`/`192` literals; re-export `PARTICLE_POOL_DEFAULT` / `PARTICLE_POOL_HARD_MAX` from `types.ts` (single source; acceptance greps still hit `particles.ts`).

### IN-02: Baked `strong` glow unused

**Files modified:** `src/render/textures/bakeGlowSprites.ts`  
**Commit:** `6f01eb8`  
**Applied fix:** Stopped baking unused `strong` halo (PAD_STRONG / EDGE_ALPHA_STRONG). Idle path keeps `soft` only — within UI-SPEC ≤2 radius max; destroy flash remains the separate white circle in `recordSprites`. Shrinks cold-path atlas work.

### IN-03: `trailLength` duplicated in recorder

**Files modified:** `src/render/recordSprites.ts`  
**Commit:** `bfb3d94`  
**Applied fix:** Import shared worklet-safe `trailLength` from `src/vfx/intensity` (LC-14 allows `render`→`vfx`); removed `trailLengthLocal` mirror so endpoints cannot drift.

## Skipped Issues

### IN-04: Audio batch overflow drops newest

**File:** `src/vfx/audioBatch.ts`  
**Reason:** By design (T-07-10). JSDoc already documents “Drop newest on overflow” and `overflow: 1 when newest events were dropped`. Changing overflow semantics (e.g. drop-oldest) is out of scope for an Info finding without a contract change.  
**Original issue:** Extreme multi-substep bursts can mute trailing SFX in that frame only when the batch hits cap 256.

---

_Fixed: 2026-09-21T03:46:00Z_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
