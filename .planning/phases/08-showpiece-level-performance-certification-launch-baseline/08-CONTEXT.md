# Phase 8: Showpiece Level, Performance Certification & Launch Baseline - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

One authored ~2–3 minute neon arcade challenge level (LVL-04), certified 60 FPS on real hardware including worst-case multi-ball + particles + shake (PLT-03), plus store-compliance baseline artifacts with a live public HTTPS privacy policy (PLT-04).

Delivers: hand-authored `level-03` showpiece with three-act escalation and plateaus; device quality tiers (Low/Mid/High) capping particles/trails/glow outside `core/`; reproducible Mid-tier Pixel 6a certification closing Phase 7 gfxinfo debt; DEV soak harness (100 Title↔Playing + 15 min play) with lifecycle assertions; privacy policy URL + in-repo Play Data Safety / age rating / iOS privacy manifest / name clearance / originality docs.

Does **not** deliver: new gameplay mechanics; ad/IAP SDKs or real monetization; production level-select UI; store listings; TestFlight / Play test-track submit; music / haptics / combo-tier juice (v2).

</domain>

<decisions>
## Implementation Decisions

### Showpiece level feel (LVL-04)
- **D-01:** Escalation uses **three distinct acts** with **short difficulty plateaus** between acts: Act 1 accessible opening → Act 2 denser multi-HP middle → Act 3 challenging final pocket shaped by **unbreakable** bricks that rewards skillful paddle control (not luck).
- **D-02:** Target **~2–3 minute successful run** through layout density and playtesting only — no new mechanics.
- **D-03:** Keep Phase 5 **~20% power-up drop rate** and existing **multi-ball / paddle-expand** only. **No level-specific drop rules** in Phase 8.
- **D-04:** Preserve **deterministic physics**; Act 3 must not depend on lucky power-up RNG for fair clears.

### Level identity & boot path
- **D-05:** Create **`assets/levels/level-03.json`** as the MVP showpiece. Leave **`level-01` / `level-02` unchanged** as regression fixtures.
- **D-06:** Title → Play loads **`level-03` by default**. No production level-selection UI.
- **D-07:** Provide a **development-only** level switch for `level-01` / `level-02` (and showpiece). Must be **unavailable in production** builds.
- **D-08:** All three levels share the **same validate → compile → gameplay pipeline** — no level-specific physics or rendering branches.

### Device quality tiers
- **D-09:** Three tiers: **Low / Mid / High**. **Mid** is the Pixel 6a certification baseline. Low reduces particle count, trail length, and glow intensity. High enables maximum visual quality within a bounded budget.
- **D-10:** **Automatic** initial tier from device capabilities; **default conservatively** when hardware info is insufficient.
- **D-11:** **`__DEV__`-only** force override for Low/Mid/High. Production uses auto selection only — **no settings UI**.
- **D-12:** Quality-tier logic lives entirely in **render/VFX** (and related RN/runtime wiring). **`core/` must not read** device capabilities or tier.
- **D-13:** If Mid fails the 60 FPS gate on Pixel 6a: **optimize rendering or retune tier budgets and re-certify**. Do **not** silently map the reference device to Low and claim Mid certification.

### 60 FPS certification protocol (PLT-03)
- **D-14:** Gate scene = **scripted, reproducible worst-case on `level-03`**: maximum active balls, peak particle bursts, overlapping camera shake; **fixed measurement window**; document exact conditions (extends Phase 7 VFX worst-case definition).
- **D-15:** **Pixel 6a + Mid tier + profiling build** is the **mandatory** Android 60 FPS gate. ≥2 runs of ≥30 s; evaluate the **worse** result against existing p95 / frame-time / jank thresholds in `docs/measurement-methodology.md`. Close Phase 7 Pixel gfxinfo Results debt here.
- **D-16:** **Physical iPhone required**: Instruments performance report plus render / touch / stability verification. Installation alone is **not** iOS performance evidence.
- **D-17:** Substitute Android (D-04) allowed for **preliminary** measurements only; **Pixel 6a re-certification remains mandatory** before declaring MVP complete.
- **D-18:** On gate failure: optimize and **rerun the same certification scenario**. Do **not** lower Mid targets or disable required effects solely to obtain a pass. RN perf monitor alone remains invalid.

### Soak / leak test
- **D-19:** Automate **100 Title ↔ Playing** mount/unmount cycles, then a **15-minute** continuous gameplay session on a **physical device** with a **profiling** build.
- **D-20:** Automated checks must verify release of game loops, worklets, listeners, timers, and audio after unmount — **no duplicate simulation ticks or event subscriptions**.
- **D-21:** Record **memory** and **frame-time** at start and end of the soak session. Fail on sustained memory growth, progressive frame-time degradation, crashes, or unresponsive controls.
- **D-22:** Add automated lifecycle / pool-reset assertions where feasible; **final device soak + performance review remain mandatory manual acceptance gates**.
- **D-23:** Soak harness is **development-only** — must not affect production gameplay or add work to the per-frame hot path.

