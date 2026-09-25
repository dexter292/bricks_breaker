# Requirements: Neon Brick Breaker

**Defined:** 2026-09-19
**Core Value:** A single level must feel arcade-punchy, skillful, and visually spectacular at a stable 60 FPS—responsive controls and accurate physics come first; neon effects never steal clarity or frame time.

## v1 Requirements

Requirements for the initial playable milestone. Each maps to roadmap phases.

### Controls & Physics

- [x] **PHYS-01**: Player can move the paddle with relative-drag touch (not absolute finger-follow), with tuned gain and light smoothing on device
- [x] **PHYS-02**: Ball collides with paddle, walls, and bricks using swept, deterministic collision with no tunneling at designed max speed
- [x] **PHYS-03**: Collision and simulation logic are unit-tested (including property tests for extreme speeds / dense grids)
- [x] **PHYS-04**: Ball bounce angle is paddle-relative with clamps that avoid near-horizontal and near-vertical degenerate trajectories
- [x] **PHYS-05**: On life start, ball is docked to the paddle and player launches with a **tap** (aimed drag-to-aim deferred — temporary MVP close 2026-09-24; see `docs/audit/MVP-CLOSE-REPORT.md`)
- [x] **PHYS-06**: Game advances on a fixed-timestep loop; React state is not updated every physics frame
- [x] **PHYS-07**: Anti-stall mitigation uses visible, deterministic escalation (no random bounce jitter)

### Level & Bricks

- [x] **LVL-01**: Levels load from a versioned data-driven format suitable for a future level editor
- [x] **LVL-02**: Level includes multiple brick types with different hit points and readable damage states (color + non-color cue)
- [x] **LVL-03**: Level can include unbreakable/structural bricks that channel the ball
- [x] **LVL-04**: One hand-crafted arcade challenge level with progressive difficulty, authored after core feel is validated (level-03 shipped; duration band ~2–3 min deferred — T3.4 accepts ~5–6 min bot / playtest median at ship)

### Run Loop

- [x] **RUN-01**: Player earns score with combo rewards for consecutive brick hits without paddle contact
- [x] **RUN-02**: Player has a limited number of lives (default 3) with clear win and lose presentations
- [x] **RUN-03**: Player can instantly retry from lose or pause without a confirmation dialog
- [x] **RUN-04**: Local high score persists across app kills (offline, no account)

### Power-ups

- [x] **PWR-01**: Destroyed bricks can drop multi-ball; a life is lost only when the last ball leaves play
- [x] **PWR-02**: Destroyed bricks can drop paddle expand; bounce-angle mapping normalizes to current paddle width
- [x] **PWR-03**: Power-up drops must be caught on the paddle (no auto-collect)

### Feedback (VFX / Audio)

- [x] **FX-01**: Ball has a trail that preserves readability at maximum speed (degrades to high-contrast minimum under reduced motion, never vanishes)
- [x] **FX-02**: Neon destruction effects (glow, particles, subtle shake) use a global intensity scalar and a hard particle budget; spectacle never hides paddle/ball or breaks frame budget
- [x] **FX-03**: Modular audio plays frame-accurate SFX for paddle hit, brick hit/break, power-up catch, life lost, win, and lose

### Platform & Performance

- [x] **PLT-01**: Player can pause/resume; app auto-pauses on OS background/interruption and resumes with a countdown (no physics catch-up spiral)
- [x] **PLT-02**: Playfield layout is responsive with safe-area handling on iOS and Android
  - *Note:* Android half unverified on physical device (no Android install) — keep wording for D2=B return path; do not claim Android layout certified.
- [ ] **PLT-03**: Stable 60 FPS is measured on a named mid-range real device (including worst-case multi-ball + particle burst); RN perf monitor alone is not acceptance — **deferred: iOS-first release (D2=B, 2026-09-24)**; Android gate out of scope for this release; replaced for shipping by iOS ceiling/floor locks in `docs/measurement-methodology.md` / `N-PLT-02`
- [x] **PLT-04**: Store compliance baseline is prepared: public HTTPS privacy policy URL, Google Play Data Safety form, honest age rating, iOS privacy manifest as required

### Architecture (cross-cutting)

