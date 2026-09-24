# Physical soak runbook (N-PLT-03 / A2)

**Status:** Harness exists; **physical Results PASS** 2026-09-24 (dev-client Debug + Metro)  
**Device target:** iPhone 16 Pro (or named physical iPhone)  
**Authority:** `docs/phase8-certification.md` Soak section · `RELEASE-GATES` G2.3

Simulator soak = **HARNESS-ONLY** — does not close this gate.

---

## 1. Build

1. Install a **dev-client** or profiling build with `__DEV__` still true.
2. Launch with soak armed:
   ```bash
   EXPO_PUBLIC_SOAK=1 npx expo start --dev-client
   # or bake EXPO_PUBLIC_SOAK=1 into the profiling env for one session only
   ```
3. **Never** set `EXPO_PUBLIC_SOAK` on the production EAS profile.

## 2. Run

1. Leave the app **foregrounded** on the physical device.
2. Do not manually thrash Menu/Play — harness drives Title↔Playing.
3. Watch logs for:
   - `[soak] arming`
   - cycle progress → `cycles done (100)`
   - 15 min continuous → `[soak] complete`
4. At **start** and **end**, capture (paste into Results):
   - Xcode Memory gauges / Instruments Allocations (RSS / dirty)
   - Instruments Game Performance or Core Animation frame notes (optional cross-check)

Harness also logs Android `adb` command strings — ignore on iOS-only posture; use Xcode for mem.

## 3. Pass / fail

| Fail if | |
|---------|--|
| Crash or hang | |
| Sustained memory growth across start→end | |
| Progressive frame-time degradation / unresponsive controls | |

## 4. Record

Fill `docs/phase8-certification.md` Soak Results row for **iPhone 16 Pro (physical)**:

| Field | Value |
|-------|--------|
| Cycles | 100 |
| Continuous | 15 min |
| Mem start / end | _(fill)_ |
| Frame start / end | _(fill or n/a + note)_ |
| Verdict | PASS / FAIL |
| Notes | date, build profile, iOS version |

## 5. Acceptance for A2

- [x] Physical soak row filled (not Simulator) — PASS 2026-09-24  
- [x] N-QA-01: `npm test` green on same HEAD  
- [x] N-QA-03: UI contract tests green (Title / GameScreen / GameHost)
