# Skia version decision (D-16)

| Field | Value |
|-------|-------|
| **Target** | `@shopify/react-native-skia@2.12.0` |
| **Status** | **Confirmed** (EAS both platforms + physical iPhone run; Android on-device install deferred) |
| **Fallback** | `2.6.2` (SDK 57 pin) — **not adopted** |
| **Assert** | `npm run assert:skia` → `@shopify/react-native-skia@2.12.0 OK` (2026-09-20) |

## Decision log

- **2026-09-20:** Plan 04 preflight — installed package is `2.12.0` (`npm run assert:skia` OK).
- **2026-09-20:** Android EAS `development` + `profiling` builds **finished successfully** on Skia 2.12.0 (build IDs `8114cb84…`, `29de5fef…`).
- **2026-09-20:** iOS EAS `development` + `profiling` builds **finished successfully** on Skia 2.12.0 (build IDs `1fa69733…`, `a0c8f802…`). No D-16 fallback required for build.
- **2026-09-20:** Physical **iPhone 16 Pro** ran the FPS harness (dev-client + Metro) with Skia 2.12.0 — canvas, 256 sprites, overlay HUD after SpaceMono `useFont` fix. Android physical install deferred (no adb device); APKs already built on 2.12.0.
- **2026-09-20:** Status marked **Confirmed** — 2.12.0 remains the pin; revisit only if Android on-device install fails on 2.12.0 (then adopt Fallback).

## Confirmation criteria

Mark **Confirmed** when both platforms install and run the FPS harness on physical devices with Skia 2.12.0.

Mark **Fallback adopted** if either platform fails to build/run on 2.12.0; pin `2.6.2`, update `scripts/assert-skia-version.mjs`, rebuild, and record the failure reason here.

**Note:** Android physical confirm is still outstanding for absolute completeness; builds succeeded and human approved phase close with D-04 Pixel 6a re-cert debt. Fallback remains unused.
