# Device gate results (Phase 1 SC-1 / SC-2 / SC-3)

Evidence for architectural bet close. Simulators / emulators / RN perf monitor alone do **not** count (D-05). Methodology: `docs/measurement-methodology.md`.

## Devices

| Role | Model | Chipset | OS | Refresh rate | Notes |
|------|-------|---------|----|--------------|-------|
| Android FPS gate (D-01) | _TBD — Pixel 6a or D-04 substitute_ | | | | Fill during Task 2 |
| iOS install/feel (D-02) | _TBD — physical iPhone_ | | | | Fill during Task 2 |

## Builds

| Platform | Profile | Path (EAS / local) | Artifact / URL | Signed as | Notes |
|----------|---------|--------------------|----------------|-----------|-------|
| Android | development | EAS | [APK](https://expo.dev/artifacts/eas/q8kgGZBx8dm3vE8dS4O1VSbvPC_gOd8nY3xi_aJmllk.apk) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/8114cb84-cdbb-4318-ad26-092d18283766) | Expo remote keystore | finished 2026-09-20; fingerprint `36b9a83e` |
| Android | profiling | EAS | [APK](https://expo.dev/artifacts/eas/foFDk5CzB7s4qpH2aAlyZyykDVaqS5XUUg7fIg7tDF4.apk) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/29de5fef-c16a-4440-a8b7-b798217942c2) | Expo remote keystore | Primary FPS gate (D-03); **measurement APK — not a store RC** (T-01-07) |
| iOS | development | EAS | [IPA](https://expo.dev/artifacts/eas/maAjb9wC2ONsJeZlbxqyctevN_y4icqR4JLL_FlP9ks.ipa) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/1fa69733-bbef-4e03-bc93-53ad4b78cb84) | ADP Ad Hoc (team `3WHS6JDYV2`) | finished 2026-09-20; build `1fa69733…` |
| iOS | profiling | EAS | [IPA](https://expo.dev/artifacts/eas/VOz0eeptrPRgar0zcYT1GVFH8jR5xa01kesezyMqixc.ipa) · [logs](https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/a0c8f802-bb05-470b-9fa6-827214a0828e) | ADP Ad Hoc (team `3WHS6JDYV2`) | finished 2026-09-20; build `a0c8f802…`; **measurement IPA — not a store RC** (T-01-07) |

**Build path summary:** Both platforms via EAS (`development` + `profiling`) — all four builds **finished** with Skia 2.12.0 (no D-16 fallback). Project `@dexter292/bricks-breaker` (`9f72de84-a221-46f1-8afd-209bda078d86`). Bundle id / package: `com.dexter292.bricksbreaker`.

**iOS install note (D-17):** Ad Hoc provisioning at build time listed device UDID `00006041-000830E90E50801C` (MacBook Pro). Before SC-1 iPhone install, register the physical iPhone UDID in Apple Developer / Expo credentials and rebuild the Ad Hoc profile if install fails with “Unable to install” / provisioning mismatch.

## SC-1 Install

| Platform | Device | Result | Evidence |
|----------|--------|--------|----------|
| iOS | | _pending_ | |
| Android | | _pending_ | |

## SC-2 Worklet mutation

| Build type | Platform | Overlay self-check | Result | Notes |
|------------|----------|-------------------|--------|-------|
| development | Android | tick / sprites | _pending_ | freezeObjectInDev warning = FAIL |
| profiling/release | Android | tick / sprites | _pending_ | |
| profiling/release | iOS | tick / sprites | _pending_ | At least once |

## SC-3 FPS

| Run | Device | Build | Tool | Sprites | Overlay FPS / p95 | gfxinfo / Instruments | Thermal | Result |
|-----|--------|-------|------|---------|-------------------|----------------------|---------|--------|
| 1 | | profiling | | ~256 | | | | _pending_ |
| 2 | | profiling | | ~256 | | | | _pending_ |

Pass criterion: stable ~60 FPS at 256± sprites on Pixel 6a (or documented D-04 substitute) using profiling/release only.

## Cliff ramp (research)

| Sprite count | Overlay ms/FPS | Tool note | Cliff? |
|--------------|----------------|-----------|--------|
| 256 | | | baseline |
| … | | | D-07 research only — does not block phase |

## Overlay production check

| Check | Result |
|-------|--------|
| `eas.json` `build.production.env` lacks `EXPO_PUBLIC_PERF_OVERLAY` | PASS (automated `node -e` assert, 2026-09-20) |
| Human: overlay not visible / not shipped on production profile | _pending on-device_ |

## Failures / fallbacks

| Issue | Disposition |
|-------|-------------|
| _(none blocking builds)_ | iOS credentials resolved (paid ADP team `3WHS6JDYV2`); both iOS profiles finished. On-device install/FPS still pending Task 2. |

---

_Status: Task 1 builds complete — fill SC-1/SC-2/SC-3 after on-device gates (Task 2)._
