---
phase: 06-ui-shell-hud-persistence-platform-seams
verified: 2026-09-20T12:09:27Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 6: UI Shell, HUD, Persistence & Platform Seams Verification Report

**Phase Goal:** The game is wrapped in a real app — menus, HUD, instant retry, a high score that survives app kills, and clean seams for future monetization

**Verified:** 2026-09-20T12:09:27Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap success criteria (non-negotiable contract) + merged PLAN must-have intent:

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Player can retry instantly from pause or lose with one tap and no confirmation dialog | ✓ VERIFIED | `PauseOverlay` / `ResultOverlay` expose `onRetry` Pressables; no `Alert`/`confirm` anywhere in overlays. `PlayingHost.onRetry` resets chrome + calls `retry()`/`setActive(true)` directly. Menu → Title via `onMenu` with `accessibilityLabel="Return to title"`. |
| 2 | HUD shows score, combo, and lives via discrete event mirrors (not React per physics frame) | ✓ VERIFIED | `HudStrip` renders `Score · N`, `×combo`, `Lives · N`, gated `Stall! · T`. Host updates via `useAnimatedReaction` change-gated `runOnJS(setScore/setCombo/…)` — only on SharedValue deltas, not every frame. |
| 3 | Personal best survives force-quit and is shown on Results, entirely offline | ✓ VERIFIED | `@nbb/personal-best/v1` AsyncStorage adapter; WON/LOST cold path `evaluatePersonalBest` + `void store.setBest`; Results shows Score/Best/New Record; Title refreshes Best on shell return. Soft-fail → memory when native module missing (intentional; UAT approved 2026-09-20). |
| 4 | Playfield and UI lay out with safe-area insets on notched iPhone and Android | ✓ VERIFIED | `playfieldSafe.top = insets.top + 48`; HudStrip under notch (`top={insets.top}`, height 48, `rgba(18,18,31,0.8)`); overlays pad all insets; letterbox `Math.min(w/360, h/640)` preserved. Manual UAT checked in `06-VALIDATION.md`. |
| 5 | Ads/IAP/account interfaces exist as no-op stubs with real call sites; playable offline | ✓ VERIFIED | `AdService`/`PurchaseService`/`AccountService` + `defaultPlatformServices()`; `PlayingHost.handleRunEnded` calls all three `onRunEnded`; no network/SDK/UI under `services/platform`. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `tests/storage.personal-best.test.ts` | RUN-04 unit coverage | ✓ VERIFIED | Exists; GREEN (compare, parse, soft-fail store) |
| `tests/platform.seams.test.ts` | ARCH-02 seam coverage | ✓ VERIFIED | Exists; GREEN (`onRunEnded` no-throw) |
| `eslint.config.js` | app → services allow | ✓ VERIFIED | `app` allowlist includes `services`; runtime/core cannot import services |
| `docs/layer-contract.md` | LC-04 services cold-path | ✓ VERIFIED | LC-04 documents `app/` → `services/` |
| `src/services/storage/compareBest.ts` | `evaluatePersonalBest` strict `>` | ✓ VERIFIED | `runScore > previousBest` only |
| `src/services/storage/asyncStorageStore.ts` | AsyncStorage `@nbb/personal-best/v1` | ✓ VERIFIED | Key + getItem/setItem + memory soft-fail |
| `src/services/platform/types.ts` | RunEndedPayload + interfaces | ✓ VERIFIED | Three service interfaces |
| `src/services/platform/index.ts` | `defaultPlatformServices` | ✓ VERIFIED | Composes three no-ops |
| `app/_components/TitleScreen.tsx` | Title shell | ✓ VERIFIED | Brand, Best · N, Play; safe-area |
| `app/_components/PlayingHost.tsx` | Game host + cold path | ✓ VERIFIED | Preload best, persist, seams, mirrors |
| `app/_components/GameHost.tsx` | shellPhase title\|playing | ✓ VERIFIED | Cold start Title; Menu unmounts PlayingHost |
| `src/runtime/HudStrip.tsx` | Compact top HUD | ✓ VERIFIED | 48px strip + metrics + Pause |
| `src/runtime/GameScreen.tsx` | playfieldTop + HudStrip | ✓ VERIFIED | `insets.top + 48`; wires overlays |
| `src/runtime/overlays/ResultOverlay.tsx` | Score/Best/New Record | ✓ VERIFIED | Badge `#F2CC8F`; Retry + Menu |
| `package.json` AsyncStorage | pin 2.2.0 | ✓ VERIFIED | `"@react-native-async-storage/async-storage": "2.2.0"` |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `GameHost` | `TitleScreen` / `PlayingHost` | `shellPhase` conditional | ✓ WIRED | Default `'title'`; Play → `'playing'`; Menu → `'title'` unmounts host |
| `PauseOverlay` / `ResultOverlay` | `onMenu` | Pressable Return to title | ✓ WIRED | Wired through `GameScreen` → `PlayingHost.onMenu` |
| `GameScreen.playfieldSafe` | `HudStrip` | `insets.top + 48` | ✓ WIRED | `HUD_STRIP_CONTENT = 48`; strip at `insets.top` |
| `HudStrip` Stall | `showStall` | PLAYING + stallTier > 0 | ✓ WIRED | Gated in `GameScreen` (result null, uiPhase playing, simPhase PLAYING) |
| `applyWorldChrome` WON/LOST | persist + `onRunEnded` | cold path `void` / sync no-await | ✓ WIRED | `handleRunEnded` via `runOnJS`; `void store.setBest`; three seam calls |
| `ResultOverlay` | `isNewRecord` | New Record badge `#F2CC8F` | ✓ WIRED | Conditional badge + styles |
| `asyncStorageStore` | AsyncStorage | `@nbb/personal-best/v1` | ✓ WIRED | `PERSONAL_BEST_KEY` + getItem/setItem |
| VALIDATION Wave 0 | storage/platform tests | vitest paths | ✓ WIRED | Paths resolve; 11 tests pass |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `HudStrip` | score/combo/lives/stallTier | SharedValue → `useAnimatedReaction` → React state | Yes — sim mirrors on change | ✓ FLOWING |
| `ResultOverlay` | score, best, isNewRecord | `handleRunEnded` ← WON/LOST + `evaluatePersonalBest` | Yes — run score + store | ✓ FLOWING |
| `TitleScreen` | best | `createDefaultPersonalBestStore().getBest()` on title phase | Yes — storage (or memory soft-fail) | ✓ FLOWING |
| Platform seams | `RunEndedPayload` | cold path on WON/LOST | Yes — real score/outcome; no-op sink | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Storage + platform unit suites | `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` | 2 files, 11 passed | ✓ PASS |
| Strict `>` compare (equal not record) | vitest `equal score is not a new record` | passed | ✓ PASS |
| AsyncStorage package pin | `package.json` grep | `2.2.0` | ✓ PASS |
| No confirmation dialogs | rg `Alert\.|confirm\(` in overlays | only “No confirmation” comments | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| RUN-03 | 06-03, 06-05 | Instant retry from lose/pause without confirmation | ✓ SATISFIED | Instant Retry Pressables; Menu → Title; cold start Title |
| RUN-04 | 06-00, 06-01, 06-05 | Local high score persists across app kills offline | ✓ SATISFIED | AsyncStorage store + end-of-run persist + Results/Title Best; UAT checked |
| PLT-02 | 06-04, 06-05 | Playfield responsive with safe-area on iOS/Android | ✓ SATISFIED | HudStrip + playfieldTop inset math + overlay insets; UAT checked |
| ARCH-02 | 06-00, 06-02, 06-05 | Seams for ads/IAP/accounts; MVP offline | ✓ SATISFIED | No-op services + real `onRunEnded` call sites; no SDKs/UI/network |

