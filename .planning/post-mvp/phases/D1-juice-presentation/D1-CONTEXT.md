# Phase D1: Juice & Presentation Pass - Context

**Gathered:** 2026-09-25  
**Status:** Ready for planning  
**Source:** `/gsd-discuss-phase` (areas 1, 4, 5, 6; areas 2–3 skipped with locks)

<domain>
## Phase Boundary

Zero–/low–fill-rate presentation polish on top of Phase 7 VFX: **brick destroy scale/fade** (N-FX-01), **haptics** (N-FX-03), optional **paddle squash** (FC-F04). Mid budgets stay frozen; ball/paddle stay readable; no regression vs A1 ceiling bar.

**Delivers:**
- Brick break scale/fade on existing Skia quads (VFX-layer state only)
- Same treatment for explosive cascade members (G1)
- Haptics via new native dep (`expo-haptics` or equivalent) with event-batch coalesce
- Paddle press squash as draw-only cosmetic
- Docs: N-FX-03 OS semantics; Mid freeze; cert timing (B3)
- Acceptance: golden-replay / `hashWorld` unchanged; ball readable; Mid caps unchanged

**Does not deliver:**
- Shell Title↔Select↔Playing timed transitions that affect CERT/SOAK (area 2 — harness law only)
- Delayed Results / confetti / star-count animations (area 3)
- Full-screen parallax / scanlines (FC-F02 deferred — A1)
- Ambient music (N-AUD-01)
- Brand rename / icon (D2 / N-BRAND-*)
- Combo hit-stop (FC-F08)
- Raising Mid particle/shake/glow budgets

</domain>

<preconditions>
## Preconditions & cert sequencing (B3 + §6)

1. **Ceiling Cert WC re-run AFTER C2, BEFORE D1 starts.** Current PASS (`CEILING-CERT.md` build `13018eb`) predates Milestone B + C2; §6 debt already open. This is not optional “C2 polish.”
2. **If that re-run FAILs → do not start D1** until resolved. Freeze Mid prevents making it worse; it does not fix B-era load.
3. **§6 trigger for D1:** re-run again only if D1 changes **render load in any way** (not only when `particleCap` numeric changes). Under A1 freeze, a second D1 measurement should be unnecessary; do not pay for a “surely green” second run.
4. Post-C2 re-run may be on a build **without** haptics; haptics do not affect render path / ceiling metrics.

</preconditions>

<decisions>
## Implementation Decisions

### Budget & cert (area 5) — A1 / B3
- **D-01:** **Freeze Mid** as certified: `particleCap` 128, glowScale 1, existing shake caps. No new particles (no confetti), no extra full-screen Skia layers, no heavier glow.
- **D-02:** N-FX-01 already requires Mid respect — freeze is compliance, not a cut.
- **D-03:** Reject raising High-only juice (A3) while R-12 RAM heuristic is open — doubles cert surface; Mid devices include strong chips mis-bucketed.
- **D-04:** Re-open budget increases only after R-10 floor device exists **and** R-12 mitigation chosen.
- **D-05:** One ceiling re-run after C2 / before D1; conditional second run only if D1 violates render-load freeze.

### Harness / shell / Results (areas 2–3 skipped)
- **D-06:** CERT (`GameHost` init) and SOAK (`setShellPhase` Title↔Playing) drive `shellPhase` directly. Any future transition animation **must no-op** when `CERT_HARNESS || SOAK_HARNESS` (instant swap). Soak must not gain fade delay (100-cycle baseline).
- **D-07:** No delayed Results overlay (Retry instant locked). No confetti. No star reveal animation on Results in D1 (C2 overlay just stabilized). Results copy = Claude’s Discretion only.

### Haptics (N-FX-03) — C1 / D1 / E1
- **D-08:** **Ship haptics in D1** with a real native module (e.g. `expo-haptics`). Not a no-op ARCH-02-style seam. Does not violate G2.17 (not ads/IAP/analytics). No privacy-manifest data collection types.
- **D-09:** **OS haptics-off is platform-enforced** (iOS has no public API to read System Haptics). App **must not** invent an OS query. Amend N-FX-03 note: *OS-level suppression relied upon; app adds no separate OS query.* Optional **in-app** mute toggle is separate state if product wants it later.
- **D-10:** **Never AND haptics with reduce-motion** (`useVfxIntensity`). Two independent concerns.
- **D-11:** Trigger map **minimal:** break → light; life lost → stronger. No paddle-drag / serve spam.
- **D-12:** **Coalesce like SFX batch** (`expoAudioService` identical-sfx pattern): at most **one** haptic per event-drain; pick **strongest** in batch (`life lost > break`). Explosive 8-brick cascade must not fire 8 native calls in one frame.

