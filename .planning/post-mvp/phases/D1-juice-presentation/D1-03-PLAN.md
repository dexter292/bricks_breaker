---
phase: D1-juice-presentation
plan: 03
type: execute
wave: 3
depends_on:
  - "D1-01"
  - "D1-02"
files_modified:
  - app/_components/PlayingHost.tsx
  - src/runtime/eventBridge.ts
  - docs/ops/HAPTICS.md
  - docs/ops/QUALITY-TIER.md
  - docs/ops/CEILING-CERT.md
  - .planning/post-mvp/REQUIREMENTS-NEXT.md
  - .planning/post-mvp/ROADMAP-NEXT.md
  - .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md
  - tests/haptics.batch-coalesce.test.ts
  - tests/physics.golden-replay.test.ts
autonomous: false
requirements:
  - N-FX-01
  - N-FX-02
  - N-FX-03
must_haves:
  truths:
    - "PlayingHost playBatch fans out audio.playBatch then haptics.playFromBatch — still ≤1 scheduleOnRN hop"
    - "Haptics created beside audio with soft-fail; released on cleanup; never gated by useVfxIntensity"
    - "docs/ops/HAPTICS.md records OS semantics, coalesce, rebuild; QUALITY-TIER Mid freeze; CEILING-CERT §5c already PASS + second-run only if render load changes"
    - "N-FX-02 harness locks documented: no timed shell fades / delayed Results/confetti in D1; CERT/SOAK instant"
    - "golden-replay + Mid quality-tiers green; VALIDATION nyquist_compliant true"
  artifacts:
    - path: "app/_components/PlayingHost.tsx"
      provides: "playBatch → audio + haptics fan-out"
      contains: "playFromBatch|createDefaultHapticsService"
    - path: "docs/ops/HAPTICS.md"
      provides: "N-FX-03 OS note, coalesce, rebuild smoke"
    - path: "docs/ops/CEILING-CERT.md"
      provides: "§5c PASS retained; D1 second-Cert trigger note"
    - path: ".planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md"
      provides: "nyquist_compliant: true"
  key_links:
    - from: "eventBridge.flushAudioBatchOnJS"
      to: "PlayingHost playBatchRef"
      via: "single scheduleOnRN; host fans out haptics"
      pattern: "scheduleOnRN|playFromBatch"
    - from: "docs/ops/HAPTICS.md"
      to: "N-FX-03 / D-09 / D-10 / D-12"
      via: "OS suppression + no reduce-motion AND + coalesce"
      pattern: "System Haptics|reduce-motion|strongest"
    - from: "D1 acceptance"
      to: "tests/physics.golden-replay.test.ts"
      via: "hashWorld unchanged gate"
      pattern: "golden-replay"
---

<objective>
Wire haptics into PlayingHost playBatch hop, document Mid freeze + N-FX-03 OS semantics + N-FX-02 harness locks + cert policy, and close Nyquist/golden acceptance.

Purpose: Finish D1 deliverables without a blocking Cert re-run (§5c already PASS) and without second `scheduleOnRN` (LC-07).
Output: Host fan-out + ops docs + VALIDATION complete + suite green.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-PATTERNS.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-01-SUMMARY.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-02-SUMMARY.md
@.planning/post-mvp/REQUIREMENTS-NEXT.md
@.planning/post-mvp/ROADMAP-NEXT.md
@docs/ops/CEILING-CERT.md
@docs/ops/QUALITY-TIER.md
@docs/ops/CRASH-REPORTING.md
@app/_components/PlayingHost.tsx
@src/runtime/eventBridge.ts
@src/services/haptics/index.ts

<preconditions>
**Cert:** `docs/ops/CEILING-CERT.md` §5c is already **PASS** (2026-09-25). Do **not** create a blocking `checkpoint:human-verify` for Instruments Cert WC. Only note that a second Cert is required **if** D1 changed render load (particles / full-screen layers / heavier glow). Ghost quads + haptics (non-render) should **not** trigger a second run under Mid freeze.
</preconditions>

