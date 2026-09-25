---
phase: D1-juice-presentation
plan: 02
type: execute
wave: 2
depends_on:
  - "D1-00"
files_modified:
  - package.json
  - package-lock.json
  - src/services/haptics/expoHapticsService.ts
  - src/services/haptics/index.ts
  - tests/haptics.batch-coalesce.test.ts
autonomous: true
requirements:
  - N-FX-03
user_setup:
  - service: expo-haptics
    why: "Native Taptic / impact feedback requires rebuilt dev-client after npx expo install"
    env_vars: []
    dashboard_config:
      - task: "Rebuild native binary after Plan 02 lands (before device UAT)"
        location: "npx expo run:ios --device (same class as expo-audio add)"
must_haves:
  truths:
    - "package.json pins expo-haptics ~57.0.3 via npx expo install (SDK 57)"
    - "createDefaultHapticsService soft-falls to memory when native missing; __DEV__ warn"
    - "expo playFromBatch strongest-wins ≤1 impactAsync (Light break / Medium life); never AND reduce-motion"
    - "No System Haptics / battery / Low-Power query; no privacy-manifest data-collection types added"
  artifacts:
    - path: "package.json"
      provides: "expo-haptics dependency pin"
      contains: "expo-haptics"
    - path: "src/services/haptics/expoHapticsService.ts"
      provides: "impactAsync wrapper + soft native probe + coalesce"
      exports: ["createExpoHapticsService", "createDefaultHapticsService"]
    - path: "tests/haptics.batch-coalesce.test.ts"
      provides: "GREEN soft-fail + coalesce for expo path (mocked)"
  key_links:
    - from: "playFromBatch"
      to: "coalesceHapticRank → impactAsync"
      via: "≤1 native call per batch"
      pattern: "impactAsync|coalesceHapticRank"
    - from: "createDefaultHapticsService"
      to: "createMemoryHapticsService"
      via: "missing ExpoHaptics native module"
      pattern: "requireOptionalNativeModule|createMemoryHapticsService"
---

<objective>
Install SDK-pinned `expo-haptics` and implement real HapticsService with soft-fail probe + strongest-wins batch coalesce (memory path already green from D1-00).

Purpose: Ship N-FX-03 native module without LC-07 second hop, OS query, or reduce-motion AND (D-08…D-12).
Output: `expo-haptics@~57.0.3` in package.json + `expoHapticsService.ts` + green coalesce/soft-fail tests.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-PATTERNS.md
@.planning/post-mvp/phases/D1-juice-presentation/D1-00-SUMMARY.md
@src/services/haptics/types.ts
@src/services/haptics/mapping.ts
@src/services/haptics/memoryHapticsService.ts
@src/services/audio/expoAudioService.ts
@tests/haptics.batch-coalesce.test.ts

<preconditions>
Wave 0 memory coalesce must be green. Do **not** wire PlayingHost yet (Plan 03 owns host fan-out). Do **not** add a second `scheduleOnRN`.
</preconditions>

