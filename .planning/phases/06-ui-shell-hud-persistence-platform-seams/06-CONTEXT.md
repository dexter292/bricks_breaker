# Phase 6: UI Shell, HUD, Persistence & Platform Seams - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The game is wrapped in a real app — title → play, polished HUD, instant retry, offline personal best, safe-area layout across phone sizes, and internal no-op seams for future ads/IAP/accounts.

Delivers: Title screen with Play + Personal Best; Pause / Results with Resume|Retry and Menu back to title; compact semi-transparent top safe-area HUD strip (Score, Combo, Lives, Stall) driven by SharedValue mirrors (not per-frame React); results showing run Score, Best, New Record badge when applicable, prominent Retry, secondary Menu; AsyncStorage (or equivalent) personal-best persistence updated at end of every run (win or lose) without blocking gameplay; playfield letterbox preserved with HUD/overlays inside safe-area insets; `AdService` / `PurchaseService` / `AccountService` (names flexible) as interfaces + no-op stubs with real call sites (e.g. `onRunEnded`) and **no visible** ads/IAP/login UI.

Does **not** deliver: neon VFX / particles / destruction anim / audio (Phase 7); new gameplay mechanics or brick/power-up types; real ad/IAP/account SDKs; store compliance paperwork (Phase 8); hardware 60 FPS re-cert (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### App shell & entry flow (RUN-03 adjacent)
- **D-01:** Cold start lands on a **Title** screen: product name, **Play**, and **Personal Best**.
- **D-02:** **Play** starts (or restarts into) the level; gameplay is not the cold-start default.
- **D-03:** **Pause** overlay: Resume, Retry (instant, no confirm), and **Menu** → Title.
- **D-04:** **Results** (Win/Lose): prominent **Retry** (instant, no confirm), secondary **Menu** → Title.
- **D-05:** Preserve Phase 3 pause/OS rules: AppState auto-pause, accumulator reset, tap Resume then 3s countdown — do not regress.

### HUD polish (SC-2 / SharedValue mirrors)
- **D-06:** Replace Phase 5 free-floating chrome with a **compact top safe-area strip** (semi-transparent background).
- **D-07:** Strip shows **Score**, **Combo**, **Lives**, and **Stall** status when active — must **not** obstruct the playfield (no center overlays for routine HUD).
- **D-08:** HUD values continue via **discrete SharedValue mirrors** + `useAnimatedReaction` / JS mirrors — **never** React state updates every physics frame.
- **D-09:** Stall chrome remains gated to active play (Phase 5 review fix) — do not show Stall! while docked/paused/results unless explicitly useful; prefer hide when not PLAYING.

### Results & high score (RUN-04)
- **D-10:** At **end of every run** (Win **or** Lose), compare run score to stored personal best; if greater, update best **asynchronously**.
- **D-11:** Results screen shows: **Score**, **Best**, **New Record** badge when this run set a new best, large **Retry**, secondary **Menu**.
- **D-12:** Title screen displays current **Personal Best** (read from persistence; refresh when returning to Title).
- **D-13:** Persistence must **not** block the sim/render loop and must **not** introduce per-frame React writes.

### Layout & platform (PLT-02)
- **D-14:** Keep existing **playfield aspect-ratio letterboxing**; do not stretch the virtual field.
- **D-15:** HUD strip and all overlays (Title, Pause, Results) lay out inside **safe-area insets** on notched iPhone and Android.
- **D-16:** Target phone sizes: layout must remain usable across the project’s intended phone range (same spirit as Phase 3 overlays — centered panels, min touch targets ≥44).

### Monetization / account seams (ARCH-02)
- **D-17:** Add **internal interfaces + no-op implementations** for future ads, IAP, and accounts; wire **real call sites** (at minimum an end-of-run hook such as `onRunEnded`).
- **D-18:** **No visible UI** for ads, shop, rewarded continue, or sign-in in Phase 6 — seams are code-only.
- **D-19:** MVP remains fully playable **offline / airplane mode** with zero network dependency for these stubs.

### Claude's Discretion
- Exact Title / HUD / Results visual styling (fonts, spacing, colors) within “clear, compact, non-obstructive neon-arcade-adjacent” — `/gsd-ui-phase 6` should lock the UI-SPEC
- Exact AsyncStorage key schema and migration strategy (single key vs versioned blob)
- Exact service interface method names beyond the seam intent
- Whether Title “Play” loads last level vs fixed Phase 4/8 level pipeline entry (must use existing level load path)

</decisions>

<specifics>
## Specific Ideas

- Priority stated by user: **complete mobile app feel** → clear HUD that does not cover play → **fast Retry** → **offline high score**.
- Monetization/account: “interface nội bộ only” — never show unimplemented product surfaces.
- Persistence: async, non-blocking; keep React off the hot path (aligns with ARCHITECTURE event-ring / SharedValue HUD model).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 6 goal + success criteria 1–5
- `.planning/REQUIREMENTS.md` — RUN-03, RUN-04, PLT-02, ARCH-02
- `.planning/PROJECT.md` — Offline MVP; deferred ads/IAP/accounts; no per-frame React
- `.planning/STATE.md` — Current milestone position

### Prior phase decisions
- `.planning/phases/03-first-playable-render-input-bricks-lives-pause/03-CONTEXT.md` — pause/AppState/countdown; minimal overlays; gesture/UI separation; letterbox
- `.planning/phases/05-run-rules-score-combo-power-ups-anti-stall/05-CONTEXT.md` — Score/combo/Stall SharedValue chrome; Phase 6 owns polish + persistence
- `.planning/phases/05-run-rules-score-combo-power-ups-anti-stall/05-REVIEW-FIX.md` — Stall chrome gated to PLAYING; win-before-lives

### Architecture / pitfalls
- `.planning/research/SUMMARY.md` — UI shell + AsyncStorage high score + platform seams folded in
- `.planning/research/ARCHITECTURE.md` — Services layer; SharedValue HUD; `services/platform/` no-op stubs; menus/cold-path React
- `.planning/research/PITFALLS.md` — No analytics/ads SDKs early; TextureView/HUD z-order; unsigned local scores OK for MVP
- `.planning/research/STACK.md` — Expo / RN shell packages
- `docs/layer-contract.md` — core purity; UI/runtime boundaries

### Existing code
- `app/index.tsx`, `app/_layout.tsx`, `app/_components/GameHost.tsx` — current entry / host
- `src/runtime/GameScreen.tsx` — Score/combo/lives/Stall chrome + overlays
- `src/runtime/overlays/PauseOverlay.tsx`, `ResultOverlay.tsx` — existing Resume/Retry / Win-Lose+Retry
- `src/runtime/appStatePause.ts`, `freeze.ts` — OS pause / freeze
- `src/runtime/useGameLoop.ts` — SharedValue mirrors
- `src/render/GameCanvas.tsx` — playfield canvas (HUD is React siblings today)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PauseOverlay` / `ResultOverlay` — extend with Menu; keep Pressable-only resume/retry (no playfield tap)
- `GameHost` / `GameScreen` / `useGameLoop` — SharedValue → React text mirrors for HUD strip
- `useSafeAreaInsets` already on overlays — reuse for Title + HUD strip

### Established Patterns
- Cold-path React for shell; hot-path Skia + worklets for playfield
- Instant Retry already exists without confirmation — wire through Title/Menu navigation without adding dialogs
- Letterbox camera/playfield from Phase 3 — do not break aspect mapping

### Integration Points
- App entry (`app/index.tsx`) → introduce Title vs Playing screen state
- End-of-run (WON/LOST) → persist best + `onRunEnded` seam + Results content
- Return to Title from Menu → refresh Best display from storage

</code_context>

<deferred>
## Deferred Ideas

- Neon VFX / particles / destruction / screen shake polish — Phase 7
- SFX / audio settings — Phase 7
- Real ads, IAP, accounts, cloud sync — post-MVP
- Showpiece level authoring & store compliance — Phase 8
- Hardware 60 FPS certification — Phase 8
- Visible shop / rewarded-continue / login screens — explicitly out of Phase 6

</deferred>

---

*Phase: 06-ui-shell-hud-persistence-platform-seams*
*Context gathered: 2026-09-20*
