# Phase 7 VFX frame-budget measurement

> **⚠️ MỘT PHẦN ĐÃ LỖI THỜI — viết cho Phase 7 (v1), trước quyết định iOS-first.**
>
> | Phần | Còn dùng được? |
> |---|---|
> | **Định nghĩa cảnh Cert WC** (multi-ball + particle burst) | ✅ **Còn đúng** — vẫn là cảnh dùng cho A1 ceiling |
> | Checklist thao tác VFX-on | ✅ Còn đúng |
> | **Bảng "Verdict tools"** nêu `adb dumpsys gfxinfo` là **Android gate** | ❌ **Sai** — Android là `OUT OF SCOPE` (D2=B). Gate hiện tại là **iOS ceiling** đo bằng Instruments |
> | Ngưỡng frame-budget | ❌ Đã bị [`measurement-methodology.md`](./measurement-methodology.md) thay |
>
> **Đọc kèm:** [`ops/CEILING-CERT.md`](./ops/CEILING-CERT.md) cho quy trình đo hiện hành.

How to measure worst-case neon feedback (trails, glow, particles, shake) against the Phase 1 frame budget before Phase 7 verify-work.

**Authoritative methodology:** follow [`docs/measurement-methodology.md`](./measurement-methodology.md) (D-08). This doc only adds the Phase 7 VFX-on scene definition and checklist — it does not replace the Phase 1 contract.

## Verdict tools (not the overlay)

| Tool | Role |
|------|------|
| In-app overlay (`EXPO_PUBLIC_PERF_OVERLAY=1`) | Cross-check only — **not** a gate |
| `adb shell dumpsys gfxinfo` | **Android gate** — primary evidence |
| Instruments (Core Animation) | iOS feel / cross-check |

**RN Perf Monitor alone is invalid** (Phase 7 RESEARCH Pitfall 7 / methodology D-05): it cannot see Skia's render thread, and this architecture keeps the JS thread idle by design. Never declare a 60 FPS pass from the React Native performance monitor alone.

## Build + package

| Item | Value |
|------|-------|
| Gate build | **profiling** (primary) — see methodology build-profile table |
| Package id | `com.dexter292.bricksbreaker` |
| Android command | `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats` |

Session hygiene matches Phase 1: screen awake, discard ~2 s warmup, ≥30 s window, ≥2 sessions (keep the worse), portrait lock.

```bash
# Reset counters, play worst-case scene ~30s, then dump
adb shell dumpsys gfxinfo com.dexter292.bricksbreaker reset
# … play worst-case scene …
adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats
```

## Worst-case scene (VFX-on)

Run a live PlayingHost level with all of the following active at once:

1. **Multi-ball** — at least **3** active balls (power-up catch or fixture)
2. **Particle pool near cap** — rapid brick chips/breaks so the pooled spark emitters sit near the Phase 7 particle cap
3. **Destroy shake** — at least one recent `BRICK_BREAK` so cosmetic camera shake is decaying
4. **Full glow atlas visible** — baked neon brick glow on-screen (not culled / not soft-failed null atlas)

If multi-ball is hard to trigger mid-session, start a run known to spawn ≥3 balls and sustain brick contact for the measurement window.

## Pass bar

Stay inside the **Phase 1 frame budget** on **Pixel 6a** (D-01): stable ~60 FPS / ~16.7 ms frames under the worst-case scene above, using profiling build + gfxinfo (not overlay-only, not RN Perf Monitor).

| Device path | Disposition |
|-------------|-------------|
| Pixel 6a + profiling + gfxinfo | **Gate** — preferred Phase 7 / MVP evidence |
| Documented mid-range Android substitute (D-04) | Allowed only with explicit note: **MVP debt — physical re-cert on Pixel 6a** (same pattern as Phase 1 `docs/device-gate-results.md`) |
| Simulator / emulator | Smoke only — never counts toward the FPS gate |

## Checklist

| ID | Check | How | Pass signal |
|----|-------|-----|-------------|
| FX-01 | Ball ghost trail | High-speed rally; live ball vs ghosts | Trail readable; live ball always distinguishable |
| FX-01 | Reduce-motion trail | OS Reduce Motion on | ~2 high-contrast ghosts (not off) |
| FX-02 | Glow atlas | Worst-case scene with baked glow | Glow visible without BlurMask / runtime blur |
| FX-02 | Particles | Rapid breaks near pool cap | Sparks + brief flash; paddle/ball not hidden long enough to cost a life |
| FX-02 | Shake | Brick breaks + Reduce Motion off/on | Subtle cosmetic offset; ≈ gone under reduce-motion |
| FX-03 | SFX latency / overlap | Paddle, chip, break, power-up, life, win, lose in quick succession | Distinct cues; overlaps rather than cutting off; subjectively frame-aligned with on-screen hits |

Record gfxinfo / Instruments one-liners in the Results section below (or in `07-VALIDATION.md` notes). Overlay numbers may be pasted as a cross-check only.

## Results

| Run | Device | Build | Tool | Scene notes | Frame evidence | Result |
|-----|--------|-------|------|-------------|----------------|--------|
| Phase 8 Plan 06 | Pixel 6a Mid (mandatory) | profiling | gfxinfo | level-03 Cert WC (≥3 balls + particles near Mid cap + shake + glow) | See Phase 8 Results table | **WAIVED 2026-09-22** — no Pixel 6a; see [`docs/phase8-certification.md`](./phase8-certification.md) |
| Phase 8 Plan 06 | iPhone 16 Pro Mid | development / `__DEV__` | Instruments Game Performance | level-03 Cert WC (multi arm) | Display ~8.33 ms (120 Hz); Hangs 0 | **PASS (D-16 companion)** — does **not** close Pixel/Android FX-02 debt |

**Pixel gfxinfo debt (Phase 7 → Phase 8):** **WAIVED** by owner 2026-09-22 (no hardware). Do **not** invent gfxinfo numbers. FX-02 / PLT-03 Android mid-range remain **unproven** until a Pixel (or documented substitute) run exists.

**D-04 waiver (if used):** _Not used — no Android substitute this session._

---

_Status: procedure ready; Pixel Results **WAIVED** (no device); iOS D-16 companion **PASS** 2026-09-22._
