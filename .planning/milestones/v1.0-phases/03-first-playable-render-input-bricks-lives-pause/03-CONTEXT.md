# Phase 3: First Playable — Render, Input, Bricks, Lives, Pause - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A player can hold the phone and play a real rally — relative-drag paddle, docked serve with aimed tap launch, destructible bricks, three lives with clear win/lose, and pause/resume including safe OS-background handling.

Delivers: camera/virtual→device transform + safe-area letterbox; immediate-mode SkPicture layers for playfield entities (flat, basic colors); `Gesture.Pan` → relative `paddleIntent` with snappy gain and minimal smoothing; serve state (ball rides paddle, tap launches with paddle-derived angle); one hardcoded brick grid exercising multi-HP + unbreakable; lives (default 3) + win when last breakable brick dies / lose when lives spent; pause overlay + `AppState` auto-pause with accumulator reset, tap-to-resume then 3s countdown; gesture/UI action separation so paddle pan never accidental-serves or resumes.

Does **not** deliver: level file format/authoring (Phase 4); score/combo/power-ups/anti-stall (Phase 5); polished menus/HUD persistence/high score (Phase 6); neon VFX/audio (Phase 7); showpiece level or hardware FPS re-cert beyond what's needed to play the rally.

</domain>

<decisions>
## Implementation Decisions