<interfaces>
```typescript
// PlayingHost — extend existing playBatchRef assignment (do NOT add scheduleOnRN):
const haptics = useMemo(() => {
  try { return createDefaultHapticsService(); }
  catch { return createMemoryHapticsService(); }
}, []);

playBatchRef.current = (codes, count) => {
  audio.playBatch(codes, count);
  haptics.playFromBatch(codes, count); // D-12 piggyback; ≤1 hop remains in eventBridge
};
// cleanup: haptics.release() alongside audio.release()

// eventBridge.ts — comment only (keep sole scheduleOnRN):
// Host playBatch may fan-out to audio AND haptics on JS thread (LC-07).
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: PlayingHost playBatch fan-out + LC-07 comment</name>
  <files>app/_components/PlayingHost.tsx, src/runtime/eventBridge.ts, tests/haptics.batch-coalesce.test.ts</files>
  <read_first>app/_components/PlayingHost.tsx, src/runtime/eventBridge.ts, src/services/haptics/index.ts, .planning/post-mvp/phases/D1-juice-presentation/D1-02-SUMMARY.md</read_first>
  <behavior>
    - playBatchRef calls both audio.playBatch and haptics.playFromBatch
    - createDefaultHapticsService soft-fail path used (mirror audio)
    - cleanup releases haptics
    - rg confirms only eventBridge.ts calls scheduleOnRN (no new sites)
    - PlayingHost does not pass vfxIntensity into haptics
  </behavior>
  <action>
Per **D-08, D-10, D-12** and PATTERNS PlayingHost / eventBridge:

1. Create haptics service beside audio in PlayingHost (soft-fail try/catch → memory).

2. Extend `playBatchRef.current` to call `haptics.playFromBatch` after audio. Do **not** add a second `scheduleOnRN` anywhere.

3. Call `haptics.release()` in the bake effect cleanup with `audio.release()`.

4. Update `eventBridge.ts` comment: host may fan-out audio+haptics; still ≤1 hop.

5. Flip remaining PlayingHost / hop `it.todo`s to GREEN where unit-testable (e.g. source-contract: `rg scheduleOnRN` only in eventBridge; optional shallow host test if pattern exists). Prefer lightweight source-contract tests over mounting full PlayingHost if heavy.

Avoid: timed shell transitions; delayed Results; confetti; in-app mute; Cert Instruments run; mutate World.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; rg -n "scheduleOnRN" src/runtime/eventBridge.ts app/_components/PlayingHost.tsx src/ && rg -n "playFromBatch" app/_components/PlayingHost.tsx && npx vitest run tests/haptics.batch-coalesce.test.ts tests/physics.golden-replay.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "playFromBatch|createDefaultHapticsService|createMemoryHapticsService" app/_components/PlayingHost.tsx` matches
    - `rg "scheduleOnRN" -g '*.ts' -g '*.tsx' src/ app/` — only `eventBridge.ts` (and possibly comments) contains call sites; PlayingHost has zero `scheduleOnRN(`
    - `rg "useVfxIntensity" app/_components/PlayingHost.tsx` — haptics path must not gate on intensity SharedValue
    - Vitest haptics + golden-replay exit 0
  </acceptance_criteria>
  <done>Haptics piggyback on existing playBatch hop; LC-07 preserved.</done>
</task>

<task type="auto">
  <name>Task 2: Ops docs + N-FX-02 harness locks + VALIDATION close</name>
  <files>docs/ops/HAPTICS.md, docs/ops/QUALITY-TIER.md, docs/ops/CEILING-CERT.md, .planning/post-mvp/REQUIREMENTS-NEXT.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md</files>
  <read_first>docs/ops/CRASH-REPORTING.md, docs/ops/CEILING-CERT.md, docs/ops/QUALITY-TIER.md, .planning/post-mvp/REQUIREMENTS-NEXT.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md, .planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md</read_first>
  <action>
Per **D-01, D-05, D-06, D-07, D-09** and RESEARCH docs structure:

1. Create `docs/ops/HAPTICS.md` (CRASH-REPORTING analog):
   - Status / date; trigger map (break→Light, life→Medium)
   - OS semantics: System Haptics / Low Power no-op — **app does not query** (N-FX-03 amended)
   - Never AND reduce-motion (`useVfxIntensity` visual only)
   - Batch coalesce strongest-wins; cascade must not fire N calls
   - Soft-fail stale binary + rebuild: `npx expo run:ios --device`
   - File locations table (`src/services/haptics/*`, PlayingHost fan-out)

2. Amend `docs/ops/QUALITY-TIER.md`: Mid freeze line — D1 must not raise `particleCap` 128 / glowScale 1 / shake caps; ghost pool ≠ particle budget.

3. Amend `docs/ops/CEILING-CERT.md`: Keep §5c PASS stamp. Add short D1 note: **no second Cert WC unless render load changes** (particles / full-screen layers / heavier glow). Ghost quads + haptics alone → skip.

4. Document **N-FX-02** harness locks (docs-only — no timed transition code): CERT/SOAK drive `shellPhase` instantly; no delayed Results/confetti/star reveal in D1. Update REQUIREMENTS-NEXT N-FX-02/N-FX-03 notes if needed to point at HAPTICS.md + harness law. Update ROADMAP-NEXT D1 Progress when execute completes (planner may leave Progress as “planned”; executor sets Done).

