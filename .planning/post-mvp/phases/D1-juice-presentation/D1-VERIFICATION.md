---
phase: D1-juice-presentation
status: passed
verified: 2026-09-25
requirements: [N-FX-01, N-FX-02, N-FX-03]
human_uat: approved_2026_09_25
open_process:
  - post_d1_cert_wc_section_5d
---

# Phase D1 — Verification

**Goal:** N-FX-01…03 — brick fade/squash juice + haptics under Mid freeze; `hashWorld` unchanged; ball readable.

**Verdict:** `passed` (automated + Human UAT). Process debt: post-D1 Instruments Cert WC (§5d) still open.

## Must-haves

| Truth | Evidence | Status |
|-------|----------|--------|
| Ghost SoA cap ≥16; spawn/step worklets; no World read | `src/vfx/brickGhosts.ts`, `allocateVfx` | ✅ |
| Every BRICK_BREAK (cascade) spawns ghost; draw flat under ball | `consumeEvents.ts`, `recordSprites.ts` | ✅ |
| Paddle squash draw-only; paddleW unchanged | `paddleSquash.ts`, golden-replay | ✅ |
| `hashWorld` / core types untouched | `git diff` empty on hash/types/reset | ✅ |
| Mid particleCap 128 / glowScale 1 | BUDGETS + quality-tiers tests | ✅ |
| Haptics strongest-wins ≤1/batch; soft-fail; no reduce-motion AND | `mapping.ts`, `expoHapticsService.ts`, HAPTICS.md | ✅ |
| PlayingHost fan-out ≤1 `scheduleOnRN` | eventBridge only; source contract | ✅ |
| Draw helpers zero-alloc | `pairScratch` Float32Array | ✅ |
| N-FX-02 harness locks documented | VALIDATION + HAPTICS/QUALITY-TIER | ✅ |
| Human feel smoke | VALIDATION Manual-Only ✅ 2026-09-25 | ✅ |
| Post-D1 Cert WC | CEILING-CERT §5c requires §5d stamp | ⏳ open process |

## Requirement IDs

| ID | Coverage |
|----|----------|
| N-FX-01 | Plans 00–01 + UAT ball readable |
| N-FX-02 | Docs-only harness locks (Plan 03) |
| N-FX-03 | Plans 00/02/03 + UAT haptics feel |

## Gaps

None blocking phase goal. **Do not treat phase complete as Cert discharge** — measure Instruments Cert WC and stamp §5d.

## Human verification

Device feel smoke approved by owner 2026-09-25. No further feel items pending.
