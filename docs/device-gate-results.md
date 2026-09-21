# Device gate results (Phase 1 SC-1 / SC-2 / SC-3)

Evidence for architectural bet close. Simulators / emulators / RN perf monitor alone do **not** count (D-05). Methodology: `docs/measurement-methodology.md`.

**Human approval:** typed `approved` on 2026-09-20 after iPhone development harness showed `worklet tick PASS` (HUD via bundled SpaceMono).

**Temporary waiver (2026-09-20):** Owner directed Phase 1 close on **iOS Simulator only** — skip Android and further physical-iOS gating for now. This **does not** satisfy D-05 for MVP; **Pixel 6a re-certification + physical iOS re-check required before MVP acceptance (D-04 / D-05).** Simulator evidence is interim smoke, not a performance claim.

## Devices

| Role | Model | Chipset | OS | Refresh rate | Notes |
|------|-------|---------|----|--------------|-------|
| Android FPS gate (D-01) | _waived (temporary)_ | — | — | — | Skip until MVP hardware pass; D-04 debt |
| iOS install/feel (D-02) | iPhone 16 Pro (`iPhone17,1`) | A18 Pro | iOS 26.6.1 | 120 Hz (ProMotion) | Physical install done earlier; further real-device work waived for Phase 1 |
| Interim smoke (waived gate) | iPhone 17 Simulator | — | iOS 26.5 sim | — | `worklet tick PASS`, ~256 sprites, SpaceMono HUD — **not** D-05 evidence |

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
| iOS (physical) | iPhone 16 Pro (iOS 26.6.1) | **PASS** | Process `NeonBrickBreaker` running; canvas + 256 sprites; HUD after SpaceMono fix |
| iOS (simulator) | iPhone 17 Simulator | **PASS (interim)** | Owner waiver: Phase 1 proceeds on simulator; not D-05 |
| Android | _(waived)_ | **WAIVED (temporary)** | Owner 2026-09-20: skip Android for Phase 1; D-04 before MVP |

## SC-2 Worklet mutation

| Build type | Platform | Overlay self-check | Result | Notes |
|------------|----------|-------------------|--------|-------|
| development | iOS Simulator | `worklet tick PASS`, sprites moving | **PASS (interim)** | Metro + `EXPO_PUBLIC_PERF_OVERLAY=1`; SpaceMono HUD |
| development | iOS physical | `worklet tick PASS` | **PASS** | iPhone 16 Pro earlier in session |
| development | Android | — | **WAIVED** | Temporary |
| profiling/release | Android | — | **WAIVED** | Temporary |
| profiling/release | iOS | — | **WAIVED** | Temporary — re-run before MVP |

## SC-3 FPS

| Run | Device | Build | Tool | Sprites | Overlay FPS / p95 | gfxinfo / Instruments | Thermal | Result |
|-----|--------|-------|------|---------|-------------------|----------------------|---------|--------|
| 1 | iPhone 17 Simulator | development | overlay only | ~256 | ~16.67 ms / ~60 FPS | **not** gfxinfo/Instruments — sim smoke | cool | **WAIVED (interim)** |
| 2 | Pixel 6a (MVP) | profiling | `adb dumpsys gfxinfo` | ~256 | TBD | required before MVP | TBD | **OPEN (D-04)** |

Pass criterion (MVP): stable ~60 FPS at 256± sprites on Pixel 6a (or documented D-04 substitute) using profiling/release only — **not claimed for Phase 1 close under simulator waiver.**

**Owner waiver (2026-09-20):** Skip Android + further real-iOS for Phase 1; continue on simulator. No topology fallback — UI-thread worklet + SkPicture remains the bet. **Pixel 6a + physical device re-cert required before MVP (D-04 / D-05).**

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
| Android + further physical iOS gating | **WAIVED (temporary)** by owner 2026-09-20 — Phase 1 closes on iOS Simulator interim evidence. **Pixel 6a + physical re-cert before MVP (D-04 / D-05).** No architecture fallback adopted. |
| `matchFont('monospace')` null Typeface on Simulator / broke HUD | **FIXED** — bundled `assets/fonts/SpaceMono-Regular.ttf` + Skia `useFont` (`f963409`). |
| Duplicate `react-native-worklets/plugin` SIGABRT | **FIXED** earlier in plan 03 (`a063acc`). |

---

---

## Phase 8 / MVP re-cert (PLT-03)

Phase 1 device rows above remain historical (simulator waiver). **MVP 60 FPS + soak evidence is recorded in [`docs/phase8-certification.md`](./phase8-certification.md)** (Pixel 6a Mid gfxinfo ≥2×≥30s, iPhone Instruments, soak 100+15min). Until those Results leave `PENDING_DEVICE`, Pixel / physical-iOS debt from D-04 / D-05 / D-15 / D-16 stays open. Do **not** treat Phase 1 waiver rows as Phase 8 PASS.

---

_Status: Phase 1 closed under simulator-only waiver 2026-09-20; hardware gates remain MVP debt — see Phase 8 Results scaffolding._
