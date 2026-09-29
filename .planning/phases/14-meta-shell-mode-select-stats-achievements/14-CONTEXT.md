# Phase 14: Meta Shell — Mode Select, Stats & Achievements - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

**The three modes and the player's record become reachable and legible from the shell.**

Nothing here is a new capability. Endless (phase 11), daily (phase 12), the v4 telemetry blob
(phase 09) and the achievement catalog (phase 13) all ship and all work. What is missing is the
shell: endless and daily are reachable **only through the `__DEV__` dev row**, and no screen reads
telemetry or the unlocked set at all.

The code says so itself, at the two dev controls this phase deletes:

> `D-05: TEMPORARY. Endless has no production entry this phase — Phase 14`
> `12-01 / N-UI-01: TEMPORARY, exactly like the Endless control it sits beside. Daily has no
> production entry this phase — Phase 14 ships the real Title route`

**In scope:** Title mode entries, the daily played-today signal, a statistics screen, an
achievements screen, deleting the two temporary dev controls, and the `maxFontSizeMultiplier`
lever D-18 deferred to this phase.

**Out of scope:** any new game mode, any new achievement, any change to what telemetry records,
tiering or rewards for achievements (D-09 rejected it), cloud sync or social comparison
(PROJECT.md rules the category out).

</domain>

<decisions>
## Implementation Decisions

### Mode entry points

- **D-01:** **Three mode entries live directly on Title.** `TitleScreen` becomes
  Brand → `Best · N` → Campaign / Endless / Daily. Campaign keeps `SelectScreen` behind it;
  Endless and Daily enter a run directly. Fewest screens and fewest taps to the daily, which is
  what a play-once-a-day mode needs. Rejected: a separate mode-select screen (costs the daily a
  tap every day and adds a shell layer) and mode tabs on `SelectScreen` (turns a 288-line level
  list into a three-role screen and introduces a tab pattern this shell does not have).

- **D-02:** **Stats and Achievements are two secondary entries on Title**, below the three modes
  and presented smaller — playing is primary, reviewing is secondary. One screen each, one level
  deep, `Back` always returns to Title. No icons, no corner affordances, no new chrome.

- **D-03:** **Title is budgeted to fit at 320×568 and never scrolls.** The same rule
  `12-UI-SPEC.md` set for the result panels: a control the player cannot reach is a defect, not
  cosmetic overflow. Title now carries seven rows (Brand, Best, three modes, two secondary
  entries) and the phase UI-SPEC must budget them against the **measured** 548 pt usable and pick
  `maxFontSizeMultiplier` so the set fits — which is precisely the lever WINDOWS #29 has been
  waiting for. — **Reversibility:** costly — the budget is what decides how many rows Title may
  carry; loosening it later means re-deciding the whole Title composition, and adding a row after
  the multiplier is picked can push a mode entry off a small screen.

- **D-04:** **`Menu` after a run always returns to Title**, keeping the shipped behaviour
  (`GameHost.tsx`, `onMenu={() => setShellPhase('title')}`). One return path for all three modes,
  the shell remembers no entry route, and therefore no new shell state exists for a run to survive
  in — which is how SC-5 is satisfied structurally rather than by a check. Rejected: returning to
  where you came from, because remembering the route is exactly the state D-01 of phase 11 pushed
  `'select'` out of the run path to avoid.

### The daily entry

