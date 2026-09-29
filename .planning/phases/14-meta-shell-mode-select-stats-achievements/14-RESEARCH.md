---
phase: 14
slug: meta-shell-mode-select-stats-achievements
researched: 2026-09-29
domain: Expo SDK 57 / React Native 0.86.3 shell composition, persisted-state extension, Dynamic Type
confidence: HIGH
---

# Phase 14: Meta Shell — Mode Select, Stats & Achievements — Research

**Researched:** 2026-09-29
**Domain:** Expo SDK 57 shell composition (`shellPhase` state machine vs. file-based routes), read-once-on-mount storage access, an additive v4 persisted field, and the `maxFontSizeMultiplier` lever
**Confidence:** HIGH — every load-bearing claim below was read in this repository or in `node_modules` **this session**, or falsified by running a probe and pasting the failure.

## Summary

Phase 14 adds **no new capability and no new package.** Everything it surfaces already ships:
endless (11), daily (12), the v4 telemetry blob (09) and the twelve-entry achievement catalog (13).
The work is three screens, one persisted field, one typography constant, and two `__DEV__` deletions.
`14-UI-SPEC.md` is approved and binding; it has already settled the row budgets, `MAX_FONT_SCALE = 1.2`,
the copy, the colour fences and the six backstops. **This document does not re-derive any of its numbers.**

Three findings change how the phase must be planned, and all three were measured this session:

1. **SC-5 is a reason NOT to adopt expo-router routes.** Every route in an expo-router `Stack`
   **stays mounted** — `NativeStackView` maps over all of `state.routes` and renders each one,
   hiding the non-focused ones with `display: 'none'` (JS path) or handing every non-preloaded route
   `activityState: 2` to a `ScreenStackItem` (native path). A `PlayingHost` sitting on a route would
   keep running behind `/stats`. The `shellPhase` early-return approach that the UI-SPEC locks is
   the only one that guarantees unmount.
2. **`react-hooks/set-state-in-effect` is severity `error` in this tree and is interprocedural.**
   It follows a `useCallback`, so `useEffect(() => { startDailyRun(); }, [])` — the obvious way to
   route Title's Daily entry into `PlayingHost` — **fails `npm run lint` and therefore CI.** Only a
   deferred call (`.then()`, `setTimeout(…, 0)`, microtask) is legal. Proven by probe, output pasted below.
3. **The seen-state must be stored as `unseen`, not `seen`.** D-13 requires pre-field unlocks to read
   as *already seen*; a `seen: string[]` defaulting to `[]` gives exactly the opposite and the harmful
   direction D-13 rejects. Inverting the field makes D-13 true for free, with no sentinel and no migration.

**Primary recommendation:** extend `ShellPhase` by two, thread an entry mode into `PlayingHost` as a
prop consumed via a **deferred** mount call, copy `SelectScreen`'s `.then()` read-once pattern verbatim
for both new screens, store the unseen set as an inverted additive field on `AchievementRecord` wired
at all **four** of its obligated sites, and gate `MAX_FONT_SCALE` with the UI-SPEC's three assertions
**after fixing assertion 3, which is red on arrival.**

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mode entry points**

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

**The daily entry**

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

**The achievements screen**

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

**Unseen unlocks — WINDOWS #35 / code review WR-03**

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

**The statistics screen**

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

### Deferred Ideas (OUT OF SCOPE)

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
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim from REQUIREMENTS.md) | Research Support |
|----|---------------------------------------------|------------------|
| **N-STAT-03** (FC-R07) | "A statistics screen renders lifetime and per-level telemetry without recomputing on every frame" | § Pattern 2 — the shipped `.then()` read-once-on-mount pattern in `SelectScreen.tsx:52-66` is the only lint-legal shape in this tree; `getSnapshot()` already hands out a deep clone (`asyncStorageStore.ts:544-547` → `cloneBlob`). D-15 renders `telemetry.lifetime` and `telemetry.byMode` directly, so nothing is derived per frame. |
| **N-UI-01** | "Title offers campaign, endless and daily as distinct entries; the daily entry shows whether today has been played" | § Pattern 1 (router), § Pattern 3 (the entry-mode prop and its deferred call). The played-today fact is `hasResultFor(history.map(e => e.date), localDateKey(nowMs))`; the streak is `currentDailyStreak(record)` — the SAME function `publishDailyPanel` uses (`PlayingHost.tsx:972`), which is what keeps one renderer for one truth. |
| **N-UI-02** | "New screens respect the shell contract — safe-area insets, dark palette, no ads/shop/login chrome, `PlayingHost` unmounts when not playing, and navigation never leaves a run mounted in the background" | § Pattern 1 — measured: an expo-router `Stack` route stays mounted; a `shellPhase` early return does not. `useSafeAreaInsets()` + `#1a1a2e` root are the shipped `SelectScreen`/`TitleScreen` shape. |

**REQUIREMENTS.md surface caution.** `N-STAT-03`, `N-UI-01` and `N-UI-02` exist in `REQUIREMENTS.md`
**only as checkbox lines** (lines 167, 199, 200) — there are no traceability table rows for `N-*` ids.
`gsd-tools mark-complete` and `phase.complete` both fail to mark them; the checkbox is the only
surface a plan can tick. [VERIFIED: .planning/REQUIREMENTS.md:167,199-200 — `- [ ] **N-STAT-03** (FC-R07): A statistics screen renders lifetime and per-level telemetry without recomputing on every frame`, `- [ ] **N-UI-01**: Title offers campaign, endless and daily as distinct entries; the daily entry shows whether today has been played`, `- [ ] **N-UI-02**: New screens respect the shell contract — safe-area insets, dark palette, no ads/shop/login chrome, \`PlayingHost\` unmounts when not playing, and navigation never leaves a run mounted in the background`]
</phase_requirements>

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

`./CLAUDE.md` is one line — `@AGENTS.md`. `./AGENTS.md` is one line and it is load-bearing:

> **Expo HAS CHANGED.** Read the exact versioned docs at `https://docs.expo.dev/versions/v57.0.0/`
> before writing any code.

