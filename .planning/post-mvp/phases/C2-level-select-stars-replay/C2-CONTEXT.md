# Phase C2: Level Select + Stars + Replay - Context

**Gathered:** 2026-09-24  
**Status:** Ready for planning  
**Source:** `/gsd-discuss-phase` (areas 1, 3, 4, 5, 6; area 2 skipped)

<domain>
## Phase Boundary

Player-facing campaign progression chrome on top of C1 ProgressStore: **level select** with lock/unlock (N-LVL-02), **stars 1–3** with durable best (N-PROG-03 — lives-based in C2), and **replay** of cleared levels plus **Next** after win (N-PROG-04). Acceptance: unlock / replay / stars correct for the **5** playable LevelIds (`01→03→04→05→06`).

**Delivers:**
- `ShellPhase` adds `'select'`; Title → Select → Playing; Playing unmounts when leaving play
- Progress blob **v3**: `bestByLevel[id] = { score, stars }`; migrate v1→v3 and v2→v3
- Pure star formula on win: `stars = clamp(livesRemaining, 1, 3)`; persist `max(stored, computed)`
- Results: win = Retry + Next + Menu (Next gated); lose = Retry + Menu; stars on win Results
- Select list: lock / uncleared / cleared states; stars + best on cleared
- `levelId` required into PlayingHost; bake-gate invariant on every level change path
- Docs: progress ops + soak note (harness skips Select); req wording N-PROG-03 / E2 handoff
- Unit/UI tests: migrate; star pure; setActive-last after levelId change; select mount refresh

**Does not deliver:**
- Lock chrome polish / toast / locked preview (area 2 skipped — ignore tap)
- Score-band star thresholds (E2 / N-CNT-02)
- Chapters, thumbnail art, cloud sync
- Aimed serve (B0 Won’t-Do)
- A1 ceiling measurement itself (plan must schedule **one** re-run **after** C2 chrome lands — RELEASE-GATES §6)

</domain>

<preconditions>
## Preconditions & sequencing (R-28)

- **C1 device UAT** must pass (or run in parallel and **block v3 migration / C2 ship** until approved). Do not write `@nbb/progress/v3` migration on an unverified v2 substrate.
- C2 touches **level load** three more times (select → play, Next, session start). R-24 / blank playfield lived on that path — bake gate is a phase invariant, not a nice-to-have.
- After C2, **one** iOS ceiling Cert WC re-run (cheaper than measuring twice). Confirm cert harness still arms **before** that measurement session.

</preconditions>

<decisions>
## Implementation Decisions

### Preconditions / harness law
- **D-01:** Both CERT and SOAK drive `shellPhase` directly; **new phases must not be inserted into harness paths**. Cert (`GameHost` initial phase) and soak (`setShellPhase('playing'|'title')`) stay Title↔Playing; document soak intentional Select skip in `docs/ops/SOAK-PHYSICAL.md`.
- **D-02:** Every `levelId` change path ends with bake → `fxReady` → gate `setActive(true)`. **No path** calls `setActive(true)` itself (same as `toggleDevLevel`).
- **D-03:** Behavioral test: after Next / select start / DEV toggle, `setActive(true)` is the **last** call (mock `useGameLoop`, fake timers — no Skia).

### Stars schema (N-PROG-03 storage)
- **D-04:** Bump to **`v: 3`**; `bestByLevel[id] = { score: number; stars: 1 | 2 | 3 }` — single source of truth (not parallel maps, not separate key).
- **D-05:** Migration tests: **v1→v3** and **v2→v3** preserve `unlocked` + score values (v2 number → `{ score, stars: 0 or omit until win }`); corrupt v3 → defaults; do **not** erase watermark incorrectly.
- **D-06:** Schema locks **shape** for richer formulas later; E2 may change star **criteria** without another schema bump if still 1–3.

### Stars criteria & persist
- **D-07:** On **win only**: `computed = clamp(livesRemaining, 1, 3)`; `storedStars = max(prev, computed)`. Lose does not write stars.
- **D-08:** Formula is pure from World/chrome at win (`lives` + outcome) — no RNG, wall-clock, or UI settings (golden-replay safe).
- **D-09:** Amend **N-PROG-03**: lives-based in C2; score bands deferred to **E2** (N-CNT-02). Rationale: max scores differ ~3× across levels; global T2 unfair; per-level thresholds = tuning without playtest (A3 0/5).

### Stars surfaces
- **D-10:** Show stars on **Select + Results** (win). Select reads fresh snapshot on each mount; Results uses blob returned from `handleRunEnded` after write (avoid dual async reads racing the same event).

### Results / replay (N-PROG-04)
- **D-11:** Win: **Retry + Next + Menu**. Next visible iff `nextLevelId(cleared)` exists **and** that id is unlocked. Final level (`level-06`): **Retry + Menu only** — no disabled Next.
- **D-12:** Lose: **Retry + Menu** only (no Next).
- **D-13:** Next stays in the **same PlayingHost**: mirror `toggleDevLevel` reset checklist exactly, including `runEndedRef.current = false`, then `setLevelId(next)` only — gate arms; never `setActive(true)` here.

