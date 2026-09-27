# Phase 12: Daily Challenge - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 12-daily-challenge
**Areas discussed:** Date & clock, One attempt per date, The daily board, Streak rules

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Date & clock | What defines "today"; behaviour on a backwards clock jump (N-DAILY-03 requires this written) | ✓ |
| One attempt per date | Retry within the day? What "uses up" a date — starting, losing, or finishing? | ✓ |
| The daily board | Fixed difficulty or varying? Campaign-shaped single board or endless-shaped waves? | ✓ |
| Streak rules | Played vs won; what counts as a gap; timezone travel | ✓ |

**User's choice:** all four.
**Notes:** SC-1 already locks seed = f(local calendar date), so that was not re-asked.

---

## Date & clock

### Q1 — Clock jumps BACKWARDS to an already-played date

| Option | Description | Selected |
|--------|-------------|----------|
| A played date stays played | A date with a stored result is read-only on re-open. Simplest, no new state, matches SC-2's one-result-per-date rule | ✓ |
| Lock via monotonic watermark | Store the highest date ever seen; refuse any earlier date even if unplayed. Stricter, but punishes westward travel | |
| Allow replay, overwrite | Each entry is a fresh attempt overwriting the last. Breaks SC-2 and makes the streak self-grantable | |

### Q2 — Clock jumps FORWARDS by several days

| Option | Description | Selected |
|--------|-------------|----------|
| Playable; streak breaks by itself | Intervening dates have no stored result, so SC-3's computation breaks the streak with no anti-cheat rule | ✓ |
| Block if the jump is too large | Refuse play beyond a threshold until the clock looks sane. Punishes anyone who simply did not open the app | |
| You decide | | |

### Q3 — Timezone travel, where "today" can legitimately move backwards

| Option | Description | Selected |
|--------|-------------|----------|
| Do not distinguish it | Treat as a case of the backwards-clock rule. Real travel and tampering are indistinguishable offline | ✓ |
| Favour the player | If the date moves back exactly one and that date was played, keep the streak rather than breaking it | |
| You decide | | |

### Q4 — Store a "highest date ever seen" watermark?

| Option | Description | Selected |
|--------|-------------|----------|
| No — rely on stored dates alone | The set of dates with results already answers both "played?" and the streak. No new field that can corrupt independently | ✓ |
| Yes — add a monotonic watermark | Needed only for the Q1 watermark option, which was not chosen | |

**Notes:** The four answers collapse into one rule — *a date is playable iff it has no
stored result* — which became D-01 and is the whole of the N-DAILY-03 policy. The
direction the clock moved stops being a variable.

---

## One attempt per date

### Q1 — Retry before the date has a result?

| Option | Description | Selected |
|--------|-------------|----------|
| One attempt only | Entering commits. Makes the streak losable, which the roadmap goal explicitly wants | ✓ |
| Free retry until a win | Kinder, but turns daily into a free board and the streak nearly unbreakable | |
| A fixed number of attempts | A middle path, but adds a number to balance and a counter to store — the state shape SC-3 avoids | |

### Q2 — What closes the date?

| Option | Description | Selected |
|--------|-------------|----------|
| Run end: win or lose | Abandoning mid-run does not close it, so an interruption does not cost the day | ✓ |
| Opening the board closes it | Tightest, unexploitable, but a misclick costs a day | |
| Any ending including abandoned | Consistent with Phase 9 D-02, but one app exit costs a day | |

### Q3 — What a closed date shows on re-open

| Option | Description | Selected |
|--------|-------------|----------|
| Result plus countdown to tomorrow | Satisfies SC-2's "shows that result"; the countdown is the return hook | ✓ |
| Result only | Less work, and avoids deciding which clock the countdown trusts | |
| You decide | | |

### Q4 — Telemetry for daily attempts

| Option | Description | Selected |
|--------|-------------|----------|
| Every attempt, under Phase 9 rules | `byMode.daily` accumulates like the other modes, including runs that did not close the date | ✓ |
| Only the closing attempt | Tidier but inconsistent with the other two modes, making history incomparable | |

**Notes:** Q1 and Q2 together mean "one attempt" is really "one *completed* attempt" — a
player can exit before the final life and re-enter the same board. Raised during the
discussion rather than left to be found later; resolved in the next area.

---

## The daily board

### Q1 — Single board or wave sequence?

