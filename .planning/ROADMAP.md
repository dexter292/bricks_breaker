# Roadmap: Neon Brick Breaker

## Overview

The journey runs from an empty repo to a single, shippable, 60-FPS neon arcade level. It starts with a cheap empirical spike that proves (or kills) the project's central bet — a deterministic simulation running as UI-thread worklets under Skia immediate-mode rendering — because retrofitting that decision later is a rewrite. Physics is then built headless and proven by property tests before a renderer exists to confuse the picture. The render bridge, relative-drag input, and the first real game loop land as one strictly sequential integration that ends with something you can hold and feel. Only after the feel is honest do the independent workstreams fan out: data-driven levels, run rules and power-ups, the React UI shell, and neon feedback. The showpiece level is authored last, against locked feel constants, alongside real-device performance certification and the store-compliance baseline.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Thread-Boundary Spike** - Prove the worklet-hosted simulation and Skia rendering bet on both real devices before any gameplay code
- [x] **Phase 2: Headless Core Simulation** - Deterministic, tunneling-free swept physics with paddle-relative bounce, tested in Node
- [x] **Phase 3: First Playable — Render, Input, Bricks, Lives, Pause** - The mandated sequential integration; ends with a rally you can actually play
- [x] **Phase 4: Level Format & Brick Types** - Levels become versioned data with multi-HP and structural bricks
- [x] **Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall** - Skill gets rewarded and no rally can dead-end (completed 2026-09-20)
- [ ] **Phase 6: UI Shell, HUD, Persistence & Platform Seams** - Menus, HUD, instant retry, local high score, responsive layout, monetization seams
- [ ] **Phase 7: Feedback — Neon VFX & Audio** - Spectacle and sound that never hide the ball or cost frame time
- [ ] **Phase 8: Showpiece Level, Performance Certification & Launch Baseline** - The authored challenge level, measured 60 FPS on hardware, store paperwork ready

## Phase Details

### Phase 1: Foundation & Thread-Boundary Spike
**Goal**: The project's central architectural bet is proven on real hardware, and the layer boundaries that protect it are enforced by the repo
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01
**Success Criteria** (what must be TRUE):
  1. A dev-client build installs and runs on a real iOS device and on a named mid-range Android reference device, with the Skia version bet either confirmed on EAS or the documented fallback adopted and recorded
  2. A `'worklet'`-marked pure TypeScript module imported across several files mutates a UI-runtime world object in place across frames inside `useFrameCallback`, in both dev and release builds
  3. Several hundred dummy sprites recorded into an `SkPicture` hold 60 FPS on the reference Android device, readable from an in-app frame-time overlay behind a dev flag
  4. `core/` imports nothing from React, Skia, or Reanimated and runs unchanged in Node under Vitest; the separation of logic, physics, rendering, input, and UI is a written, checkable contract
**Plans:** 4 plans
Plans:
- [x] 01-01-PLAN.md — Bootstrap Expo SDK 57, Node 24, Skia 2.12.0, EAS profiles
- [x] 01-02-PLAN.md — core/ stub, Vitest smoke/purity, ESLint boundaries, layer contract
- [x] 01-03-PLAN.md — Worklet loop + SkPicture harness + overlay + thin app host
- [x] 01-04-PLAN.md — Device builds, FPS/worklet gates, Skia decision evidence
**UI hint**: no

### Phase 2: Headless Core Simulation
**Goal**: Ball and paddle physics are correct, deterministic, and provably free of tunneling before any pixels exist
**Depends on**: Phase 1
**Requirements**: PHYS-02, PHYS-03, PHYS-04, PHYS-06
**Success Criteria** (what must be TRUE):
  1. The world advances only in fixed timesteps with a frame clamp and max-substep cap; the same inputs delivered in different frame chunkings produce an identical end state (golden-replay hash)
  2. A property test fires balls at 2× the intended maximum speed through a dense brick grid with zero tunneling and zero missed collisions against paddle, walls, and bricks
  3. Bounce direction is a function of the paddle-relative contact point, with clamps that prevent near-horizontal and near-vertical trajectories, verified by tests at the clamp edges
  4. No React state is written during simulation, and `Math.random()` or wall-clock reads inside the simulation directory fail the build — all randomness comes from two seeded streams
**Plans:** 6 plans
Plans:
- [x] 02-00-PLAN.md — Wave 0: fast-check install, ESLint RNG/clock bans, nested core boundaries
- [x] 02-01-PLAN.md — World SoA + dual RNG + event ring + hashWorld + thin harness migration
- [x] 02-02-PLAN.md — Swept CCD primitives (sweep/broadphase/integrate) + PHYS-02 unit tests
- [x] 02-03-PLAN.md — Classic Breakout paddle english + PHYS-04 clamp tests
- [x] 02-04-PLAN.md — stepWorld CCD loop + multi-HP/unbreakable + Intent finite guards
- [x] 02-05-PLAN.md — 2× tunneling props + golden-replay + full suite gate
**UI hint**: no

