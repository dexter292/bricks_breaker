---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Retention & Replayability
current_phase: '9'
status: in_progress
stopped_at: "Phase 9 Wave 2 complete (09-03 store round-trip + 2 data-loss fixes); Wave 3 (09-04) next — has a human checkpoint"
last_updated: "2026-09-25T13:40:00.000Z"
last_activity: 2026-09-25
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 4
  percent: 80
  v1_0: closed_2026_09_24
  v1_1_post_mvp: code_complete_2026_09_25_store_track_open
  phase_8_status: temporary_close
  phase_8_plans: 6/7
  plt_03: deferred_ios_first_d2b
  post_mvp: full_lock_d1_through_d7
  post_mvp_a3: skipped_owner
  post_mvp_b0: wont_do_tap_only
  post_mvp_b123: done
  post_mvp_c1: uat_approved_2026_09_25
  post_mvp_c2: done_2026_09_25
  post_mvp_d1: done_2026_09_25
  post_mvp_d1_cert: pending_section_5d
  post_mvp_ceiling_rerun_bc2: pass_2026_09_25
  post_mvp_a4: wired_pending_sentry_verify
  post_mvp_e1a: levels_04_06_shipped
  post_mvp_e1b: done_2026_09_25
  post_mvp_e2: done_with_debt_2026_09_25
  post_mvp_d2: done_with_debt_2026_09_25
  post_mvp_display_name: pulse_paddle
  post_mvp_f45_speed_ramp: shipped_0_01_per_sec
  post_mvp_owner_gates: skipped_by_owner_2026_09_25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-21)

**Core value:** A single level must feel arcade-punchy, skillful, and visually spectacular at a stable 60 FPS—responsive controls and accurate physics come first; neon effects never steal clarity or frame time.
**Current focus:** **v1.2 — Retention & Replayability.** The game ends when the 5th level ends; v1.2 makes it outlast its authored content using shipped verbs and no backend. Phases 9–14: telemetry → seeded generator → endless → daily → achievements → meta shell. v1.1's owner/device debt (§5d on a ramp build, ASC uniqueness, Sentry DSN, cohort, R-10/R-12) is carried, not scoped.

## Current Position

**v1.2 PLANNED** — roadmap written, nothing planned or executed yet.  
**Next:** `/gsd-discuss-phase 9` (Run Telemetry & Storage v4) — no dependencies, and phases 13/14 both need its counters. Phase 10 (generator) can run in parallel.  
**Owner-gated, carried from v1.1:** §5d Instruments on a ramp build (capture past t=100s), ASC console uniqueness for `Pulse Paddle`, Sentry DSN, human playtest cohort.  
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

### Decisions (Post-MVP close)

- [E1b]: B1 explosive shipped but was placed in zero levels — `E` now on a teaching curve across 03–06; `level-01` left byte-identical as the fundamentals/UAT baseline
- [E2]: Campaign order is the difficulty curve, not file order — `01→04→05→06→03`, monotone in bricks and HP, pinned by test
- [E2]: F-45 ramp shipped at 0.01/s as a speed **floor** before `stepAntiStall`, so tier-2 ×1.08 survives; SLOW unaffected (scales at integration)
- [E2]: Score-band stars rejected — 3.3× score spread at identical bot skill means bands would measure ricochet luck
- [D2]: Display name `Pulse Paddle`; display-only rename, bundle/slug/scheme unchanged; drift guarded by `assert-brand-name`
- [D2]: Brand icons generated procedurally (Node `zlib` + hand-rolled PNG encoder) — no image dependency added

### Pending Todos

- **Phase 8 Plan 06:** Pixel 6a gfxinfo + iPhone Instruments + device soak Results (PLT-03)
- **§5d ceiling cert must now run on a ramp build** — E2 changed sustained ball speed; §5/§5b/§5c predate it. Set `SPEED_RAMP_PER_SECOND = 0` to reproduce the old baseline
- **ASC console uniqueness for "Pulse Paddle"** — never run; old name's failure was an exact-title collision
- **Owner sign-off on the E2 curve + ramp feel** — E2's stated acceptance, not obtained
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
