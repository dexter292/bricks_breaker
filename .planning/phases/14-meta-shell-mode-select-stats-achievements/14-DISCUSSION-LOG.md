# Phase 14: Meta Shell — Mode Select, Stats & Achievements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-29
**Phase:** 14-Meta Shell — Mode Select, Stats & Achievements
**Areas discussed:** Mode entry points, Daily played-today signal, Locked achievement spoilers, Unseen unlocks (#35), Statistics screen content

---

## Mode entry points

### Where the three modes present

| Option | Description | Selected |
|--------|-------------|----------|
| Three entries directly on Title | Brand → Best → Campaign / Endless / Daily. Campaign keeps SelectScreen; Endless and Daily enter a run directly. Fewest screens, fewest taps to the daily. | ✓ |
| A separate mode-select screen | Title keeps one Play → a mode screen → then split. Title untouched, but the daily costs an extra tap every day and the shell gains a layer. | |
| SelectScreen gains mode tabs | Everything in one screen, but turns a 288-line level list into a three-role screen and introduces a tab pattern this shell does not have. | |

**User's choice:** Three entries directly on Title
**Notes:** → **D-01**. Picked the option with the shortest path to the daily, which matches what a play-once-a-day mode needs.

### Where Stats and Achievements enter from

| Option | Description | Selected |
|--------|-------------|----------|
| Two secondary entries on Title | Below the three modes, presented smaller — playing primary, reviewing secondary. One screen each, one level deep, Back always to Title. | ✓ |
| One combined 'Record' entry | One Title entry → a screen with two sections or tabs. Tidier Title, but re-opens the tab question just declined. | |
| A small corner affordance | Icon or small text in a corner. Keeps the centre column clean, but needs new rules for corner touch targets and safe-area, and #29 will grow the text there. | |

**User's choice:** Two secondary entries on Title
**Notes:** → **D-02**. The presentation carries the priority: playing first, reviewing beneath.

### Scroll or budget at 320×568 with enlarged text

| Option | Description | Selected |
|--------|-------------|----------|
| Budget to fit, never scroll | The rule 12-UI-SPEC set for the result panels: an unreachable control is a defect. The UI-SPEC must budget seven rows and pick maxFontSizeMultiplier — the lever #29 has been waiting for. | ✓ |
| Allow scrolling when it does not fit | Safe at any text size, but breaks the no-scroll convention both result panels hold, and a player might not see Daily if it sits below the fold. | |
| Budget to fit, and drop a row if it cannot | As above, but drop `Best · N` from Title if seven rows will not fit at large text. Lets the UI-SPEC measure first and then decide. | |

**User's choice:** Budget to fit, never scroll
**Notes:** → **D-03**, rated `costly` for reversibility — the budget decides how many rows Title may ever carry.

### Where Menu after a run returns to

| Option | Description | Selected |
|--------|-------------|----------|
| Always Title (keep as shipped) | Matches `onMenu={() => setShellPhase('title')}`. One return path for all three modes, no memory of the entry route, no new shell state — so no new way for a run to stay mounted (SC-5). | ✓ |
| Back to where you came from | Campaign to SelectScreen, endless and daily to Title. More natural for campaign, but the shell must remember the route — the state phase 11's D-01 pushed `'select'` out of the run path to avoid. | |
| You decide | | |

**User's choice:** Always Title
**Notes:** → **D-04**. SC-5 becomes structural rather than a check: there is no state for a run to survive in.

---

## Daily played-today signal

### What the entry says once today is played

| Option | Description | Selected |
|--------|-------------|----------|
| Status plus streak | `Daily` unplayed; `Daily · done · Streak 4` once played. N-UI-01 needs only the played fact, but the streak is what brings a player back and is the value phase 12 worked hardest to get right. | ✓ |
| Played/unplayed only | `Daily` vs `Daily · done`. Exactly enough for N-UI-01 and cheapest for the seven-row budget, but drops a streak the storage keeps clean. | |
| Status plus countdown | `Daily · done · new board in 13h 9m`. Pulls the player back at the right time, but needs a live interval on Title — the thing phase 12 was careful about. | |

**User's choice:** Status plus streak
**Notes:** → **D-05**.

### Tapping Daily on an already-played day

| Option | Description | Selected |
|--------|-------------|----------|
| Open the stored result panel | D-02's shipped read-only branch: score, streak, days played, countdown from the record; no board generated, nothing written. One renderer for one truth. Already built and tested. | ✓ |
| Disable the entry | Clearest about the day being spent, but throws away the shipped branch and the player cannot review their score. | |
| Open it, but not via PlayingHost | Cleanest for SC-5, but a second renderer for one truth — the defect family 12-UI-SPEC was written against. | |

**User's choice:** Open the stored result panel
**Notes:** → **D-06**.

### Whether Title mentions a broken streak

| Option | Description | Selected |
|--------|-------------|----------|
| Say nothing on Title | Title shows only the current streak, which is 1 or 0 after a break and says it on its own. The daily panel already carries the streak-ended line where it means something. | ✓ |
| Say it, lightly | `Daily · Streak 1 (was 6)`. Honest about the loss, but spends text on the tightest row of the budget. | |
| Show best streak instead | `Daily · Streak 1 · Best 6`. Frames it as achievement, but a longer line still, and the stats screen will show the number. | |

**User's choice:** Say nothing on Title
**Notes:** → **D-07**. Avoids re-opening a loss on every launch.

---

## Locked achievement spoilers

### Whether locked entries show their condition

| Option | Description | Selected |
|--------|-------------|----------|
| Show everything, hide nothing | All twelve are pursuable goals with no secret to spoil. SC-3's clause is conditional and that condition does not arise for this catalog; CONTEXT.md records where the rule lives if a later phase adds a genuinely secret entry. Also serves D-11 — a player can only tell you a threshold is wrong if they can see it. | ✓ |
| Hide the two never-lost-a-life conditions | `Flawless Clear` and `Perfect Daily` show names only. The two that reveal a play style rather than a number — but also the two hardest, and hiding the condition means nobody can pursue them. | |
| Names only, all conditions hidden | Keeps a sense of discovery, but turns the screen into a list of riddles and closes the only feedback channel for twelve unreviewed thresholds. | |

**User's choice:** Show everything, hide nothing
**Notes:** → **D-08**. Presented with the observation that, read against the shipped twelve, none is actually a spoiler.

### Whether locked entries show progress

| Option | Description | Selected |
|--------|-------------|----------|
| No — locked/unlocked only | Catalog keeps SC-1's shape: id + name + description + one pure predicate. No new field, no twelve progress functions, no way for a progress number to drift from its predicate. The stats screen already shows the counters. | ✓ |
| Yes, for the countable entries | Five cumulative entries show `272 / 1000`; the others do not. Useful, but adds a catalog field and a conditional benefit a later reader must understand. | |
| Yes, for all twelve | Uniform, but forces a parallel progress function for every predicate — two expressions of one rule, the drift family this project has hit repeatedly. | |

**User's choice:** No — locked/unlocked only
**Notes:** → **D-09**. The architectural cost was stated before the choice: the catalog is boolean-only by design.

### Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Declaration order, no grouping | The rule phase 13 made contract for the panel. One order for both surfaces, no re-sort on unlock, author still decides what comes first. | ✓ |
| Unlocked first, then locked | Achievements surface first, but the list re-sorts on every unlock so an entry's position is unstable. | |
| Most recently unlocked first | Sorts by `at` — but D-04 makes a retroactive flood share ONE timestamp, measured on device the same day with seven entries at the same `at`. Order within a flood is arbitrary. | |

**User's choice:** Declaration order, no grouping
**Notes:** → **D-10**.

---

## Unseen unlocks (#35)

### Whether the screen marks unlocks the player was never told about

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — a 'new' mark that clears once seen | Closes #35: every unlock eventually reaches the player, including those earned on an abandoned run. Needs a new storage field, additive to v4 with no version bump, following D-13's shape. | ✓ |
| Yes — and a mark on the Title entry too | As above, plus a mark on Title so the player knows without opening. Delivers the news, but spends text on the tight seven-row budget. | |
| No — let the screen be the answer | The screen itself makes abandon-earned unlocks visible; the player just has to look. Least code, no new field, but #35 stays open — what was lost is *being told*. | |

**User's choice:** Yes — a 'new' mark that clears once seen
**Notes:** → **D-11**, rated `one-way` — it adds a persisted field, so undoing it means dead data or a migration.

### What counts as "seen"

| Option | Description | Selected |
|--------|-------------|----------|
| Announced on a panel OR present when the screen was opened | `recordRunEnd`'s delta reaches the panel, so those entries have genuinely been seen and are marked then; opening the screen marks the rest. The exact sense of "never announced" #35 names, so the mark appears only in the missed case. | ✓ |
| Only on opening the achievements screen | Simpler by one branch, but labels as "new" something the player read half a minute earlier. | |
| Only entries actually on screen | Most literal reading of "seen", but needs viewport tracking on a twelve-row screen — complexity hard to justify at this scale. | |

**User's choice:** Announced on a panel OR present when the screen was opened
**Notes:** → **D-12**.

### Players who already have unlocks

| Option | Description | Selected |
|--------|-------------|----------|
| Treat all pre-existing unlocks as seen | True for real players in most cases — most were announced on a panel — and wrong in the less harmful direction: worst case is a missed mark, not labelling a dozen read entries as "new". | ✓ |
| Treat them all as unseen | Misses nothing, but marks things the player has already been told, and with twelve entries the whole screen could read "new", emptying the mark of meaning. | |
| You decide at UI-SPEC time | | |

**User's choice:** Treat all pre-existing unlocks as seen
**Notes:** → **D-13**. Raised with the concrete case: the test device already carries `combo-25`, which *was* announced.

---

## Statistics screen content

| Option | Description | Selected |
|--------|-------------|----------|
| Lifetime block plus a per-level table | Lifetime counters, a per-level table, two rows for endless and daily. Exactly N-STAT-03; reads `lifetime` and `byMode` directly, so nothing is derived and nothing recomputes per frame. | ✓ |
| Plus a recent-runs list | As above plus `recentRuns` — the surface `RUN_LOG_LEVEL_ID_MAX` was added for. More interesting, but a third long screen needing scroll. | |
| Lifetime block only | Tidiest and certain to fit at any text size, but N-STAT-03 says "and per-level", so it would miss half the requirement. | |

**User's choice:** Lifetime block plus a per-level table
**Notes:** → **D-15**. Asked after the four selected areas, because the content was still unspecified and the planner would otherwise have guessed.

---

## Claude's Discretion

Three areas left to Claude, recorded in CONTEXT.md so the planner does not re-open them:

- **Navigation structure for SC-5** — D-04 removes the mechanism; the remaining work is keeping `PlayingHost` mounted only while `shellPhase === 'playing'` as two screens join the router.
- **The `maxFontSizeMultiplier` lever (D-18 / WINDOWS #29)** — this phase owns the three components. Carries the measurement trap #29 records: a panel height ratio is not a text multiplier, because fixed padding does not scale.
- **Reading telemetry without recomputing per frame** — `getSnapshot()` hands out a deep clone; `GameHost`'s read-once-on-title-mount for `best` is the analog.

## Deferred Ideas

- Rendering `recentRuns` on the statistics screen — out this phase to stay inside D-03's no-scroll budget; safe whenever wanted, since `RUN_LOG_LEVEL_ID_MAX` was added for exactly that surface.
- A countdown to the next daily board on Title — needs a live interval on Title; the countdown already appears on the daily result panel.
- Best-streak on the Title daily entry — `longestStreak` is stored and the stats screen will show it.
- Progress bars / completion meters for achievements — declined by D-09; `ACHIEVEMENTS.md` Limit 4 already rules out a `7 of 12` line as belonging to a completion meter.
- Tiering or rewards for achievements — out of scope by decision (phase 13's D-09, PROJECT.md).