- [x] **ARCH-01**: Game logic, physics, rendering, input, and UI are separated; simulation is suitable to run on the UI-thread worklet path
  - *Note:* Hardware 60 FPS / Android install waived for Phase 1 close (simulator interim); re-cert before MVP (D-04/D-05).
- [x] **ARCH-02**: Architecture includes seams for future ads/IAP/accounts without implementing them; MVP is fully playable offline

## v2 Requirements

Deferred past the first playable milestone. Tracked but not in current roadmap commitment.

### Feel Differentiators

- **FX-04**: Haptics on paddle hit, brick break, and life lost (respect OS haptics setting)
- **FX-05**: Paddle bump for continuous agency / last-brick mitigation
- **FX-06**: Combo-tier escalating juice (graded hit-stop, rising pitch, trail/shake scaling)

### Content & Meta

- **LVL-05**: Additional authored levels + level select
- **AUD-01**: Single ambient music loop
- **META-01**: Optional platform leaderboards (skippable sign-in)
- **META-02**: Rewarded ads for optional continues; cosmetic IAP
- **TOOL-01**: Level editor built on the v1 data format
- **TOOL-02**: Deterministic replay / ghost of best run

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Copying Maker/Shatter assets, branding, music, or layouts | Original identity only; App Store Guideline 4.1 risk |
| Absolute finger-follow paddle | Causes teleport deaths and thumb occlusion |
| Off-the-shelf rigid-body engines (Matter/Box2D) for the ball | Fights arcade bounce skill; worklet-hostile; tunnels |
| Random bounce jitter to break stalls | Destroys physics-toy trust |
| Paddle-shrink / punishing power-downs | Player-negative; competitors get reviewed down for this |
| Turn-based “ballz” aim-and-shoot mechanics | Different genre; abandons paddle niche |
| Modal / unskippable text tutorials | Teach via docked launch + contextual hints |
| Thousands of procedural levels in MVP | Uneven difficulty; contradicts one polished level |
| Ads, IAP, accounts, analytics SDK in MVP | Prove loop first; keep offline zero-data |
| Background music in MVP | Scope sink; modular SFX first |
| Level editor in MVP | Data format only; editor is its own product surface |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PHYS-01 | Phase 3 | Complete |
| PHYS-02 | Phase 2 | Complete |
| PHYS-03 | Phase 2 | Complete |
| PHYS-04 | Phase 2 | Complete |
| PHYS-05 | Phase 3 | Complete (tap-only; aimed deferred temp MVP 2026-09-24) |
| PHYS-06 | Phase 2 | Complete |
| PHYS-07 | Phase 5 | Complete |
| LVL-01 | Phase 4 | Complete |
| LVL-02 | Phase 4 | Complete |
| LVL-03 | Phase 4 | Complete |
| LVL-04 | Phase 8 | Complete |
| RUN-01 | Phase 5 | Complete |
| RUN-02 | Phase 3 | Complete |
| RUN-03 | Phase 6 | Complete |
| RUN-04 | Phase 6 | Complete |
| PWR-01 | Phase 5 | Complete |
| PWR-02 | Phase 5 | Complete |
| PWR-03 | Phase 5 | Complete |
| FX-01 | Phase 7 | Complete |
| FX-02 | Phase 7 | Complete |
| FX-03 | Phase 7 | Complete |
| PLT-01 | Phase 3 | Complete |
| PLT-02 | Phase 6 | Complete |
| PLT-03 | Phase 8 | **DEFERRED (iOS-first, D2=B 2026-09-24)** — Android out of scope; use iOS ceiling/floor locks (N-PLT-02). Do not claim Complete |
| PLT-04 | Phase 8 | Complete |
| ARCH-01 | Phase 1 | Complete (simulator waiver; hardware debt → MVP) |
| ARCH-02 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27 ✓
- Unmapped: 0

