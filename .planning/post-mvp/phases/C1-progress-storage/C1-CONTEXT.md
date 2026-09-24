# Phase C1: Progress Storage & Unlock Model - Context

**Gathered:** 2026-09-24  
**Status:** Ready for planning  
**Source:** PRD Express Path (REQUIREMENTS-NEXT + ROADMAP-NEXT) — owner skipped A3; next milestone C

<domain>
## Phase Boundary

Offline campaign progress for the **5 playable LevelIds** (`level-01`, `03`–`06`): unlock chain, per-level best score, durable across app kills. Extends existing personal-best storage into a **v2 progress blob** without blocking the sim/render loop.

**Delivers (N-PROG-01, N-PROG-02):**
- Storage schema v2 (migrate from `@nbb/personal-best/v1` or coexist cleanly)
- First level unlocked by default; clearing a level unlocks the next in catalog order
- Per-level best score recorded at end of run (win **or** lose if score > stored)
- Global personal best remains available for Title (derive from max per-level or keep dual field)
- Unit tests for migrate / unlock / persist fail-soft parse
- Docs for catalog order + unlock rules

**Does not deliver (this phase):**
- Level select UI / stars / replay chrome (**C2** — N-LVL-02, N-PROG-03, N-PROG-04)
- Aimed serve (**B0 Won’t-Do** after A3 skip)
- Rename / brand surfaces (**N-BRAND-*** still TBD)
- Sentry DSN verify (**N-OPS-01** deferred)
- E1b verb-teaching layout retouches (parallel later)
- Cloud sync, accounts, daily challenge

</domain>

<decisions>
## Implementation Decisions

### Catalog & unlock (N-PROG-01)
- **D-01:** Playable catalog order (locked): `level-01` → `level-03` → `level-04` → `level-05` → `level-06`. `level-02` remains **non-playable** negative fixture only.
- **D-02:** `level-01` is always unlocked. Clearing level *i* unlocks the next id in that order (not by numeric filename).
- **D-03:** Unlock is permanent offline (survives kill/reinstall only if AsyncStorage persists; same fail-soft memory fallback as PB today).
- **D-04:** Win (`SimPhase.WON`) is the only event that unlocks next. Lose does **not** unlock.

### Per-level best (N-PROG-02)
- **D-05:** On every run end (WON or LOST), if `score > bestByLevel[id]`, update that level’s best asynchronously.
- **D-06:** Results overlay can show **this level’s** best (wire data in C1; chrome polish may land with C2 if Results already has a single Best — extend to per-level when active level is known).
- **D-07:** Title “Personal Best” = max of per-level bests (or explicit `bestScore` rolled up on write) so existing Title copy stays honest.

### Storage v2
- **D-08:** New key e.g. `@nbb/progress/v2` (or bump under versioned blob). Migrate: if only v1 PB exists, seed global best and leave unlocks at default (`level-01` only).
- **D-09:** Fail-soft parse (corrupt → defaults); never throw into gameplay.
- **D-10:** Writes async / non-blocking; optional `flush` on AppState background (mirror F-26 PB pattern).
- **D-11:** No per-frame React or storage reads on the hot path.

### Out of scope locks
- **D-12:** Stars criteria (**N-PROG-03**) deferred to **C2**.
- **D-13:** Level select UI deferred to **C2**.
- **D-14:** Do not change serve to aimed (B0 Won’t-Do).

### Claude's Discretion
- Exact TypeScript shape of the v2 blob (fields beyond unlocks + bestByLevel + schema version)
- Whether active LevelId is plumbed through GameHost now or stubbed for C2
- Whether Results “Best” switches to per-level in C1 or C2 if wiring is trivial

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Post-MVP roadmap & requirements
- `.planning/post-mvp/ROADMAP-NEXT.md` — Phase C1 / C2; A3 SKIPPED; B0 Won’t-Do
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-PROG-01, N-PROG-02; N-LVL-01 catalog
- `.planning/post-mvp/PRODUCT-DIRECTION.md` — offline arcade; 5-level campaign
- `.planning/post-mvp/RELEASE-GATES.md` — G2 progression expectations if listed

### Existing storage & runtime
- `src/services/storage/types.ts` — `PERSONAL_BEST_KEY` / v1 blob
- `src/services/storage/asyncStorageStore.ts` — AsyncStorage + memory fallback
- `src/services/storage/parseBlob.ts` — fail-soft parse
- `src/runtime/loadLevel.ts` — `LevelId` union + bundled modules
- `app/_components/PlayingHost.tsx` / Results overlay — end-of-run hooks

### Prior phase patterns
- `.planning/phases/06-ui-shell-hud-persistence-platform-seams/06-CONTEXT.md` — offline PB, non-blocking writes
- `.planning/post-mvp/phases/E1a-baseline-authorship/SUMMARY.md` — five ship levels landed

</canonical_refs>

<specifics>
## Specific Ideas

- Owner 2026-09-24: skip A3 cohort; continue roadmap with GSD plan for next phase → **C1**.
- Keep sim pure: progress I/O stays in `src/services/` + app/runtime hosts only.

</specifics>

<deferred>
## Deferred Ideas

- C2: level select, stars 1–3, replay UX
- N-BRAND-01 display name
- N-OPS-01 Sentry dashboard verify
- E1b layouts teaching explosive / new power-ups
- B0 aimed serve (Won’t-Do)

</deferred>

---

*Phase: C1-progress-storage*
*Context gathered: 2026-09-24 via PRD Express Path (owner skip A3)*
