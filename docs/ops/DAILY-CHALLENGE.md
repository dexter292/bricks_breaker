# Daily challenge (Phase 12)

**Status:** Implemented 2026-09-28
**Requirements:** N-DAILY-01 (one board per local calendar date, derived from the date alone,
no network) · N-DAILY-02 (one recorded result per date, and a streak computed from the set of
dates that have one) · N-DAILY-03 (device clock changes are handled by an explicit **written**
policy — this file is that policy)
**Consumers:** Phase 13 achievements over daily play · Phase 14's Title entry point and its
zero state (both replace the `__DEV__` entry this phase ships)
**Owner sign-off:** **not obtained.** **No human has played a daily board**, and nothing in
this document was calibrated by one. Every number here is either a deterministic headless
measurement (a Node or vitest run, or a JSI harness driving the Hermes build this app ships)
or arithmetic over one, and each is labelled with which. **The device half of the timezone
finding is unmeasured**, and the Android engine was never executed at all. See *Limits* at the
end before citing anything here as established.

## Why this document exists

Success criterion **SC-4** is not satisfied by a correct `hasResultFor`. It asks that device
clock changes be *"handled by an explicit, written policy — the behaviour on a backwards clock
jump is a decision recorded in the phase, not an accident"*, and **N-DAILY-03** asks for the
same thing in requirement form. A correct implementation does not discharge either: the
artifact **is** the criterion. This file is that artifact, and it is the only one in the phase
that discharges SC-4.

The policy is deliberately one sentence. A policy a reader cannot hold in their head is not
one, and every sub-section below states a *case* of the single rule rather than adding a
second rule to it.

The policy itself lives in **`src/services/daily/`** — `dateKey.ts` (`localDateKey`,
`nextLocalMidnightMs`, `previousDateKey`, `isValidDateKey`, `DAILY_DIFFICULTY`) and
`streak.ts` (`hasResultFor`, `streakFrom`, `endedStreakLength`), both pure and both without a
clock read. Its guards are **`tests/daily.clock-policy.test.ts`** (the rule itself, under
pinned zones and an injected clock) and **`tests/daily.date-key.test.ts`** (the derivation,
TZ-pinned against absolute UTC instants); `tests/daily.streak.test.ts`,
`tests/daily.record.test.ts` and `tests/storage.daily-firewall.test.ts` guard the walk, the
record and the SC-5 firewall respectively.

The board generator it feeds is Phase 10's, documented in `docs/ops/BOARD-GENERATOR.md` and
unchanged by this phase. The record it writes lives inside the v4 blob documented in
`docs/ops/PROGRESS-STORAGE.md`: `TelemetryBlob.daily` is a **new field on an existing
version**, so **no version bump and no migration were needed** — an existing v4 blob written
before the daily record existed parses with the field defaulted and every campaign field
intact, which is asserted rather than assumed (`tests/storage.progress-v4.test.ts`, the
no-migration case).

## The policy

> **A date is playable if and only if it has no stored result.**

That is the whole clock policy (**D-01**). It is evaluated as set membership over the stored
date keys — no clock is consulted to answer it, and there is no second piece of state that
could disagree with the first. Everything below is a case of that one rule.

### Clock backwards (D-02)

A date that already has a result is **read-only**. Opening it renders the stored result; it
cannot be replayed, and a repeat write replaces the same-date entry in place rather than
appending, so the lifetime counters do not move. Winding the clock back gains nothing.

The countdown line may briefly show a longer remainder after a backwards jump. That is the
honest display of what the device says the time is; it is decoration, nothing branches on it,
and it grants the player nothing.

### Clock forwards (D-03)

The new date is **playable**, and the streak **breaks by itself** — the intervening dates have
no stored result, so the walk that computes the streak ends at the gap. A seven-day jump opens
the new date and yields a streak of 1, not 8.

There is **no anti-cheat branch anywhere in the code**, and that absence is the design rather
than an omission. It is held by a standing source guard inside the `forwards` case of
`tests/daily.clock-policy.test.ts`: a comment-stripped scan of the daily policy tree for
watermark, highest-date, last-seen-date and clock-tamper identifiers must print `0`. No branch
anywhere tells the player anything about their clock.

### Timezone travel (D-04)

**Not distinguished from clock tampering.** Offline and without a trusted time source the two
are not distinguishable, so any special case would be a guess dressed as a policy. The same
rule covers both: whichever local date the app derives, it is playable if and only if it has
no stored result.

