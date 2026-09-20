# Device gate results (Phase 1 SC-1 / SC-2 / SC-3)

Evidence for architectural bet close. Simulators / emulators / RN perf monitor alone do **not** count (D-05). Methodology: `docs/measurement-methodology.md`.

**Human approval:** typed `approved` on 2026-09-20 after iPhone development harness showed `worklet tick PASS` (HUD via bundled SpaceMono). Android reference device was **not attached** during this session — SC-3 FPS gate and Android SC-1/SC-2 are **deferred** with explicit human acknowledgment (see Failures / fallbacks). **Pixel 6a re-certification required before MVP acceptance (D-04).**

## Devices

| Role | Model | Chipset | OS | Refresh rate | Notes |
|------|-------|---------|----|--------------|-------|
| Android FPS gate (D-01) | _none attached_ | — | — | — | `adb devices` empty 2026-09-20; gate deferred |
| iOS install/feel (D-02) | iPhone 16 Pro (`iPhone17,1`) | A18 Pro | iOS 26.6.1 | 120 Hz (ProMotion) | UDID `00008140-000605803C01801C`; CoreDevice id `06CAC741-EB05-55B0-AAE6-14D7B49F50BB` |

## Builds

| Platform | Profile | Path (EAS / local) | Artifact / URL | Signed as | Notes |
|----------|---------|--------------------|----------------|-----------|-------|
| Android | development | EAS | [APK](https://expo.dev/artifacts/eas/q8kgGZBx8dm3vE8dS4O1VSbvPC_gOd8nY3xi_aJmllk.apk) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/8114cb84-cdbb-4318-ad26-092d18283766) | Expo remote keystore | finished 2026-09-20; fingerprint `36b9a83e` |
| Android | profiling | EAS | [APK](https://expo.dev/artifacts/eas/foFDk5CzB7s4qpH2aAlyZyykDVaqS5XUUg7fIg7tDF4.apk) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/29de5fef-c16a-4440-a8b7-b798217942c2) | Expo remote keystore | Primary FPS gate (D-03); **measurement APK — not a store RC** (T-01-07) |
| iOS | development | EAS | [IPA](https://expo.dev/artifacts/eas/maAjb9wC2ONsJeZlbxqyctevN_y4icqR4JLL_FlP9ks.ipa) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/1fa69733-bbef-4e03-bc93-53ad4b78cb84) | ADP Ad Hoc (team `3WHS6JDYV2`) | finished 2026-09-20; build `1fa69733…`; on-device via Metro LAN |
| iOS | profiling | EAS | [IPA](https://expo.dev/artifacts/eas/VOz0eeptrPRgar0zcYT1GVFH8jR5xa01kesezyMqixc.ipa) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/a0c8f802-bb05-470b-9fa6-827214a0828e) | ADP Ad Hoc (team `3WHS6JDYV2`) | finished 2026-09-20; build `a0c8f802…`; **measurement IPA — not a store RC** (T-01-07); on-device profiling install **not** re-run after HUD font fix |

**Build path summary:** Both platforms via EAS (`development` + `profiling`) — all four builds **finished** with Skia 2.12.0 (no D-16 fallback). Project `@dexter292/bricks-breaker` (`9f72de84-a221-46f1-8afd-209bda078d86`). Bundle id / package: `com.dexter292.bricksbreaker`.

**iOS install note (D-17):** Physical iPhone 16 Pro UDID `00008140-000605803C01801C` registered; Ad Hoc profile refreshed. Dev-client launched 2026-09-20 via `devicectl process launch --payload-url` → Metro `http://172.18.44.106:8081` with `EXPO_PUBLIC_PERF_OVERLAY=1`.

## SC-1 Install

| Platform | Device | Result | Evidence |
|----------|--------|--------|----------|
| iOS | iPhone 16 Pro (iOS 26.6.1) | **PASS** | Process `NeonBrickBreaker` running; canvas + 256 sprites visible; human confirmed HUD after SpaceMono `useFont` fix (`f963409`) |
| Android | _(none)_ | **DEFERRED** | No adb device; APK artifacts ready — install when Pixel 6a (or D-04 substitute) is available |

## SC-2 Worklet mutation

| Build type | Platform | Overlay self-check | Result | Notes |
|------------|----------|-------------------|--------|-------|
| development | iOS | `worklet tick PASS`, sprites moving | **PASS** | Physical iPhone 16 Pro + Metro; no `freezeObjectInDev` in Metro after worklets babel fix |
| development | Android | tick / sprites | **DEFERRED** | No device |
| profiling/release | Android | tick / sprites | **DEFERRED** | No device; profiling APK built |
| profiling/release | iOS | tick / sprites | **DEFERRED** | Profiling IPA built; not re-installed after HUD font fix — treat as open follow-up |

## SC-3 FPS

| Run | Device | Build | Tool | Sprites | Overlay FPS / p95 | gfxinfo / Instruments | Thermal | Result |
|-----|--------|-------|------|---------|-------------------|----------------------|---------|--------|
| 1 | _(none)_ | profiling | `adb dumpsys gfxinfo` / Instruments | ~256 | — | **not captured** — Android absent; Instruments not run | — | **DEFERRED** |
| 2 | _(none)_ | profiling | `adb dumpsys gfxinfo` / Instruments | ~256 | — | **not captured** | — | **DEFERRED** |

Pass criterion: stable ~60 FPS at 256± sprites on Pixel 6a (or documented D-04 substitute) using profiling/release only.

**Human acknowledgment (2026-09-20):** SC-3 not measured this session. No topology fallback chosen — UI-thread worklet + SkPicture path remains the architectural bet. **Pixel 6a re-certification required before MVP acceptance (D-04).** Re-run: install Android profiling APK → `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker reset` → ≥30s → `framestats`; cross-read overlay; two runs.

**iPhone overlay cross-check (not a D-01 gate claim):** development session showed ~`16.67 ms/frame`, rolling ~60 FPS, `worklet tick PASS` at 256 sprites — smoke only (D-05).

## Cliff ramp (research)

| Sprite count | Overlay ms/FPS | Tool note | Cliff? |
|--------------|----------------|-----------|--------|
| 256 | ~16.67 ms / ~60 FPS (iOS development overlay) | baseline smoke | no |
| … | not ramped | `EXPO_PUBLIC_CLIFF_RAMP` not enabled this session | D-07 research only — does not block phase |

## Overlay production check

| Check | Result |
|-------|--------|
| `eas.json` `build.production.env` lacks `EXPO_PUBLIC_PERF_OVERLAY` | **PASS** (automated `node -e` assert, 2026-09-20) |
| Human: overlay not visible / not shipped on production profile | **PASS** (env hygiene; production profile not built for on-device visual — T-01-01 mitigated by assert) |

## Failures / fallbacks

| Issue | Disposition |
|-------|-------------|
| Android reference device unavailable | **DEFERRED** with human `approved` 2026-09-20. SC-1/SC-2 Android + SC-3 FPS remain open. **Pixel 6a re-certification required before MVP acceptance (D-04).** No architecture fallback (typed-array SharedValue / JS rAF) adopted. |
| `matchFont('monospace')` null Typeface on Simulator / broke HUD | **FIXED** — bundled `assets/fonts/SpaceMono-Regular.ttf` + Skia `useFont` (`f963409`). |
| Duplicate `react-native-worklets/plugin` SIGABRT | **FIXED** earlier in plan 03 (`a063acc`). |

---

_Status: Task 2 human-approved with Android/SC-3 deferred; Task 3 evidence finalized 2026-09-20._
