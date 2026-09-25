---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: temporary_mvp_closed
stopped_at: "D1-03 Tasks 1–2 done — awaiting human-verify device smoke"
last_updated: "2026-09-25T02:59:30.000Z"
last_activity: 2026-09-25
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 48
  completed_plans: 47
  percent: 98
  phase_8_status: temporary_close
  phase_8_plans: 6/7
  plt_03: deferred_ios_first_d2b
  post_mvp: full_lock_d1_through_d7
  post_mvp_a3: skipped_owner
  post_mvp_b0: wont_do_tap_only
  post_mvp_b123: done
  post_mvp_c1: uat_approved_2026_09_25
  post_mvp_c2: done_2026_09_25
  post_mvp_d1: wave3_pending_device_smoke
  post_mvp_ceiling_rerun_bc2: pass_2026_09_25
  post_mvp_a4: wired_pending_sentry_verify
  post_mvp_e1a: levels_04_06_shipped
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-21)

**Core value:** A single level must feel arcade-punchy, skillful, and visually spectacular at a stable 60 FPS—responsive controls and accurate physics come first; neon effects never steal clarity or frame time.
**Current focus:** Post-MVP — **D1 Wave 3 code/docs done**; awaiting device feel smoke (human-verify). Open ledger: display-name, R-10, R-12, N-OPS-01.

## Current Position

**TEMPORARY MVP CLOSED** — iOS internal / soft playtest authorized.  
**Next:** Rebuild native (`npx expo run:ios --device`) → D1-03 device smoke → reply `approved` or defect list.  
**Public path:** iOS-first. **Not** authorized for ASC public submit until RELEASE-GATES G2.  

## Performance Metrics

**Velocity:**

- Total plans completed: 41 (Phase 01: 4, Phase 02: 6)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | — | — |
| 02 | 6 | — | — |
| 03 | 6 | - | - |
| Phase 04 P00 | 1min | 2 tasks | 10 files |
| Phase 04 P01 | 2min | 2 tasks | 8 files |
| Phase 04 P02 | 3min | 2 tasks | 11 files |
| Phase 04 P03 | 2min | 2 tasks | 4 files |
| 04 | 5 | - | - |
| Phase 05 P00 | 2min | 2 tasks | 7 files |
| Phase 05 P01 | 2min | 2 tasks | 8 files |
| Phase 05 P02 | 2min | 2 tasks | 2 files |
| Phase 05 P03 | 3min | 3 tasks | 6 files |
| Phase 05 P04 | 3min | 2 tasks | 6 files |
| Phase 05 P05 | 5min | 2 tasks | 4 files |
| Phase 05 P06 | 11min | 3 tasks | 5 files |
| 5 | 7 | - | - |
| Phase 06 P00 | 2min | 2 tasks | 7 files |
| Phase 06 P01 | 1min | 2 tasks | 7 files |
| Phase 06 P02 | 1min | 2 tasks | 6 files |
| Phase 06 P03 | 2min | 2 tasks | 6 files |
| Phase 06 P04 | 2min | 2 tasks | 2 files |
| Phase 06 P05 | 25min | 3 tasks | 5 files |
| 06 | 6 | - | - |
| 07 | 7 | - | - |
| Phase 08 P00 | 2min | 2 tasks | 16 files |
| Phase 08 P01 | 2min | 2 tasks | 5 files |
| Phase 08 P02 | 3min | 2 tasks | 9 files |
| Phase 08 P03 | 3min | 2 tasks | 5 files |
| Phase 08 P04 | 2min | 2 tasks | 4 files |
| Phase D1-juice-presentation P02 | 2min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