| Directive | How this phase complies |
|---|---|
| Cite the v57 docs, not SDK-50-era memory | The SDK 57 API index confirms **React Native 0.86 / React 19.2.3** for SDK 57.0.0 [CITED: https://docs.expo.dev/versions/v57.0.0/ — dependency table row `57.0.0 \| 0.86 \| 19.2.3`]. Every platform-behaviour claim below is additionally read in `node_modules` rather than taken from prose, because the v57 index **does not** document React Native core components (`Text`, `ScrollView`) at all [CITED: https://docs.expo.dev/versions/v57.0.0/ — the navigation menu covers Expo modules, config and Expo Router only]. |
| No bare `npm install` | Zero packages added. `package-lock.json` has been untouched across phases 10–13 and stays untouched. If a plan ever proposes one: `npx expo install`, never bare `npm install`. |
| Project skills | `ls .claude/skills .agents/skills` → **neither directory exists** in this repo. No project skill rules to load. [VERIFIED: filesystem check, 2026-09-29] |

**Additional in-repo constraints the planner must honour (all read this session):**

| Constraint | Source | Consequence |
|---|---|---|
| CI runs `npm run lint -- --max-warnings 0` | `.github/workflows/ci.yml:19` | **The baseline is GREEN as of 2026-09-29** — `npm run lint -- --max-warnings 0` exits **0** with zero output. The "3 warnings at exit 0" baseline recorded in memory is stale; it has been repaired. Any new warning this phase introduces will therefore fail CI. |
| `react-hooks/set-state-in-effect` = **error** | resolved config for `app/_components/*.tsx` | See § Pitfall 1. Interprocedural. |
| `react-hooks/purity` = **error** | same | A bare `Date.now()` in a render body fails the build. A lazy `useState(() => …)` initializer does **not**. |
| `react-hooks/refs` = **error** | same | Reading `ref.current` during render fails the build. Both new screens must mirror to state, never read a ref in JSX. |
| `boundaries/dependencies`: `app → runtime` and `runtime → runtime` permitted | `eslint.config.js` `boundaries/elements` + policies | `src/runtime/textScale.ts` is importable from both trees. `npm run lint` is the **only** mechanism observing this; no unit test covers it. |
| `src/services/achievements/**` purity block | guarded by `scripts/assert-purity.mjs` (`OK (purity_probe_errors=5)`) | The catalog stays read-only in this phase. Do not add a clock, RNG or storage import to it. |
| `handleRunEnded`'s dependency array must stay on ONE line | `PlayingHost.tsx` ~line 1246; anchored by `tests/ui/PlayingHost.endless-host.test.ts` regex `\n    [platform, store, levelId[^\]]*\],` | Additive growth is tolerated by design. Breaking the literal across lines reds five cases at once. |
| No test may be `it.only` / `it.todo` / silently skipped | `scripts/assert-no-disabled-tests.mjs` (`OK (243 files — 0 only, 0 todo, 1 declared skip)`) | Plans may not park a case as a todo. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shell phase routing (Title / Select / Stats / Achievements / Playing) | **`app/` shell** (`GameHost.tsx`) | — | The `ShellPhase` union and its early returns are the only mechanism that guarantees `PlayingHost` is unmounted. A router library cannot own this (§ Pattern 1). |
| Reading the player's record for display | **`app/` shell** (both new screens) | `src/services/storage` (the `getSnapshot()` seam) | The overlays and `src/runtime/**` may not import storage — that prohibition is what makes the contract checkable at a prop signature. Derivation happens in `app/` and is threaded down as scalars. |
| Deriving "played today" and "current streak" | **`src/services/daily` + `src/services/storage`** (`hasResultFor`, `currentDailyStreak`) | `app/` (the clock read) | The predicates are pure and already shipped; only the clock read is impure and it belongs in the `app/` mount effect. |
| Persisting the unseen-unlock set | **`src/services/storage`** (`types.ts`, `telemetry.ts`, `parseBlob.ts`, both stores) | — | It rides `telemetry.achievements`, the one sub-object validated independently of its siblings. |
| Evaluating which achievements are unlocked | **`src/services/achievements`** (unchanged) | — | Pure, eslint-fenced, `assert-purity`-guarded. This phase reads it and changes nothing. |
| Announcing an unlock on a result panel | **`src/runtime/overlays`** (unchanged) | `app/` (`publishUnlockedAchievements`) | Shipped. The panel receives display names as plain strings. |
| Capping Dynamic Type growth | **`src/runtime/textScale.ts`** (new constant) | every `Text`-bearing file in `src/` and `app/` | The cap is a property of the app's typography, not a per-screen repair (UI-SPEC § The multiplier). |
| Rendering the playfield | `src/render` / Skia (**untouched**) | — | The Skia playfield renders no `Text` and is out of scope. |

---

## Standard Stack

### Core — resolved versions read from `node_modules/<pkg>/package.json`, 2026-09-29

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | **57.0.24** | SDK | Already installed; SDK 57 pairs with RN 0.86 / React 19.2.3 [CITED: https://docs.expo.dev/versions/v57.0.0/] |
| `react-native` | **0.86.3** | `View` / `Text` / `Pressable` / `ScrollView` | The only component library in this project. `Tool: none` in the UI-SPEC is a decision, not an omission. |
| `react` | **19.2.3** | — | Constrains the hook patterns available (§ Pattern 2) |
| `react-native-safe-area-context` | **5.7.0** | `useSafeAreaInsets()` on all three screens | The shipped pattern in both `TitleScreen.tsx` and `SelectScreen.tsx`; N-UI-02 names safe-area insets explicitly |
| `expo-router` | **57.0.22** | Provides the single `app/index.tsx` entry only | See § Pattern 1 — **used, but deliberately NOT extended with new routes** |
| `vitest` | **5.0.1** | Test runner | `vitest.config.ts` aliases `react-native → react-native-web`, `environment: 'node'` with jsdom opted into per file |
| `@testing-library/react` | **16.3.3** | jsdom render assertions | The shipped `tests/ui/*.test.tsx` shape |

### Supporting — already installed, used unchanged

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-native-async-storage/async-storage` | 2.2.0 | Behind `createDefaultProgressStore()` | Never imported directly by a screen |
| `react-native-screens` | 4.26.0 | Backs expo-router's native stack | Read this session to establish § Pattern 1; not called directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `ShellPhase` | expo-router file routes `app/stats.tsx`, `app/achievements.tsx` + `useRouter()` | **Rejected — breaks SC-5.** Measured: a `Stack` keeps every route mounted (§ Pattern 1). Would also add a shell layer D-01/D-02 rejected and a remembered-route state D-04 removed on purpose. |
| `.then()`-callback read-once | `useSyncExternalStore` | **Rejected.** `ProgressStore.getSnapshot()` is `async` and there is no subscribe/emit seam on the store; `useSyncExternalStore` requires a synchronous `getSnapshot`. Adding one means adding a subscription API to a singleton that three surfaces share — new machinery for a read that happens once per screen entry. [ASSUMED — no such seam was found by grep over `src/services/storage/**`; the rejection rests on the absent API, not on a measured failure] |
| `.then()`-callback read-once | Sync `setState` in the effect body | **Illegal in this tree** — `react-hooks/set-state-in-effect` is severity error (§ Pitfall 1, probe output pasted) |
| Twelve per-file `maxFontSizeMultiplier` props | An `AppText` wrapper component setting the prop once | **Contradicts the approved UI-SPEC.** A wrapper collapses `maxFontSizeMultiplier` to one occurrence and would red assertion 1 (count equality). Noted only so a later author finds the reason; see § Open Question 2 for the one thing it would buy. |
| A `seen: string[]` field | An inverted `unseen: string[]` field | **Take the inverted one** — see § Pattern 4. `seen: []` on a pre-field blob marks every unlock as new, which is exactly the harm D-13 rejects. |

**Installation:** none. Zero packages added.

**Version verification:**
```bash
node -p "require('./node_modules/expo/package.json').version"            # 57.0.24
node -p "require('./node_modules/react-native/package.json').version"    # 0.86.3
node -p "require('./node_modules/react/package.json').version"           # 19.2.3
node -p "require('./node_modules/expo-router/package.json').version"     # 57.0.22
```

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** `14-UI-SPEC.md` § Registry Safety
declares zero packages added, continuing phases 10–13 (`package-lock.json` untouched across all four).
The legitimacy gate was therefore **not run**, because there is no candidate package to evaluate — not
because it was skipped.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| *(none)* | — | — | — |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

**Standing rule if a plan ever proposes one:** pin via `npx expo install <pkg>`, never bare
`npm install`, and run `gsd-tools query package-legitimacy check --ecosystem npm <pkg>` before the
plan is written.

---

## Architecture Patterns

### System Architecture Diagram

```
                      ┌──────────────────────────────────────┐
  cold start ────────►│ app/_layout.tsx  (expo-router Stack)  │
                      │  ONE route: app/index.tsx             │
                      └──────────────────┬───────────────────┘
                                         │  (never grows a second route — SC-5)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │ app/index.tsx                         │
                      │  GestureHandlerRootView               │
                      │   └─ SafeAreaProvider                 │
                      │       └─ GameHost                     │
                      └──────────────────┬───────────────────┘
                                         │
                            ShellPhase state machine
                 'title' | 'select' | 'stats' | 'achievements' | 'playing'
                                         │
        ┌──────────┬──────────┬──────────┴────────────┬──────────────────┐
        │          │          │                       │                  │
        ▼          ▼          ▼                       ▼                  ▼
  ┌──────────┐ ┌────────┐ ┌────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │  Title   │ │ Select │ │ Statistics │ │   Achievements   │ │   PlayingHost    │
  │ 7 rows   │ │ 5 rows │ │ 3 + 7 rows │ │ 12 entries,      │ │ Skia + worklets  │
  │          │ │        │ │ no scroll  │ │ fixed hdr+scroll │ │ useFrameCallback │
  └────┬─────┘ └───┬────┘ └─────┬──────┘ └────────┬─────────┘ └────────┬─────────┘
       │           │            │                 │                    │
       │ (early    │ (early     │ (early return)  │ (early return)     │ final return
       │  return)  │  return)   │                 │                    │
       ▼           ▼            ▼                 ▼                    ▼
   ONE read    ONE read     ONE read          ONE read +          run-end write
   at mount    at mount     at mount          ONE write           (recordRunEnd)
       │           │            │                 │                    │
       └───────────┴────────────┴────────┬────────┴────────────────────┘
                                         ▼
                    ┌────────────────────────────────────────────┐
                    │ createDefaultProgressStore()  — SINGLETON  │
                    │  ensureHydrated() single-flight            │
                    │  getSnapshot() → cloneBlob (deep clone)    │
                    │  recordRunEnd(args) → blob + newlyUnlocked │
                    │  markAchievementsSeen()        [NEW]       │
                    └──────────────────┬─────────────────────────┘
                                       ▼
                    ┌────────────────────────────────────────────┐
                    │ parseProgressResult → sanitizeTelemetry    │
                    │   → sanitizeAchievementRecord              │
                    │        drop unknown id → dedupe → BOUND    │
                    └──────────────────┬─────────────────────────┘
                                       ▼
                        AsyncStorage  '@nbb/progress/v4'  (plaintext)
```

**Trace the primary use case (Title → Achievements → back) by the arrows:** `GameHost` renders the
`'title'` early return; its one mount effect reads `getBest()` + the daily record + the unseen count
in one pass; tapping `Achievements` sets `shellPhase = 'achievements'`, which takes a **different
early return** — so `PlayingHost` is not in the tree at all, not hidden in it. The screen reads the
snapshot once, renders `New` from that snapshot, writes the seen-state once, and `Back` sets
`'title'` and nothing else.

### Recommended Project Structure

```
app/
├── _layout.tsx                        # unchanged — ONE Stack, ONE route
├── index.tsx                          # unchanged
└── _components/
    ├── GameHost.tsx                   # ShellPhase widens by two; two new early returns
    ├── TitleScreen.tsx                # 3 Text → ~9; seven rows
    ├── SelectScreen.tsx               # LAYOUT UNCHANGED; gains maxFontSizeMultiplier only
    ├── StatisticsScreen.tsx           # NEW
    ├── AchievementsScreen.tsx         # NEW
    └── PlayingHost.tsx                # two __DEV__ controls deleted; entry-mode prop added
src/runtime/
└── textScale.ts                       # NEW — MAX_FONT_SCALE = 1.2, pure, no imports, no React
src/services/storage/
├── types.ts                           # AchievementRecord gains the additive field
├── telemetry.ts                       # clone + merge sites (D-23's three sites)
├── parseBlob.ts                       # sanitizeAchievementRecord gains the field's read path
├── memoryStore.ts                     # hand-mirrored store #1
└── asyncStorageStore.ts               # hand-mirrored store #2
```

### Pattern 1: `shellPhase` early returns, NOT expo-router routes — the SC-5 mechanism

**What:** widen `ShellPhase` from `'title' | 'select' | 'playing'` to
`'title' | 'select' | 'playing' | 'stats' | 'achievements'` and add two early returns **above** the
final `PlayingHost` return in `GameHost`, exactly as `'select'` already is.

**Why this and not routes — measured, not assumed.** The UI-SPEC locks this choice; here is the
evidence that makes it the *correct* choice rather than merely the incumbent one.

`expo-router`'s `Stack` resolves to `createNativeStackNavigator` from
`expo-router/build/fork/native-stack/createNativeStackNavigator`, whose view delegates to the bundled
react-navigation `NativeStackView`. **Both of its platform variants render every route in the stack:**

```js
// node_modules/expo-router/build/react-navigation/native-stack/views/NativeStackView.js:54,88
state.routes.concat(state.preloadedRoutes).map((route, i) => {
  const isFocused = state.index === i;
  ...
  style: [ StyleSheet.absoluteFill, { display: (isFocused || …) && !isPreloaded ? 'flex' : 'none' } ],
  children: … render()
})
```

```js
// node_modules/expo-router/build/react-navigation/native-stack/views/NativeStackView.native.js:210,257
state.routes.concat(state.preloadedRoutes).map((route, index) => …
  ScreenStackItem, { screenId: route.key, activityState: isPreloaded ? 0 : 2, … freezeOnBlur, … }
```

[VERIFIED: node_modules/expo-router/build/react-navigation/native-stack/views/NativeStackView.js:54-90
and .native.js:210,257 — quoted verbatim above]

So a background route is **mounted and rendered**, merely `display: 'none'` (JS) or handed
`activityState: 2` (native). `freezeOnBlur` is only an *option*, and even when enabled it wraps the
screen in `react-freeze`'s `<Freeze>`, which suspends React re-renders — **it does not unmount and it
does not stop a `useFrameCallback` or a Reanimated worklet**, both of which run on the UI thread.
[VERIFIED: node_modules/react-native-screens/lib/commonjs/components/helpers/DelayedFreeze.js —
`return React.createElement(Freeze, { freeze: freeze ? freezeState : false }, children)`, with the
file's own comment "This component allows one more render before freezing the screen."]

**Concrete unmount semantics of each option:**

| Option | What guarantees `PlayingHost` is gone | Verdict |
|---|---|---|
| `shellPhase` early return | React unmounts the subtree because the element is **not returned**. Effect cleanups run; worklets tear down. This is the shipped invariant D-04 preserves. | **Use this** |
| expo-router `router.push('/stats')` over a `/play` route | **Nothing.** The `/play` route stays in `state.routes` and keeps rendering. | Rejected — violates SC-5 |
| expo-router `router.replace('/stats')` | The popped route leaves `state.routes`, so it *does* unmount — but `replace` from Title also destroys the back stack, and D-04 already gives one return path, so the router buys nothing and costs a dependency. | Rejected — no benefit |
| `useFocusEffect` cleanup | Per the v57 docs the cleanup "runs when the screen loses focus — **not on unmount**" [CITED: https://docs.expo.dev/versions/v57.0.0/sdk/router/]. It is a focus signal, not an unmount signal. | Not a substitute |

**The v57 docs do not state the mount behaviour either way** — the SDK 57 router page documents
`useRouter`, `useFocusEffect`, `useNavigation`, `useLocalSearchParams`, `useGlobalSearchParams`,
`usePathname`, `useSegments`, `useRootNavigationState`, `Stack`, `Tabs`, `Link`, `Redirect`, `Slot`,
`ErrorBoundary`, and says nothing about whether a pushed-over screen unmounts
[CITED: https://docs.expo.dev/versions/v57.0.0/sdk/router/]. That silence is **not** evidence either
way; the installed-source reading above is what settles it.

**Two harness contracts extend verbatim:**
- `runCycle` in the soak effect must never set `'stats'` or `'achievements'` — the shipped phase-11
  note reads *"D-01: only 'title' | 'playing' — never 'select'"* (`GameHost.tsx`, above the soak effect).
- `CERT_HARNESS` must still open directly on `'playing'`:
  `useState<ShellPhase>(() => CERT_HARNESS && !SOAK_HARNESS ? 'playing' : 'title')`.
  `tests/ui/GameHost.test.tsx` already asserts both by source regex — extend those two cases rather than adding a third site.

### Pattern 2: read once on mount, via a `.then()` callback — the ONLY lint-legal shape

**What:** copy `SelectScreen.tsx:52-66` verbatim in shape.

```tsx
// Source: app/_components/SelectScreen.tsx:48-66 (shipped, verbatim)
const [progress, setProgress] = useState<ProgressBlob>(() => defaultProgressBlob());

useEffect(() => {
  let cancelled = false;
  void store
    .getSnapshot()
    .then((snap) => {
      if (!cancelled) setProgress(snap);
    })
    .catch(() => {
      if (!cancelled) setProgress(defaultProgressBlob());
    });
  return () => {
    cancelled = true;
  };
}, [store]);
```

Four properties, each load-bearing:

1. **`useState(() => defaultProgressBlob())` gives the pre-read frame its zeros** — the UI-SPEC's
   E3/E4/E5 `loading` rows resolve to "renders defaults", not a spinner.
2. **The `.catch(…)` → defaults is the whole of § Error states.** No error modal anywhere.
3. **`cancelled` guard** — the screen can unmount before the read resolves (`Back` is interactive from
   first paint).
4. **`setState` lives inside the `.then()` callback, not the effect body.** This is not style. See § Pitfall 1.

**Why each candidate is safe or unsafe here:**

| Candidate | Verdict |
|---|---|
| `useState` initializer for the **blob** | **Unsafe** — `getSnapshot()` is `async` (`Promise<ProgressBlob>`), so an initializer cannot produce it. Use the initializer for the *defaults* only. |
| `useState` initializer for the **clock** (`localDateKey(Date.now())`) | **Safe, measured** — a lazy initializer does not trip `react-hooks/purity`. A bare `Date.now()` in the render body does. [VERIFIED: probe, § Pitfall 2] |
| `useEffect` + `.then()` → `setState` | **Safe and shipped** — the recommended pattern |
| `useEffect` + synchronous `setState` | **Unsafe — build failure.** `react-hooks/set-state-in-effect`, severity error |
| `useSyncExternalStore` | **Unsafe** — needs a synchronous `getSnapshot` and a `subscribe`; the store has neither |
| `useFocusEffect` | **Not applicable** — the screens are not router routes (§ Pattern 1) |
| A `useMemo` over the snapshot | **Wrong tool** — memoising an async result does not avoid the read, and N-STAT-03 is satisfied by the read *pattern*, not by a memo |

**Title's read is ONE effect, three values.** The shipped effect is already gated
`if (shellPhase !== 'title') return;` (`GameHost.tsx`). Extend that single effect rather than adding
two more; a `getSnapshot()` carries the daily record and the unseen set as well as the best, so one
call answers all three:

```tsx
// Source: extends the shipped GameHost.tsx title effect (lines ~78-95)
useEffect(() => {
  if (shellPhase !== 'title') return;
  let cancelled = false;
  const nowMs = Date.now();            // clock read inside the effect — never in render
  const todayKey = localDateKey(nowMs);
  void store
    .getSnapshot()
    .then((snap) => {
      if (cancelled) return;
      setBest(snap.bestScore);
      const daily = snap.telemetry.daily;
      setDailyPlayedToday(hasResultFor(daily.history.map((e) => e.date), todayKey));
      setDailyStreak(currentDailyStreak(daily));           // SAME fn publishDailyPanel uses
      setUnseenCount(snap.telemetry.achievements.unseen.length);
    })
    .catch(() => {
      if (cancelled) return;
      setBest(0);
      setDailyPlayedToday(false);
      setDailyStreak(0);
      setUnseenCount(0);
    });
  return () => { cancelled = true; };
}, [shellPhase, store]);
```

`currentDailyStreak` is the function `publishDailyPanel` already calls
[VERIFIED: app/_components/PlayingHost.tsx:972 — `history != null && record != null ? currentDailyStreak(record) : 0`].
Using it here rather than `streakFrom` over raw keys is what makes Title and the daily panel one
renderer for one truth. `hasResultFor(sortedKeys, key)` is the same predicate `startDailyRun`
evaluates D-01 with [VERIFIED: src/services/daily/streak.ts:68 — `export function hasResultFor(sortedKeys: readonly string[], key: string): boolean`].

**Note the `getBest()` → `getSnapshot()` widening.** Today Title calls `store.getBest()`. Both route
through `ensureHydrated()`, which is single-flight precisely because "Title's `getBest()` and Select's
`getSnapshot()` hit the same singleton (F-26) when Play is tapped before the first read resolves"
[VERIFIED: src/services/storage/asyncStorageStore.ts:330-348 — the `ensureHydrated` JSDoc, quoted]. So
widening to `getSnapshot()` is free: same hydrate, one call instead of three, and `getBest()` would
otherwise return `memory.bestScore` — the identical field `getSnapshot()` clones.

### Pattern 3: the entry-mode prop, and the deferred call that makes it legal

**The problem.** `startEndlessRun` and `startDailyRun` live **inside** `PlayingHost` and are wired only
to `onPress` on the two `__DEV__` controls this phase deletes. Title's Endless and Daily entries must
therefore (a) mount `PlayingHost`, and (b) get it to start in that mode. The shipped comment even
predicts the shape:

> *"Endless mode (N-END-01 / D-10) is HOST-LOCAL state: entered by the `__DEV__` entry on the dev row,
> never threaded down from `GameHost`. D-05 makes the entry temporary and **Phase 14 replaces it with
> the real Title route**, so the shell plumbing that a `mode` prop would build is plumbing Phase 14
> would immediately have to unpick."*
> [VERIFIED: app/_components/PlayingHost.tsx:284-289, quoted verbatim]

**Recommended shape:**

```tsx
// GameHost: entry mode is decided BEFORE PlayingHost mounts, and is not shell state that
// survives a run (D-04). Reset it to 'campaign' on every onMenu.
const [entryMode, setEntryMode] = useState<'campaign' | 'endless' | 'daily'>('campaign');
...
<PlayingHost
  levelId={CERT_HARNESS ? 'level-03' : activeLevelId}
  entryMode={CERT_HARNESS ? 'campaign' : entryMode}
  onLevelIdChange={setActiveLevelId}
  onMenu={() => { setEntryMode('campaign'); setShellPhase('title'); }}
/>
```

```tsx
// PlayingHost: ONE deferred, once-only mount dispatch.
// DEFERRED deliberately — a direct call reds react-hooks/set-state-in-effect (see Pitfall 1),
// and the readiness gate inside startDailyRun means a same-tick call silently no-ops.
const entryDispatchedRef = useRef(false);
useEffect(() => {
  if (entryMode === 'campaign' || entryDispatchedRef.current) return;
  if (!levelReady || levelError != null || !fxReady) return;   // retry when readiness flips
  entryDispatchedRef.current = true;
  const id = setTimeout(() => {
    if (entryMode === 'endless') startEndlessRun();
    else startDailyRun();
  }, 0);
  return () => clearTimeout(id);
}, [entryMode, levelReady, levelError, fxReady, startEndlessRun, startDailyRun]);
```

**Three things this shape gets right, and each is a defect if dropped:**

1. **The readiness gate.** `startDailyRun` returns early when `!levelReady || levelError != null || !fxReady`,
   logging `[daily] entry blocked: level or fx not ready` in `__DEV__`
   [VERIFIED: app/_components/PlayingHost.tsx:1996-2006 — `if (!levelReady || levelError != null || !fxReady) { … console.error('[daily] entry blocked: level or fx not ready'); return; }`].
   On a cold start those are false, so a `useEffect(…, [])` fires once, no-ops, and the player lands on
   a campaign board having tapped `Daily`. The effect **must** depend on the readiness flags.
2. **The once-only ref.** With readiness in the dependency array the effect re-runs; without the ref it
   would re-enter the run on every flip.
3. **The reset on `onMenu`.** D-04 says Menu always returns to Title. If `entryMode` survived, the next
   `shellPhase = 'playing'` (a Campaign tap from `SelectScreen`) would re-enter endless. Resetting it in
   the same handler keeps D-04's "no new shell state exists for a run to survive in" literally true.

**D-06 needs no new code.** `startDailyRun`'s first act on an already-closed date is the read-only
branch, which publishes the panel from the stored record, generates no board, writes nothing, sets
`runEndedRef.current = true`, and — as of the phase-13 code review's WR-01 fix — neutralises
`unlockedAchievementNames` to `[]`
[VERIFIED: app/_components/PlayingHost.tsx:1945-1993 — `if (hasResultFor(dailyRecordRef.current.history.map((e) => e.date), dateKey)) { … setUnlockedAchievementNames([]); … runEndedRef.current = true; setUiPhase('playing'); setResult(stored?.outcome ?? 'win'); setActive(false); return; }`].
D-06 is satisfied by routing the Daily tap into the same function, unchanged.

### Pattern 4: the unseen field — store it INVERTED

**The shape.**

```ts
// src/services/storage/types.ts
export type AchievementRecord = {
  unlocked: AchievementUnlock[];
  /**
   * Unlocked ids the player has NOT been told about (D-11 / D-12).
   *
   * INVERTED deliberately. A `seen` list defaulting to `[]` would mark every pre-field unlock
   * as new — the exact harm D-13 rejects ("labelling as 'new' a dozen entries the player has
   * already read, which would empty the mark of meaning on first open"). An `unseen` list
   * defaulting to `[]` makes D-13 true with no sentinel, no version bump and no migration.
   *
   * Bounded by ACHIEVEMENT_UNLOCK_BOUND and intersected with the parsed `unlocked` set on read:
   * Title renders `{n} new` from this length, so an unintersected field lets a tampered blob
   * render a count the catalog cannot justify.
   */
  unseen: string[];
};
```

**Why `[]` is the right default and a `seen` list is not:** `sanitizeTelemetry` starts from
`defaultTelemetryBlob()` and assigns field by field, so any field absent from a stored v4 blob arrives
at its default with `status: 'ok'` and no `v` bump
[VERIFIED: src/services/storage/parseBlob.ts:748-781 — `const out = defaultTelemetryBlob(); … out.achievements = sanitizeAchievementRecord(telemetry.achievements);`],
and `defaultAchievementRecord()` is reachable from `defaultTelemetryBlob()` for exactly this reason
[VERIFIED: src/services/storage/types.ts — `achievements: defaultAchievementRecord(),` under the comment
"Reachable from here is what makes D-13's no-migration claim TRUE rather than intended"]. That
mechanism gives the field **whatever its default says**, so the *direction* of the default is the
whole decision — and only the inverted field's default matches D-13.

**FOUR obligated sites, not three.** The shipped code calls them "D-23's three sites"; the read path is
a fourth and the compiler reds only three of the four:

| # | Site | What breaks if missed | Caught by |
|---|------|----------------------|-----------|
| 1 | `defaultTelemetryBlob()` / `defaultAchievementRecord()` — `types.ts` | the default does not exist | `tsc` (`TS2741`) |
| 2 | `cloneTelemetryBlob()` — `telemetry.ts:63-93` | **the field is dropped on EVERY other mode's run-end write** — `mergeEndlessRecord` and `mergeDailyRecord` both start from this clone | `tsc` (`TS2741`) |
| 3 | `mergeTelemetryBlobs()` → `mergeAchievementRecords()` — `telemetry.ts:882-912` / `865-880` | the field is lost on every memory↔disk reconcile, i.e. every cold start that hydrates after a write | `tsc` (`TS2741`) |
| 4 | **`sanitizeAchievementRecord()` — `parseBlob.ts:644-672`** | the field is silently **unbounded and unvalidated on read**; a hand-edited blob reaches Title's `{n} new` | **NOTHING.** `out` starts from the default and `record.unseen` is simply never consulted, so the code typechecks and the field always reads `[]` |

[VERIFIED: src/services/storage/telemetry.ts:78-86 — the `cloneTelemetryBlob` comment "D-23's site, and the worst case in this file's three-site trap. `mergeEndlessRecord` and `mergeDailyRecord` both START here, so a field missing from this clone is dropped on EVERY other mode's run-end write — a campaign run would erase the unlock set, silently, with no test naming the function that did it."]
[VERIFIED: src/services/storage/telemetry.ts:903-909 — "The second of D-23's three sites. Missing here, the unlock set is lost on every memory/disk reconcile"]

**Site 4 is the one that needs a behavioural test**, because it is the one the compiler cannot see. It
owes the same three-step order `sanitizeAchievementRecord` already contracts — *drop per entry, then
de-duplicate, then bound* — with the bound **last**, so padding garbage cannot push real ids out of
the window [VERIFIED: src/services/storage/parseBlob.ts:604-640, the numbered JSDoc list and the
`slice(0, ACHIEVEMENT_UNLOCK_BOUND)` at line 670]. `keep-first`, matching the two shipped sites.

**`unseen` unions monotonically under merge, so `mergeAchievementRecords` needs no inversion rule.**
That function carries an explicit warning that `mergeDailyRecords`' incoming-wins tiebreak is **wrong**
for a timestamp and must be inverted to earliest-wins
[VERIFIED: src/services/storage/telemetry.ts:855-861 — "For an unlock, last-writer-wins moves the
timestamp FORWARD, and D-14 stores timestamps precisely so Phase 14 can show a recency order.
**Earliest must win.**"]. For `unseen` the hazard does not recur: an id is its own evidence and a union
of two id sets cannot inflate — the same argument the file already makes for the id set
[VERIFIED: src/services/storage/telemetry.ts:834-837 — "For the ID SET it does not recur. An id is its
own evidence; the union of two id sets cannot inflate, and there is no claim/evidence pair to cross."].
**But the union has a cost worth naming:** two devices, one of which has already seen an unlock, will
re-show the mark after a reconcile. That is D-13's chosen direction of harm (a mark seen twice beats a
mark never seen), and it is also academic — this project has no cloud sync (`PROJECT.md` § Out of Scope).

**Where the two D-12 paths write.**

| D-12 path | Write site | Mechanism |
|---|---|---|
| "announced on a result panel" | both stores' unlock-evaluation tail | Do **not** add to `unseen` when a panel will render |
| "present when the achievements screen was opened" | `AchievementsScreen` mount | one `markAchievementsSeen()` clearing `unseen` to `[]` |

Both stores already hold the evaluation tail, hand-mirrored:

```ts
// Source: src/services/storage/memoryStore.ts:208-219 (shipped) — the asyncStorageStore copy is identical in shape
const newlyUnlocked = newlyUnlockedAchievements(
  blob.telemetry,
  blob.telemetry.achievements.unlocked.map((e) => e.id),
);
if (newlyUnlocked.length > 0) {
  blob.telemetry = mergeAchievementUnlocks(blob.telemetry, newlyUnlocked, Date.now());
  blob.updatedAt = Date.now();
}
```

`args.outcome` is **already in scope here** — it is a member of every arm of `RecordRunEndArgs`. So the
cheapest correct wiring is one added pure merge, gated on the outcome:

```ts
if (newlyUnlocked.length > 0) {
  blob.telemetry = mergeAchievementUnlocks(blob.telemetry, newlyUnlocked, Date.now());
  // D-11 / D-12: an abandoned run shows no panel, so nothing was announced. The identical
  // gate already governs the platform payload one function away in PlayingHost
  // (`if (outcome !== 'abandoned')`), for the identical reason.
  if (args.outcome === 'abandoned') {
    blob.telemetry = markAchievementsUnseen(blob.telemetry, newlyUnlocked);
  }
  blob.updatedAt = Date.now();
}
```

**This keeps ONE write per run end**, which the D-10/F-26 contract cares about
("sync memory merge score/stars/unlock; void persist; return clone before awaiting disk"). The
host-side alternative — letting `publishUnlockedAchievements` clear the announced ids — needs a
**second** persist inside the same run-end tick, racing the first. **`outcome === 'abandoned'` is a
proxy for "no panel rendered", and that proxy is a decision, not a fact** — see § Open Question 1.

**The fail-soft obligation repeats.** Adding a required `markAchievementsSeen()` to `ProgressStore`
reds the two real stores and **nothing else**: the five mocked-store files build their store as a bare
object literal inside a `vi.mock` factory and are therefore not contextually typed as `ProgressStore`
[VERIFIED: `grep -rln 'createDefaultProgressStore:' tests/` → tests/ui/GameHost.test.tsx,
PlayingHost.daily-run.test.tsx, PlayingHost.endless-record.test.tsx, PlayingHost.endless-retry.test.tsx,
PlayingHost.endless-run.test.tsx — five files]. This is the same trap `RecordRunEndResult`'s JSDoc
records verbatim for `newlyUnlocked`. **Call it optionally — `void store.markAchievementsSeen?.()` —
and a harness that means to exercise the real path must supply the method or it silently exercises the
fail-soft branch.**

**Prefer DI over `vi.mock` for both new screens.** `SelectScreen` takes `store?: ProgressStore` and
resolves `useMemo(() => storeProp ?? createDefaultProgressStore(), [storeProp])`
[VERIFIED: app/_components/SelectScreen.tsx:14-18 and 43-47]. Copy it: `tests/ui/SelectScreen.test.tsx`
is the only UI test that injects a store by prop, and it is the only one that does not have to
`vi.mock` the whole storage barrel.

### Pattern 5: `MAX_FONT_SCALE` — where the constant lives and what actually reads it

```ts
// src/runtime/textScale.ts — pure, no imports, no React
export const MAX_FONT_SCALE = 1.2;
```

`src/runtime/**` is importable by both `src/runtime/**` and `app/**`
[VERIFIED: eslint.config.js `boundaries/dependencies` — the `runtime` policy allows
`anyOf: ['core','runtime','render','vfx']` and the `app` policy allows `anyOf: ['runtime','render','input','app','services', …]`],
and `app/**` already deep-imports `src/runtime/*` files in four places
[VERIFIED: `grep -rn "from '../../src/runtime" app/` → GameHost.tsx:7, SelectScreen.tsx:4,
certLevelPlan.ts:55, PlayingHost.tsx:18,28,49,50,54,59].

**The three platform facts the cap rests on, all read in the installed package this session:**

| Fact | Evidence |
|---|---|
| `allowFontScaling` defaults to `true` | `processedProps.allowFontScaling = allowFontScaling !== false;` [VERIFIED: node_modules/react-native/Libraries/Text/Text.js:289] |
| An explicit `lineHeight` **also** scales | `CGFloat lineHeight = textAttributes.lineHeight * RCTEffectiveFontSizeMultiplierFromTextAttributes(textAttributes);` [VERIFIED: node_modules/react-native/ReactCommon/react/renderer/textlayoutmanager/platform/ios/react/renderer/textlayoutmanager/RCTAttributedTextUtils.mm:230] |
| The cap is a **continuous** `fminf`, not a snap to an iOS step | `return maxFontSizeMultiplier >= 1.0 ? fminf(maxFontSizeMultiplier, fontSizeMultiplier) : fontSizeMultiplier;` [VERIFIED: same file:117] |

**Two prop-surface facts the UI-SPEC does not record, both relevant to the gate:**

1. **A value below `1.0` is silently ignored.** The `>= 1.0` guard above means `maxFontSizeMultiplier={0.9}`
   is a no-op, and `0` explicitly means "no max". The documented value set is exactly:
   `null/undefined` → inherit from the parent node or the global default (0); `0` → no max, ignore
   parent/global default; `>= 1` → set this node's max to this value
   [VERIFIED: node_modules/react-native/Libraries/Text/TextProps.js:172-180, quoted verbatim;
   CITED: https://reactnative.dev/docs/text — identical wording].
2. **The prop INHERITS to nested `Text` nodes.** A nested `<Text>` inside a capped parent therefore does
   not strictly need the prop. That makes the UI-SPEC's count-equality gate **stricter than RN
   requires**, which is the right direction — but a reviewer should not read a nested `Text` carrying
   the prop as redundant noise. (No nesting exists in the ten current files: every file's `<Text` count
   equals its `</Text>` count and equals its occurrence count — see the table in § Pitfall 4.)
3. **`adjustsFontSizeToFit` is iOS-only in the installed tree** and is **not** a substitute for the cap:
   it shrinks text to fit a *constrained* box, and none of these three screens constrains a row's height.
   [VERIFIED: node_modules/react-native/Libraries/Text/TextProps.js:110-114 — the prop is declared under
   a block commented `iOS Only`. Note that reactnative.dev's general `Text` page does **not** mark it
   iOS-only [CITED: https://reactnative.dev/docs/text]; prefer the installed declaration.]

**No global lever exists in this stack, so the enumeration is necessary.** `Text.defaultProps` is gone —
React 19 removed `defaultProps` on function components — and `grep -rn maxFontSizeMultiplier
node_modules/react-native/Libraries/` finds only per-component prop declarations and view configs, with
no JS-side global setter. The "global default (0)" the prop doc mentions is a native-side value with no
exposed API in this version. [VERIFIED: grep over node_modules/react-native/Libraries/ — hits are
confined to TextInput view configs, TextProps.js, RCTTextAttributes.{h,mm}, RCTBaseTextViewManager.mm
and TextNativeComponent.js]

### Anti-Patterns to Avoid

- **A new route under `app/`.** It adds a mounted background screen (§ Pattern 1) and an `app/_layout.tsx`
  change this phase has no other reason to touch.
- **A second renderer for the daily record.** D-06 reuses `startDailyRun`'s shipped branch whole. A
  "daily record screen" would be the defect family `12-UI-SPEC.md` exists against.
- **A `seen` field.** Inverts D-13's direction of harm (§ Pattern 4).
- **Reading `ref.current` in JSX on a new screen.** `react-hooks/refs` is severity error; proven by probe.
- **Assuming a stored value's cap.** Title's `{n} new` is only capped at 12 if the read path intersects
  `unseen` with the parsed `unlocked` set. Without that, `ACHIEVEMENT_UNLOCK_BOUND = 64` is the only cap.
- **Copying `SelectScreen`'s locked row wholesale.** It is the right layout analog and the **wrong colour
  analog** — `#6B7280` on `#1a1a2e` is 3.53:1 and fails AA (UI-SPEC § Color fence 1).
- **Raising `ACHIEVEMENT_LINES_MAX`.** It stays `2`. Its production reader is real as of `99afd8b`:
  `return laid.slice(0, ACHIEVEMENT_LINES_MAX);` [VERIFIED: src/runtime/overlays/achievementLines.ts:158;
  declared at :49 as `export const ACHIEVEMENT_LINES_MAX = 2;`. `grep -rn ACHIEVEMENT_LINES_MAX src/ app/`
  returns four hits: the declaration, two prose mentions in the same file, and that one reader].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Has today been played?" | A date comparison over `history` | `hasResultFor(sortedKeys, key)` from `src/services/daily` | Same predicate `startDailyRun` evaluates D-01 with; a second one can disagree and no test says which is right |
| "What is the current streak?" | `streakFrom(keys)` or a counter | `currentDailyStreak(record)` from `src/services/storage` | It resolves `currentStreakStart` with the credibility walk that phase 12's amended D-16 added, and it is the function `publishDailyPanel` uses. `assert-streak-evidence.mjs` gates its consumers ("2 consumer(s) — resolveStreakStart, reconcileStreakStart") |
| Level row labels | A new `level-01 → "Level 01"` map | `SelectScreen`'s shipped `LEVEL_LABEL` | A second mapping is T-13-01's failure in a new place |
| Level row order | Numeric or file order | `PLAYABLE_LEVEL_ORDER` | `['level-01','level-04','level-05','level-06','level-03']` — the E2 curve, five members, `readonly`. `Level 03` last is correct [VERIFIED: src/services/storage/catalog.ts:14-20, quoted] |
| Achievement names/descriptions | A stored string | `ACHIEVEMENT_CATALOG[i].name` / `.description` | T-13-01's mitigation. A stored id is attacker-controllable on a rooted device |
| "Is this stored id real?" | A local allow-list | `isKnownAchievementId` from `src/services/achievements` | The predicate lives beside the catalog that mints the ids, so the parser cannot hold a stale copy [VERIFIED: src/services/storage/parseBlob.ts:16 imports it; :595 calls it] |
| A deep copy of the snapshot | `JSON.parse(JSON.stringify(...))` | `getSnapshot()` already returns `cloneBlob(memory)` | [VERIFIED: src/services/storage/asyncStorageStore.ts:544-547] |
| Unlock-set union / dedupe | A hand-rolled `Set` dance | `mergeAchievementUnlocks` / `mergeAchievementRecords` | Both encode earliest-wins and the keep-first bound, with the reasons in their JSDoc |
| Truncating a long value | `value.slice(0, n)` + `'…'` | `numberOfLines={1}` | UI-SPEC makes it contract on every fixed-width row; it converts an overflow from "a control is pushed off screen" into "a value is visibly truncated" |
| A "thousands separator" for big counters | `toLocaleString()` | a bare integer | UI-SPEC § Copywriting: no separators anywhere; it would be the only locale-dependent string in the app |

**Key insight:** every value these three screens render already has exactly one derivation site in this
repo, and most of those sites carry a JSDoc paragraph explaining why a second one would be a defect. The
whole phase is *plumbing existing derivations to new surfaces* — the moment a plan writes a second
derivation, it has introduced the `12-UI-SPEC.md` "two expressions of one rule" defect this project has
hit at least four times (`certLevelPlan.ts`, phase 13's shared classifier, `sanitizeAggregateMap`'s
citation drift, `localTodayRef`).

---

## Runtime State Inventory

> Included because this phase adds a persisted field to a blob that already exists on real devices.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `@nbb/progress/v4` in AsyncStorage on every installed device carries `telemetry.achievements = { unlocked: [...] }` and **no** `unseen` field. [VERIFIED: src/services/storage/types.ts `PROGRESS_KEY = '@nbb/progress/v4'`; `AchievementRecord = { unlocked: AchievementUnlock[] }`] | **Code edit only, NO data migration.** `sanitizeTelemetry` starts from `defaultTelemetryBlob()` and assigns field by field, so an existing v4 blob parses `status: 'ok'` with `unseen` defaulted. The **inverted** field makes that default (`[]`) also the D-13-correct value, so no backfill exists to write. |
| **Legacy keys** | `@nbb/progress/v3`, `@nbb/progress/v2`, `@nbb/personal-best/v1` remain on disk as migrate-on-read sources and are never deleted. | **None.** `migrateOrDefault(v4Raw, v3Raw, v2Raw, v1Raw)` produces a v4 blob whose `achievements` is the default; no v3/v2/v1 blob can carry an unseen set, and D-13 says a pre-field unlock is seen. |
| **Live service config** | **None — verified.** This project has no n8n, Datadog, Tailscale or Cloudflare surface. The only external service is Sentry, wired via `initCrashReporting()` in `app/_layout.tsx` and a no-op without `EXPO_PUBLIC_SENTRY_DSN`; it carries no screen names or mode strings this phase changes. | None |
| **OS-registered state** | **None — verified.** No Task Scheduler / launchd / pm2 / systemd surface. iOS orientation lock (`ScreenOrientation.OrientationLock.PORTRAIT_UP`) and the splash screen are set at runtime in `app/_layout.tsx`, not registered. | None |
| **Secrets / env vars** | `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_CERT`, `EXPO_PUBLIC_LEVELGEN_PROBE`, `EXPO_PUBLIC_SOAK` (via `src/devflags.ts`). **None is renamed or read by this phase.** `assert-eas-profiles.mjs` gates the production/profiling split and reports `production env clean; profiling SOAK unset OK`. | None |
| **Build artifacts** | **None — verified.** No `egg-info`, no compiled binary, no global npm install. `ios/PulsePaddle.xcodeproj` carries `IPHONEOS_DEPLOYMENT_TARGET = 16.4` (four occurrences) and `ios/Podfile:25` defaults to `'16.4'` — unchanged by this phase, but load-bearing for § Environment Availability. | None |
| **Doc artifacts that go stale** | `docs/ops/PROGRESS-STORAGE.md` § *"Every stored collection is bounded on READ as well as on write"* carries a four-row table of bounds and keep-directions; the new field adds a fifth row. `docs/ops/ACHIEVEMENTS.md` **Limit 2b is #35 stated in prose** and becomes false once D-11 ships. | **Both must be edited in this phase.** `PROGRESS-STORAGE.md` describing v3 for three phases is precisely how WINDOWS #27 sat unowned. |

**The canonical question — after every file in the repo is updated, what runtime systems still hold the
old shape?** Exactly one: the v4 blob on installed devices, and it needs **no** migration because the
inverted field's default is already the answer D-13 wants. That is the single strongest argument for the
inversion, over and above the correctness argument in § Pattern 4.

---

## Common Pitfalls

### Pitfall 1: `react-hooks/set-state-in-effect` is an ERROR here, and it follows `useCallback`

**What goes wrong:** the natural way to auto-start a mode — `useEffect(() => { startDailyRun(); }, [])`
— fails `npm run lint`, and CI runs `npm run lint -- --max-warnings 0` as its fourth step. The rule is
severity **2**, so `--max-warnings 0` is not even what catches it.

**Why it happens:** `eslint-config-expo/flat` pulls in `eslint-plugin-react-hooks` 7.1.1, whose
resolved config for `app/_components/*.tsx` sets `react-hooks/set-state-in-effect: [2]`,
`react-hooks/purity: [2]` and `react-hooks/refs: [2]`
[VERIFIED: `npx eslint --print-config app/_components/TitleScreen.tsx`, 2026-09-29 — full resolved
`react-hooks/*` list].

**Falsification attempt, run this session. The rule is interprocedural — it followed the `useCallback`:**

```
app/_components/__p4.tsx
  12:7  error  Error: Calling setState synchronously within an effect can trigger cascading renders
  10 |   useEffect(() => {
  11 |     if (entry === 'b') {
> 12 |       start();
     |       ^^^^^ Avoid calling setState() directly within an effect
  13 |     }
  14 |   }, [entry, start]);
  react-hooks/set-state-in-effect
✖ 1 problem (1 error, 0 warnings)
EXIT=1
```

(where `start = useCallback(() => { setN(1); setM(2); }, [])`)

**What does NOT silence it — also measured:**
- Guarding on state: `useEffect(() => { if (n === 0) setN(1); }, [n])` → **still errors**, same rule, `EXIT=1`.
- Guarding on a ref: silences `set-state-in-effect`, but reading `ref.current` in JSX then errors under
  `react-hooks/refs` (`9:24 error Error: Cannot access refs during render`). **No clean escape.**

**What DOES work — measured, `EXIT=0`:**
- `setState` inside a `.then()` callback (this is why `SelectScreen`'s shipped pattern is legal).
- `setTimeout(() => { start(); }, 0)` with a `clearTimeout` cleanup.
- `void Promise.resolve().then(() => { start(); })`.

**How to avoid:** use § Pattern 3's deferred dispatch, and § Pattern 2's `.then()` read.

**Warning signs:** a plan action that says "call `startDailyRun` on mount" without the word *deferred*.

### Pitfall 2: a clock read in a render body fails the build; a lazy initializer does not

**What goes wrong:** `const today = localDateKey(Date.now());` at the top of a component.

**Measured:**
```
  17:15  error  Error: Cannot call impure function during render
  `Date.now` is an impure function. …
> 17 |   const bad = Date.now(); // clock read during render
     |               ^^^^^^^^   react-hooks/purity
```

**But `useState(() => String(Date.now()))` lints clean (`EXIT=0`).** Both forms were in the same probe
file; only the render-body one was flagged.

**How to avoid:** read the clock inside the mount effect (§ Pattern 2's `const nowMs = Date.now()`), which
also keeps the clock read and the decision it justifies one statement apart — the rule
`startDailyRun`'s own comment states and the reason `localTodayRef` was deleted with three write sites
and zero reads.

### Pitfall 3: `maxFontSizeMultiplier` is INVISIBLE to jsdom — do not try to assert it from a render

**What goes wrong:** a plan writes `expect(el).toHaveAttribute('maxFontSizeMultiplier')` or queries for it.

**Why it happens:** `vitest.config.ts` aliases `react-native → react-native-web`, and
`grep -rn maxFontSizeMultiplier node_modules/react-native-web/dist/` returns **zero hits** — the prop is
dropped, not forwarded.

**Falsification attempt, run this session** (forced assertion to print the DOM):

```
AssertionError: expected '<div dir="auto" class="css-text-146c3…' to be 'SHOW_ME'
Received: "<div dir="auto" class="css-text-146c3p1 r-maxWidth-dnmrzs r-overflow-1udh08x
            r-textOverflow-1udbk01 r-whiteSpace-3s2u2q r-wordWrap-1iln25a">hello</div>"
```

rendered from `createElement(Text, { maxFontSizeMultiplier: 1.2, numberOfLines: 1 }, 'hello')`. **No
`maxFontSizeMultiplier` attribute appears at all.** (`numberOfLines={1}` *does* leave a trace — the
`r-overflow`/`r-textOverflow`/`r-whiteSpace`/`r-wordWrap` classes — but those are react-native-web
internal hashes and are brittle to assert on.)

**How to avoid:** the UI-SPEC already specifies the right instrument — a **source-text** gate, which is
the `tests/ui/PlayingHost.endless-host.test.ts` shape (`readFileSync` + regex over stripped code).

**Warning signs:** any acceptance criterion for the cap phrased as a `render()` assertion.

### Pitfall 4: the UI-SPEC's assertion 3 is RED ON ARRIVAL — a comment holds an eleventh `<Text`

**What goes wrong:** the UI-SPEC's third gate says *"`grep -rc '<Text'` over `src/` and `app/` outside
the twelve enumerated files must return **zero**."* Run as written today, it returns **1**.

**Measured.** `grep -rl '<Text' src app` returns **eleven** files, not ten:

| File | `<Text` lines | `<Text` occurrences | `</Text>` |
|---|---|---|---|
| src/runtime/overlays/ResultOverlay.tsx | 12 | 12 | 12 |
| src/runtime/overlays/DailyResultOverlay.tsx | 13 | 13 | 13 |
| src/runtime/overlays/PauseOverlay.tsx | 4 | 4 | 4 |
| src/runtime/overlays/CountdownOverlay.tsx | 1 | 1 | 1 |
| src/runtime/overlays/LevelErrorOverlay.tsx | 3 | 3 | 3 |
| src/runtime/HudStrip.tsx | 5 | 5 | 5 |
| src/runtime/GameScreen.tsx | 1 | 1 | 1 |
| app/_components/TitleScreen.tsx | 3 | 3 | 3 |
| app/_components/SelectScreen.tsx | 7 | 7 | 7 |
| app/_components/PlayingHost.tsx | 7 | 7 | 7 |
| **src/services/storage/types.ts** | **1** | **1** | **1** |
| **total** | **57** | **57** | **57** |

The eleventh is **prose**:

```
src/services/storage/types.ts:69: * **4 000-character** `levelId` survived the read path intact, as did `<Text>evil</Text>`
```

The UI-SPEC's 56 is correct for the ten enumerated *component* files. Assertion 3, as literally
specified, would fail on a file that is describing its own security history — **the exact defect
`scripts/assert-no-disabled-tests.mjs` and `scripts/assert-levelgen-thread.mjs` were both written
against**, and the one the UI-SPEC says phase 13 shipped twice ("a `numberOfLines` grep that counted its
own JSDoc").

**How to avoid:** the gate must **strip comments before matching** and **scope to `.tsx`**, following
`assert-no-disabled-tests.mjs`'s shape (`codeOnly` strip + a self-check that proves both directions
before the real scan runs). Note also that `grep -c` counts **lines, not occurrences** — today they
coincide in every file, but a new screen putting two `<Text` on one line would silently under-count.
Use `grep -o '<Text' | wc -l`.

### Pitfall 5: the dev row's `W{wave}` readout — the UI-SPEC and the shipped comment disagree

**What goes wrong:** the executor deletes either too much or too little from the `__DEV__` dev row.

**The conflict, verbatim from both sides:**

- Shipped source: *"D-05: TEMPORARY. Endless has no production entry this phase — Phase 14 ships the
  real Title route and **DELETES this Pressable and the wave readout beside it.**"*
  [VERIFIED: app/_components/PlayingHost.tsx:2669-2673]
- `14-UI-SPEC.md` § The multiplier: `app/_components/PlayingHost.tsx | 7, two deleted this phase`.

`PlayingHost` has exactly 7 `<Text` today: three `devSwitchLabel`s (`Lv {nn}`, tier, `Cert WC`),
`Endless`, `Daily`, the `mode === 'endless'` `devReadout` (`W{wave}`), and `Crash`. Deleting the two
Pressables leaves **5**; also deleting the wave readout leaves **4**. **Both numbers cannot be right,
and the count-equality gate pins whichever the executor chooses.**

**How to avoid:** make the plan state the post-change number explicitly and derive the gate's pinned
total from it. Recommendation: **follow the shipped source comment and delete the readout too** — it is
`mode === 'endless'`-gated dev chrome whose only producer was the control being removed, and the
Daily control's own comment records that a `D{n}` counterpart was rejected as ~30px for a number the
panel already shows. That gives `PlayingHost` **4** and a new enumerated total of
`4 + 12 + 13 + 4 + 1 + 3 + 5 + 1 + 7 + (new Title) + (new Statistics) + (new Achievements)`.

### Pitfall 6: `vitest -t` is a case-sensitive regex that exits 0 when it matches nothing

**Measured this session:**

```
$ npx vitest run tests/ui/TitleScreen.test.tsx -t 'no such case'
 Test Files  1 skipped (1)
      Tests  1 skipped (1)
EXIT=0

$ npx vitest run tests/ui/TitleScreen.test.tsx -t 'renders brand'
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

**How to avoid:** bind every gate on the word **`passed`**, never on `$?` and never on the absence of
`skipped`. Escape regex metacharacters in a test name — a name containing `(D-11)` needs `\(D-11\)` or
the filter silently matches nothing and reports success.

### Pitfall 7: Title's `{n} new` is only capped at 12 if the read path says so

**What goes wrong:** the UI-SPEC's E2 `long-text` row states *"the only variable is `n`, capped at 12 by
the catalog."* That cap is a property of the **read path**, not of the catalog: `unseen` is bounded by
`ACHIEVEMENT_UNLOCK_BOUND = 64`, so a hand-edited blob could render `64 new` unless the sanitizer
intersects `unseen` with the parsed `unlocked` set (which `isKnownAchievementId` already caps at the
catalog's size).

**Why it matters:** `64 new` is 6 characters where the UI-SPEC budgets for 5–6, so it is **not** a layout
defect — but the UI-SPEC's stated cap would be a false claim, which is the category of defect this repo
has been burned by repeatedly. AsyncStorage is plaintext, so on a rooted device this field is fully
attacker-controllable — the same posture `sanitizeAchievementUnlock`'s JSDoc names for the id.

**How to avoid:** intersect on read, and assert it: *"an `unseen` id not present in `unlocked` renders no
mark and does not raise the Title count."*

### Pitfall 8: `mergeHighWatermark`'s telemetry half SUMS — never double-hydrate

**What goes wrong:** a second `hydrateOnce()` against the same disk blob doubles every lifetime counter,
and the next `persist` writes the inflated values back **permanently**. Statistics is the first screen
that would make that visible.

**Why it happens / how it is prevented:** `ensureHydrated()` is single-flight *because* of this, and its
JSDoc says so [VERIFIED: src/services/storage/asyncStorageStore.ts:330-348 — *"`hydrateOnce` folds the
disk blob into memory with `mergeHighWatermark`, whose telemetry half SUMS lifetime counters — so
running it twice against the same disk blob would double every counter and the next `persist` would
write the inflated values back permanently."*].

**How to avoid:** both new screens must go through `createDefaultProgressStore()` (the process
singleton), never construct their own store. Do **not** call `__resetSharedProgressStoreForTests()`
outside tests, and do not add a second `createAsyncStorageProgressStoreFrom` call site.

---

## Code Examples

### Reading the snapshot once on a new screen (verified pattern)

```tsx
// Source: app/_components/SelectScreen.tsx:43-66 (shipped) — copy verbatim in shape
export function StatisticsScreen({ onBack, store: storeProp }: Props) {
  const insets = useSafeAreaInsets();
  const store = useMemo(() => storeProp ?? createDefaultProgressStore(), [storeProp]);
  const [progress, setProgress] = useState<ProgressBlob>(() => defaultProgressBlob());

  useEffect(() => {
    let cancelled = false;
    void store
      .getSnapshot()
      .then((snap) => { if (!cancelled) setProgress(snap); })
      .catch(() => { if (!cancelled) setProgress(defaultProgressBlob()); });
    return () => { cancelled = true; };
  }, [store]);
  // … render progress.telemetry.lifetime and progress.telemetry.byMode DIRECTLY (D-15)
}
```

### The Achievements screen: snapshot the unseen set, render from it, write once

```tsx
// UI-SPEC § The seen-mark: the rendered marks must NOT change while the screen is open.
const [progress, setProgress] = useState<ProgressBlob>(() => defaultProgressBlob());
// A SEPARATE piece of state, frozen at the moment of the read — NOT derived from `progress`,
// because clearing `unseen` must not clear the marks the player is looking at (UI-SPEC step 4).
const [unseenAtMount, setUnseenAtMount] = useState<readonly string[]>([]);

useEffect(() => {
  let cancelled = false;
  void store
    .getSnapshot()
    .then((snap) => {
      if (cancelled) return;
      setProgress(snap);
      setUnseenAtMount(snap.telemetry.achievements.unseen);
      // Opening the screen IS the "seen" event (D-12). Optional-called: the five mocked-store
      // harnesses are bare object literals and hand this code `undefined` at runtime.
      void store.markAchievementsSeen?.();
    })
    .catch(() => { if (!cancelled) setProgress(defaultProgressBlob()); });
  return () => { cancelled = true; };
}, [store]);

const unlockedIds = useMemo(
  () => new Set(progress.telemetry.achievements.unlocked.map((e) => e.id)),
  [progress],
);
const unseenIds = useMemo(() => new Set(unseenAtMount), [unseenAtMount]);

// D-10: ACHIEVEMENT_CATALOG declaration order, never re-sorted.
// Marker strings are the UI-SPEC's three exact literals.
{ACHIEVEMENT_CATALOG.map((a) => {
  const unlocked = unlockedIds.has(a.id);
  const marker = !unlocked ? 'Locked' : unseenIds.has(a.id) ? 'New' : 'Unlocked';
  // … name from a.name (never a stored string), description from a.description in BOTH states
})}
```

**Note the `.catch` asymmetry, and it is deliberate:** a failed read renders all twelve `Locked` and
**writes nothing**, so nothing is marked seen and the state is fully recovered by reopening the screen
(UI-SPEC § Error states, "Two named costs, accepted").

### The two new `GameHost` branches (SC-5 at the render tree)

```tsx
// Source: extends app/_components/GameHost.tsx — ABOVE the final PlayingHost return,
// exactly as the shipped 'select' branch is.
if (shellPhase === 'stats') {
  return (
    <View style={styles.root}>
      {harnessAwake}
      <StatisticsScreen onBack={() => setShellPhase('title')} />
    </View>
  );
}

if (shellPhase === 'achievements') {
  return (
    <View style={styles.root}>
      {harnessAwake}
      <AchievementsScreen onBack={() => setShellPhase('title')} />
    </View>
  );
}

// … the existing PlayingHost return stays last and is therefore unreachable from either branch.
```

### The source-text gate shape this repo already uses

```ts
/**
 * @vitest-environment node
 */
// Source: the shape of tests/ui/PlayingHost.endless-host.test.ts (shipped)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FILES = [ /* the enumerated .tsx files, closed list */ ];
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

it('every Text in every enumerated file carries maxFontSizeMultiplier', () => {
  for (const rel of FILES) {
    const code = stripComments(readFileSync(join(__dirname, '../..', rel), 'utf8'));
    const texts = (code.match(/<Text/g) ?? []).length;            // occurrences, not lines
    const props = (code.match(/maxFontSizeMultiplier/g) ?? []).length;
    expect(props, rel).toBe(texts);
    expect(code.match(/maxFontSizeMultiplier=\{1/g), rel).toBeNull();  // assertion 2: no literal
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Text.defaultProps.maxFontSizeMultiplier = 1.2` as a global cap | Per-node prop, or a wrapper component | React 19 removed `defaultProps` on function components | **There is no global lever in this stack.** The UI-SPEC's twelve-file enumeration is necessary, not merely chosen. [ASSUMED — the React 19 `defaultProps` removal is training knowledge; what IS verified this session is that `grep -rn maxFontSizeMultiplier node_modules/react-native/Libraries/` finds no JS-side global setter in 0.86.3] |
| `unmountOnBlur: true` on a react-navigation screen | `freezeOnBlur` (freezes React updates) | react-navigation 6 → 7 era | `freezeOnBlur` is **not** `unmountOnBlur`. It suspends re-renders via `react-freeze`; the component stays mounted and UI-thread work continues. Reaching for it as an SC-5 fix would be wrong. [VERIFIED: DelayedFreeze.js, quoted in § Pattern 1] |
| `useEffect` + synchronous `setState` for a mount read | `setState` in an async callback | `eslint-plugin-react-hooks` 7.x (`set-state-in-effect`, severity 2 under `eslint-config-expo` 57) | The whole shape of § Pattern 2. An SDK-50-era snippet will not lint in this tree. |
| Expo SDK 50-era `Text` docs | SDK 57 ships RN 0.86 | SDK 57.0.0 | `maxFontSizeMultiplier` semantics are unchanged from 0.7x, but read the installed package: the SDK 57 API index documents **no** RN core components, so there is no v57 page for `Text` to cite. |

**Deprecated / outdated in this repo:**
- The `3xl` (64px) spacing token: **no longer used anywhere** once `playButton.marginTop: 64` becomes
  `lg` (UI-SPEC names it a removal candidate, not an available token).
- `TitleScreen`'s `accessibilityLabel="Start game"` and `playButton`/`playLabel` styles: the single
  `Play` control becomes three mode entries. **`tests/ui/TitleScreen.test.tsx` and
  `tests/ui/GameHost.test.tsx` both query `getByRole('button', { name: 'Start game' })` and will need
  updating** — two files, three query sites.
- `docs/ops/ACHIEVEMENTS.md` **Limit 2b** (#35 in prose) becomes false when D-11 ships.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Gating the `unseen` write on `args.outcome === 'abandoned'` is a faithful proxy for "no result panel was rendered" | § Pattern 4 | If a win/lose path can navigate away without raising a panel, that unlock is never marked and #35 survives in a narrower form. I traced all four shipped exits (pause `Menu`, hardware back, pause `Retry`, dev tier change) and all route through `handleMenuPress` or `recordInFlightEndlessRun`, both of which pass `'abandoned'` — but this is a reading of control flow, not a test. **Needs a decision checkpoint** (§ Open Question 1). |
| A2 | `useSyncExternalStore` is unusable here because the store exposes no `subscribe` | § Alternatives Considered | If a subscribe seam exists that grep missed, the rejection is weaker than stated — though the recommendation would not change, since a once-per-entry read needs no subscription. This rests on an **absence** in `src/services/storage/**` and is tagged accordingly. |
| A3 | React 19 removed `defaultProps` on function components, so there is no global `maxFontSizeMultiplier` lever | § State of the Art | If a global lever exists, the twelve-file enumeration is more work than necessary — but the UI-SPEC's three assertions are approved and binding either way, so nothing in the plan changes. What is **verified** is only that no JS-side setter exists in `node_modules/react-native@0.86.3/Libraries/`. |
| A4 | Widening Title's read from `getBest()` to `getSnapshot()` costs nothing | § Pattern 2 | Both go through the same single-flight `ensureHydrated()` and `getBest()` returns the same `memory.bestScore` that `getSnapshot()` clones, so the only added cost is the `cloneBlob`. That clone is per-entry, not per-frame. Rated low risk, but it is a reading of the store rather than a measurement of the clone's cost. |
| A5 | Deleting the `W{wave}` dev readout is the right resolution of the Pitfall 5 conflict | § Pitfall 5 | Choosing wrong pins the count-equality gate to a wrong number. The shipped comment says delete it; the UI-SPEC's table implies keep it. **The plan must state the post-change number explicitly rather than inherit either.** |
| A6 | `hasResultFor` expects the history's dates in sorted order (its parameter is named `sortedKeys`) and `record.history` is stored sorted | § Pattern 2 | If the stored history can be unsorted, Title's played-today fact could be wrong on an edge case. `startDailyRun` already calls it exactly this way (`dailyRecordRef.current.history.map((e) => e.date)`), so Title inherits whatever guarantee that path has — but I did not read `mergeDailyRecord`'s insertion order this session. |
| A7 | No project-skill rules exist to honour | § Project Constraints | `ls .claude/skills .agents/skills` found neither directory. If a skill lives at another path, its conventions were not consulted. |

---

## Open Questions

1. **Where does the `unseen` write belong — the store (gated on `outcome`) or the host (gated on the
   panel actually rendering)?**
   - *What we know:* `args.outcome` is already in scope at both stores' unlock-evaluation tail, so a
     store-side gate costs one added pure merge and keeps **one write per run end**, which the D-10/F-26
     contract cares about. The host-side alternative needs a second persist inside the same tick, racing
     the first. The `if (outcome !== 'abandoned')` gate governing the platform payload sits one function
     away in `PlayingHost` and makes the identical judgement for the identical reason.
   - *What's unclear:* the store-side gate puts a **presentation** fact ("a panel rendered") into the
     services tier. Every existing gate of that shape lives in `app/`.
   - *Recommendation:* take the store-side gate, and write the reason into `markAchievementsUnseen`'s
     JSDoc in the register this file uses for exactly this kind of decision. **Flag it as a decision
     checkpoint in the plan** — it is a data-shape decision on a one-way field (D-11's own reversibility
     rating).

2. **Should the `MAX_FONT_SCALE` gate's "no escapee" assertion be structural rather than enumerative?**
   - *What we know:* the UI-SPEC is explicit that "an enumeration cannot detect a node nobody enumerated,"
     which is why assertion 3 exists. But assertion 3 is itself an enumeration-complement — it is red
     today on a doc comment (§ Pitfall 4), and it can only ever say *that* a thirteenth file appeared,
     never that its `Text` nodes are capped.
   - *What's unclear:* an `AppText` wrapper would make the cap structural, but it collapses
     `maxFontSizeMultiplier` to one occurrence and **reds assertion 1**, so it contradicts an approved
     contract.
   - *Recommendation:* ship the UI-SPEC's three assertions as specified, with the Pitfall 4 corrections
     (strip comments, scope to `.tsx`, count occurrences not lines), and **open a window** for the
     wrapper rather than re-opening the contract. Both are gates over the same fact and the wrapper is a
     strictly later, larger change.

3. **Can the six UI-SPEC backstops be discharged on the simulator available on this machine?**
   - *What we know:* partially — see § Environment Availability. Dynamic Type is settable
     (`xcrun simctl ui <device> content_size`) and an iPhone SE (3rd generation) simulator is **booted
     right now** as `UAT-SE3`. But 320×568 is not reachable: the `iPhone SE (1st generation)` device type
     exists and `simctl create` against the only installed runtime **fails**, and `simctl ui` exposes no
     display-zoom option.
   - *Recommendation:* split each backstop into the part the simulator can reach (Dynamic Type growth at
     375×667, backstop 5's *direction*) and the part it cannot (fit at 320×568, backstops 1–4 and 6).
     **#29 may still only be marked fixed after the 320×568 reading its own annotation demands.**

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests, assert scripts | ✓ | **v25.6.0** — note `package.json` `engines` says `>=24 <25`, so the local runtime is **out of the declared range** while CI pins `node-version: '24'` | CI is the authority; local runs pass today |
| `npm test` (vitest + 8 assert scripts) | every gate | ✓ | vitest 5.0.1 | — |
| `npm run lint -- --max-warnings 0` | the only `boundaries` observer | ✓ | eslint 9.39.5 | — |
| `npm run typecheck` | the compiler-forced sites 1–3 in § Pattern 4 | ✓ | typescript ~6.0.3 | — |
| `xcrun simctl` | backstop 5 (Dynamic Type) | ✓ | Xcode toolchain present | — |
| A **booted** iPhone SE (3rd gen) simulator at 375×667 | backstop 5's direction | ✓ | `UAT-SE3` (`F014B81C-…`) **Booted**; `iPhone 17` also booted | — |
| A **320×568** viewport | backstops 1, 2, 3, 4, 6 | ✗ | — | **Physical 375×667 device with Display Zoom.** No fallback in software. |
| iOS runtime ≤ 15 (to host an iPhone SE 1st gen simulator) | same | ✗ | only `iOS 26.5 (23F77)` installed | Moot — `IPHONEOS_DEPLOYMENT_TARGET = 16.4`, so the app would not install on iOS 15 anyway |

**The 320×568 finding, with the falsification attempt pasted.** The memory note *"blocked on hardware
was wrong 3×; simctl creates device types"* was worth testing, and the device type genuinely exists:

```
$ xcrun simctl list devicetypes | grep 'SE (1st'
iPhone SE (1st generation) (com.apple.CoreSimulator.SimDeviceType.iPhone-SE)
```

But creating it fails against the only installed runtime:

```
$ xcrun simctl create "PROBE-SE1" com.apple.CoreSimulator.SimDeviceType.iPhone-SE \
                                  com.apple.CoreSimulator.SimRuntime.iOS-26-5
An error was encountered processing the command (domain=com.apple.CoreSimulator.SimError, code=403):
Incompatible device
Unable to create a device for device type: iPhone SE (1st generation)
(com.apple.CoreSimulator.SimDeviceType.iPhone-SE), runtime: iOS 26.5 (26.5 - 23F77)
```

And `simctl ui` has **no** resolution or display-zoom option — its complete supported set is:

```
$ xcrun simctl ui booted        # (prints usage)
Supported Options:
    appearance
    appearance [light | dark]
    content_size
    content_size [increment | decrement | desired_size]
    increase_contrast
    increase_contrast [enabled | disabled]
```

**Conclusion:** #28's route ("Display Zoom on a physical 375×667 device") holds on this machine, and the
binding reason is `IPHONEOS_DEPLOYMENT_TARGET = 16.4` × available runtimes, not the absence of the device
type. Also measured: the booted simulator's current content size is `large` (the default), so backstop 5
starts from a known baseline.

**Missing dependencies with no fallback:**
- A 320×568 viewport. **Backstops 1, 2, 3, 4 and 6 cannot be discharged in software on this machine.**
  They are `unrun-verify` window entries owned by the phase's final plan, exactly as `14-UI-SPEC.md`
  § Backstops specifies.

**Missing dependencies with fallback:**
- None. Backstop 5's *direction* is simulator-reachable at 375×667 via `content_size`; its *320×568
  reading* is not, and #29's own annotation forbids marking it fixed without that reading.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **vitest 5.0.1** + `@testing-library/react` 16.3.3 + jsdom 29.1.1 |
| Config file | `vitest.config.ts` — `resolve.alias { 'react-native': 'react-native-web' }`, `environment: 'node'`, `include: ['src/core/**/*.test.ts','tests/**/*.test.ts','tests/**/*.test.tsx']` |
| jsdom opt-in | **per-file docblock** `/** @vitest-environment jsdom */`, the shipped `tests/ui/*.test.tsx` shape. Source-contract tests use `@vitest-environment node` |
| Quick run command | `npx vitest run tests/ui` — **measured 21 files / 218 tests / 3.53 s** |
| Full suite command | `npm test` — vitest (`112 files / 881 passed \| 1 skipped`, 10.22 s) **then** eight assert scripts; **measured 13.7 s wall total**, all green 2026-09-29 |
| Baseline | **GREEN.** `npm test` ✓, `npm run lint -- --max-warnings 0` ✓ exit 0, `npm run typecheck` available |

### Phase Requirements → Test Map

> Sampling logic: each success criterion is observed by at least **two** independent instruments where
> the criterion has both a source-placement half and a behavioural half — the rule
> `tests/ui/PlayingHost.endless-host.test.ts` was written on. SC-1/SC-2/SC-3 sample at **≥2×** their
> single change frequency (per task commit); SC-4/SC-5's source halves sample on **every** commit
> because a render-tree regression is invisible in a passing behavioural case.

| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| **N-UI-01** / SC-1 | Title renders exactly seven rows; three distinct mode entries | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'seven rows'` | ❌ Wave 0 (file exists, case is new) |
| **N-UI-01** / SC-1 | Daily meta **absent** when unplayed, `done · Streak {n}` when played — **each absence case with a positive control in the same case** | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'daily meta'` | ❌ Wave 0 |
| **N-UI-01** | Tapping Endless / Daily reaches `PlayingHost` with the right entry mode | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'entry mode'` | ❌ Wave 0 (file exists) |
| **N-UI-01** | Title's `Achievements` meta absent at `n = 0`, `1 new` / `12 new` at 1 / 12 | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'new'` | ❌ Wave 0 |
| **N-STAT-03** / SC-2 | Exactly 3 lifetime rows and exactly 7 `By mode` rows, in `PLAYABLE_LEVEL_ORDER` then Endless then Daily | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'row order'` | ❌ Wave 0 (**new file**) |
| **N-STAT-03** / SC-2 | The Endless row's meta contains no `won`, in every state | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'endless meta'` | ❌ Wave 0 |
| **N-STAT-03** / SC-2 | **`getSnapshot()` is called exactly ONCE per mount** and never on re-render — a counting spy, not an eyeball | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'reads once'` | ❌ Wave 0 |
| **N-STAT-03** / SC-2 | Rendering the same snapshot twice produces identical output | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'idempotent'` | ❌ Wave 0 |
| **N-STAT-03** | A level with no `byMode.campaign` entry renders the same strings as an all-zero entry | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'zero'` | ❌ Wave 0 |
| SC-3 / D-08 | All twelve descriptions render in **both** states, asserted over the **locked** state specifically | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'locked description'` | ❌ Wave 0 (**new file**) |
| SC-3 / D-10 | Twelve entries in `ACHIEVEMENT_CATALOG` declaration order, and **the order does not change** when the unlocked set changes | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'catalog order'` | ❌ Wave 0 |
| D-11 / D-12 | `Locked` / `Unlocked` / `New` appear in the right states; **`New` survives a re-render** (the mount snapshot is not re-derived) | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'marker'` | ❌ Wave 0 |
| D-12 | The seen-write happens **once** per mount and the rendered marks do not change after it | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'writes once'` | ❌ Wave 0 |
| D-12 | An `abandoned` run adds to `unseen`; a `win`/`lose` run does **not** | unit (node) | `npx vitest run tests/achievements.record.test.ts -t 'unseen'` — **both stores, parameterised separately** | ❌ Wave 0 (file exists) |
| D-13 | A v4 blob with **no** `unseen` field parses `status: 'ok'` with `unseen: []`, `v` still 4, and renders **no** marks | unit (node) | `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen'` | ❌ Wave 0 (file exists) |
| D-14 | Read path: unknown id **dropped**; drop-then-dedupe-then-**bound** order; keep-first; an `unseen` id absent from `unlocked` renders nothing and does not raise Title's count | unit (node) | `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen bound'` | ❌ Wave 0 |
| D-14 / site 2 | An **endless** and a **daily** run-end write both preserve `unseen` (the `cloneTelemetryBlob` trap) | unit (node) | `npx vitest run tests/daily.record.test.ts -t 'unseen'` | ❌ Wave 0 |
| D-14 / site 3 | A memory↔disk reconcile preserves `unseen` (the `mergeTelemetryBlobs` trap) | unit (node) | `npx vitest run tests/daily.record.test.ts -t 'reconcile unseen'` | ❌ Wave 0 |
| **N-UI-02** / SC-4 | Both new screens apply `useSafeAreaInsets()` and the `#1a1a2e` root; **no** ads/shop/login string anywhere | unit (jsdom) + source | `npx vitest run tests/ui/StatisticsScreen.test.tsx tests/ui/AchievementsScreen.test.tsx -t 'shell contract'` | ❌ Wave 0 |
| **N-UI-02** / SC-4 | `#6B7280` appears **zero** times in either new screen; `#F2CC8F` and `#E85D5D` likewise (fences 1–3) | source contract | `npx vitest run tests/ui/shellColorFences.test.ts` | ❌ Wave 0 (**new file**) |
| **N-UI-02** / SC-5 | `GameHost` mounts **no** `PlayingHost` in the `'stats'` or `'achievements'` branch — asserted at the **render tree**, with `PlayingHost` stubbed to emit a sentinel | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'no PlayingHost'` | ❌ Wave 0 (file exists) |
| **N-UI-02** / SC-5 | The soak `runCycle` sets neither new phase; `CERT_HARNESS` still opens on `'playing'` | source contract | `npx vitest run tests/ui/GameHost.test.tsx -t 'CERT'` | ✅ exists — **extend** the shipped `not.toMatch(/setShellPhase\('select'\)/)` case |
| **N-UI-02** / SC-5 | `Back` on both screens sets `shellPhase` to `'title'` **and to nothing else** | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'Back'` | ❌ Wave 0 |
| D-18 / #29 | `MAX_FONT_SCALE === 1.2`; per-file `maxFontSizeMultiplier` occurrences **==** `<Text` occurrences; **no** `maxFontSizeMultiplier={1` literal; **no** `<Text` in an unenumerated `.tsx` | source contract (3 assertions) | `npx vitest run tests/ui/textScale.gate.test.ts` | ❌ Wave 0 (**new file**) |
| Error states | A rejected `getSnapshot()` renders zeros / all-locked with **no error copy anywhere**, with a positive control in the same case | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx tests/ui/AchievementsScreen.test.tsx -t 'read failure'` | ❌ Wave 0 |
| Dev row | `Endless` and `Daily` `__DEV__` controls are **gone**; `handleRunEnded`'s dep array is still on one line | source contract | `npx vitest run tests/ui/PlayingHost.endless-host.test.ts` | ✅ exists — its regex anchor must still match |

**Manual-only, with justification (jsdom performs no layout and supplies no insets):** every height,
width, line-count, visible-entry-count and character-budget claim. These are `unrun-verify` windows, not
test gaps. See the backstop table below.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/ui` (3.53 s) **plus** `npm run lint -- --max-warnings 0`.
  Lint is in the per-commit loop **because three of this phase's rules are severity-2 errors that a
  passing test cannot see** (`set-state-in-effect`, `purity`, `refs`) and because lint is the only
  observer of `boundaries/dependencies` for the new `textScale` import.
- **Per storage task commit:** additionally `npx vitest run tests/storage.progress-v4.test.ts tests/daily.record.test.ts tests/achievements.record.test.ts` — the four-site field must be sampled at every commit that touches `src/services/storage/**`, because site 4 (`sanitizeAchievementRecord`) is the one the compiler cannot see.
- **Per wave merge:** `npm run typecheck && npm test` (13.7 s) — `typecheck` first, because sites 1–3 of the new field are compiler-caught and a `TS2741` is cheaper to read than a failing behavioural case.
- **Phase gate:** full `npm test` green **plus** `npm run lint -- --max-warnings 0` green **plus** the six backstops recorded with dates, before `/gsd-verify-work`.

**Gate binding rule (measured, § Pitfall 6):** bind on the word `passed`
(`… | grep -qE 'Tests +[0-9]+ passed'`). An unmatched `-t` prints `1 skipped` and **exits 0**. Escape
parentheses in any `-t` pattern.

**Red-proof rule:** all three `MAX_FONT_SCALE` assertions must be red-proofed before being trusted — the
UI-SPEC says so in terms ("a gate this document has just been corrected about is not one to take on
trust"), and § Pitfall 4 shows assertion 3 is red on arrival for the wrong reason. Follow
`assert-no-disabled-tests.mjs`'s shape: a self-check that proves both directions before the real scan.

### Backstops — machine-checkable vs. human-only

| # | UI-SPEC backstop | Machine-checkable? | Instrument |
|---|---|---|---|
| 1 | **Title vertical fit** — 7 rows, 468/548 at `m=1`, 517.2 at the cap; all seven rows visible and tappable, no scroll | **No — human only** | 320×568 via Display Zoom on physical 375×667. jsdom performs no layout. Partial machine half: assert Title is **not** a `ScrollView`/`FlatList` and has no `contentContainerStyle` (source contract) |
| 2 | **Brand wraps to exactly two lines at 320 pt**, still two at the cap | **No — human only** | Wrap claims are the class this project has got wrong. Partial machine half: assert `DISPLAY_NAME` is read from `app/_brand.ts` and never a literal (`assert-brand-name.mjs` already covers the drift half) |
| 3 | **Statistics vertical fit** — 458/548, 522.4 at the cap, no scroll | **No — human only** | As #1. Machine half: **three** lifetime rows and **seven** table rows exactly (jsdom), which is what the budget is computed from — so a row-count regression is caught even though the height is not |
| 4 | **Achievements scroll** — `Back` visible and tappable **at maximum scroll**; first two entries complete; no clipped last entry | **No — human only** | Machine half, and it is the load-bearing one: assert **at the render tree** that `Back` and the heading are **outside** the `ScrollView` subtree. That is the entire content of the rule D-03 inherits, and it *is* observable in jsdom |
| 5 | **`MAX_FONT_SCALE = 1.2` discharges #29** — binding `ResultOverlay` campaign-win case shows `Menu` fully at `xxxLarge` **and** at an AX size, at 320×568 | **Partially** | The *direction* is simulator-reachable: `xcrun simctl ui UAT-SE3 content_size <size>` at 375×667 (current value measured: `large`). The **320×568 reading #29's annotation demands is not.** **Do not close #29 on a green `npm test`** — that is the false-gate failure this project has shipped three times |
| 6 | **Horizontal budgets at Label 14** — Daily meta at a 5-digit streak (227.8/240), `By mode` meta at 20 chars (177.7), name + `Unlocked` (221.6/272) | **No — human only** | Machine half: `numberOfLines={1}` present on every fixed-width row (source contract). Record **which of the two failure directions occurred** — a truncation means the copy shortens with no height cost; a **wrap** grows the row by 20 px and the screen's vertical budget absorbs it (Title has 30.8 pt of spare at the cap, so one wrapped meta survives and two do not) |

**#35 is annotated, not opened.** It is discharged by shipping the mark: its *appearance* rides backstop
4 and its *logic* rides the D-11/D-12 jsdom cases above. It is a placement obligation, not a layout claim.

### Wave 0 Gaps

- [ ] `tests/ui/StatisticsScreen.test.tsx` — **new file**; covers N-STAT-03, SC-2, E3, E4, error states
- [ ] `tests/ui/AchievementsScreen.test.tsx` — **new file**; covers SC-3, D-08, D-10, D-11, D-12, E5
- [ ] `tests/ui/textScale.gate.test.ts` — **new file**; the three assertions, comment-stripped, `.tsx`-scoped, occurrence-counted, all three red-proofed
- [ ] `tests/ui/shellColorFences.test.ts` — **new file**; the three colour fences as source contracts
- [ ] `tests/ui/TitleScreen.test.tsx` — **extend**; and **fix** the shipped `getByRole('button', { name: 'Start game' })` query, which the seven-row Title removes
- [ ] `tests/ui/GameHost.test.tsx` — **extend**; the `'Start game'` query appears here too, plus the two new branches, the entry-mode dispatch, the `Back` edges, and the soak/CERT source cases
- [ ] `tests/storage.progress-v4.test.ts` — **extend**; D-13 default, D-14 read path, the bound and the `unlocked` intersection
- [ ] `tests/daily.record.test.ts` — **extend**; the `cloneTelemetryBlob` and `mergeTelemetryBlobs` sites, both stores
- [ ] `tests/achievements.record.test.ts` — **extend**; the abandoned-vs-announced write, both stores parameterised separately
- [ ] Framework install: **none needed** — vitest 5.0.1, jsdom 29.1.1 and `@testing-library/react` 16.3.3 are installed and the suite is green

*(No `conftest`-equivalent is needed: this suite has no shared fixture file. The `vi.mock('react-native-safe-area-context', …)` stub is repeated per file by convention — copy it, do not extract it, or 21 files change for one refactor.)*

---

## Security Domain

`security_enforcement` is not `false` in `.planning/config.json` (the key is absent), so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **no** | No accounts, no login. `PROJECT.md` § Out of Scope rules the category out and `06-D-18` restates it |
| V3 Session Management | **no** | No sessions, no network identity |
| V4 Access Control | **no** | Single-user local app; no multi-tenant surface |
| **V5 Input Validation** | **yes — the whole of this phase's security surface** | `parseBlob.ts`'s sanitizer chain. AsyncStorage is **plaintext**, so on a rooted device every field these three screens render is attacker-controllable. The new `unseen` field needs the same treatment `sanitizeAchievementUnlock` already carries: `isKnownAchievementId` on every id (never coerce), the `ACHIEVEMENT_UNLOCK_BOUND` cap applied **after** the drop loop, and an intersection with the parsed `unlocked` set |
| V6 Cryptography | **no** | Nothing is signed or encrypted; the blob is deliberately plaintext and that posture is accepted (T-12-06) |
| V7 Error Handling / Logging | **partially** | No error copy anywhere, by contract. Every read failure degrades to a default, downward, silently. The `__DEV__` console paths this phase touches are dev-only and two of them are deleted |
| V12 Files & Resources | **no** | No file I/O beyond AsyncStorage |
| V13 API | **no** | No network calls. `platform.ads/purchases/accounts` are no-ops (`06-D-18` / T-06-02) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A hand-edited blob injects an unknown achievement id that reaches a rendered `Text` (**T-13-01**, live) | Tampering | `isKnownAchievementId` on read, **plus** the UI-SPEC's rule that the screen renders `ACHIEVEMENT_CATALOG[i].name`, never a stored string. **Both halves, and the new `unseen` field owes both.** |
| An unbounded stored collection inflates on parse (**WINDOWS #27**, `fixed`) | Denial of Service | The pattern rule: a collection must have **the bound or the id validation and must not have neither**. `unseen` should have both — bounded at `ACHIEVEMENT_UNLOCK_BOUND`, ids validated, then intersected with `unlocked` |
| A stored count is rendered as a UI magnitude claim (**new, T-14 candidate**) | Tampering / Spoofing | Title's `{n} new` is `unseen.length`. Unintersected, a hostile blob renders `64 new` and the UI-SPEC's "capped at 12 by the catalog" becomes false. § Pitfall 7 |
| An over-long stored string reaches a fixed-width row (**T-12-15**, **RUN_LOG_LEVEL_ID_MAX**) | Tampering | Not reached this phase: D-15 **does not render `recentRuns`**, which is the surface `RUN_LOG_LEVEL_ID_MAX` was added for. Every string the three screens render is either a fixed English literal or an authored catalog string. **If a later phase renders `recentRuns`, this row goes live.** |
| A constant declared as the single source of a number is read by nothing in production (**the `ACHIEVEMENT_LINES_MAX` family**) | *(not STRIDE — an integrity-of-controls defect)* | `MAX_FONT_SCALE`'s **assertion 2** exists for exactly this: a file writing `maxFontSizeMultiplier={1.2}` as a literal passes count-equality identically to one importing the constant. Editing the constant would then change no rendered text while the gate stayed green |
| A gate names something that does not exist or reaches less than stated | *(same family)* | § Pitfall 3 (the prop is invisible to jsdom), § Pitfall 4 (assertion 3 is red on arrival), § Pitfall 6 (`-t` exits 0 on no match). Three instruments in this phase would have measured something other than what they name |

**No new threat requires a new control type.** Every mitigation above is an existing pattern in
`parseBlob.ts` applied to one more field, or an existing gate shape applied to one more constant.

---

## Sources

### Primary (HIGH confidence) — read in this repository or in `node_modules`, 2026-09-29

- `app/_components/GameHost.tsx` — `ShellPhase`, the title read effect, the soak `runCycle`, the CERT initial phase
- `app/_components/TitleScreen.tsx` (89 lines), `SelectScreen.tsx` (288 lines) — the shipped row/read patterns
- `app/_components/PlayingHost.tsx` (2 848 lines) — `startDailyRun` (read-only branch at :1945-1993, readiness gate at :1996), `handleRunEnded` (:1039-1247, dep array at :1246), `handleMenuPress` (:1535-1541), `recordInFlightEndlessRun` (:1568), `publishUnlockedAchievements` (:1028), `publishDailyPanel`, the dev row (:2639-2730), the phase-14 notes at :284-289, :2669-2673, :2685-2698
- `src/services/storage/types.ts` — `ProgressBlob`, `TelemetryBlob`, `AchievementRecord`, `ACHIEVEMENT_UNLOCK_BOUND = 64`, `AGGREGATE_MAP_BOUND = 64`, `RUN_LOG_LEVEL_ID_MAX = 32`, `DAILY_HISTORY_BOUND = 400`, `DAILY_STREAK_WALK_CAP = 36 525`, `RecordRunEndResult`'s mocked-store warning, and the stray `<Text` at :69
- `src/services/storage/parseBlob.ts:590-672, 700-781` — `sanitizeAchievementUnlock`, `sanitizeAchievementRecord` (drop → dedupe → bound), `sanitizeAggregateMap`, `sanitizeTelemetry`
- `src/services/storage/telemetry.ts:63-93, 233-260, 533, 820-912` — `cloneTelemetryBlob` (D-23's site), `mergeAchievementUnlocks`, `currentDailyStreak`, `mergeAchievementRecords` (the earliest-wins inversion), `mergeTelemetryBlobs`
- `src/services/storage/asyncStorageStore.ts:142-158, 271-348, 520-563` — the singleton, `persist`, `hydrateOnce`, `ensureHydrated`'s summing warning, `getSnapshot` → `cloneBlob`
- `src/services/storage/memoryStore.ts:102-224` — the hand-mirrored unlock-evaluation tail
- `src/services/storage/catalog.ts:14-20` — `PLAYABLE_LEVEL_ORDER`
- `src/services/achievements/catalog.ts` — twelve entries with names and descriptions, `ACHIEVEMENT_NAME_MAX = 16` (:202), `isKnownAchievementId` (:723)
- `src/services/daily/{index,streak,dateKey}.ts` — `hasResultFor` (:68), `streakFrom`, `endedStreakLength`, `localDateKey`
- `src/runtime/overlays/achievementLines.ts:49,158` — `ACHIEVEMENT_LINES_MAX = 2` and its one production reader
- `node_modules/react-native/Libraries/Text/Text.js:289` — `allowFontScaling !== false`
- `node_modules/react-native/Libraries/Text/TextProps.js:110-121, 165-180` — `maxFontSizeMultiplier`'s three-value semantics and inheritance; `adjustsFontSizeToFit` under an `iOS Only` block
- `node_modules/react-native/ReactCommon/…/RCTAttributedTextUtils.mm:102-121, 229-234` — the `fminf` clamp and `lineHeight` scaling
- `node_modules/expo-router/build/react-navigation/native-stack/views/NativeStackView.js:54-90` and `.native.js:210,257` — **every route in a Stack is rendered**
- `node_modules/expo-router/build/fork/native-stack/NativeStackView.js` — the fork delegates to the above
- `node_modules/react-native-screens/lib/commonjs/components/helpers/DelayedFreeze.js` — `freezeOnBlur` freezes, does not unmount
- `node_modules/react-native-web/dist/` — **zero** `maxFontSizeMultiplier` references
- `eslint.config.js` — `boundaries/elements` + `boundaries/dependencies` policies; the `src/services/achievements/**` purity block
- `vitest.config.ts`, `package.json` (`test` chain of 8 assert scripts, `engines.node >=24 <25`), `.github/workflows/ci.yml`
- `scripts/assert-no-disabled-tests.mjs`, `scripts/assert-purity.mjs` — the comment-stripping + self-check gate shape
- `.planning/WINDOWS.md` rows 16, 17, 27, 28, 29, 35 — read in full
- `.planning/phases/14-meta-shell-mode-select-stats-achievements/14-UI-SPEC.md` (1 150 lines) and `14-CONTEXT.md`
- `docs/ops/PROGRESS-STORAGE.md` — the bounds/keep-direction table
- `ios/PulsePaddle.xcodeproj/project.pbxproj:400,432,501,566` + `ios/Podfile:25` — `IPHONEOS_DEPLOYMENT_TARGET = 16.4`

### Measured this session (probes and command runs — output pasted inline above)

- `npx eslint --print-config app/_components/TitleScreen.tsx` — the full resolved `react-hooks/*` severity list
- Four throwaway probe components under `app/_components/` (written, linted, **deleted**) establishing:
  sync `setState` in an effect = error; the same via a `useCallback` = error (**interprocedural**);
  state-guarded = error; ref-guarded = silenced but `react-hooks/refs` errors instead;
  `setTimeout(…,0)` and a microtask = clean; `Date.now()` in render = `purity` error;
  a lazy `useState(() => …)` initializer = clean
- One throwaway vitest case (`tests/__probe_mfsm.test.tsx`, written, run, **deleted**) — `maxFontSizeMultiplier` emits no DOM attribute under jsdom + react-native-web
- `npm test` → 112 files / 881 passed / 1 skipped / 13.7 s wall, all 8 assert scripts OK
- `npx vitest run tests/ui` → 21 files / 218 tests / 3.53 s
- `npm run lint -- --max-warnings 0` → exit **0**, no output (**the memory note's stale-baseline claim is now false**)
- `npx vitest run … -t 'no such case'` → `1 skipped`, exit 0 (the `passed`-binding rule)
- `grep -rl '<Text' src app` → **eleven** files, 57 occurrences (assertion 3 is red on arrival)
- `xcrun simctl list devicetypes | grep SE`, `xcrun simctl create … iPhone-SE … iOS-26-5` → `403 Incompatible device`, `xcrun simctl ui booted` → three options only, `content_size` → `large`

### Secondary (MEDIUM confidence) — official documentation

- `https://docs.expo.dev/versions/v57.0.0/` — SDK 57.0.0 ↔ RN 0.86 ↔ React 19.2.3; **no RN core-component pages**
- `https://docs.expo.dev/versions/v57.0.0/sdk/router/` — the exported hook/component surface; `useFocusEffect`'s cleanup "runs when the screen loses focus — not on unmount"; **silent on Stack mount behaviour**
- `https://reactnative.dev/docs/text` — `maxFontSizeMultiplier`'s three-value semantics (wording identical to the installed `TextProps.js`); `allowFontScaling` default `true`; `numberOfLines`; `dynamicTypeRamp` iOS-only
- `https://docs.expo.dev/router/reference/screen-tracking/` — fetched and found to contain **nothing** about lifecycle; recorded so the next reader does not re-fetch it

### Tertiary (LOW confidence)

- React 19's removal of `defaultProps` on function components — training knowledge (A3). What is verified is only the absence of a JS-side global setter in the installed 0.86.3 tree.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack | **HIGH** | Zero packages added; every version read from `node_modules/<pkg>/package.json` this session and cross-checked against the SDK 57 index |
| Router / SC-5 (§ Pattern 1) | **HIGH** | Settled by reading both `NativeStackView` variants in the installed `expo-router`, not by docs (which are silent) or by memory |
| Read-once pattern (§ Pattern 2) | **HIGH** | The shipped `SelectScreen` pattern, plus four lint probes that falsified every alternative and whose failing output is pasted |
| Persisted field (§ Pattern 4) | **HIGH** on mechanism and the four sites; **MEDIUM** on the write gate | The `sanitizeTelemetry` default mechanism and all four obligated sites were read. The `outcome === 'abandoned'` gate is a control-flow reading, not a test — A1 / Open Question 1 |
| `maxFontSizeMultiplier` (§ Pattern 5) | **HIGH** | Three platform facts read in the installed package with line numbers; two prop-surface facts the UI-SPEC does not record; the jsdom invisibility falsified by a forced assertion |
| Pitfalls | **HIGH** | Seven of eight were measured this session; Pitfall 8 is quoted verbatim from the shipped JSDoc that exists because of it |
| Validation architecture | **HIGH** on instruments and timings; **MEDIUM** on the exact `-t` patterns | Framework, timings and the green baseline were all run. The `-t` strings are proposals — the executor must escape regex metacharacters and bind on `passed` |
| Environment availability | **HIGH** | Every row probed, including the 320×568 falsification whose failure output is pasted |
| Security domain | **MEDIUM-HIGH** | Categories mapped against the shipped sanitizer chain and the live threat ids. The `{n} new` magnitude row is a **new** T-14 candidate and has no register entry yet |

**Research date:** 2026-09-29
**Valid until:** **2026-10-29** for the stack and the platform facts (stable — zero packages, pinned versions). **2026-10-06** for the green baselines (`npm test`, `npm run lint -- --max-warnings 0`, the 57-occurrence `<Text` count, the booted-simulator inventory) — all four move with any commit.
