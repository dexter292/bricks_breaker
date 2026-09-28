---
gsd_state_version: "1.0"
milestone: v1.2
milestone_name: Retention & Replayability
current_plan: 2
status: in_progress
stopped_at: Completed 12-01-PLAN.md
last_updated: "2026-09-28T01:48:20.613Z"
state_head: f880fd07e43eb4e26d5622961e98dca365aeb411
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 38
  completed_plans: 33
  percent: 0
  phase_9_human_checkpoint: passed_2026_09_25
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
last_activity: 2026-09-25
current_phase: 11
current_phase_name: Daily Challenge
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-21)

**Core value:** A single level must feel arcade-punchy, skillful, and visually spectacular at a stable 60 FPS—responsive controls and accurate physics come first; neon effects never steal clarity or frame time.
**Current focus:** Phase 12 — Daily Challenge

## Current Position

Current Plan: 2
Total Plans in Phase: 6

**Phase 11 (Endless Mode) — all 21 plans executed (6 original + 15 gap-closure across 6 rounds).** Endless is playable from the `__DEV__` dev row; SC-1/SC-2/SC-3/SC-4 are proven headlessly and `docs/ops/ENDLESS-MODE.md` is the written-down record. **Round 6 closed both round-5 gaps** (the cert-level decision is one predicate with three consumers; the queued `Cert WC` load is pinned at source and the four artifacts that described it wrongly are corrected) **and the round-5 `showPauseOverlay` advisory** (two negative render cases make the operator observable). `.planning/REQUIREMENTS.md` is coherent again: N-END-01 and N-END-02 read `[x]` on a round-6 evidence gate, N-END-03 reads `[ ]`.  
**Next:** `/gsd-verify-work 11` (round 7 — and harvest the SC-5 device reading), then `/gsd-discuss-phase 12` (Daily Challenge).  
**Open from Phase 11:** the SC-5 device half — see Pending Todos.  
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
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 11 P01 | 15min | 3 tasks | 8 files |
| Phase 11 P02 | 12min | 3 tasks | 8 files |
| Phase 11 P03 | 12min | 2 tasks | 2 files |
| Phase 11 P04 | 12min | 2 tasks | 2 files |
| Phase 11 P05 | 20 min | 3 tasks | 5 files |
| Phase 11 P06 | 8min | 3 tasks | 3 files |
| Phase 11 P07 | 1h 16m | 4 tasks | 6 files |
| Phase 11 P08 | 25 min | 3 tasks | 10 files |
| Phase 11 P09 | 10 min | 3 tasks | 5 files |
| Phase 11 P10 | 9 min | 2 tasks | 4 files |
| Phase 11 P11 | 10 min | 3 tasks | 4 files |
| Phase 11 P12 | 9 min | 3 tasks | 4 files |
| Phase 11 P13 | 9 min | 3 tasks | 4 files |
| Phase 11 P14 | 9 min | 3 tasks | 4 files |
| Phase 11 P15 | 11 min | 3 tasks | 4 files |
| Phase 11 P16 | 10 min | 3 tasks | 4 files |
| Phase 11 P17 | 12 min | 3 tasks | 3 files |
| Phase 11 P18 | 7 min | 3 tasks | 3 files |
| Phase 11 P19 | 10 min | 3 tasks | 5 files |
| Phase 11 P20 | 13 min | 3 tasks | 5 files |
| Phase 11 P21 | 11 min | 3 tasks | 5 files |
| Phase 12 P01 | 17 min | 1 tasks | 15 files |

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
- [Phase 11]: D-06 implemented: applyWaveAdvance sets world.tick = 0 so every wave starts at serve speed; the effect SoA clear stays above the reset because effectUntilTick is absolute — E2 speed ramp hits MAX_BALL_SPEED at t=100s, inside wave 1 — carrying tick would pin every ball at the cap from wave 3 on and make the written-down difficulty ramp cosmetic
- [Phase 11]: seedForWave mixes the wave index, not the difficulty — difficulty saturates at D_MAX from wave 21, so mixing it would hand every post-clamp wave the same board
- [Phase 11]: applyWaveAdvance takes only (World, CompiledLevel or null) — mode-agnostic so Phase 12 daily reuses it verbatim; endless policy stays in src/services/endless
- [Phase 11]: D-07 implemented: lowestLiveBall exported from tests/helpers/balanceBot.ts instead of duplicating the scan
- [Phase 11]: D-11 implemented: recordRunEnd takes the RecordRunEndArgs discriminated union (campaign | endless); the endless arm has no levelId, so TypeScript narrowing forces the runtime mode gate to exist and SC-3 becomes a property of the type rather than a caller convention — A convention-only gate is one careless edit away from returning; the union is pinned by a @ts-expect-error that fails tsc if it ever collapses back to a flat type
- [Phase 11]: D-12 implemented: ENDLESS_TELEMETRY_KEY is a plain string constant for byMode.endless, and LevelId was NOT widened — LevelId is the key type for bestByLevel and unlocked; admitting an endless value there is the exact SC-3 failure
- [Phase 11]: EndlessRecord lives inside TelemetryBlob, never on ProgressBlob, and no version bump or migration was needed (PROGRESS_VERSION stays 4, migrateProgress.ts has a zero-line diff) — sanitizeTelemetry already validates telemetry independently of its siblings; that independence IS the SC-3 firewall, and defaultTelemetryBlob() makes an old key-less v4 blob default cleanly
- [Phase 11]: The endless run driver is DUPLICATED into tests/endless.determinism.test.ts rather than lifted to tests/helpers/ — importing it from tests/endless.wave-loop.test.ts would re-register that file's eight suites inside the determinism file, and the fixture serves two test files, not the shipped code
- [Phase 11]: D-04's guard is two tests and only 6a is load-bearing: lives immediately after each applyWaveAdvance must equal lives immediately before it. 6b (the MAX_LIVES cap) asserts a real life gain FIRST — in the 12-wave reference run lives first exceed 3 at wave 8 and reach exactly MAX_LIVES = 5 at wave 10 — because an un-exercised cap assertion is green regardless of whether anyone thought about D-04
- [Phase 11]: SC-4 is scoped in the file that claims it: a DEVICE endless run is not replayable, because intent is read per substep from paddleTarget.value and substep count depends on wall-clock frame timing — nothing records the per-tick intent sequence. No literal hash or digest is pinned anywhere; every case is A-equals-B self-consistency or A-differs-from-B divergence, because an endless sequence is not a frozen corpus
- [Phase 11]: The seed-divergence case asserts the divergence is a genuine HASH difference inside the shared boundary range, not merely a different run length — the plan's literal wording (differs at at least one boundary) would have been satisfied by the weaker claim
- [Phase 11]: The device half of SC-5 is recorded as a dated OPEN assumption in docs/ops/ENDLESS-MODE.md rather than assumed to pass — no automated step in this repo can measure a frame on hardware, and the block names 'no device available' as a valid outcome that keeps it OPEN
- [Phase 11]: BOARD-GENERATOR.md § Limits item 2's 'plausibly unfinishable' inference is marked superseded in place (20 insertions, 0 deletions) with a dated note cross-linked to ENDLESS-MODE.md — the original belief stays visible next to its correction, which is what that section exists for
- [Phase 11]: SCHEDULE was deliberately NOT re-tuned — the clear-time tail is a trajectory property (18x spread on one lattice across paddle offsets) and per-difficulty maxima are non-monotone (d=17 at 2735.3 s beats d=20), so a re-tune buys ~34% off the median while re-rolling the tail and invalidating Phase 10's digests, sweep, proof and the A1 device record
- [Phase 11]: A-01 decided retry-in-place: a Retry that cannot build wave 1 keeps the endless Results overlay up with Retry live, body copy `Wave 1 could not be built — tap Retry` (literal wave 1, never templated) — The mid-run body says run saved, which is false at Retry time — there is no in-flight run to save. A silent no-op was rejected too: it presents a dead-looking Retry button. Owner decision 2026-09-26.
- [Phase 11]: genIssues removed: a generated board that fails to compile ends the run instead of rendering LevelErrorOverlay — LevelErrorOverlay has no controls and GameScreen suppresses showResult while levelError is non-null, so the old route left a live sim behind a modal with two dead buttons (11-UI-SPEC Error state (board)).
- [Phase 11]: The mode branch in handleRunEnded moved ahead of evaluatePersonalBest, and each arm now owns its own recordRunEnd call — a single ternary call site cannot express branch-before-compare, because the ternary IS the branch and it sits after the compare — Gap 2's three symptoms — the campaign PB shown as the endless Best, New Record firing against an unrelated campaign score, and the endless score written into previousBestRef where the next run start re-published it — all came from that one ordering. 11-UI-SPEC Record Display Contract makes branch-before-compare the contract.
- [Phase 11]: waveBuildFailedWave alone discriminates the two wave-build-failure bodies: 1 is always Retry-time (tap Retry), >= 2 is always mid-run (run saved) — no second flag was added — Structural, not a convention: a mid-run failure sets waveRef.current + 1 and waveRef is >= 1 from the first successful build, so mid-run can never produce 1. 11-07 stored the FAILED wave rather than the last good one precisely so this needs no arithmetic.
- [Phase 11]: mode/wave/bestWave are REQUIRED props on GameScreenProps and ResultOverlay, and the overlay FORCES the lose variant in endless rather than trusting the caller's kind — A defaulted mode would silently render campaign chrome for an endless run if a call site forgot it — the exact class of defect this plan closes. Gating only on kind would make the SC-1 unreachability of Win/All clear/stars/Next a caller promise; isWin = kind === 'win' && !isEndless makes it a component property.
- [Phase 11]: WR-04 folded in: startEndlessRun publishes endlessBestScoreRef/endlessBestWaveRef, never previousBestRef — the host `best` prop belongs to the player's mode for the whole lifetime of a run, not only while ResultOverlay is mounted — Latent today (`best` reaches only ResultOverlay, unmounted mid-run, and handleRunEnded always overwrites first) but rendered the moment Phase 14 adds a mid-run endless record surface. Owner folded the fix in 2026-09-26 rather than record it as debt. Both halves published: resultBestWave is the endless-only counterpart on the same Record Display Contract row.
- [Phase 11]: The campaign-ref claim moved to the source-contract tier because the WR-04 fix REMOVES the only behavioural probe of it — previousBestRef's remaining readers are campaign resets unreachable while modeRef is latched to endless, and the getBestForLevel effect heals the ref on every levelId change — The contract states in its own comment what it does NOT prove: counting assignment sites proves the WRITE, never the RENDER. Asserted as two campaign-only REGIONS (the mount effect's success + fail-soft pair is one place), not a literal statement count of two, which would have been unsatisfiable without deleting the load-bearing fail-soft branch.
- [Phase 11]: docs/ops/ENDLESS-MODE.md keeps its bolded `every path that discards a run records it first` sentence STANDING with a dated correction beneath, rather than rewriting it as though it had always held; A-02 retires to DECIDED 2026-09-26 and the SC-5 do-not-press note NARROWS to the tier button and Cert WC — Same superseded-claim-beside-its-correction treatment BOARD-GENERATOR.md § Limits item 2 received. `Lv` came out of the warning because A-02 made it an explicit exit; the tier button stays because cycleDevTier fires remountDevSession, whose endless branch restarts the run at wave 1 and re-bakes the glow atlas — the exact cold path SC-5 exists to prove is not entered.
- [Phase 11]: Guard the PUBLICATION, never the cache: previousBestRef.current stays unconditional in both preload arms so the campaign best is warm the instant the player exits endless — A guarded cache write would make the campaign Best stale after every endless run, which toggleDevLevel's synchronous republication would then faithfully propagate. The new setResultBest contract pins cache-writes === publications.
- [Phase 11]: Keep the previousBestRef WR-04 contract and ADD a setResultBest one rather than replacing it — The cache and the publication are different obligations and need different instruments. The round-2 contract counted assignments and whitelisted the region the gap-1 defect lived in; it was not wrong, only blind.
- [Phase 11]: N-END-02 moved twice in one plan, as two separate commits — unticked while the rendered leak was open, re-ticked only after npm test went green — The requirement is about what the player SEES, and a campaign number was provably rendered as the endless Best. Two commits keep the record of what was believed when recoverable from git (threat T-11-22).
- [Phase 11]: The endless WON branch RETURNS on runEndedRef rather than falling through — a fall-through would end an endless run on a cleared board (SC-1)
- [Phase 11]: gap 3 severity recorded as the verifier settled it (incoherent ENDED state + copy defect), not as 11-REVIEW CR-01 opened it (CRITICAL/false record)
- [Phase 11]: Task 3 pins an INDEPENDENT structural count (three setActive(false) run-end sites) beside the four-branch enumeration — an enumeration cannot detect a branch nobody enumerated
- [Phase 11]: The WR-04 guard-release claim dropped to the source tier, disclosed in the test's own comment; the case was re-pointed and renamed, never deleted
- [Phase 11]: The mode term gates runCertWorstCase's LEVEL half only; the tier half stays a real, funnel-covered run boundary — Gating the tier half would be the 'disable Cert WC while endless' option the owner rejected on 2026-09-26 as inconsistent with A-02's explicit-exit resolution for Lv. The level half was the last deterministic, race-free trigger for a cross-mode record publication, and while endless it could not take effect anyway — its only product was a stopped frame loop behind a live HUD.
- [Phase 11]: Task 1 Test 1 (tier UNSET) was RED pre-fix, not the passing regression pin the plan assumed: the funnel DID fire (verifier P3 holds) but the restart could not reach W1 because the level half had flipped levelId and fxReady was false at the readiness gate — Recorded as measured rather than reconciled against the verifier's pre-fix numbers — the gate did not merely preserve branch A, it repaired it.
- [Phase 11]: An explanatory comment must not restate a literal that a structural gate counts — naming the level-forcing call in prose made the plan's own gate read 2 where it requires 1 — Caught by running the gate, not by reading it. Line comments only inside runCertWorstCase, because codeOnly() in PlayingHost.endless-host.test.ts strips // but not block comments.
- [Phase 11]: Cert WC stays in the SC-5 do-not-press set even though its level half is now gated — It still injects the worst-case ball, particle and shake load onto the board under measurement, which disqualifies any frame time captured across it in BOTH tier branches. The warning was narrowed by reason, not by control.
- [Phase 11]: Hoist the run-ended latch to the FIRST statement of applyChrome rather than snapshotting resultScore/resultLives at the boundary — one statement, and it closes the campaign Results panel by the same edit because the same five chrome writes precede both campaign branches — The snapshot shape would add two pieces of state every reset path must maintain and would leave the HUD behind the overlay still repainting from a finished run
- [Phase 11]: Remove the endless WON branch inner runEndedRef guard and re-point 11-13 three branch ordering assertions to the applyChrome function preamble, disclosing the tier change in the test own comment — With the latch at the top the inner copy is unreachable, so no mutation could kill it; mutation evidence measured strictly stronger after the move (7 cases RED vs 11-13 M2 set)
- [Phase 11]: [Phase 11]: The review's Cert WC one-liner was adopted but only after BOTH endless sub-branches were measured — pressing Cert WC while already on level-03 (the shipped default) discharged a real injection into the freshly restarted endless run pre-fix (1 call), so the term suppresses a genuine behaviour there rather than clearing a stranded flag; recorded at the assignment, in the ops doc and in the SUMMARY rather than shipped silently
- [Phase 11]: [Phase 11]: Latch hygiene stated as a general rule at the assignment site — do not arm a latch whose discharge preconditions the same change has made unreachable. 11-14 gated runCertWorstCase's level half and left the deferral bookkeeping, so an endless press armed a one-shot only a campaign level-03 session could discharge
- [Phase 11]: [Phase 11]: Case C1 (the campaign deferral) DOES fire in jsdom, so the plan's permitted downgrade to a flagged unprovable assumption was NOT taken — both preconditions are asserted as rendered labels before the injection count, so the pass cannot be vacuous
- [Phase 11]: [Phase 11]: gsd check tdd-red-evidence requires the FULL TAP test name including the tests/… file prefix in targetTest — the bare 'describe > it' name is classified no_target_test_failure even when that exact test appears in the parsed failing_tests list
- [Phase 11]: A1 closed: the ops doc no longer calls level-03 the shipped default — it is the CERT_HARNESS mount level (GameHost.tsx:196) and LAST in PLAYABLE_LEVEL_ORDER, four Lv presses from the shipped level-01 default (GameHost.tsx:68), so the SC-5 operator's sub-branch is the RARE one
- [Phase 11]: The Cert WC level half is documented with THREE terms, not the plan's 'both' — 11-17 added !runEndedRef.current to an EXISTING two-term condition; writing 'both terms' would have dropped levelId !== 'level-03', this phase's signature failure inside the edit correcting it
- [Phase 11]: Under a gate that pins a false literal at 0, a superseded claim is DESCRIBED rather than quoted — the beside-not-erase rule and the discriminating-gate rule conflict, and the record lives in git rather than in the file
- [Phase 11]: N-END-01 and N-END-02 re-ticked on an evidence gate that ran BEFORE the file was opened; each closure note states the claim rests on the round-4 verifier's judgement plus round-5 instruments, NOT a fresh first-principles audit, so a future round can overrule without archaeology
- [Phase 11]: requirements.mark-complete was NOT run and the metadata commit excludes REQUIREMENTS.md — both would produce a second commit on that file and break Task 3's requirements-commits=1 gate (threat T-11-22)
- [Phase 11]: Round-5 gap 1 closed structurally: certLevelPlanFor is the single cert-level decision and three PlayingHost consumers read its returned value — Rounds 3, 4 and 5 each added a term to one of two copies of the same decision. Extracting the decision removes the drift class, not its fourth instance. Enforced by count: runEndedRef and modeRef pinned at 0 occurrences inside both decision bodies (measured bases 1 and 2).
- [Phase 11]: certLevelPlanFor evaluation order is contract: endless first, level-03 before the run-ended latch, then run-ended — Endless first preserves 11-16 suppression of both endless sub-branches; level-03 before the latch preserves cell 7, where an ended run already at the cert level needs no level move and the 11-17 guard has nothing to guard (T-11-39). Both orderings were falsified by mutation and the RED signals recorded.
- [Phase 11]: The deferred-cert self-cancel is source-pinned only; its positive direction is unobservable by any harness in this repo — Measured by deletion: only the Part C source contract reds, no behavioural case moves. Recorded as human_judgment true in the SUMMARY coverage block rather than claimed proven.
- [Phase 11]: src/runtime is NOT changed by 11-20: no harness in this repo can drive onFrame, and a reset in the retry block would swallow a request issued between a retry() and the next frame — silently disabling the deferred-inject path. link 4 of tests/runtime.cert-request.test.ts is the tripwire for a future change
- [Phase 11]: Round-6 gap 2: the Cert WC load is QUEUED on certRequest and applies on the FIRST FRAME OF THE NEXT RUN, below the retry-reset block, onto the freshly reset world — proven link by link at source in tests/runtime.cert-request.test.ts, which states in its own header that it cannot produce a frame. The MEASURED label round 5 attached to a vi.fn() count is struck
- [Phase 11]: 11-20 ticks NO requirement. N-END-03 device half stays unmeasured by plan prohibition; N-END-01 gets no new closing evidence from a plan that repairs an instruction rather than taking a reading. REQUIREMENTS.md untouched
- [Phase 11]: The 1,400-word Cert WC table cell in ENDLESS-MODE.md is corrected in content and deliberately NOT restructured (advisory IN-03) — a compression would relocate five dated corrections away from where the SC-5 operator reads them. Owner rewrite option stays open
- [Phase 11]: [Phase 11]: The round-5 showPauseOverlay advisory is closed with a NEGATIVE RENDER CASE, not a single-literal source gate — a prettier re-wrap of that assignment would red a source literal with no behaviour changing, and a literal cannot tell 'the operator is &&' from 'the operator is spelled && on this line'. ASSERTION 5 is untouched: it asserts the two TERMS, the new cases assert the OPERATOR between them
- [Phase 11]: [Phase 11]: An absence assertion carries a POSITIVE CONTROL in the same case — case 2 asserts the result overlay's Retry level button IS present, so 'the component rendered nothing' cannot pass as 'the pause gate refused'
- [Phase 11]: [Phase 11]: N-END-01 and N-END-02 re-ticked on a round-6 evidence gate that ran BEFORE the file was opened (npm test 99 files / 663 tests, typecheck, lint — all green, transcripts dated in the commit body); the incoherent box/note pairs go 3 to 0; N-END-03 stays [ ] because round 6 repaired the INSTRUCTIONS for the SC-5 reading without taking it
- [Phase 11]: [Phase 11]: N-END-01's superseded clause is DESCRIBED, not quoted — the first draft re-introduced the false literal while retiring it and moved the plan's own premature-clause gate from 0 back to 1. Caught by running the gate, not by reading it
- [Phase 11]: [Phase 11]: Four plan-stated bases had moved under this plan by execution time (false-clause enumeration 6 at 6bb18bf vs 5 at da1c356; nine declared falsifications vs twelve recorded; roadmap ticks 2/1 not 0/3, making one gate counter vacuous; the :108 line already half-edited by update-plan-progress). All four reported in the SUMMARY rather than edited to fit
- [Phase 12]: DAILY_DIFFICULTY = 10 — from the generator's published table: between level-01's 32 bricks and level-03's showpiece, ~2-minute median clear, and exactly where endless arrives at wave 11 (D-11)
- [Phase 12]: The daily arm of RecordRunEndArgs carries date and NO levelId, so bestByLevel/unlocked/bestScore are unreachable at compile time rather than merely unwritten (N-DAILY-03 / SC-5)
- [Phase 12]: telemetryKey stays ONE const ternary in both stores; the daily branch reaches DAILY_TELEMETRY_KEY and never a date, which is what keeps byMode.daily bounded (D-15)
- [Phase 12]: ResultOverlay.mode is NOT widened — daily ships as a separate scalar-props DailyResultOverlay, which is SC-5 at the prop signature