### Break presentation (N-FX-01) — F1 / G1
- **D-13:** Break juice = **scale/fade on existing brick quads** already drawn in `recordSprites` — parameter change only; **zero new particles**.
- **D-14:** Explosive cascade: **every brick in the chain** gets the same short scale/fade (not root-only) — looks intentional; cost is JS/CPU on ≤8 bricks, not fill-rate.
- **D-15:** **Hard rule — juice reads World, never writes it.** Brick fade/scale state lives in `src/vfx/` (alongside particles/trails/shake). **Do not** add `brickFadeT` (or similar) to `World`. **`hashWorld` must not change in D1** — golden-replay green is an acceptance gate.

### Atmosphere (area 6) — H1 / I1
- **D-16:** **Defer** parallax / scanlines (FC-F02) — third full-screen fill; banned by A1 + R-10.
- **D-17:** **Ship paddle squash** (FC-F04) in D1 — draw-quad scale only. **Never** mutate `world.paddleW` (hashed + collision width). Cosmetic only.

### Claude's Discretion
- Exact scale/fade curves and durations (keep short; ball never occluded)
- Exact haptic styles (Impact Light vs Medium) within E1 map
- Whether optional in-app haptics mute ships in D1 or later
- Results microcopy polish without new chrome motion
- Whether shell transitions are coded as zero-duration helpers now or omitted entirely until a later phase

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope
- `.planning/post-mvp/ROADMAP-NEXT.md` — D1 goal / acceptance; §6 cert re-run
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-FX-01…03 (N-FX-03 OS note amended)
- `.planning/post-mvp/RELEASE-GATES.md` §6 — re-run when physics/VFX/render load changes
- `.planning/post-mvp/FEATURE-CANDIDATES.md` — FC-F01, F04 in; F02 deferred; F05/F08 out
- `docs/ops/CEILING-CERT.md` — current PASS build age vs B/C2
- `docs/ops/QUALITY-TIER.md` — Mid budgets; R-12 open

### Code
- `src/render/recordSprites.ts` — brick/paddle quads; full-screen draw count; ball last
- `src/vfx/*` — particles, shake, trails, intensity (homes for fade state + haptic batch)
- `src/core/hash.ts` — `brickHp` / `paddleW` in `hashWorld` — do not extend for juice
- `src/audio/expoAudioService.ts` — SFX batch coalesce pattern to mirror for haptics
- `src/runtime/useVfxIntensity.ts` — reduce-motion only; do not gate haptics
- `app/_components/GameHost.tsx` — CERT/SOAK shellPhase harness law
- `tests/physics.golden-replay.test.ts` — must stay green

### Prior phase
- `.planning/phases/07-feedback-neon-vfx-audio/07-CONTEXT.md` — ball readability, Mid, reduce-motion
- `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md` — Results stars; harness Select skip

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Destroy sparks + flash already on `BRICK_BREAK` — keep; F1 adds quad animation, not more sparks
- `useVfxIntensity` for visual scale only
- Audio batch coalesce as haptic template

### Established Patterns
- VFX outside World; event drain → side effects
- Quality tier Mid forced in Cert WC

### Integration Points
- `consumeEvents` / `stepVfx` / `recordSprites` for fade list
- Host or audio-adjacent service for haptic fire after drain

</code_context>

<specifics>
## Specific Ideas

- Zero-cost juice table: brick fade, paddle squash, haptics, copy — allowed under A1.
- Banned under A1: confetti, parallax/scanlines, heavier glow, Mid cap bumps.
- Plan acceptance line: **`hashWorld` unchanged; golden-replay suite green.**

### Plan invariant (F / G / I)
```
D1 juice reads World; never writes World.
Per-effect state lives in src/vfx/ (or render-local ephemeral).
hashWorld / golden replay must not change.
```

</specifics>

<deferred>
## Deferred Ideas

- Shell timed transitions (when coded: harness bypass mandatory)
- Win/lose confetti / delayed overlay / Results star animations
- FC-F02 parallax / scanlines
- N-AUD-01 ambient
- FC-F08 combo hit-stop
- Mid budget increases (after R-10 + R-12)
- D2 brand surfaces (needs N-BRAND-01 string)
- In-app haptics mute (optional later)

</deferred>

---

*Phase: D1-juice-presentation*  
*Context gathered: 2026-09-25 via discuss-phase*
