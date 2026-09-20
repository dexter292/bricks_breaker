# Skia version decision (D-16)

| Field | Value |
|-------|-------|
| **Target** | `@shopify/react-native-skia@2.12.0` |
| **Status** | Pending first hardware build |
| **Fallback** | `2.6.2` (SDK 57 pin) if 2.12.0 fails to build/run on either platform |
| **Assert** | `npm run assert:skia` must match the decided version |

## Decision log

- **2026-09-20:** Plan 04 preflight — installed package is `2.12.0` (`npm run assert:skia` OK).
- **2026-09-20:** Android EAS `development` + `profiling` builds **finished successfully** on Skia 2.12.0 (build IDs `8114cb84…`, `29de5fef…`). Status remains **Pending first hardware build** for on-device confirm; iOS builds not yet attempted (D-17 credentials).

## Confirmation criteria

Mark **Confirmed** when both platforms install and run the FPS harness on physical devices with Skia 2.12.0.

Mark **Fallback adopted** if either platform fails to build/run on 2.12.0; pin `2.6.2`, update `scripts/assert-skia-version.mjs`, rebuild, and record the failure reason here.