**By phase:**

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1. Foundation & Thread-Boundary Spike | ARCH-01 | 1 |
| 2. Headless Core Simulation | PHYS-02, PHYS-03, PHYS-04, PHYS-06 | 4 |
| 3. First Playable | PHYS-01, PHYS-05, RUN-02, PLT-01 | 4 |
| 4. Level Format & Brick Types | LVL-01, LVL-02, LVL-03 | 3 |
| 5. Run Rules | RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07 | 5 |
| 6. UI Shell, HUD & Persistence | RUN-03, RUN-04, PLT-02, ARCH-02 | 4 |
| 7. Feedback — Neon VFX & Audio | FX-01, FX-02, FX-03 | 3 |
| 8. Showpiece Level & Launch Baseline | LVL-04, PLT-03, PLT-04 | 3 |

---
*Requirements defined: 2026-09-19*
*Last updated: 2026-09-21 — T8.1 ledger sync (Phase 3 verified; PLT-03 reverted pending device evidence)*

---

## v1.2 Requirements — Retention & Replayability

**Defined:** 2026-09-25 · Roadmap: [`ROADMAP.md`](./ROADMAP.md) · Candidates: `post-mvp/FEATURE-CANDIDATES.md`

Scope rule for this milestone: **offline only, shipped verbs only, no backend, no new brick
type, no monetization SDK.** Anything needing a server, an account, or a store gate is out.

### Telemetry & Statistics

- [ ] **N-STAT-01** (FC-R07): A run records deterministic counters — bricks broken, best combo, power-ups caught, lives lost, ticks played, outcome — derived from the existing event ring, aggregated lifetime and per level id
- [ ] **N-STAT-02**: `ProgressBlob` v3 → v4 migration is lossless for every existing best score, star and unlocked level; corrupt v4 degrades to defaults instead of throwing
- [ ] **N-STAT-03** (FC-R07): A statistics screen renders lifetime and per-level telemetry without recomputing on every frame

### Board Generation

- [ ] **N-GEN-01**: `generate(seed, difficulty)` is pure and returns a `LevelFileV1`; identical arguments produce byte-identical output across processes
- [ ] **N-GEN-02**: Every generated board passes `checkSolvability` with zero unreachable breakables and fits the 360×640 playfield, asserted over a seed/difficulty sweep
- [ ] **N-GEN-03**: `difficulty` is monotone — higher values yield non-decreasing authored weight (brick count and total HP); generation uses only shipped verbs and respects the Mid particle budget

### Endless Mode

- [ ] **N-END-01** (FC-R04): Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives
- [ ] **N-END-02**: Endless records (best wave, best score) are stored separately — endless play cannot alter campaign unlocks, bests or stars
- [ ] **N-END-03**: A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget

### Daily Challenge

- [ ] **N-DAILY-01** (FC-R03): The board derives from the local calendar date alone — same date, same board, no network
- [ ] **N-DAILY-02**: The day's result is recorded once per date and shown on re-open rather than regenerated; a streak is computed from stored dates, not an incrementable counter
- [ ] **N-DAILY-03**: Behaviour on device-clock changes is an explicit written policy; daily results never touch campaign or endless records

### Achievements

- [ ] **N-ACH-01** (FC-R01): Achievements are declared as data — id, description, pure predicate over a telemetry snapshot — so adding one needs no game-code edit
- [ ] **N-ACH-02**: Evaluation is deterministic and idempotent; unlocks persist across app kills under the storage migration contract
- [ ] **N-ACH-03**: An unlock is surfaced without interrupting a live rally; the catalog covers all three modes, not just score thresholds

### Meta Shell

- [ ] **N-UI-01**: Title offers campaign, endless and daily as distinct entries; the daily entry shows whether today has been played
- [ ] **N-UI-02**: New screens respect the shell contract — safe-area insets, dark palette, no ads/shop/login chrome, `PlayingHost` unmounts when not playing, and navigation never leaves a run mounted in the background

### Explicitly out of scope for v1.2

| Candidate | Why not now |
|-----------|-------------|
| FC-R06 platform leaderboards | Needs Game Center / Play Games — not offline |
| FC-R02 unlockable cosmetics | Wants an art pipeline this milestone does not fund |
| FC-B03 moving bricks · FC-B06 boss · FC-P08 laser | Physics hot path; ceiling cert is already stale (§5d) |
| FC-L09 level editor | XL, and authoring pain is not yet proven |
| FC-M01…M05 monetization | D5=A — no SDK before first ASC approval |
| Chapters / worlds (FC-L05) | Premature below ~8 levels |
