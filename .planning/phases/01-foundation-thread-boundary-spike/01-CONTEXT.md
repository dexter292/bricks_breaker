# Phase 1: Foundation & Thread-Boundary Spike - Context

**Gathered:** 2026-09-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the project's central architectural bet on real hardware and enforce layer boundaries in the repo — before any gameplay code.

Delivers: Expo SDK 57 + EAS `expo-dev-client` project on the pinned matrix; Skia + Reanimated/Worklets + Gesture Handler wired; UI-thread worklet mutating a world object across frames; opaque Skia `SkPicture` harness with ~200–300 dummy sprites holding measured 60 FPS; in-app frame-time overlay; Vitest smoke proving `core/` runs in Node; written/checkable separation of logic, physics, rendering, input, and UI.

Does **not** deliver: collision physics, paddle gameplay, brick logic, power-ups, neon VFX beyond flat dummy sprites, level data, audio, or store packaging beyond what's needed for the spike builds.

</domain>

<decisions>
## Implementation Decisions

### Reference devices
- **D-01:** Primary Android 60 FPS reference device is **Pixel 6a**.
- **D-02:** iOS Phase 1 gate is an available recent **physical iPhone** for install, rendering, touch responsiveness, and stability — Android remains the hard FPS gate.
- **D-03:** Use **dev-client for daily development**; require a **release/profile build on physical hardware** before Phase 1 is marked complete.
- **D-04:** Temporary substitute Android is allowed if Pixel 6a is unavailable. Document exact model, chipset, OS version, display refresh rate, and measured frame times. **Re-certify on Pixel 6a before final MVP acceptance.**
- **D-05:** Never claim the 60 FPS gate passed based on simulator results, dev builds alone, or untested hardware.

### Spike proof surface
- **D-06:** Phase 1 on-device proof is a **minimal FPS harness**: opaque Skia canvas, ~200–300 dummy sprites via `SkPicture`, UI-thread worklet updating a mutable world object, frame-time overlay behind a dev flag.
- **D-07:** Also **ramp sprite count until the frame budget breaks** and record the performance cliff as research — not a Phase 1 completion requirement. Completion target remains ~200–300 sprites at 60 FPS on the reference device (release/profile).
- **D-08:** Overlay displays **ms/frame, rolling FPS, and simulation substep count**. Document the measurement methodology (how FPS is derived, which build, which device).
- **D-09:** Require a **passing Vitest smoke test** proving `core/` can be imported and executed in Node without React Native / Skia / Reanimated dependencies.
- **D-10:** Keep Phase 1 focused on architecture + rendering performance validation. Defer gameplay, collision physics, and advanced visual effects.

### Layer enforcement
- **D-11:** Enforce strict layer boundaries with **ESLint/import rules from Phase 1**. `core/` must not import React Native, Skia, Reanimated, or platform APIs.
- **D-12:** `core/` in Phase 1 is a **pure TypeScript stub** + smoke test only. World modeling and physics land in Phase 2.
- **D-13:** Spike harness lives in **`src/runtime/`** and **`src/render/`**, hosted by a thin Expo **`app/`** screen.
- **D-14:** **Prohibit `runOnJS` and `scheduleOnRN` on the per-frame hot path.** Performance overlay uses shared values without triggering React re-renders every frame.
- **D-15:** No monorepo or extra package abstractions in Phase 1 — keep the architecture simple and enforceable.

### Skia version (locked without discussion — user confirmed research default)
- **D-16:** Use research-recommended **Skia `2.12.0`** (SDK pin override) unless the first hardware build reveals compatibility or performance issues; then fall back to SDK-pinned `2.6.2` and record the decision.

### Toolchain & distribution (locked during plan-phase research gate)
- **D-17:** Use **paid Apple Developer Program** membership for EAS internal distribution to a physical iPhone. Verify signing credentials and provisioning **before** building. Physical iPhone install remains a **mandatory** Phase 1 completion criterion.
- **D-18:** Use **Node 24 LTS** via nvm/fnm. Pin in **`.nvmrc`** and enforce via package **`engines`**. Vitest `core/` smoke test remains a **mandatory** Phase 1 completion criterion.

### Claude's Discretion
- Exact Expo app router screen naming and file layout within `app/` / `src/`
- Overlay visual styling (as long as metrics and methodology are clear)
- Exact ESLint boundary plugin/config choice (must actually fail illegal imports)
- How the cliff-ramp experiment is triggered (dev menu, button, or const) — results must be recorded
- Whether to use `fnm` or `nvm` for Node 24 (must satisfy `.nvmrc` + `engines`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & phase scope
- `.planning/PROJECT.md` — Core value, stack locks, performance/offline constraints, approval gates
- `.planning/REQUIREMENTS.md` — **ARCH-01** (layer separation + worklet-ready sim); PLT-03 informs the measurement ethos
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria
- `.planning/STATE.md` — Current position

### Research (mandatory for this phase)
- `.planning/research/SUMMARY.md` — UI-thread topology, Expo SDK 57 pins, Skia override, measurement pitfalls
- `.planning/research/STACK.md` — Exact package versions, `expo install` rule, Vitest/fast-check, audio note (defer)
- `.planning/research/ARCHITECTURE.md` — Layer map (`core/` / `runtime/` / `render/` / …), worklet host, immediate-mode Skia, Phase 0/1 spike intent
- `.planning/research/PITFALLS.md` — Thread-split, TextureView/opaque canvas, wrong FPS tools, gesture frame-rate trap, worklet mutable state risks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield empty repo (only `.planning/` and `.cursor/rules/gsd.md`)

### Established Patterns
- None in code yet; follow research architecture as the pattern source of truth

### Integration Points
- New Expo app root will own the thin host screen
- Future phases attach physics into `core/`, input into gesture → shared values, gameplay into the same runtime host

</code_context>

<specifics>
## Specific Ideas

- Pixel 6a named as the long-lived Android performance reference through MVP
- Substitute-device documentation is mandatory if used; MVP still re-certifies on Pixel 6a
- Performance cliff discovery is valuable research output alongside the pass/fail harness
- Hot path must stay free of JS bridge hops for overlay updates

</specifics>

<deferred>
## Deferred Ideas

- Gameplay, collision physics, paddle/ball behavior — Phase 2+
- Advanced neon VFX, particles, glow baking — Phase 7
- Monorepo / multi-package layout — not in Phase 1; revisit only if boundaries become unenforceable
- Named iPhone as a second hard FPS gate — not required for Phase 1

</deferred>

---

*Phase: 01-foundation-thread-boundary-spike*
*Context gathered: 2026-09-19*
