# Phase 7: Feedback — Neon VFX & Audio - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Hits, breaks, and losses look and sound spectacular without ever hiding the ball or spending frame budget the game needs (FX-01, FX-02, FX-03).

Delivers: Shatter-inspired neon sci-fi visuals — always-on baked brick glow, pooled neon-spark destruction particles (scaled chip vs destroy), short ghost ball trails, subtle cosmetic camera shake on destroy/life-lost; modular frame-accurate SFX for paddle hit, brick hit/break, power-up catch, life lost, win, and lose; one global VFX intensity scalar defaulting from OS reduce-motion; VFX layer deletable with identical gameplay; measurement against Pixel 6a frame budget.

Does **not** deliver: background music or full audio settings UI; haptics (FX-04 / v2); combo-tier escalating juice / hit-stop / rising pitch (FX-06 / v2); showpiece authored level or hardware 60 FPS certification paperwork (Phase 8 owns PLT-03/PLT-04 certification — Phase 7 still measures every effect on Pixel 6a before merge); new gameplay mechanics; per-entity runtime blur.

</domain>

<decisions>
## Implementation Decisions

### North star & hard constraints
- **D-01:** Art direction: **Shatter-inspired neon sci-fi** — impressive brick destruction, readable ball trail, modern arcade SFX.
- **D-02:** All VFX are **cosmetic only**. Deleting the VFX layer leaves gameplay identical. Effects must never compromise **ball visibility**, **paddle responsiveness**, or **stable 60 FPS on Pixel 6a**.
- **D-03:** **Reduced-motion support** and **adaptive VFX intensity** (single global scalar) are in scope. Intensity defaults from the OS reduce-motion flag — dampen, never a binary “effects off” for trail readability.
- **D-04:** No hit-stop / gameplay slowdown in Phase 7. No music, haptics, or full audio settings UI.

### Neon glow & break spectacle (FX-02)
- **D-05:** Idle bricks: **always-on soft neon edge/halo** via **baked or cached** sprites/layers — **never** expensive per-brick blur every frame.
- **D-06:** Break particles: **bright neon sparks / energy flecks** — short, satisfying burst.
- **D-07:** Chip vs destroy: **same visual language at different intensities** — chip = small spark pop; destroy = larger burst + **brief glow flash**.
- **D-08:** Particle colors: **inherit brick color** + **white/cyan highlights**.
- **D-09:** Hard particle budget + intensity scalar; spectacle never obscures paddle/ball long enough to cost a rally.

### Ball trail (FX-01)
- **D-10:** Trail style: **fading ghost afterimages** (not a continuous ribbon) for max readability at high speed and multi-ball.
- **D-11:** Trail length at full intensity: **short 3–5 frame history**; current ball position must always remain clearly distinguishable.
- **D-12:** Trail color: **white/light matching the ball** + **subtle cyan rim** for contrast on navy.
- **D-13:** Reduced / low intensity: preserve **1–2 high-contrast afterimages** with **no glow/bloom**; **never fully disable** the trail.
- **D-14:** Trail rendering stays lightweight — **bounded history per ball**; **no per-frame React state** updates.

### Shake & impact punch
- **D-15:** Camera shake triggers: **brick destruction** and **life lost** only — not ordinary hits or power-up catch.
- **D-16:** Feel: **subtle, short-lived** shake with **smooth decay**; preserve aiming accuracy.
- **D-17:** Rapid destroys: **merge overlapping shakes** with a **hard amplitude cap** and **deterministic decay** (prevent multi-ball jitter).
- **D-18:** Shake amplitude scales with global VFX intensity → **approaches zero at minimum**.
- **D-19:** Shake is a **cosmetic camera/render offset only** — must never modify simulation coordinates, collision, paddle input, or ball trajectories.

### SFX personality & mix (FX-03)
- **D-20:** Sonic identity: **modern neon arcade** — clean synth blips, punchy impacts, subtle sci-fi textures; **original assets only**.
- **D-21:** Brick hit vs break: **same sound family** — chip = short softer impact; destroy = fuller impact + brief shimmer.
- **D-22:** Loudness hierarchy: **Life lost / Win / Lose → Brick break → Paddle hit / Brick chip → Power-up catch** — rare events cut through without excessive volume.
- **D-23:** Rapid-fire: pooled players with **per-category voice limits**; at limit **reuse oldest voice** in that category (bounded overlap, not unbounded).
- **D-24:** Modular **`AudioService`**; **preload/decode before gameplay**; consume simulation events **without blocking** the physics loop. Event set: paddle hit, brick hit/break, power-up catch, life lost, win, lose — frame-aligned to impact.