5. Set `D1-VALIDATION.md` frontmatter `nyquist_compliant: true`; check remaining boxes; confirm Phase Requirements → Test Map all ✅.

Avoid: inventing shell fade helpers; paying for “surely green” Cert; brand rename (D2); ambient music.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; test -f docs/ops/HAPTICS.md && rg -n "System Haptics|reduce-motion|strongest|§5c|render load" docs/ops/HAPTICS.md docs/ops/CEILING-CERT.md docs/ops/QUALITY-TIER.md && rg -n "nyquist_compliant: true" .planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md && npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/haptics.batch-coalesce.test.ts tests/physics.golden-replay.test.ts tests/runtime.quality-tiers.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `docs/ops/HAPTICS.md` exists with OS note + coalesce + rebuild
    - CEILING-CERT still shows §5c PASS; includes D1 second-run-only-if-render-load note
    - QUALITY-TIER mentions Mid freeze / no particle bump for D1
    - VALIDATION `nyquist_compliant: true`
    - Combined vitest command exits 0
  </acceptance_criteria>
  <done>Docs + Nyquist closed; N-FX-02 harness locks recorded; no blocking Cert gate.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Device smoke — ball readable + haptics feel (non-Cert)</name>
  <files>.planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/D1-juice-presentation/D1-VALIDATION.md, docs/ops/HAPTICS.md, docs/ops/CEILING-CERT.md</read_first>
  <what-built>
    Brick ghost fade/scale, paddle squash, and expo-haptics wired through PlayingHost. Ceiling §5c already PASS — this checkpoint is **device feel only**, not Instruments Cert WC.
  </what-built>
  <action>
Pause for human device feel smoke against N-FX-01 / N-FX-03 / FC-F04. Do not change gameplay code during this checkpoint unless the user reports failures. Do **not** run Instruments Cert WC (D-05 / §5c already PASS). After approval, mark Manual-Only rows in `D1-VALIDATION.md` and append `Human UAT: approved YYYY-MM-DD`.
  </action>
  <how-to-verify>
    1. Rebuild if Plan 02 added native dep: `npx expo run:ios --device` (stale binary → silent memory no-op).
    2. Play a level with breaks + an explosive cascade: each broken brick should briefly scale/fade; ball stays readable (white, last).
    3. Paddle hit: brief visual squash; collision feel unchanged.
    4. System Haptics ON: break → light tap; life lost → stronger; cascade → not a buzz-saw of 8 taps.
    5. System Haptics OFF: play continues; no app-side error; no haptic.
    6. Confirm you did **not** need a second Cert WC unless you observed new particles / full-screen layers / heavier glow (should be none under Mid freeze).
  </how-to-verify>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/vfx.brick-ghosts.test.ts tests/vfx.paddle-squash.test.ts tests/haptics.batch-coalesce.test.ts tests/physics.golden-replay.test.ts tests/runtime.quality-tiers.test.ts</automated>
  </verify>
  <resume-signal>Type "approved" or list feel/readability issues</resume-signal>
  <acceptance_criteria>
    - User replies `approved` OR a written defect list
    - If approved: `D1-VALIDATION.md` contains `Human UAT: approved`
    - No blocking Cert WC required for approval
  </acceptance_criteria>
  <done>Human confirmed ball-readable juice + haptics feel; Cert not re-blocked.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| UI worklet → JS playBatch | Single hop; host must soft-fail native |
| Docs ↔ release process | Cert second-run policy must not be ignored if render load actually rises |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-D1-12 | Denial of service | PlayingHost native throw | mitigate | Soft-fail create + playFromBatch try/catch; release on cleanup |
| T-D1-13 | Tampering | Determinism via host | mitigate | Host must not write World; golden-replay remains gate |
| T-D1-14 | Information disclosure | Docs encouraging OS scrape | mitigate | HAPTICS.md explicitly forbids OS query (D-09) |
| T-D1-15 | Denial of service | Unnecessary Cert churn | accept | Process: skip second Cert unless render-load delta (D-05) |
</threat_model>

<verification>
Host fan-out present; only one `scheduleOnRN` call site; HAPTICS + QUALITY-TIER + CEILING notes landed; VALIDATION nyquist true; vitest juice+haptics+golden+tiers green; human device smoke (non-Cert).
</verification>

<success_criteria>
D1 phase deliverable complete: N-FX-01 ghosts+squash, N-FX-03 haptics wired, N-FX-02 harness locks documented, Mid freeze + hashWorld held, §5c not re-blocked.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/D1-juice-presentation/D1-03-SUMMARY.md`
</output>