### Decisions (Post-MVP close)

- [E1b]: B1 explosive shipped but was placed in zero levels — `E` now on a teaching curve across 03–06; `level-01` left byte-identical as the fundamentals/UAT baseline
- [E2]: Campaign order is the difficulty curve, not file order — `01→04→05→06→03`, monotone in bricks and HP, pinned by test
- [E2]: F-45 ramp shipped at 0.01/s as a speed **floor** before `stepAntiStall`, so tier-2 ×1.08 survives; SLOW unaffected (scales at integration)
- [E2]: Score-band stars rejected — 3.3× score spread at identical bot skill means bands would measure ricochet luck
- [D2]: Display name `Pulse Paddle`; display-only rename, bundle/slug/scheme unchanged; drift guarded by `assert-brand-name`
- [D2]: Brand icons generated procedurally (Node `zlib` + hand-rolled PNG encoder) — no image dependency added

### Pending Todos

- **Phase 8 Plan 06:** Pixel 6a gfxinfo + iPhone Instruments + device soak Results (PLT-03)
- **Phase 11 SC-5 device reading (OPEN, 2026-09-25):** no frame spike outside the Mid budget across an endless wave transition — device half unmeasured. Dev build + perf overlay + `__DEV__` `Endless` entry, waves 1-5, watch each transition. Open-assumption block and discharge procedure live in `docs/ops/ENDLESS-MODE.md` § Limits item 2
- **§5d ceiling cert must now run on a ramp build** — E2 changed sustained ball speed; §5/§5b/§5c predate it. Set `SPEED_RAMP_PER_SECOND = 0` to reproduce the old baseline
- **ASC console uniqueness for "Pulse Paddle"** — never run; old name's failure was an exact-title collision
- **Owner sign-off on the E2 curve + ramp feel** — E2's stated acceptance, not obtained
- Before MVP: discharge D2 (SC-2 release worklet mutation), D4 (iOS profiling re-run), D13 (`tsc --noEmit` gate)