### Phase 3: First Playable — Render, Input, Bricks, Lives, Pause
**Goal**: A player can hold the phone and play a real rally — drag the paddle, aim a launch, break bricks, lose lives, pause and come back
**Depends on**: Phase 2
**Requirements**: PHYS-01, PHYS-05, RUN-02, PLT-01
**Success Criteria** (what must be TRUE):
  1. Dragging anywhere on the playfield moves the paddle by relative offset with tuned gain and light smoothing; the paddle never teleports to the finger on re-press, and control feels responsive on both platforms
  2. At the start of each life the ball rides the paddle and the player launches it with an aimed tap/release; bricks take damage and disappear as the ball hits them
  3. A player can deliberately aim the ball at a chosen brick within their first minute of play
  4. A run ends with a clear win when the last breakable brick is destroyed and a clear lose when the last of three lives is spent
  5. The player can pause and resume, and backgrounding the app mid-rally for 60+ seconds auto-pauses and resumes via countdown with no physics catch-up jump
**Plans:** 6 plans
Plans:
- [x] 03-00-PLAN.md — Wave 0: pure drag/gate/freeze helpers + Vitest stubs
- [x] 03-01-PLAN.md — Core dock/serve/lives/win + phase3Grid + stepRun
- [x] 03-02-PLAN.md — Letterbox camera + entity SkPicture + GameCanvas
- [x] 03-03-PLAN.md — Relative-drag Race(Pan,Tap) gesture hook
- [x] 03-04-PLAN.md — useGameLoop Intent/stepRun + AppState freeze
- [x] 03-05-PLAN.md — GameHost overlays + playable UAT checkpoint
**UI hint**: yes

### Phase 4: Level Format & Brick Types
**Goal**: Levels are data rather than code — versioned, validated, and expressive enough for the showpiece level and a future editor
**Depends on**: Phase 3
**Requirements**: LVL-01, LVL-02, LVL-03
**Success Criteria** (what must be TRUE):
  1. A second, structurally different level file loads and plays with zero code changes
  2. Invalid level files are rejected with actionable validation errors before play starts, and the runtime reads only the compiled form — never the authoring format
  3. A level contains multiple brick types whose remaining hit points are readable through a non-color cue as well as colour
  4. Unbreakable/structural bricks reflect the ball, never break, and never block the win condition
  5. The format carries a version and a migration path, so level files authored today still load after the schema evolves
**Plans:** 5 plans
Plans:
- [x] 04-00-PLAN.md — Wave 0: Nyquist stubs + invalid level fixtures
- [x] 04-01-PLAN.md — schema/validate/migrations + loadAndCompile gate
- [x] 04-02-PLAN.md — compile/apply + level-01/02 JSON + spatial SoA
- [x] 04-03-PLAN.md — damageCues + Skia crack/hatch in recordFrame
- [x] 04-04-PLAN.md — GameHost wire, LevelErrorOverlay, delete phase3Grid
**UI hint**: no

### Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall
**Goal**: The run rewards skill and risk-taking, and no rally can dead-end
**Depends on**: Phase 3 (runs in parallel with Phase 4)
**Requirements**: RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07
**Success Criteria** (what must be TRUE):
  1. Consecutive brick hits without paddle contact raise a combo multiplier that resets on paddle contact, and the score visibly reflects it
  2. Destroyed bricks can drop multi-ball and paddle-expand pickups, which apply only when caught on the paddle — nothing auto-collects
  3. With several balls in play, a life is lost only when the last ball leaves the playfield
  4. While the paddle is expanded, bounce angles respond the same way as at base width, because the angle mapping normalizes to the current width
  5. A stalled rally escalates visibly and deterministically until it breaks out, with no random bounce jitter
**Plans:** 7/7 plans complete
Plans:
- [x] 05-00-PLAN.md — Wave 0 Nyquist stubs for scoring/pickups/effects/multiball/stall/lives
- [x] 05-01-PLAN.md — World SoA + constants + hash + ball-pool compact (activeBallCount)
- [x] 05-02-PLAN.md — Score + combo from event ring (RUN-01, award-then-increment)
- [x] 05-03-PLAN.md — Pickups, expand effects, multi-ball spawn (PWR-01/02/03 modules)
- [x] 05-04-PLAN.md — Last-ball lives + stepRun orchestration
- [x] 05-05-PLAN.md — Deterministic anti-stall tiers (PHYS-07)
- [x] 05-06-PLAN.md — Score/combo/Stall! SharedValue chrome + flat pickups
**UI hint**: no

### Phase 6: UI Shell, HUD, Persistence & Platform Seams
**Goal**: The game is wrapped in a real app — menus, HUD, instant retry, a high score that survives app kills, and clean seams for future monetization
**Depends on**: Phase 5 (runs in parallel with Phase 7)
**Requirements**: RUN-03, RUN-04, PLT-02, ARCH-02
**Success Criteria** (what must be TRUE):
  1. The player can retry instantly from pause or the lose screen with one tap and no confirmation dialog
  2. The HUD shows score, combo, and lives, driven by discrete event mirrors rather than a React render per physics frame
  3. A personal best survives force-quitting the app and is shown on the results screen, entirely offline
  4. Playfield and UI lay out correctly with safe-area insets on a notched iPhone and on Android, across the target phone sizes
  5. Ads, IAP, and account interfaces exist as no-op stubs with real call sites, and the whole game is playable in airplane mode