- **D-05:** **The Daily entry shows status plus streak.** `Daily` when today is unplayed;
  `Daily · done · Streak {n}` once played. N-UI-01 requires only the played/unplayed fact, but the
  streak is what brings a player back and is the value phase 12 spent the most effort getting
  right (D-16's amended ceiling, `currentStreakStart`, `assert-streak-evidence.mjs`).

- **D-06:** **Tapping Daily on an already-played day opens the stored result panel**, through
  D-02's shipped read-only branch in `startDailyRun` — score, streak, days played and the
  countdown rendered from the record, no board generated, nothing written. **One renderer for one
  truth**, which is the defect family `12-UI-SPEC.md` was written against: a second read-only
  screen could disagree with the first and no test would say which is right. Rejected: disabling
  the entry (throws away the shipped branch and the player cannot review their score) and a
  separate record screen (a second renderer).

- **D-07:** **Title says nothing about a broken streak.** It shows only the current streak, which
  is 1 or 0 after a break and says it on its own. The daily result panel already carries the
  streak-ended line at the moment it means something; repeating it on Title would re-open a loss
  on every launch.

### The achievements screen

- **D-08:** **Every entry shows its condition. Nothing is hidden.** All twelve are pursuable goals
  with no secret to spoil: five cumulative counters (`1000 Bricks`, `50 Runs`, `100 Pickups`,
  `25 Clears`, `20 Endless`), four skill thresholds (`25x Combo`, `60 Rally`, `12 Cascade`,
  `Wave 10`), two play-style conditions (`Flawless Clear`, `Perfect Daily`) and one commitment
  target (`7 Day Streak`). SC-3's clause is **conditional** — "locked entries do not spoil the
  condition *where that would ruin the surprise*" — and that condition does not arise for this
  catalog. **Where the rule lives if it ever does:** a future entry whose value is the discovery
  itself needs a per-entry hidden flag, and this decision is the reason there is not one today.
  Showing conditions also serves D-11: a player can only tell you a threshold is wrong if they can
  see it, and all twelve are still unreviewed judgements.

- **D-09:** **No progress display on locked entries — locked/unlocked only.** The catalog keeps
  SC-1's shape: `id` + `name` + `description` + one pure predicate. The screen reads the stored
  unlocked set and the catalog and nothing else — no new catalog field, no twelve progress
  functions, and **no way for a progress number to drift from the predicate it describes**, which
  is the two-expressions-of-one-rule defect this project has hit repeatedly (`certLevelPlan.ts`
  records it; phase 13's shared classifier exists because of it). The statistics screen sitting
  one entry away already shows the counters themselves.

- **D-10:** **Catalog declaration order, no grouping.** The same rule phase 13 made contract for
  the result panel (`13-UI-SPEC.md` § Ordering is contract). One order for both surfaces, the list
  never re-sorts when an entry unlocks, and the catalog author still decides what comes first.
  Rejected: unlocked-first (the list re-sorts on every unlock, so an entry's position is not
  stable) and most-recent-first — **measured on device 2026-09-29**, a D-04 retroactive flood
  stored seven entries sharing **one** `at` value, so order within a flood is arbitrary. That
  measurement is why phase 13 refused a recency sort and it applies here unchanged.

### Unseen unlocks — WINDOWS #35 / code review WR-03

- **D-11:** **An unlocked entry the player was never told about is marked, and the mark clears
  once seen.** This closes the obligation phase 13 handed forward: `handleMenuPress` records a run
  as `abandoned`, which evaluates and stores the unlock, then calls `onMenu()` and navigates away
  — and under D-02 the delta is one-shot, so it can never fire later. The phase-13 verifier
  measured **7 of the 12 entries as crossable on an abandoned run**, in all three modes, because
  `mergeRunIntoTelemetry` increments `runsPlayed` unconditionally. Without a mark, those unlocks
  are indistinguishable from every other unlocked entry and the goal's verb — *tells them* —
  stays unmet. — **Reversibility:** one-way — it adds a persisted field to the v4 blob, so undoing
  it means either leaving dead data on every device or writing a migration that removes it.

- **D-12:** **"Seen" means announced on a result panel OR present when the achievements screen was
  opened.** `recordRunEnd` returns the delta and the panel renders it, so those entries have
  genuinely been seen and are marked at that moment; opening the screen marks everything else.
  This is the exact sense of "never announced" that #35 names, so the mark appears only in the case
  that was being missed — in practice, almost always an abandoned run. Rejected: marking only on
  screen-open, which would label as "new" something the player read half a minute earlier.

- **D-13:** **Unlocks that predate the field are treated as already seen.** True for real players
  in the overwhelming majority of cases — most were announced on a panel — and wrong in the
  **less harmful direction**: the worst outcome is missing a mark on an entry earned on an
  abandoned run before this phase, rather than labelling as "new" a dozen entries the player has
  already read, which would empty the mark of meaning on first open.

- **D-14:** **The seen-state is an additive v4 field and takes no `PROGRESS_VERSION` bump**,
  following exactly the shape D-13 of phase 13 established for `telemetry.achievements`: a v4 blob
  written before the field existed parses with `status: 'ok'` and the field defaulted. Verified on
  device 2026-09-29 — a real pre-phase-13 blob gained `achievements` with `v` still 4. The read
  path owes the same treatment: bounded, degrading alone, and dropping an unknown id.

### The statistics screen

- **D-15:** **Lifetime block plus a per-level table**, and two rows for endless and daily. Reads
  `telemetry.lifetime` and `telemetry.byMode` directly — nothing is derived, so there is nothing
  to recompute per frame, which is N-STAT-03's whole requirement. `recentRuns` is **deliberately
  not rendered this phase**; it is the surface `RUN_LOG_LEVEL_ID_MAX` was added for on
  2026-09-29, so it is safe to render later, but it would make this a third long screen needing
  scroll and D-03 has just budgeted against that.

### Claude's Discretion

Three things the owner explicitly left to me, recorded so the planner does not re-open them:

- **Navigation structure for SC-5.** D-04 already removes the mechanism (no remembered route), so
  the remaining work is keeping `PlayingHost` mounted only while `shellPhase === 'playing'` — the
  shipped invariant — as two new screens join the router. The new screens must not be able to
  hold a run.
- **The `maxFontSizeMultiplier` lever (D-18 / WINDOWS #29).** The three shipped components it
  touches are this phase's to change. Note the measurement trap recorded in #29: the panel
  **height** ratio is not the **text** multiplier a spec quotes, because fixed padding and button
  chrome do not scale. Project with absolute per-row growth.
- **How telemetry is read without recomputing per frame.** The stores already hand out a deep
  clone via `getSnapshot`; the pattern `GameHost` uses for `best` — read once on title mount — is
  the analog.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### This phase's scope and requirements
- `.planning/ROADMAP.md` § Phase 14 — the goal and SC-1..SC-5, verbatim
- `.planning/REQUIREMENTS.md` — `N-STAT-03`, `N-UI-01`, `N-UI-02` (the three this phase owns)
- `.planning/PROJECT.md` § Out of Scope — no ads/IAP/accounts/cloud, offline-first; § Constraints

### What the screens read
- `docs/ops/PROGRESS-STORAGE.md` § Storage keys / § Migrate / § Fail-soft — **brought up to v4 on
  2026-09-29**; it described v3 until then, which is how WINDOWS #27 sat unowned for three phases.
  Also carries the table of all four read-side bounds and their two opposite keep-directions.
- `docs/ops/ACHIEVEMENTS.md` — the catalog, every threshold's stated reasoning, the stored shape,
  the accepted costs, and **Limit 2b, which is #35 stated in prose**
- `docs/ops/DAILY-CHALLENGE.md` — the nine named accepted costs; the streak rules D-05 renders;
  the timezone limit (a change while the app is open does not move the date key until relaunch)
- `docs/ops/ENDLESS-MODE.md` — the wave ramp and the `certLevelPlanFor` pointers

### Prior contracts this phase must not break
- `.planning/phases/13-achievements/13-UI-SPEC.md` — § Ordering is contract, the 16-character
  display-name budget, § Measurement Provenance. **`#16` was discharged 2026-09-29**: a 16-char
  name renders on one line at a 312 pt panel, and the assumed 0.612 em advance is slightly
  conservative.
- `.planning/phases/13-achievements/13-CONTEXT.md` — 23 locked decisions, notably D-04 (retroactive
  flood, one shared timestamp), D-13 (additive field, no version bump), D-14 (timestamp never
  moves), D-17 (an unlock is one-way), D-21 (two failure rules in one entry sanitizer)
- `.planning/phases/12-daily-challenge/12-UI-SPEC.md` — the no-scroll rule D-03 inherits, and the
  daily panel's row budget
- `.planning/WINDOWS.md` — **#29 is due at this phase**; #35 is this phase's to close; #16/#17/#28
  carry measurements taken 2026-09-29 that this phase's UI-SPEC should start from rather than
  re-derive

### Code contracts that will bite
- `app/_components/GameHost.tsx` — `ShellPhase = 'title' | 'select' | 'playing'`; the router this
  phase extends. Phase-11 D-01 note at line ~90: *"only 'title' | 'playing' — never 'select'"*.
- `app/_components/PlayingHost.tsx` — the two `__DEV__` controls this phase deletes, each carrying
  its own "TEMPORARY … Phase 14" note; `startDailyRun`'s read-only closed-date branch that D-06
  reuses; `handleRunEnded`'s dependency array, which **must stay on one line** because
  `tests/ui/PlayingHost.endless-host.test.ts` slices the callback out with a regex anchored on it
- `src/services/achievements/catalog.ts` — the twelve entries, the `src/services/achievements/**`
  eslint purity block (no clock, no RNG, no storage import), guarded by
  `scripts/assert-purity.mjs`
- `src/runtime/overlays/achievementLines.ts` — `ACHIEVEMENT_LINES_MAX`, which **clamps** as of
  `99afd8b`; before that it was read by nothing in production

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`TitleScreen.tsx` (89 lines)** — already Brand → `Best · N` → one `Pressable`. D-01 and D-02
  extend the same composition; the styling and the no-chrome rule (D-18) carry over.
- **`SelectScreen.tsx` (288 lines)** — stays exactly as it is, now behind the Campaign entry. Its
  row layout and locked-state treatment are the closest analog for both new screens' list bodies.
- **`startDailyRun`'s read-only branch** — D-06 reuses it whole. It already neutralises every
  panel scalar, including `unlockedAchievementNames` as of the phase-13 code review's WR-01 fix.
- **`ACHIEVEMENT_CATALOG` + `isKnownAchievementId`** — the achievements screen reads the catalog
  for names/descriptions/order and the stored set for state. The id→name mapping in the `app` tier
  is T-13-01's mitigation and the new screen must use it rather than rendering a stored string.
- **`getSnapshot()`** — hands out a deep clone; the stats screen's single read.

### Established Patterns
- **Read storage once on screen mount, not per frame** — `GameHost` already does this for `best`
  (`if (shellPhase !== 'title') return;`). N-STAT-03's requirement is satisfied by following it.
- **`PlayingHost` unmounts when not playing** — a shell invariant, not a cleanup step. Two new
  screens must join the router without giving a run anywhere to live.
- **No ads/shop/login chrome (D-18)** — a project-level constraint, restated in `TitleScreen`'s
  own header.
- **One renderer for one truth** — `12-UI-SPEC.md`'s rule, the reason D-06 reuses the shipped
  branch and D-09 refuses a parallel progress function.
- **An additive v4 field takes no version bump** — phase 13's D-13, verified on device; D-14
  follows it exactly.

### Integration Points
- `GameHost.tsx`'s `ShellPhase` union and its render branches — where two screens join.
- `TitleScreen`'s props — it will need the daily state (played-today, current streak) and the
  unseen-unlock count, all read at title mount.
- `PlayingHost.tsx`'s `__DEV__` dev row — where two controls come out. Note that removing them
  changes the dev row's wrap behaviour, which `eec2137` tuned; the row currently renders `Daily`
  and `Crash` over the brick field on a 402 pt device (cosmetic, dev-only, deleted here).
- The v4 blob's `telemetry.achievements` — where D-14's seen-state joins, with the same read-path
  obligations `sanitizeAchievementRecord` already carries.

</code_context>

<specifics>
## Specific Ideas

- Daily reads `Daily · done · Streak {n}` — status and streak on one line, the `·` separator the
  rest of the app uses.
- Playing is primary and reviewing is secondary, and the Title composition should *look* like
  that: the three modes first, Stats and Achievements smaller beneath them.
- The seen-mark is a mark, not a notification. No toast, no modal, no badge on a mode entry —
  D-05 and phase 13's § What the player sees were written against notification-shaped UI.

</specifics>

<deferred>
## Deferred Ideas

- **Rendering `recentRuns` on the statistics screen** — D-15 leaves it out this phase to keep the
  screen inside D-03's no-scroll budget. It is safe to render whenever someone wants it:
  `RUN_LOG_LEVEL_ID_MAX` was added on 2026-09-29 specifically because this surface will read it.
- **A countdown to the next daily board on Title** — considered for D-05 and rejected because it
  needs a live interval on Title, and phase 12 took care to keep that interval from running while
  the panel is closed. The countdown already appears on the daily result panel.
- **Best-streak on the Title daily entry** — considered for D-07; `longestStreak` is stored and the
  statistics screen will show it.
- **Progress bars / completion meters for achievements** — D-09 declines them here, and phase 13's
  `docs/ops/ACHIEVEMENTS.md` Limit 4 already rules out a `7 of 12 unlocked` line as belonging to a
  completion meter rather than a result panel.
- **Tiering or rewards for achievements** — out of scope by decision, not omission (phase 13's
  D-09 and PROJECT.md).

</deferred>

---

*Phase: 14-Meta Shell — Mode Select, Stats & Achievements*
*Context gathered: 2026-09-29*