### Visual first-playable
- **D-01:** Flat untextured shapes only — no neon glow, particles, trails, or baked glow sprites (those wait for Phase 7).
- **D-02:** Palette: **navy playfield background** + white/light ball and paddle + **row-colored bricks** (basic solid fills). Multi-HP readability via color/brightness differences only in Phase 3 (non-color crack cues can wait for Phase 4 LVL-03 if needed for that phase's criteria).
- **D-03:** Keep the Phase 1 opaque Skia canvas / immediate-mode `SkPicture` path; evolve the blank spike harness into a real playfield renderer (layered by update frequency where practical: static bg, dirty bricks, per-frame dynamics).

### Paddle drag feel (PHYS-01)
- **D-04:** **Relative drag** across the **entire playfield** — record touch-down + paddle x, apply deltas with gain, clamp to arena. **Never teleport** the paddle to the finger on re-press.
- **D-05:** **Snappy arcade** tuning: slightly elevated gain, **minimal** smoothing (reject thumb jitter only — must not feel like syrup). Exact numeric gain/smoothing constants are Claude's discretion within that feel band; expect hardware retune.
- **D-06:** Control must feel responsive on both iOS and Android; no absolute finger-follow, no tilt/gyro.

### Serve & aim launch (PHYS-05)
- **D-07:** On life start the ball is **docked** to the paddle (rides with paddle motion).
- **D-08:** **Tap to launch** — outgoing angle derived from **paddle position / classic paddle-relative mapping** (same family as bounce clamps). No random serve.
- **D-09:** **No aim line** in Phase 3.
- **D-10:** No drag-release aim vector in Phase 3 (tap-only launch).

### Gesture / action separation (hard requirement)
- **D-11:** Touch used to **move the paddle must never accidentally trigger serve or resume**. Gameplay pan and UI/serve/resume actions must be clearly separated (e.g. distinct gesture recognizers, hit targets, and/or mode gates: serve tap only while docked and not paused; resume only via explicit resume control while paused; pan never counts as those taps).
- **D-12:** Planner/researcher must specify a concrete separation scheme that survives simultaneous finger motion and accidental taps on the playfield.

### Pause / background resume (PLT-01)
- **D-13:** Player can **Pause / Resume / Retry** from a **minimal** pause overlay.
- **D-14:** **`AppState` (or equivalent) auto-pauses** on background/blur/interruption; **reset the simulation accumulator** — never catch up a large backlog of physics steps on return.
- **D-15:** After OS interruption (and for resume from pause): require an **explicit tap** (Resume control), **then** a **3-second countdown**, **then** gameplay continues. **Never auto-resume gameplay** after an OS interruption without that tap + countdown sequence.
- **D-16:** Mid-rally background for 60+ seconds must return safely with no physics jump (success criterion).

### Lives, win / lose, bricks (RUN-02)
- **D-17:** Default **3 lives**; clear **lose** when the last life is spent.
- **D-18:** Clear **win** when the last **breakable** brick is destroyed (unbreakable bricks never block win — consistent with Phase 2 D-10).
- **D-19:** Win/lose presentation: **minimal overlay** — “Win” / “Lose” + **Retry** (no fancy results screen; Phase 6 owns polished UI/HUD/persistence).
- **D-20:** **One hardcoded brick grid** in code for Phase 3 — includes multi-HP bricks and some unbreakable/structural bricks. Level format/authoring deferred to Phase 4.

### Claude's Discretion
- Exact gain, smoothing alpha, and dead-zone numbers (must match D-05 feel)
- Exact serve angle mapping from paddle position (must stay consistent with Phase 2 paddle bounce clamps / PHYS-04)
- SkPicture layer split (bg / bricks / dynamics) and camera letterbox math details
- Exact Resume button placement and countdown visual (must satisfy D-11…D-15)
- Hardcoded grid layout density/shape (must be playable and exercise multi-HP + unbreakable)
- Whether spike file names (`SpikeScreen`, `useSpikeLoop`) are renamed to game names in this phase or evolved in place

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & phase scope
- `.planning/PROJECT.md` — Core value; feel mix; offline/performance constraints
- `.planning/REQUIREMENTS.md` — **PHYS-01**, **PHYS-05**, **RUN-02**, **PLT-01**
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria
- `.planning/STATE.md` — Current position; Phase 1 hardware waiver / D-04 debt (does not block Phase 3 playable on simulator, but FPS claims remain constrained)

### Prior phase decisions
- `.planning/milestones/v1.0-phases/01-foundation-thread-boundary-spike/01-CONTEXT.md` — D-11…D-14 layer/hot-path; opaque SkPicture; no `runOnJS` on hot path
- `.planning/milestones/v1.0-phases/02-headless-core-simulation/02-CONTEXT.md` — World SoA, swept collision, paddle bounce, multi-HP/unbreakable API, event ring, determinism
- `docs/layer-contract.md` — LC-* crossings; `core/` purity

### Research (mandatory)
- `.planning/research/SUMMARY.md` — Phase 3 deliverables; immediate-mode render; relative-drag; serve; pause/AppState
- `.planning/research/ARCHITECTURE.md` — Input layer `paddleIntent`; render Picture layers; `lives.ts` / serve state; UI shell overlays
- `.planning/research/FEATURES.md` — Relative drag; docked launch; pause + countdown; anti-features (absolute follow, tilt)
- `.planning/research/PITFALLS.md` — Gesture/frame-rate trap; background accumulator detonation; immediate-mode before first destructible brick; Android opaque/SurfaceView
- `.planning/research/STACK.md` — Gesture Handler, Reanimated `setActive(false)` pause primitive, Skia Picture

### Existing code
- `src/core/` — `stepWorld`, World SoA, brick HP metadata, event ring (consume for destroy/lives transitions as needed)
- `src/runtime/useSpikeLoop.ts` — Frame callback + accumulator host to evolve into playable loop
- `src/render/recordSprites.ts` / `SpikeCanvas.tsx` — Blank navy field → real entity rendering
- `src/runtime/SpikeScreen.tsx` — Thin host screen to wire gestures + overlays

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/` — Full headless sim ready: allocate, step, reset, brick fields, paddle bounce, N-ball pool (one active), event ring
- `src/runtime/useSpikeLoop.ts` — Fixed-timestep accumulator, `MAX_FRAME_TIME` / `MAX_SUBSTEPS`, SharedValue world + picture (blank after Phase 2)
- `src/render/recordSprites.ts` — Worklet PictureRecorder pattern + navy `#1a1a2e` field; extend to draw paddle/ball/bricks
- `src/render/SpikeCanvas.tsx` — Opaque canvas + `<Picture>` consumer
- Dev metrics overlay (optional keep behind flag) — not a Phase 3 success requirement

### Established Patterns
- UI-thread worklet mutates world; one SharedValue picture write per frame
- `core/` pure / `'worklet'`-safe; no React/Skia/Reanimated imports
- Logical 360×640 playfield precedent in core + render

### Integration Points
- Wire `Gesture.Pan` → `paddleIntent` SharedValue consumed by `stepWorld` each substep
- Serve/lives/win-lose state machine: prefer `core/` pure rules where testable; runtime hosts AppState + overlay React UI
- Pause: deactivate frame callback / freeze stepping + reset accumulator on background
- Phase 4 will replace hardcoded grid with level load into the same brick SoA fields

</code_context>

<specifics>
## Specific Ideas

- Priority order stated by user: **gameplay correctness** → **fast smooth paddle** → **easy touch aim/launch** → **safe background pause/resume**
- Graphics stay simple basic colors; neon deferred to Phase 7; advanced win/lose UI deferred to Phase 6
- Resume after interruption: **tap first, then 3s countdown** — never auto-unfreeze into live physics
- Accidental serve/resume from paddle drag is explicitly forbidden (D-11)

</specifics>

<deferred>
## Deferred Ideas

- Level format, validation, migrations, authored layouts, non-color brick damage cues as first-class — Phase 4
- Score, combo, power-ups, multi-ball activation, anti-stall — Phase 5
- Polished menus, HUD event mirrors, high score persistence, safe-area product polish beyond playable letterbox — Phase 6
- Neon VFX, trails, particles, audio/haptics — Phase 7
- Aim line / drag-release serve variants — backlog unless a later phase needs them
- Hardware 60 FPS re-cert (Pixel 6a / physical iOS) — MVP debt from Phase 1 waiver

</deferred>

---

*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Context gathered: 2026-09-20*