**Plans**: 6 plans
Plans:
- [x] 06-00-PLAN.md — Wave 0: AsyncStorage 2.2.0, ESLint app→services, Nyquist stubs
- [x] 06-01-PLAN.md — services/storage personal best (compare + AsyncStorage + GREEN tests)
- [ ] 06-02-PLAN.md — services/platform no-op seams (onRunEnded + GREEN tests)
- [ ] 06-03-PLAN.md — Title/PlayingHost shell + Menu on Pause/Results (RUN-03)
- [ ] 06-04-PLAN.md — HudStrip + playfieldSafe.top = insets.top + 48 (PLT-02)
- [ ] 06-05-PLAN.md — End-of-run persist + seams + Results Score/Best/New Record + UAT
**UI hint**: yes

### Phase 7: Feedback — Neon VFX & Audio
**Goal**: Hits, breaks, and losses look and sound spectacular without ever hiding the ball or spending frame budget the game needs
**Depends on**: Phase 5 (runs in parallel with Phase 6)
**Requirements**: FX-01, FX-02, FX-03
**Success Criteria** (what must be TRUE):
  1. The ball keeps a readable trail at maximum speed, and under reduced motion the trail degrades to a high-contrast minimum instead of vanishing
  2. Brick destruction produces glow, pooled particles, and subtle shake inside a hard particle budget, and no effect obscures the paddle or ball long enough to cost the player a rally
  3. One global intensity scalar — defaulting from the OS reduce-motion flag — scales every effect, and deleting the VFX layer leaves gameplay identical
  4. Paddle hit, brick hit/break, power-up catch, life lost, win, and lose each play a distinct SFX aligned to the frame of impact, with rapid hits overlapping rather than cutting each other off
  5. Every effect added is measured on the named Android reference device and stays inside the frame budget established in Phase 1
**Plans**: TBD
**UI hint**: yes

### Phase 8: Showpiece Level, Performance Certification & Launch Baseline
**Goal**: One authored challenge level, certified at 60 FPS on real hardware, with the store-compliance paperwork ready
**Depends on**: Phase 4, Phase 6, Phase 7
**Requirements**: LVL-04, PLT-03, PLT-04
**Success Criteria** (what must be TRUE):
  1. A hand-authored ~2–3 minute arcade challenge level plays with escalating difficulty phases and plateaus, and a first-time player wants to replay it to beat their score
  2. Release builds hold 60 FPS on the named mid-range device through the worst-case frame — multi-ball with a maximum particle burst and combo shake — measured with platform profilers, not the React Native perf monitor
  3. Device quality tiers cap particle count, trail length, and glow variants, with nothing in `core/` reading the tier
  4. A mount/unmount soak test shows no worklet or game-loop leaks and no frame-time drift over an extended session
  5. A public HTTPS privacy policy URL is live, the Play Data Safety form and age rating are complete, the iOS privacy manifest is present, the name is cleared, and every asset and level layout is originally authored
**Plans**: TBD
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Phases 4 and 5 may run in parallel (both depend only on Phase 3). Phases 6 and 7 may run in parallel (both depend on Phase 5). Phases 1 → 2 → 3 are strictly sequential: physics, game loop, and rendering integration must not be developed in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Thread-Boundary Spike | 4/4 | Complete (simulator waiver; D-04/D-05 MVP debt) | 2026-09-20 |
| 2. Headless Core Simulation | 6/6 | Complete | 2026-09-20 |
| 3. First Playable | 6/6 | Complete | 2026-09-20 |
| 4. Level Format & Brick Types | 5/5 | Executing (verify) | 2026-09-20 |
| 5. Run Rules | 7/7 | Complete    | 2026-09-20 |
| 6. UI Shell, HUD & Persistence | 0/6 | Planned | - |
| 7. Feedback — Neon VFX & Audio | 0/TBD | Not started | - |
| 8. Showpiece Level & Launch Baseline | 0/TBD | Not started | - |

## Coverage

All 27 v1 requirements map to exactly one phase each. See REQUIREMENTS.md Traceability.

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1 | ARCH-01 | 1 |
| 2 | PHYS-02, PHYS-03, PHYS-04, PHYS-06 | 4 |
| 3 | PHYS-01, PHYS-05, RUN-02, PLT-01 | 4 |
| 4 | LVL-01, LVL-02, LVL-03 | 3 |
| 5 | RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07 | 5 |
| 6 | RUN-03, RUN-04, PLT-02, ARCH-02 | 4 |
| 7 | FX-01, FX-02, FX-03 | 3 |
| 8 | LVL-04, PLT-03, PLT-04 | 3 |
| **Total** | | **27** |

---
*Roadmap created: 2026-09-19*
