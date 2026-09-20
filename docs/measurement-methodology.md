# Measurement methodology (D-08)

How the Phase-1 FPS harness derives overlay numbers, which builds/devices count, and how cliff-ramp research is triggered. This is the authoritative measurement contract for plan 04 device gates (SC-2 / SC-3).

## Overlay metrics

| Metric | Derivation |
|--------|------------|
| **ms/frame** | `frameInfo.timeSincePreviousFrame` (milliseconds). First frame is `null` → treated as `16.67`. |
| **Rolling FPS** | `1000 / mean(interval)` over the last **60** samples in a preallocated ring buffer. **Not** the mean of per-frame FPS values (averaging reciprocals overstates performance). |
| **Substeps** | Count of fixed-timestep `stepStub` calls in the most recent frame, plus session **max**. Fixed dt = `1/120`, max 5 substeps/frame. |
| **p95 / p99** | Percentiles of the same interval ring (ms). |
| **frames > 16.7** | Count of samples whose interval exceeds **16.7 ms**. |
| **Worklet tick** | After ~30 frames, `PASS` if `world.tick` advanced since self-check start; else `FAIL`. |

Overlay text is drawn **inside** the same `SkPicture` as the sprites when `EXPO_PUBLIC_PERF_OVERLAY=1`. It does **not** use React `<Text>`, `setState`, `runOnJS`, or `scheduleOnRN` on the hot path (D-14).

## Verdict tools (not the RN perf monitor)

The in-app overlay is a **cross-check**, not the gate. Prefer:

- **Android:** `adb shell dumpsys gfxinfo <package> reset` → run ~30 s → `adb shell dumpsys gfxinfo <package> framestats`
- **iOS:** Instruments (Core Animation / Game performance) on a physical iPhone

Never declare the 60 FPS gate from the React Native performance monitor alone — it cannot see Skia's render thread, and this architecture keeps the JS thread idle by design (D-05).

## Build profile

| Profile | Use for gate? | Overlay |
|---------|---------------|---------|
| `development` (dev-client) | Daily iteration only | `EXPO_PUBLIC_PERF_OVERLAY=1` |
| `profiling` | **Yes** — primary measurement build (D-03 / D-05) | `EXPO_PUBLIC_PERF_OVERLAY=1` |
| `production` | Not for FPS claims | Overlay **off** (env unset) |

Do **not** gate the overlay on `__DEV__` — that hides metrics in profiling/release builds.

## Devices

| Role | Device | Notes |
|------|--------|-------|
| **Android FPS gate (D-01)** | Pixel 6a | Hard 60 FPS reference for Phase 1 / MVP |
| **iOS install/feel (D-02)** | Recent physical iPhone | Install, render, touch, stability — not a hard FPS gate in Phase 1 |
| **Substitute (D-04)** | Documented mid-range Android | Record model, chipset, OS, refresh rate, frame times; **re-certify on Pixel 6a** before final MVP acceptance |

Simulators / emulators never count toward the gate (D-05).

## Session hygiene

1. Keep the screen awake (`expo-keep-awake` on the spike screen).
2. Discard the first **~2 seconds** (warmup / JIT / thermal settle).
3. Measure a **≥30 second** window.
4. Run **≥2** independent sessions; keep the worse of the two for pass/fail.
5. Note thermal state / charging if frame times drift mid-run.
6. Portrait lock (`PORTRAIT_UP`) — matches `app.json` + `_layout` reinforcement.

## Cliff ramp (D-07) — research only

**Not a Phase 1 completion gate.** Completion target remains ~200–300 sprites at 60 FPS on Pixel 6a (profiling/release).

**How to trigger:**

1. Build with `EXPO_PUBLIC_CLIFF_RAMP=1` (or enable the flag in the profiling env for a research session).
2. Launch the spike host; default sprite count is **256**.
3. Tap the on-screen **Cliff +32** button (bottom-right). Each press bumps the UI-thread `spriteTarget` SharedValue by 32, wrapping back to 256 after 300.
4. Record overlay ms/FPS and `dumpsys`/`Instruments` as sprite count climbs until the frame budget breaks.
5. File the cliff point as research notes — do **not** treat cliff failure as a Phase 1 blocker.

The button is a discrete RN `Pressable` **outside** the per-frame path; it only writes a SharedValue (D-14).

## Package id reminder

Substitute the real Android application id from `app.json` / EAS when invoking `dumpsys gfxinfo`.
