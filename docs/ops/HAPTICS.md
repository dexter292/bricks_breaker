# Haptics (N-FX-03)

**Status:** Wired through PlayingHost playBatch fan-out  
**Date:** 2026-09-25  
**Gate:** Device feel smoke (D1-03) — not a Cert Instruments gate  
**Authority:** D1-CONTEXT D-08…D-12 · `REQUIREMENTS-NEXT` N-FX-03

## What shipped

| Piece | Location |
|-------|----------|
| Mapping + coalesce (strongest-wins) | `src/services/haptics/mapping.ts` |
| Memory service (Vitest / soft-fail) | `src/services/haptics/memoryHapticsService.ts` |
| expo-haptics wrapper (~57.0.3) | `src/services/haptics/expoHapticsService.ts` |
| Barrel / default factory | `src/services/haptics/index.ts` |
| Host fan-out (audio + haptics) | `app/_components/PlayingHost.tsx` `playBatchRef` |
| Sole UI→JS hop | `src/runtime/eventBridge.ts` `flushAudioBatchOnJS` (≤1 `scheduleOnRN`) |

## Trigger map (D-11)

| Event code | Meaning | Haptic |
|------------|---------|--------|
| `4` | Brick break | Impact **Light** |
| `7` | Life lost | Impact **Medium** |
| other (paddle, wall, …) | — | **No fire** |

Batch drain: **strongest-wins** — at most **one** native `impactAsync` per frame batch. Life lost beats break. An 8-brick explosive cascade must not fire 8 taps.

## OS semantics (N-FX-03 / D-09)

- iOS **System Haptics** / Low Power may suppress Taptic Engine with **no public read API**.
- The app **does not query** System Haptics, AccessibilityInfo for haptics, or battery APIs to gate fire.
- When OS suppresses: `impactAsync` is a silent no-op — play continues; no app error.
- Optional **in-app** mute is a separate future product toggle — not shipped in D1.

## Never AND reduce-motion (D-10)

`useVfxIntensity` / reduce-motion dampens **visual** juice only. Haptics are independent — do not gate `playFromBatch` on intensity SharedValue.

## Soft-fail + rebuild

Stale native binary without `ExpoHaptics` → `createDefaultHapticsService` soft-falls to memory (no Taptic) with `__DEV__` warn. Same class as expo-audio:

```bash
npx expo run:ios --device
# or
npx expo run:android
```

Without rebuild after adding `expo-haptics`, device UAT will feel like “haptics off.”

## LC-07 hop rule

UI worklet → JS: **one** `scheduleOnRN` in `eventBridge.flushAudioBatchOnJS`. PlayingHost `playBatch` fans out `audio.playBatch` then `haptics.playFromBatch` on the JS thread. Do **not** add a second hop for haptics.

## Tests

```bash
npx vitest run tests/haptics.batch-coalesce.test.ts
```

Covers coalesce ranks, expo injectable spy, soft-fail default factory, D-10 import contract, PlayingHost / LC-07 source contract.