### Store compliance baseline (PLT-04)
- **D-24:** Publish a **short, accurate** privacy policy at a **public HTTPS URL** (simple static hosting). Document MVP reality: offline gameplay, local high-score storage, **no ads / IAP / user accounts**. Verify Expo, dependency, and platform data practices before finalizing.
- **D-25:** Prepare **in-repo** artifacts: iOS privacy manifest, Google Play Data Safety + age-rating documentation, app name clearance notes, asset originality attestation — reflecting the **actual production build**.
- **D-26:** Phase 8 does **not** create store listings or submit to TestFlight / Play testing tracks.
- **D-27:** Do not mark PLT-04 complete while any required artifact or live-URL verification remains outstanding.

### Claude's Discretion
- Exact brick layouts / row counts / unbreakable pocket geometry within the three-act + plateau feel
- Exact Low/Mid/High numeric budgets (particle/trail/glow) as long as Mid certifies on Pixel 6a and High stays bounded
- Device-capability heuristic details (which signals, thresholds) as long as D-10/D-13 hold
- Exact scripted worst-case trigger implementation (dev command vs in-level fixture) as long as D-14 is reproducible and documented
- Privacy policy hosting provider and markdown/HTML packaging within D-24
- Exact filenames/layout under `docs/` for store paperwork as long as D-25/D-27 are satisfiable

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 8 goal + success criteria 1–5
- `.planning/REQUIREMENTS.md` — LVL-04, PLT-03, PLT-04
- `.planning/PROJECT.md` — Arcade feel; Pixel 6a bar; neon never steals clarity/frame time
- `.planning/STATE.md` — Milestone position; Phase 8 next

### Measurement & Phase 7 debt
- `docs/measurement-methodology.md` — Profiling build; gfxinfo/Instruments; session hygiene; Pixel 6a gate (D-01/D-05)
- `docs/phase7-vfx-measurement.md` — VFX-on worst-case checklist; package id; Phase 7 Results debt → Phase 8
- `docs/device-gate-results.md` — Prior device-gate recording pattern
- `docs/layer-contract.md` — Layer boundaries (`core/` isolation)

### Prior phase decisions
- `.planning/phases/01-foundation-thread-boundary-spike/01-CONTEXT.md` — Pixel 6a (D-01); substitute D-04; measurement D-05
- `.planning/phases/04-level-format-brick-types/04-CONTEXT.md` — Versioned JSON row-strings; validate→compile; no hot-path parse
- `.planning/phases/05-run-rules-score-combo-power-ups-anti-stall/05-CONTEXT.md` — Score/combo; ~20% drops; multi-ball / expand
- `.planning/phases/06-ui-shell-hud-persistence-platform-seams/06-CONTEXT.md` — Title → Play; personal best; platform seams no-op
- `.planning/phases/07-feedback-neon-vfx-audio/07-CONTEXT.md` — VFX SoA; intensity; soft-fail audio; quality tiers deferred to Phase 8

### Expo (versioned)
- https://docs.expo.dev/versions/v57.0.0/ — SDK 57 APIs (project mandate)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/runtime/loadLevel.ts` — `LevelId` currently `'level-01' | 'level-02'`; Metro static requires; extend with `level-03` and default Play to showpiece
- `assets/levels/level-01.json`, `level-02.json` — Format proofs; keep unchanged as regression fixtures
- `app/_components/PlayingHost.tsx` — Level load + existing DEV level toggle between 01/02; retarget default + production-hide switch
- `src/vfx/types.ts` + particle/trail/shake SoA — Already accept caps; natural place for tier budgets
- `src/runtime/useVfxIntensity.ts` — Global intensity scalar; interact carefully with tier caps (tier caps hard limits; intensity dampens within)
- `docs/phase7-vfx-measurement.md` — Starting point for scripted Mid-tier certification scene

### Established Patterns
- Cold-path JS validate/compile → `SharedValue<CompiledLevel>` → UI-thread sim (D-11…D-15 from Phase 4)
- Cosmetic VFX only; `core/` blind to render quality (Phase 7 D-02)
- Soft-fail audio / optional native modules (Phase 7 D-24)
- Platform seams already no-op for ads/IAP (Phase 6) — do not wire real SDKs

### Integration Points
- Title → Play boot: change default `loadLevelById` / PlayingHost initial `levelId` to `level-03`
- Quality tier: resolve once on RN/runtime → pass numeric caps into VFX create/step; never into `core/`
- Certification harness: DEV-only scripted worst-case + soak driver; document Results in `docs/`
- Store baseline: privacy URL + repo docs/manifest; no EAS submit in this phase

</code_context>

<specifics>
## Specific Ideas

- Product priority called out at discuss start: engaging ~2–3 min neon showpiece first; **real-device 60 FPS cert is a hard MVP gate**; Phase 8 = quality / perf / soak / store baseline only — **no new gameplay, no ad/IAP SDKs**.
- Act 3 “boss pocket” shaped by unbreakables should force angled play and reward paddle skill.
- Mid-tier failure must trigger optimize/retune — never silent downgrade of the reference device.

</specifics>

<deferred>
## Deferred Ideas

- Production level-select UI / campaign progression beyond single showpiece
- Real ad / IAP SDK integration and store submit (TestFlight / Play tracks)
- Music, haptics, combo-tier escalating juice (v2 FX items)
- User-facing quality settings UI (production)

None of the above belong in Phase 8.

</deferred>

---

*Phase: 08-showpiece-level-performance-certification-launch-baseline*
*Context gathered: 2026-09-21*