All four phase requirement IDs appear in PLAN frontmatter and in `REQUIREMENTS.md` Phase 6 mapping. **No orphaned requirements.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `asyncStorageStore.ts` | ~40–48 | Soft-fail to memory when native AsyncStorage missing | ℹ️ Info | Intentional D-13 / UAT unblocking; durable Best requires native rebuild (`npx expo run:ios\|android`). UAT approved 2026-09-20. |
| `tests/storage.personal-best.test.ts` | — | Node tests exercise memory/soft-fail path, not device AsyncStorage | ℹ️ Info | Expected for Vitest Node; device durability covered by manual UAT row |

No blocker stubs, hollow props, or confirmation dialogs found in Phase 6 shell/HUD/persistence/seams surfaces.

### Human Verification Required

None pending. Plan 06-05 Task 3 human UAT was **approved 2026-09-20**; all manual rows in `06-VALIDATION.md` are checked (force-quit Best, HUD/safe-area, airplane mode, instant Retry/Menu).

### Gaps Summary

No actionable gaps. Phase goal achieved: Title↔Playing shell, instant Retry, HudStrip with discrete mirrors, offline personal best + Results chrome, safe-area layout wiring, and platform seams with real call sites.

**Note (non-blocking):** On Expo Go / stale dev-client without `RNCAsyncStorage`, Best is in-memory until a native rebuild links AsyncStorage — documented soft-fail, not a missing feature.

---

_Verified: 2026-09-20T12:09:27Z_
_Verifier: Claude (gsd-verifier)_