### Claude's Discretion
- Exact particle pool sizes, spark lifetimes, glow-bake variant counts, and shake amplitude/decay constants within the locked feel bands
- Exact synth sample design / file packaging within “modern neon arcade + original”
- Exact per-category voice-limit numbers and `expo-audio` pool sizing (research recommends 2–3 players per sound — planner may refine)
- How intensity scalar maps numerically from OS reduce-motion (dampen ~research default band) as long as D-03/D-13/D-18 hold
- Internal VFX module file layout under `src/` as long as architecture seams (event ring → UI-thread VFX; batched drain → audio) are respected

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 7 goal + success criteria 1–5
- `.planning/REQUIREMENTS.md` — FX-01, FX-02, FX-03; v2 FX-04/FX-06 explicitly out; Out of Scope music
- `.planning/PROJECT.md` — Feel mix 40/30/30; neon never steals clarity/frame time; modular SFX; Pixel 6a performance bar
- `.planning/STATE.md` — Current milestone position; Phase 1 Pixel 6a reference

### Research (architecture & pitfalls)
- `.planning/research/SUMMARY.md` — Event ring dual consumers; baked glow; particle pools; `expo-audio` pools; intensity scalar; Android glow cliff
- `.planning/research/ARCHITECTURE.md` — VFX system (cosmetic SoA particles/trails/shake); `services/audio`; Picture layers
- `.planning/research/STACK.md` — `expo-audio` SDK 57 path; Skia immediate mode
- `.planning/research/PITFALLS.md` — Per-entity neon glow / BlurMask Android cliff; variable-entity React tree; particle budget
- `.planning/research/FEATURES.md` — Trail-as-readability; motion intensity scalar

### Prior phase decisions
- `.planning/milestones/v1.0-phases/01-foundation-thread-boundary-spike/01-CONTEXT.md` — Pixel 6a reference (D-01); UI-thread worklet topology
- `.planning/milestones/v1.0-phases/02-headless-core-simulation/02-CONTEXT.md` — Event ring; VFX consumes events in Phase 7
- `.planning/milestones/v1.0-phases/03-first-playable-render-input-bricks-lives-pause/03-CONTEXT.md` — Flat navy + row colors; immediate-mode SkPicture; neon deferred here
- `.planning/milestones/v1.0-phases/04-level-format-brick-types/04-CONTEXT.md` — Neon glow/particles deferred to Phase 7
- `.planning/milestones/v1.0-phases/05-run-rules-score-combo-power-ups-anti-stall/05-CONTEXT.md` — Flat pickups; neon/audio deferred
- `.planning/milestones/v1.0-phases/06-ui-shell-hud-persistence-platform-seams/06-CONTEXT.md` — Services pattern; VFX/audio owned by Phase 7

### Expo (versioned)
- https://docs.expo.dev/versions/v57.0.0/ — SDK 57 audio and related APIs (project mandate)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/events/ring.ts` — Fixed-capacity SoA event ring; VFX (UI thread) + audio (batched JS drain) consumers
- `src/render/recordSprites.ts` + `GameCanvas.tsx` — Immediate-mode `SkPicture` path to extend with trails/particles/glow draws
- `src/render/colors.ts` / `brickFill` — Row HP palette to tint particles and bake glow variants
- `src/render/camera.ts` — Camera/letterbox transform; shake should apply as cosmetic offset in render only
- `src/services/storage/` + `src/services/platform/` — Pattern for modular `services/audio` interface + impl
- `src/runtime/useGameLoop.ts` — Frame callback / picture SharedValue; event drain hook point

### Established Patterns
- No React state on the physics/render hot path — SharedValues + worklets
- Core stays pure / worklet-safe; services stay outside `core/`
- Cosmetic systems must not write back into gameplay `World` state

### Integration Points
- Drain `World` event ring each frame → spawn/step particles, trails, shake; `scheduleOnRN` (or equivalent batch) → `AudioService`
- Extend sprite recording (or add `fxPicture` layer) without regressing opaque canvas / letterbox
- Wire global intensity from OS reduce-motion at runtime shell; expose scalar into VFX emitter API from first particle
- Preload SFX before PlayingHost enters active play

</code_context>

<specifics>
## Specific Ideas

- User priority (VN/EN): Shatter neon sci-fi; ấn tượng phá gạch; trail dễ quan sát; âm thanh arcade hiện đại — with performance and clarity non-negotiable.
- Idle glow must use baked/cached rendering, not per-brick per-frame blur.
- Trail is a readability tool first; spectacle second.
- Shake and particles budgeted/adaptive; Pixel 6a 60 FPS beats visual intensity when they conflict.

</specifics>

<deferred>
## Deferred Ideas

- Haptics on paddle/break/life lost — FX-04 (v2)
- Combo-tier escalating juice (hit-stop, rising pitch, trail/shake scaling) — FX-06 (v2)
- Background music / ambient loop — AUD-01 / Out of Scope for MVP
- Full in-game audio or VFX settings UI — Out of Scope (modular hook only)
- Device quality tiers capping particles/trails/glow — Phase 8 (PLT-03 adjacent)
- Formal release-build 60 FPS certification + soak — Phase 8

None additional from discussion — stayed within phase scope.

</deferred>

---

*Phase: 07-feedback-neon-vfx-audio*
*Context gathered: 2026-09-20*