| Option | Description | Selected |
|--------|-------------|----------|
| A single board | Goal and SC-1 both say "the board", singular. Reuses the campaign path, leaves Phase 11's wave loop untouched | ✓ |
| Endless-shaped waves | SC-2 mentions "wave", so not baseless — but then "the same board" holds only for wave one | |
| You decide | | |

### Q2 — How the daily difficulty is chosen

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed, mid-scale | Scores comparable across dates; nobody loses a streak to a hard draw; one constant to balance | ✓ |
| By day of week | Gives the week a rhythm, but forces a streak-holder past the hardest day weekly | |
| Deterministic per-date random | Most varied, and the fastest way to lose a streak to luck | |

### Q3 — Stars for generated boards?

| Option | Description | Selected |
|--------|-------------|----------|
| No stars — score and outcome | `stars.ts` thresholds are authored per campaign level; a generated board has none. Keeps stars campaign-only, serving SC-5 | ✓ |
| Yes — thresholds derived from board statics | Adds an achievement axis, but needs a new uncalibrated formula and a sweep to prove it sane at both ends | |

### Q4 — The rehearsal hole raised in the previous area

| Option | Description | Selected |
|--------|-------------|----------|
| Accept and record it | No new rule. Self-deception is the player's own; the trade is not punishing genuinely interrupted players | ✓ |
| Close it — abandoning also closes the date | Airtight, but one phone call costs a day | |
| Soft close — count the exits and show them | Honest without punishing, but adds a stored field | |

---

## Streak rules

### Q1 — Increase on played or won dates?

| Option | Description | Selected |
|--------|-------------|----------|
| Played | SC-3's own words are "consecutive played dates". With a single attempt, requiring a win ends long streaks on one unlucky board | ✓ |
| Won | A more valuable streak, but contradicts SC-3 and compounds with the one-attempt rule | |

### Q2 — What counts as a gap?

| Option | Description | Selected |
|--------|-------------|----------|
| One missed date breaks it | "Consecutive" means consecutive. The computation is a walk over the sorted date set with no extra state | ✓ |
| A one-day grace | Kinder, but "consecutive" stops meaning consecutive and must be spelled out in the UI | |
| You decide | | |

### Q3 — How long is daily history kept?

| Option | Description | Selected |
|--------|-------------|----------|
| A bounded window of recent dates | Follows Phase 9 D-05 — the blob is read whole on every app open, so nothing in it may grow unbounded | ✓ |
| Keep everything | No history lost, but one row per day for years in a fully-read blob | |
| Bounded window plus separate records | Was not selected here; became the resolution of the conflict below | |

### Q4 — What the player sees when a streak breaks

| Option | Description | Selected |
|--------|-------------|----------|
| State it, with the length that ended | "Your 12-day streak ended." Acknowledging the loss is what makes the streak worth keeping — the goal's own "annoyed to lose" | ✓ |
| Silent reset to 1 | Less work and less irritating, but discards the feature's emotional lever | |

---

## Conflict raised and resolved

Q3 (bounded window, no separate records) and Q4 (report the streak that ended) contradict:
a streak longer than the window reads as the window length, and "longest streak ever" is
stored nowhere to report.

| Option | Description | Selected |
|--------|-------------|----------|
| Add two never-trimmed scalars | Keep the bounded window, plus `longestStreak` and `totalDaysPlayed` updated when a date closes. Trimming history stops erasing achievement | ✓ |
| Widen the window a lot | ~400 days instead of ~90 — no new fields, but still a threshold to cross and a much larger blob | |
| Drop the old-record report | Consistent, but discards what Q4 chose to keep | |

**Notes:** became D-16, rated `one-way` — once players accumulate these numbers they
cannot be reconstructed from trimmed history, so a later schema change must migrate them.

---

## Claude's Discretion

- Deriving the seed for `generate(seed, difficulty)` from the local calendar date.
- The fixed difficulty constant (D-11) and the history window size (D-15).
- The stored shape of the daily result and the date key format inside the v4 blob.
- Where streak and countdown appear on screen, and the countdown's wording.
- The entry point — Phase 11 D-05's temporary `__DEV__` button is the default.

## Deferred Ideas

- Streak freeze / grace day — rejected at D-14; additive if feedback later demands it.
- Stars or a second scoring axis for generated boards — rejected at D-12; needs its own
  calibration work.
- Cross-device or social comparison — out of scope by PROJECT.md (no server, no account).

---

*Phase: 12-Daily Challenge*
*Discussion: 2026-09-27*