### Session start / levelId plumbing
- **D-14:** Title **Play → Select**. Playing receives **required** `levelId` prop (no play-path fallback to `'level-03'`).
- **D-15:** Four call sites to name in plans:
  1. `PlayingHost` `useState('level-03')` → required prop / controlled from GameHost
  2. `loadLevel` default param → remove
  3. Cert gate forcing `level-03` → **keep**; add verify-arm step after change (before A1 re-run)
  4. `GameHost` cert initial `'playing'` → must continue to **bypass Select**
- **D-16:** After default/play-path change, cert sessions always hit defer+remount branch — plan includes one cert arm smoke before measurement.

### Level select UI (N-LVL-02)
- **D-17:** `ShellPhase = 'title' | 'select' | 'playing'`. Select is its own React screen; **Playing unmounts** when leaving play (Menu/Back path tears down worklets/atlas).
- **D-18:** Vertical **list of 5** rows (catalog order). Unlocked cleared row: label + ★★★ + best. Three states:
  | State | Display |
  |-------|---------|
  | Locked | lock affordance; no best/stars |
  | Unlocked, never cleared | label + ☆☆☆; **no** “Best 0” |
  | Cleared | label + earned stars + best score |
- **D-19:** Select has **Back → Title**. Tap unlocked row → `playing` + that `levelId`.
- **D-20:** Select **`getSnapshot()` on every mount** — no cached progress across visits.
- **D-21:** Locked tap = **ignore** (no toast, no preview, no load).

### Claude's Discretion
- Exact Select/ResultOverlay styling within existing navy/flat chrome language
- Whether `stars: 0` vs omitting key means “never cleared” (must match three-state table; prefer omit / no entry until first win)
- Exact TypeScript helpers (`computeStars`, `recordLevelBest` signature evolution)
- Whether DEV level chip remains beside Select or stays on Playing only

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Post-MVP scope
- `.planning/post-mvp/ROADMAP-NEXT.md` — Phase C2 goal / acceptance
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-LVL-02, N-PROG-03 (amended), N-PROG-04; N-CNT-02 owns later star tuning
- `.planning/post-mvp/PRODUCT-DIRECTION.md` §5 — progression layers (stars later enriched)
- `.planning/post-mvp/RELEASE-GATES.md` §6 — cert re-run when render surface / budgets change
- `.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md` — unlock catalog; D-12/D-13 deferred into this phase

### Ops & debt
- `docs/ops/PROGRESS-STORAGE.md` — catalog order, unlock-on-win (extend for v3 + stars)
- `docs/ops/SOAK-PHYSICAL.md` — add intentional Select skip note
- `docs/audit/DECISIONS-2026-09-24.md` / playfield blank lessons — R-24 / R-28 stacking risk

### Code (integration)
- `app/_components/GameHost.tsx` — `ShellPhase`, cert init, soak `setShellPhase`
- `app/_components/PlayingHost.tsx` — bake gate, `toggleDevLevel`, `handleRunEnded`, cert `level-03` force
- `src/runtime/overlays/ResultOverlay.tsx` — Retry/Menu buttons
- `src/services/storage/types.ts` — ProgressBlob v2 → evolve to v3
- `src/services/storage/catalog.ts` — `PLAYABLE_LEVEL_ORDER`, `nextLevelId`
- `src/runtime/loadLevel.ts` — remove default LevelId param

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressStore` / `getSnapshot` / `isUnlocked` / `unlockAfterClear` / `recordLevelBest` (C1)
- `PLAYABLE_LEVEL_ORDER` + `nextLevelId`
- `toggleDevLevel` reset sequence — **template for Next**
- `TitleScreen` / `ResultOverlay` button patterns

### Established Patterns
- Fail-soft parse → defaults; async non-blocking writes; Title PB rollup
- `fxReady` derived from `bakedKey === loadKey`; gate effect owns `setActive(true)`
- CERT/SOAK bypass normal UX entry

### Integration Points
- GameHost shell phase machine + progress preload for Title best
- PlayingHost end-of-run → store write → Results props
- Select mount → snapshot → list rows

</code_context>

<specifics>
## Specific Ideas

- Max score table (combo=1) used to reject global score bands in C2: 01≈2150 … 03≈6370 (~3×). Document in reqs / ops when amending N-PROG-03.
- Next without Retry would break mastery under lives-only stars + best-stars max.
- `handleRunEnded` should return updated blob (or stars/best fields) for Results; Select refreshes on mount only.

### Next reset checklist (must match toggleDevLevel)
```
setResult(null); setIsNewRecord(false); runEndedRef.current = false;
setLives(3); setScore(0); setCombo(1); setStallTier(0);
setSimPhaseNum(SIM.DOCKED); setUiPhase('playing');
clearCountdown(); setCountdownNumeral(null);
setLevelId(next);  // gate arms — DO NOT setActive(true)
```

</specifics>

<deferred>
## Deferred Ideas

- Area 2 lock chrome / toast / preview
- Score-band / per-level star thresholds → **E2** (N-CNT-02)
- Chapters / worlds (FC-L05)
- Thumbnail art for select (FC-L02 art creep)
- Cloud sync / accounts
- Measuring ceiling twice — do **one** re-run after C2

</deferred>

---

*Phase: C2-level-select-stars-replay*  
*Context gathered: 2026-09-24 via discuss-phase*