<interfaces>
```typescript
// src/services/haptics/expoHapticsService.ts — mirror expoAudioService soft probe
import * as Haptics from 'expo-haptics'; // only inside this file / default factory

export function createExpoHapticsService(
  impact?: (style: Haptics.ImpactFeedbackStyle) => Promise<void>,
): HapticsService;
// playFromBatch: rank = coalesceHapticRank(codes, count);
// rank 1 → ImpactFeedbackStyle.Light; rank 2 → Medium; else no-op
// wrap impactAsync in try/catch — never throw into gameplay

export function createDefaultHapticsService(): HapticsService;
// probe ExpoHaptics via requireOptionalNativeModule (or equivalent);
// missing → __DEV__ warn + createMemoryHapticsService()

// FORBIDDEN in any haptics file:
// - import useVfxIntensity / intensityFromReduceMotion / AccessibilityInfo (D-10)
// - expo-battery / Low Power Mode / System Haptics settings reads (D-09)
// - PrivacyManifestEntries / NSPrivacyCollectedDataTypes for haptics (D-08)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pin expo-haptics via npx expo install</name>
  <files>package.json, package-lock.json</files>
  <read_first>.planning/post-mvp/phases/D1-juice-presentation/D1-RESEARCH.md, package.json, docs/ops/CEILING-CERT.md</read_first>
  <action>
Per **D-08** and RESEARCH install block:

1. Run `npx expo install expo-haptics` from repo root (uses SDK 57 `bundledNativeModules` pin `~57.0.3`). Prefer Node 24 PATH if project requires it.

2. Verify `package.json` lists `"expo-haptics": "~57.0.3"` (or SDK-resolved equivalent matching `~57.0.3`).

3. Do **not** edit `app.config.js` privacy manifest for haptics. Do **not** bump Mid budgets. Do **not** rebuild IPA in this task (owner rebuild is `user_setup`).

Avoid: Pulsar / Vibration API; pinning a non-SDK major; Android-only packages; PlayingHost edits.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; node -e "const p=require('./package.json'); const v=p.dependencies['expo-haptics']; if(!v) process.exit(1); console.log(v); if(!String(v).includes('57.0')) process.exit(2);"</automated>
  </verify>
  <acceptance_criteria>
    - `rg '"expo-haptics"' package.json` matches a 57.0.x range
    - No new entries under iOS privacy collected-data types for haptics
    - `BUDGETS.mid.particleCap` still 128 (spot-check `src/runtime/resolveQualityTier.ts` or quality-tiers test)
  </acceptance_criteria>
  <done>expo-haptics SDK 57 pin present in package.json.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: expoHapticsService + soft-fail default + GREEN tests</name>
  <files>src/services/haptics/expoHapticsService.ts, src/services/haptics/index.ts, tests/haptics.batch-coalesce.test.ts</files>
  <read_first>src/services/audio/expoAudioService.ts, src/services/haptics/memoryHapticsService.ts, src/services/haptics/mapping.ts, tests/haptics.batch-coalesce.test.ts, tests/audio.batch-dedupe.test.ts</read_first>
  <behavior>
    - Injected impact spy: 8× BRICK_BREAK → impact called once with Light
    - Injected spy: break+LIFE_LOST → once Medium
    - Injected spy: PADDLE_HIT only → 0 calls
    - createDefaultHapticsService with mocked missing native → memory service (no throw)
    - Source contract: no useVfxIntensity / AccessibilityInfo imports under src/services/haptics/
  </behavior>
  <action>
Per **D-09, D-10, D-11, D-12** and PATTERNS audio soft-probe:

1. Implement `createExpoHapticsService` with injectable `impact` for Vitest; production default calls `Haptics.impactAsync`. Coalesce via existing `coalesceHapticRank` — **never** one call per code.

2. Implement `createDefaultHapticsService` mirroring `createDefaultAudioService` probe + `__DEV__` warn + memory fallback.

3. Export from `src/services/haptics/index.ts`.

4. Flip Wave 0 soft-fail / expo todos to GREEN (mock impact; optional mock `requireOptionalNativeModule`). Add explicit test or `rg`-backed assert that haptics tree does not import reduce-motion helpers.

Avoid: PlayingHost/`scheduleOnRN` (Plan 03); OS settings queries; AND with intensity; in-app mute UI; privacy manifest edits.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/haptics.batch-coalesce.test.ts && ! rg -n "useVfxIntensity|AccessibilityInfo|intensityFromReduceMotion|expo-battery" src/services/haptics/</automated>
  </verify>
  <acceptance_criteria>
    - `rg "createDefaultHapticsService|impactAsync|ImpactFeedbackStyle" src/services/haptics/expoHapticsService.ts` matches
    - `rg "coalesceHapticRank" src/services/haptics/expoHapticsService.ts` matches
    - Vitest coalesce suite exit 0
    - Zero matches for reduce-motion / battery imports under `src/services/haptics/`
  </acceptance_criteria>
  <done>Native haptics service shipped with soft-fail + strongest-wins; reduce-motion AND forbidden.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| JS host → expo-haptics native | Soft-fail required if binary stale |
| Event codes → impact style | Only break/life ranks; ignore others |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-D1-08 | Denial of service | Missing native / impactAsync throw | mitigate | Soft-fail probe + try/catch; memory no-op (audio precedent) |
| T-D1-09 | Denial of service | Haptic spam | mitigate | Strongest-wins ≤1 fire/batch (D-12) |
| T-D1-10 | Information disclosure | OS haptics/battery scrape | mitigate | No query APIs (D-09); OS suppression only |
| T-D1-11 | Spoofing | Privacy manifest bloat | mitigate | No new collected-data types for haptics (D-08) |
</threat_model>

<verification>
`expo-haptics` in package.json ~57.0.x; `npx vitest run tests/haptics.batch-coalesce.test.ts` green; no reduce-motion AND; no PlayingHost changes yet.
</verification>

<success_criteria>
N-FX-03 native dependency + service complete; coalesce/soft-fail proven; ready for Plan 03 host wire.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/D1-juice-presentation/D1-02-SUMMARY.md`
</output>