- [Phase 1]: Simulator-only waiver for device gates; D-04/D-05 Pixel 6a + physical re-cert before MVP
- [Phase 1]: Skia 2.12.0 Confirmed; UI-thread worklet topology retained
- [Phase 2]: Classic Breakout paddle bounce; MAX_BALL_SPEED + 2× tunneling props; N-ball + event ring (1 active); multi-HP/unbreakable metadata
- [Phase 3]: Snappy relative-drag; tap serve no aim line; tap+3s countdown resume; navy flat render; hardcoded grid; gesture/UI separation
- [Phase 04]: Wave 0: invalid fixtures + it.todo stubs; LVL reqs deferred to Plans 01–03
- [Phase 04]: Non-finite grid fixture uses originX:null (JSON has no Infinity/NaN)
- [Phase 04]: Prefer compile stub so loadAndCompile imports compileLevel; packing in 04-02
- [Phase 04]: brickTypes built on null-prototype map after rejecting dangerous keys
- [Phase 04]: level-02 mid-row steel corridor + side walls for fingerprint ≠ level-01
- [Phase 04]: applyCompiledLevel uses spatial when gridRows>1; packed 1-row fallback otherwise
- [Phase 04]: Inlined planBrickDamageCuesLocal in worklet (sync with damageCues.ts) to avoid JS remotes
- [Phase 04]: Stroke color #E5E7EB width 1.25; hatch = 3 fixed diagonals distinct from hp===1 cracks
- [Phase 05]: Wave 0: lives stubs-only until Plan 04; no applyLivesFromEvents
- [Phase 05]: hashWorld golden-replay Wave 0 box deferred to Plan 01
- [Phase 05]: Locked SCORE_HIT=10, DROP_CHANCE=0.2, EXPAND_DURATION_TICKS=1200, STALL_IDLE_TICKS=960 verbatim
- [Phase 05]: compactBallPool swaps SoA after CCD; activeBallCount is live dense count (D-12)
- [Phase 05]: hashWorld extended with score/combo/pickups/stall (T-05-01)
- [Phase 05]: Award-then-increment locked: score uses current combo before combo += 1
- [Phase 05]: Scoring barrel + stepRun wiring deferred to Plan 04 (Wave 2 ownership)
- [Phase 05]: Task order effects → multiball → pickups so catch can import helpers
- [Phase 05]: Even/odd SoA slot index signs ±18°/±36° multiball angles
- [Phase 05]: Power-up barrel export + stepRun deferred to Plan 04
- [Phase 05]: Deleted applyLivesFromEvents; life only when activeBallCount===0
- [Phase 05]: Life-reset sets combo=1; preserves score and brick HP
- [Phase 05]: stepRun PLAYING: score→drops→pickups→effects→lives→win (stall Plan 05)
- [Phase 05]: Apply ×1.08 speed once when entering tier 2; ±8° nudge once when entering tier 3
- [Phase 05]: stepRun integration uses sentinel breakable below paddle so win check does not WON on empty grid
- [Phase 05]: Show ×combo always while playing (not only when combo > 1)
- [Phase 05]: Stall! · N rendered only when stallTier > 0
- [Phase 05]: Pickup sprites are flat amber rects; gameplay catch remains core-authoritative
- [Phase 06]: Pinned AsyncStorage exactly 2.2.0 via npx expo install (D-13 / T-06-02)
- [Phase 06]: Added services to app allow-list only — runtime/core still banned (T-06-03)
- [Phase 06]: Strict > for New Record (D-11); equal score keeps previous best
- [Phase 06]: Schema v===1 + finite ≥0 + Math.floor; corrupt → 0 (T-06-01)
- [Phase 06]: Classic AsyncStorage default export only — no createAsyncStorage / SecureStore
- [Phase 06]: Method name locked to onRunEnded (research recommendation)
- [Phase 06]: Platform no-ops only — no fetch/React/monetization UI (D-18 / T-06-02)
- [Phase 06]: Call sites deferred to Plan 05 PlayingHost cold path
- [Phase 06]: Cold start defaults shellPhase to title (D-02)
- [Phase 06]: Menu unmounts PlayingHost — no freeze-under-Title (Pattern 1)
- [Phase 06]: Retry/Menu have no Alert.alert confirmation (RUN-03)
- [Phase 06]: Strip height 48 + rgba(18,18,31,0.8) per UI-SPEC
- [Phase 06]: playfield starts below notch + strip so opaque chrome never covers brick rows
- [Phase 06]: Stall gate unchanged: PLAYING + stallTier > 0 (D-09)
- [Phase 06]: Soft-fail AsyncStorage → memory when native module missing; UAT approved 2026-09-20
- [Phase 08]: Pin expo-device via npx expo install only — never react-native-device-info
- [Phase 08]: Privacy assert exists and fails closed until Plan 05 fills app.json
- [Phase 08]: Store/privacy stubs marked STATUS:STUB with LIVE_URL: TBD (no fake URL)
- [Phase 08]: 10×16 Neon Gauntlet layout: Act1 1s → plateau → Act2 2/3 clusters → plateau → Act3 X pocket
- [Phase 08]: Default LevelId and PlayingHost useState are level-03 (D-06); fixtures 01/02 unchanged (D-05)
- [Phase 08]: BUDGETS low 48/2/0, mid 128/5/1, high 192/5/1 (RESEARCH table)
- [Phase 08]: modelName /Pixel 6a/i forces mid before memory heuristic (D-13)
- [Phase 08]: Trail/glow clamp at call sites + VfxState fields; intensity.ts unchanged
- [Phase 08]: Cert inject leaves DOCKED via applyServe before multiball so processDocked cannot wipe balls
- [Phase 08]: Primary cert trigger is __DEV__ Cert WC; EXPO_PUBLIC_CERT auto-arms only under __DEV__
- [Phase 08]: A1 lock: p50≤16.7ms; p95≤20ms OR ≤5% jank; RN Perf Monitor invalid
- [Phase 08]: Soak dwell 750ms; continuous 15min; gated by __DEV__ && SOAK_HARNESS
- [Phase 08]: Memory AudioService clears plays/cursors on release for soak lifecycle asserts
- [D1-02]: expo-haptics ~57.0.3 via npx expo install; soft-fail mirrors ExpoAudio probe
- [D1-02]: Local ImpactFeedbackStyle string consts for Vitest spies; no top-level native import
- [D1-02]: PlayingHost fan-out deferred to Plan 03; owner rebuild required for device Taptic

### Pending Todos

- **Phase 8 Plan 06:** Pixel 6a gfxinfo + iPhone Instruments + device soak Results (PLT-03)
- Before MVP: discharge D2 (SC-2 release worklet mutation), D4 (iOS profiling re-run), D13 (`tsc --noEmit` gate)

### Blockers/Concerns

- [MVP] Hardware performance gates still open (waived only for Phase 1 close)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Device gate | Android SC-1/SC-2 + SC-3 gfxinfo (Pixel 6a) | Open — Phase 8 Plan 06 / MVP (D-04) | 2026-09-20 |
| Device gate | iOS profiling SC-2 / physical re-check (D4) | Open — Phase 8 Plan 06 / MVP (D-05) | 2026-09-20 |
| Release build | SC-2 worklet mutation on profiling/release (D2) | Open — Phase 8 Plan 06 Results | 2026-09-21 |
| Typecheck | D13 — `tsc --noEmit` in phase gate | Open — see `docs/audit/DEFERRED-ITEMS.md` | 2026-09-21 |

## Session Continuity

Last session: 2026-09-25T02:54:51.000Z
Stopped at: Completed D1-02-PLAN.md (expo-haptics soft-fail service)
Resume file: None