### No stored watermark (D-05)

A "highest date ever seen" field was **considered and rejected**. It is a second thing that
can corrupt independently, and SC-3's whole point is deriving state from stored dates rather
than from a separate counter that a crash could corrupt. Nothing in the record is a monotonic
date watermark.

One consequence of taking that seriously is worth recording, because it bit twice. A value
that cannot be trusted is **discarded**, and discarding is not a penalty: it degrades the date
to *"no stored result"*, which is the **playable** direction. Every fence in this phase
degrades that way — under-reporting, never inflating.

## Measured behaviour

The evidence, with its provenance. **Where a measurement was executed matters**, because the
app ships on Hermes and the automated suite runs on Node/V8; each row below says which engine
produced it.

| # | Measurement | Engine |
|---|---|---|
| 1 | Five device locales, one instant (`2026-09-27T12:00:00Z`): `toLocaleDateString()` returned `27/9/2569` (Thai Buddhist), `١٦ ربيع الآخر، ١٤٤٨ هـ` (Islamic Umm al-Qura), `۱۴۰۵/۷/۵` (Persian Solar Hijri), `2026/9/27` and `27/09/2026`. The plain-`Date` getters returned `2026-09-27` in **all five**. | Hermes `250829098.0.17` (the iOS slice this repo ships), via a JSI harness |
| 2 | America/Santiago **2026-09-06**, a 23-hour local day with no local midnight: the local-field constructor resolves it to `2026-09-06T04:00:00.000Z` — the first instant that *does* exist on that local day — and the countdown from `23:59:59` the previous evening read exactly `1000 ms`. | Hermes, reproduced exactly under Node 25.6.0 |
| 3 | America/Havana **2026-11-01**, a 25-hour local day where local midnight occurs twice: the day measures `90 000 000 ms`, and at its first instant the countdown reads `25h 0m`. | Hermes, reproduced exactly under Node 25.6.0 |
| 4 | The banned fixed-day form, `now + 86 400 000`, **skips 2026-09-06 entirely** in Santiago (a whole daily board unreachable) and **repeats 2026-11-01** in Havana ("tomorrow's board" is today's). | Hermes |
| 5 | `toISOString().slice(0, 10)` is a calendar day wrong for roughly a third of every day west of Greenwich — Santiago `2026-09-27 21:00` local keys as `2026-09-28`. | Hermes |
| 6 | 731 consecutive date keys replayed through the shipped `hashSeed`/`mixSeed`/`makeRng`: **731 distinct seeds, 731 distinct 8-draw signatures, no collision**, consecutive-date Hamming distance mean 17.18 (ideal 16), min 7, max 24 — no adjacent-date correlation. | Node replay of `src/levelgen/rng.ts` |
| 7 | 731 consecutive date keys through the real `generate`: **731 distinct playfields**, the closest consecutive pair differing in 70 cells. 2028-02-29 gets its own board, distinct from both neighbours. | vitest / Node |

**Why a fixed day in milliseconds is banned rather than merely discouraged** (rows 2–4): a
local day is 23 or 25 hours on a DST boundary. Adding a fixed 24 hours therefore steps *past*
the short day, so that date's board is never reachable at all; on the long day it lands back
inside the same date, so "tomorrow's board" is today's. The shipped form is **calendar
arithmetic** — take the local date, add one day, set `00:00:00.000` local — and it is correct
on both. The module bans `Intl.`, `toLocale*`, `toISOString` and the literal `86400000` by a
comment-stripped grep gate that was red-proved against a scratch file carrying them.

**`Intl` is present on Hermes and is deliberately unused.** It exists on iOS and Android, in
debug and release, but as a *partial* ECMA-402 implementation backed by the **platform's**
locale data — Apple `NSDateFormatter`/`NSLocale` on iOS, ICU4J on Android. Row 1 is why it
must not derive the key: the failure is invisible on an `en-US` simulator and total in
Bangkok. This phase adds no Expo module and **no package at all**.

**Two functions were found to be partial and were made total.** `localDateKey(NaN)` returned
the string `0NaN-NaN-NaN` and `nextLocalMidnightMs(NaN)` returned `NaN`. Neither is cosmetic:
the streak walk compares stored keys lexicographically and never parses them, so a malformed
key sorts into the set as garbage silently, and a non-finite boundary reaches the countdown as
a rendered `NaN`. Both now pass through a shared `representableInstant` normaliser that asks
the engine — `Number.isFinite(new Date(x).getTime())` — whether it can represent the instant,
rather than restating a bound that belongs to the runtime. Finite inputs are unaffected.

**A measured negative result, preserved on purpose.** The backward day-step
(`previousDateKey`) anchors at local **midday**, and the rationale written in the plans for
doing so — *"a midnight anchor can land on a local hour that does not exist on either side of a
DST step"* — **is false**. Measured across **38 355 real dates in 15 DST-hostile zones over
2024–2030** (Santiago, Havana, Apia, Lord Howe, Troll, Teheran, Asuncion, Azores, Amman,
Damascus, Cairo, Godthab, Easter Island, São Paulo, Beirut): **0 differences** between a
midnight anchor and a midday anchor. The local-field constructor resolves a non-existent
midnight forward into the same day, which is row 2 restated. The midday anchor **ships
anyway**, for the true reason — twelve hours of slack, so no DST shift can reach a day
boundary, rather than depending on that constructor behaviour. The measurement is recorded
here and in the module's own doc comment so that a later reader who re-derives it does not
conclude the comment is wrong and "correct" the anchor back.

### The streak, and the one defect that re-entered through the read side

The streak counts dates **played**, not dates won (**D-13**): win or lose, a closed date keeps
it, and one missed date breaks it with no grace day (**D-14**). It is a walk over stored dates
with no counter anywhere, which is SC-3 structurally rather than by intent.

**D-16 was re-opened and amended mid-phase, with the project owner's approval, before any of
these values had shipped.** As originally written, D-16 protected a long streak from the
bounded window (**D-15**) with two surviving scalars — longest streak ever, and total dates
played. Measured against the shipped walk over **450 consecutive closes**, `longestStreak`
computed that way **saturates at `DAILY_HISTORY_BOUND + 1` — 401** — because a walk can only
ever see the surviving window plus the date being closed. That is precisely the failure D-16
exists to prevent (*"a streak longer than the window would read as the window length"*), off
by one.

`DailyRecord` therefore carries a **fourth** surviving member, `currentStreakStart` — a **date
key, not a counter**, so SC-3's "computed from stored dates rather than an incrementable
counter that a crash could corrupt" still holds. The current streak is a `previousDateKey`
walk from the closing date back to that start, bounded by `DAILY_STREAK_WALK_CAP` (36 525 —
one hundred Gregorian years, a fence a legitimate blob can never reach, not a streak ceiling).
**Reaching the cap discards the stored start rather than saturating at it**, because
saturating would invent a century of daily play out of a tampered blob. At 450 consecutive
closes the shipped record reads history 400, `totalDaysPlayed` 450, `longestStreak` 450, while
a walk over the survivors alone derives only 400 — the ceiling that made the field necessary.

**The same defect then re-entered through the read side, and was caught before it shipped.**
Both the plan and the handoff prescribed deriving the panel's `Streak · {n}` line with
`streakFrom` over the stored keys — which walks the **trimmed** window. Measured at 450
consecutive closes: `streakFrom` returns **400** while `longestStreak` reads **450**. The
panel would have stated a streak the player does not have, and because the record badge fires
on `streak === longestStreak`, it would also have **silently stopped congratulating that
player from day 401 onward, on every day of their best-ever run**. Fixed by exporting
`currentDailyStreak` from `src/services/storage/telemetry.ts`, which reuses the *same*
`resolveStreakStart` + `streakLengthFrom` the write side already calls: read and write are now
one computation over one set of inputs, so they cannot diverge again. Any document or plan
repeating the *"`Streak · {n}` comes from `streakFrom`"* sentence is describing the pre-fix
design.

`endedStreakLength` is deliberately **not** given the same treatment. An *ended* run has no
stored start to carry, so the window genuinely is all the evidence there is, and the D-17 line
is **omitted** in that case rather than filled from `longestStreak` — which may belong to an
entirely different, earlier run and would state a number that was never the streak that just
ended.

**The reconcile rule between two copies of the record is `max-and-union`, and it is NOT
lossless.** `longestStreak` takes a per-field maximum, `totalDaysPlayed` takes
`max(a, b, |history_a ∪ history_b|)`, and `currentStreakStart` is **derived-beats-carried**: a
gap anywhere in the unioned history makes the start exactly derivable, and then **both** stored
claims are discarded, including the earlier one; only a union that is consecutive end to end
lets the earlier admissible claim stand. The lossy topology is stated in the module's own doc
comment and asserted as a worked example: a copy whose history has been trimmed, reconciled
against one holding dates **exclusively outside** that window, under-counts by that overlap —
`500` / `10` / `410` reconciles to `500` where the truth is `510`. **It never inflates.** Do
not describe this rule as exact.

### The read side validates, and refuses to repair

`sanitizeDailyRecord` validates all four members independently from the default, checks every
stored date key with integer arithmetic only (no `Date` parsing), drops what fails, and applies
the trailing-window trim **after** the drop so that padding garbage cannot evict real dates.
Measured: 400 real dates followed by 40 pieces of garbage yields 400 survivors, where
trim-then-drop would have yielded 360.

The surviving history is **not re-sorted and not de-duplicated**, and that is a decision, not
an omission. `mergeDailyRecord` sorts on write, so out-of-order entries can only come from
tampering; the streak walk ends early on them, which **under-reports**; and sorting them would
turn a tampered order into a **longer** streak than the blob's own stored order can justify.
Having refused to sort, the predicate inside `sanitizeStreakStart` takes the newest key as a
**maximum** rather than as the last array element — it must not assume an order it has just
declined to impose.

One asymmetry is deliberate: a `currentStreakStart` **older than the oldest surviving date is
carried**, not rejected. Expressing a run longer than the bounded window is the entire reason
D-16 was amended to store it.

### The panel, the countdown and the two date refs

The countdown is **decoration and never a gate** — nothing branches on it, and playability is
evaluated only by D-01. It is derived from a single clock read each time it is displayed, never
accumulated, so a clock jump changes the next computed value and can make nothing else go
stale. A non-positive or non-finite remainder is never displayed; the line omits itself.
`dailyNextBoundaryMs` is **pinned to the shown date's midnight at publish time and is not
re-derived on each refresh**, which is what makes that omission reachable at all — re-deriving
it from `now` would keep the remainder permanently positive and the line would count down to a
second tomorrow forever.

**The 60-second refresh interval is scoped to the Daily Result panel being open, and that is
load-bearing rather than cosmetic.** Red-proved on this tree: mounted unconditionally it
throws `Aborting after running 10000 timers` across four host specs that no plan in this phase
owns (`endless-run`, `endless-record`, `endless-retry`, `next-bake`). Specs that mount the
panel use `advanceTimersByTime`, never `runAllTimers`. A later change that lifts the interval
out of the panel's lifetime will take those four files down with it.

**Two refs answer two different questions about dates, and must not be collapsed into one.**
`dailyDateRef` is *the date of the run in flight* — the board was generated from it and the
result is recorded under it. `localTodayRef` is *what local calendar date it is now*, the sole
D-01 input, written by the two events that can answer it from a fresh clock read (the entry
press and the OS foreground). Moving the first on a midnight rollover — which is what the
foreground instruction said literally — would record a run against a date whose board it was
not, and repaint a mounted panel's `Daily · {date}` with a date the score does not belong to.
Both are outright SC-1 breaks. Each ref carries a doc comment naming the question it answers.

## The two discretionary numbers

Both are **judgements, not measurements**. The reasoning is inherited; the numbers are
confirmable and were confirmed against the generator's own published table, but neither is an
observation of anything.

**`DAILY_DIFFICULTY = 10`** (D-11 asks only for "a fixed constant, mid-scale"). On the
generator's published schedule, `d = 10` is the row `| 10 | 12 | 72 | 116 | 3 | 3 |` — 12 rows
used, 72 bricks, 116 authored HP. The same document's calibration line reads *"`d = 0` matches
`level-01`'s 32 bricks, `d ~ 13` matches `level-03`'s 94-brick showpiece, `d = 20` exceeds the
hardest shipped board by ~36 %"*, so 10 sits **between the tutorial board and the showpiece** —
recognisably a real board, not a warm-up, and not the hardest thing the generator can make. The
sweep's per-difficulty medians run 56 s at `d = 0` to 197 s at `d = 20`, putting `d = 10` near a
two-minute median, which is the right size for a once-a-day sitting. It is also exactly the
difficulty endless reaches at wave 11, so a daily board is directly comparable to a familiar
point on the shipped ramp.

**The caveat that makes D-13 safe:** the generator's own 840-board sweep recorded **0
non-wins** — every board cleared with `bricksRemaining === 0`. That is what makes "the streak
counts dates played, not dates won" a fair rule: no date can draw an unwinnable board. If a
future re-tune of the generator's dials changes that, D-13 needs revisiting, not just the
number above.

**`DAILY_HISTORY_BOUND = 400`** (D-15 asks only for a bounded window, following Phase 9's
`RECENT_RUNS_BOUND` reasoning: the blob is read whole on every app open, so nothing in it may
grow without limit). A history entry is `{ date, score, outcome }`, roughly 45 bytes of JSON; at
400 entries that is ~18 KB, the same order as `RECENT_RUNS_BOUND`'s stated ~6 KB and three
orders of magnitude inside the *"~2MB Android CursorWindow practical ceiling"* the shipped
comment names. **The byte figure is arithmetic, not a measurement.**

`400` was chosen over a rounder `365` for one reason specific to this phase: the window is
**directly the longest ended streak the D-17 line can ever report**, because the line is omitted
whenever the backward walk reaches the window floor while still consecutive. A 365-day window
would suppress that line a month earlier, for no storage gain. At 400 the omission only reaches
a player who has played over 400 consecutive days, at which point it is a rounding error on an
extraordinary run.

## Accepted costs

Three named, bounded, deliberately unmitigated things. Each is a **decision a later reader will
find**, not a defect they should file.

**1. The practice hole (D-08).** Because the board is derived from the date, exiting before the
final life and re-entering returns the **same** board, so a determined player can rehearse.
There is **no re-roll** — the board never changes — only rehearsal. Closing it would mean
making an abandoned run close the date, which costs every interrupted player their day (a phone
call mid-run should not cost a streak), so it stays open. Win or lose closes the date;
abandoning does not (**D-07**), while telemetry still records every attempt (**D-09**).

**2. The read-failure second attempt.** Treating an unreadable record as *"no stored result"*
means a transient storage error can hand a player a **second attempt at the day**. The
alternative — treating unreadable as closed — locks a player out of their day on a transient
fault, which is strictly worse. There is no error modal anywhere in this phase: a read failure
means the date is open, a write failure renders the panel from the in-memory record, and
degraded daily data renders as zeros with campaign bests, stars, unlocks and the endless record
provably untouched.

**3. Blob tampering.** Accepted by design. There is no server to validate against and no
leaderboard to protect; an offline single-player streak has **no adversary but the player**.
The date-derived seed is a *public, guessable* value on purpose — `src/levelgen/rng.ts` states
in its own header that it is a deterministic generator and **not** a CSPRNG, and nothing in
this phase may be reused for a token, nonce, key or session id. Board predictability is the
feature: everyone gets the same board on the same day. What the read path *does* defend against
is tampering that would **crash, corrupt or inflate** — an oversized or malformed key is
dropped rather than rendered, the history is bounded on read as well as on write, and every
fence degrades downward.

## Flagged assumptions from this round

Recorded here rather than left only in the planning artifacts, so an open question is visible
where the work gets picked up.

- **A-01 — concurrent writes to one date. Assumption, not a measurement.** Two writes to the
  same date key can interleave in principle (a run closing while a foreground refresh
  re-reads, over a store that is a read-modify-write on one blob). The interleaving is assumed
  benign because both stores' `recordRunEnd` is synchronous and single-threaded on the JS
  thread, `mergeDailyRecord` replaces a same-date entry in place rather than appending (so a
  duplicate write is idempotent on the history), and the foreground refresh is read-only. This
  is an assumption about the runtime model. The idempotency half of it **is** pinned by a test;
  the runtime-model half is not.
- **A-02 / A-03 — the edge probe could not classify N-DAILY-02 or N-DAILY-03.** Reviewed
  manually and left unresolved rather than auto-resolved into coverage. The behaviours are
  covered by explicit tests, but *"the probe found no edge category here"* is recorded as an
  unverified claim, not as a clean bill.
- **The two discretionary numbers are judgements.** `DAILY_DIFFICULTY = 10` and
  `DAILY_HISTORY_BOUND = 400`: the reasoning above is real and the inputs to it are measured,
  but the choice of these numbers over neighbouring ones is not. Treat the reasoning as
  inherited and the numbers as re-openable.
- **Three prohibitions ship `unresolved` — kept, flagged, never dismissed.** (a) *The clock
  policy must not become an anti-cheat mechanism* — no accusation copy, no lockout, no
  "suspicious clock" state, no punitive reset, no penalty of any kind for a clock or timezone
  change, because D-04 makes travel and tampering indistinguishable offline and any such branch
  punishes a traveller for travelling. This one has a standing source guard in CI. (b) *The
  streak surface must not use shaming, guilt or loss-aversion framing, and must carry no offer
  to restore, protect, freeze or buy back a streak* — no rewarded ad, no purchase, no
  streak-freeze item. (c) *The panel must never display a streak length it cannot derive from
  the stored dates.* (b) and (c) are each asserted by a case today, but they are prohibitions
  about a whole surface, and a test can only ever cover the surface as it exists now.

## Limits

This section is why this document exists rather than a code comment. Everything above is real;
these are the things that are **not** established, stated plainly so a later phase does not
mistake an inference for a fact.

**1. The JS engine resolves the device time zone once per runtime and caches it for that
runtime's lifetime, so a device timezone change is not observed until the app is relaunched.**

D-01 covers the outcome: whichever local date the app derives, it is playable if and only if it
has no stored result. Nothing corrupts, and after a relaunch the derivation is correct again —
for up to ~14 hours of offset difference a traveller may find today already closed, or may play
a date the device thinks is tomorrow. This is a **named bounded cost, not a mitigation to
engineer**; adding an `AppState`-active timezone re-check or importing `expo-localization`
would be a real mitigation of a hazard **D-04 already declined**.

What is *not* broken by the cache: the engine caches the **zone**, not an offset. DST
transitions while the app is alive are handled correctly (measurements 2 and 3 above were taken
inside one runtime), and device **clock** changes are unaffected entirely, because `Date.now()`
reads the wall clock on every call. D-02 and D-03 are untouched.

**What was actually measured, and what was not.** The desktop harness proved the cache is the
**engine's own rather than the C library's**: a `localtime_r` control in the same process saw a
zone change immediately while the engine's `Date` did not, and a freshly constructed runtime
did. A **real OS timezone change on a device is a different mechanism** — a system notification
— and whether the engine re-reads on it **was not observable here**. If a device check shows
the date *does* re-derive without a relaunch, the paragraph above should be **narrowed, not
deleted**: the desktop measurement stands whatever the device does, and the narrowed statement
is still the thing a later reader needs.

**2. The Android engine slice was never executed.** Every engine measurement in this document
comes from the **Apple** slice of the SDK 57 Hermes artifact, run through a JSI harness that
self-reported the same build string as the artifact this repo ships. Android is a separate
compilation with a Java/ICU4J `Intl` layer and bionic's tzdata. Nothing here is evidence about
it.

**3. A green automated suite is evidence about a different engine.** vitest runs on Node/V8.
Node and this Hermes build agreed *exactly* on both DST hazard cases, which is why the tests are
worth writing — but a green suite is evidence about V8, and the engine evidence in this document
comes from executing the engine directly. Do not cite a passing test as a Hermes measurement.

**4. jsdom performs no layout, so no test in this repository is evidence about fit.** Three
layout claims are computed from font metrics and style values and have **never been observed on
a rendered panel**: the Daily Result panel's horizontal fit at extreme values (a 27-character
budget derived from a measured 0.612 em advance), its vertical fit (a 456 px computed content
height against a 320×568 pt safe area), and the `__DEV__` dev row's reachability at 375 pt
(computed ≈431–475 px — and **the row is already past 375 pt in its two default tier states
before this phase added anything**, so a check that does not know that will misattribute the
clipping). All three are routed as device-verification items in `12-VALIDATION.md` and recorded
in `.planning/WINDOWS.md`. **A passing `render()` assertion must not be recorded as having
verified any of them.**

**5. The `max-and-union` reconcile under-counts on one topology.** Stated above and repeated
here because it is the kind of thing a later reader assumes away: a trimmed copy reconciled
against one holding dates exclusively outside that window under-counts `totalDaysPlayed` by the
overlap. It never inflates. It is not lossless and must not be described as such.

**6. No human play calibrated anything in this document.** Not the difficulty, not the window,
not the streak rules. The bot-clear-time figures this document cites from the generator's sweep
are floors on human duration at a fixed policy, not predictions — the same sweep's own limits
section shows a single-policy clear time varying by an order of magnitude with the policy. No
human has played a daily board at the point this phase completes.

**7. The entry point is temporary.** The daily challenge is reachable this phase only from a
`__DEV__` `Daily` control in the dev row on the playing HUD, beside `Endless`. It must not
appear in a production build. Phase 14 (Meta Shell) owns the real Title entry, its zero state,
and the deletion of the dev row; the Daily Result panel itself is production and stays.