### Blockers/Concerns

- [MVP] Hardware performance gates still open (waived only for Phase 1 close)
- N-END-03 is deliberately left UNCHECKED in REQUIREMENTS.md by plan 11-08. Its reproducibility half is verified (tests/endless.determinism.test.ts); its second clause — "wave transitions cause no frame spike outside the Mid budget" — is the unmeasured SC-5 device half. Checking it would be the untaken-reading failure the phase's own prohibitions forbid. Discharge it together with the SC-5 device reading.
- Phase gate instrument defect (reported by 11-11 Task 3, deliberately NOT fixed): the plan's freeze command `git diff --name-only origin/main...HEAD -- src/core src/levelgen` prints 8, because origin/main (8788caa) predates Phase 10 and Phase 10 CREATED src/levelgen. Against the phase base b99607b the diff is 0 and the freeze holds. Future phase gates must anchor on the phase directory's first commit, not origin/main.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Device gate | Android SC-1/SC-2 + SC-3 gfxinfo (Pixel 6a) | Open — Phase 8 Plan 06 / MVP (D-04) | 2026-09-20 |
| Device gate | iOS profiling SC-2 / physical re-check (D4) | Open — Phase 8 Plan 06 / MVP (D-05) | 2026-09-20 |
| Release build | SC-2 worklet mutation on profiling/release (D2) | Open — Phase 8 Plan 06 Results | 2026-09-21 |
| Typecheck | D13 — `tsc --noEmit` in phase gate | Open — see `docs/audit/DEFERRED-ITEMS.md` | 2026-09-21 |

## Session Continuity

Last session: 2026-09-28T01:48:12.821Z
Stopped at: Completed 12-01-PLAN.md
Resume file: None
