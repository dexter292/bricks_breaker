# Neon Brick Breaker

## What This Is

A premium 2D brick-breaker mobile game for iOS and Android, inspired by classic Arkanoid gameplay (Brick Breaker Maker as feel reference) and modern neon arcade aesthetics (Shatter as visual reference). Players control a paddle, bounce a ball through destructible neon brick layouts, chase score and combos, and clear a full arcade challenge—starting with one polished, replayable level shipped as a production-quality offline MVP.

## Core Value

A single level must feel arcade-punchy, skillful, and visually spectacular at a stable 60 FPS—responsive controls and accurate physics come first; neon effects never steal clarity or frame time.

## Requirements

### Validated

- [x] Score tracking with combo rewards — Validated in Phase 5: Run Rules
- [x] Basic power-ups (at least multi-ball and paddle expansion) — Validated in Phase 5: Run Rules
- [x] Limited lives with meaningful failure risk; clear win and lose conditions — last-ball life loss refined in Phase 5 (win/lose/pause from Phase 3)
- [x] Architecture separating game logic, physics, rendering, input, and UI—no React state updates every physics frame — Validated across Phases 1–6 (SharedValue chrome mirrors + HudStrip)
- [x] Data-driven level format designed to support a future level editor — Validated in Phase 4
- [x] Unit tests for game logic and collision detection — Validated in Phases 2–5 (110 green as of Phase 5)
- [x] Instant retry from pause/results; Title shell; Menu without confirmation — Validated in Phase 6
- [x] Local personal best persists offline (AsyncStorage + Results Score/Best/New Record) — Validated in Phase 6
- [x] Responsive playfield/HUD with safe-area insets (HudStrip above letterbox) — Validated in Phase 6
- [x] Ads/IAP/account seams as no-ops with real `onRunEnded` call sites; airplane-playable — Validated in Phase 6

### Active

- [ ] Touch-controlled paddle with responsive, precise control on iOS and Android
- [ ] Ball movement with accurate, deterministic collision detection (paddle, walls, bricks)
- [ ] Multiple brick types with different hit points and behaviors
- [ ] One complete arcade challenge level (~2–3 min successful run) with progressive difficulty
- [ ] Pause and resume
- [ ] Minimal SFX: paddle hit, brick hit/break, power-up, life lost, win/lose
- [ ] Basic neon visual effects: glowing bricks, ball trails, particle destruction, subtle screen shake
- [ ] Performance measured on real mid-range devices (target 60 FPS)

### Out of Scope

- Copying Brick Breaker Maker / Shatter assets, branding, music, or level designs — original identity only
- Background music and full audio settings UI — modular audio hook only in MVP
- Additional levels beyond the first challenge — after MVP playable loop is proven
- Advanced graphics beyond basic neon VFX — prioritize prototype feel first
- Level editor — data format ready; editor deferred
- Ads, IAP, subscriptions, user accounts, cloud sync — architecture-aware only; no backend in MVP
- Online multiplayer or social features — offline-first product

## Context

**Product goal:** Ship a production-quality game to the App Store and Play Store. Start with a polished playable MVP, then expand levels, power-ups, and features before public release.

**Feel mix (first level):**
- ~40% arcade punchy — snappy paddle, smooth ball, precise collisions, satisfying breaks
- ~30% physics toy — predictable trajectories, controllable bounce angles, meaningful skill
- ~30% spectacle — neon glow, trails, particles, subtle shake, polished feedback  
Visual effects must never compromise responsiveness or gameplay clarity.

**Inspiration (intent only):**
- Brick Breaker Maker → classic paddle/ball loop, creative layouts, progressive difficulty, multi-type bricks, power-ups, data-driven levels
- Shatter → futuristic neon look, vibrant glow, dynamic feel, destruction FX, trails, fluid feedback

**Tech stack (decided):**
- React Native + TypeScript
- Expo + EAS Build
- React Native Skia for 2D rendering
- Custom deterministic physics engine
- Fixed-timestep game loop
- Unit tests for logic and collisions

**Architecture mandates:**
- Separate layers: game logic, physics, rendering, input, UI
- Avoid React state updates on every physics frame
- Data-driven levels for future editor support
- Fully playable offline; no unnecessary backend dependencies in MVP
- Design seams for future rewarded ads, cosmetic IAP, local high scores, optional cloud accounts—without implementing them yet

**Success bar for MVP level:** Player understands controls within seconds, enjoys the run, and wants to replay to beat their score.

**Process constraint:** Architecture and roadmap require explicit approval before implementation begins. Do not build the entire game in one phase—phased roadmap with deliverables and acceptance criteria; playable prototype before advanced polish, more levels, monetization, or editor.

## Constraints

- **Tech stack**: React Native, TypeScript, Expo, EAS, Skia, custom physics, fixed timestep — locked for MVP
- **Performance**: Stable 60 FPS on mid-range devices; measure on hardware, do not assume
- **Platform**: iOS and Android from the start; responsive layouts required
- **Offline**: MVP must be fully playable without network
- **Originality**: No copyrighted third-party game assets, branding, music, or level layouts
- **Phasing**: Playable prototype first; no single-phase entire-game implementation
- **Approval gate**: Architecture and roadmap approved before coding starts
- **Monetization**: Deferred; keep integration points clean without shipping ads/IAP/accounts in early phases

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native + Expo + Skia | Cross-platform mobile with high-quality 2D rendering | — Pending |
| Custom deterministic physics + fixed timestep | Predictable skill-based play; testable collisions | — Pending |
| Separate logic/physics/render/input/UI; no per-frame React state | Preserve 60 FPS and clean architecture | — Pending |
| Data-driven levels from day one | Enables future level editor without rewrite | — Pending |
| One full arcade challenge level in MVP (not tutorial-only) | Prove complete loop, difficulty, and replay motivation | — Pending |
| Basic power-ups (multi-ball, paddle expand) in MVP | Part of the engaging arcade loop, not deferred polish | Accepted Phase 5 — catch-on-paddle, last-ball lives, anti-stall |
| Minimal SFX only; modular audio system | Feedback without music scope; easy to extend | — Pending |
| Ads/IAP/accounts later; offline MVP | Focus on gameplay quality; avoid backend early | Accepted Phase 6 — no-op seams + airplane UAT |
| Feel mix 40/30/30 (punch / physics / spectacle) | Guides tradeoffs when VFX and responsiveness conflict | — Pending |
| Interactive gates for architecture/roadmap/scope; auto-execute approved plans | Speed after decisions without losing approval control | — Pending |
| Parallel plans except physics ↔ game loop ↔ rendering when dependent | Avoid integration thrash on the hot path | — Pending |
| Real-device testing required before performance goals are done | 60 FPS must be measured, not assumed | Pending — MVP |
| Phase 1 closes on iOS Simulator interim; Android + further physical iOS waived | Unblock Phase 2; keep D-04/D-05 hardware debt before MVP | Accepted 2026-09-20 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-20 — Phase 6 complete (Title/HUD/Best/seams)*
