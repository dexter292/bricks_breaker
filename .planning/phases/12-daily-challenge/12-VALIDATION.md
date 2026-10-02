---
phase: "12"
slug: "daily-challenge"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
# Left at `draft` deliberately by plan 12-06: `validated` is this lifecycle's own marker for
# "validate-phase §6 ran", and that workflow has not run. The sign-off block below is complete
# and every one of its lines was measured; flipping a flag that means a different thing would
# be the one kind of overstatement this file exists to prevent.
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-27"
closed: "2026-09-28"
closed_by: "12-06"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `plan-phase` from `12-RESEARCH.md` § Validation Architecture. Task IDs were filled
> by plan 12-06; the requirement→test map below is the research's, unchanged. The `File Exists`
> and `Status` columns were filled by 12-06's executor from runs taken on the closed tree, not
> carried forward from any plan's own report.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.1 (`package.json` devDependencies) — already installed, nothing to add |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, include `['src/core/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.tsx']`, `resolve.alias` maps `react-native` → `react-native-web` |
| **UI environment** | per-file docblock `@vitest-environment jsdom` (e.g. `tests/ui/HudStrip.test.tsx:4`) — **not** global |
| **Quick run command** | `npx vitest run tests/daily` |
| **Full suite command** | `npm test` (`vitest run` + the four `assert-*.mjs` scripts) |
| **Estimated runtime** | see § Measured feedback latency below — the seeded ~70 s figure is stale and was re-measured at phase close |

**Two gates are load-bearing this phase and are not optional:**

- `npm run typecheck` — the `RecordRunEndArgs` daily arm is enforced by the **compiler**, not by
  a test. A green suite says nothing about whether both stores compile.
- `npm run lint` — `boundaries/dependencies` in `eslint.config.js` is the only thing preventing
  `DailyResultOverlay` from importing `src/services/storage`. No unit test observes that.

See § Two load-bearing commands and one measurement that changes how to read this file, below,
for why each is not optional and for the filter measurement every `-t` row here must be read
against.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/daily && npm run typecheck`
- **After every plan wave:** `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** full suite green, and every device-verification item below either
  resolved or explicitly routed to human verification
- **Max feedback latency:** measured at phase close — see § Measured feedback latency

---

## Phase wave map

The `Wave` column below carries this, so it is recorded once here rather than inferred per row.

| Wave | Plans |
|------|-------|
| 1 | `12-01` |
| 2 | `12-02` |
| 3 | `12-03` |
| 4 | `12-04` ∥ `12-05` (parallel) |
| 5 | `12-06` |

**The one consequence a verifier needs.** Because wave 4's two plans were authored to run in
parallel against one working tree, their typecheck gates each *excluded the sibling's declared
files* and neither ran `npm test`. **Plan 12-06's Task 2 is therefore the only full-suite run
that observes wave 4's combined output** — the first unfiltered `tsc --noEmit` and the first run
of the four `assert-*.mjs` scripts since wave 3, over a tree carrying both wave-4 plans' edits
at once.

**This is deliberately narrower than "the phase's only full-suite gate", which would be false.**
`12-01` (wave 1) and `12-03` (wave 3) each gate on `npm test`, and `npm test` is literally
`vitest run && node scripts/assert-worklet-closures.mjs && … assert-brand-name.mjs`, so both of
those runs executed the full suite and all four assert scripts too. Both are single-plan waves
and both runs are meaningful. The sharp point is the one above: **a green wave-4 summary is not
a whole-tree pass, because no wave-4 gate saw the whole tree.**

*(Recorded as a finding, not as a gate: both wave-4 plans in fact ran sequentially on a
quiescent tree and each ran the tree-wide `npm test` anyway. That is extra evidence, not a
substitution — 12-06's run is the binding one, and it is the one the Status column below was
filled from.)*

---

## Per-Task Verification Map

Task IDs were assigned by plan 12-06 from what actually shipped. The requirement→behaviour→command
rows are from `12-RESEARCH.md` § Validation Architecture and are reproduced here unchanged.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "local not UTC"` | ✅ | ✅ green |
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "locale invariant"` | ✅ | ✅ green |
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "skipped midnight"` | ✅ | ✅ green |
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "25 hour day"` | ✅ | ✅ green |
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "not plus 24h"` | ✅ | ✅ green |
| 12-02-T1 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "rollover"` | ✅ | ✅ green |
| 12-02-T2 | 12-02 | 2 | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.board.test.ts` | ✅ | ✅ green |
| 12-02-T2 | 12-02 | 2 | N-DAILY-01 | — | no network on the daily path | unit (source contract) | `npx vitest run tests/daily.board.test.ts -t "no network"` | ✅ | ✅ green |
| 12-03-T3 | 12-03 | 3 | N-DAILY-02 | — | N/A | integration | `npx vitest run tests/daily.record.test.ts` | ✅ | ✅ green |
| 12-03-T3 | 12-03 | 3 | N-DAILY-02 | — | N/A | integration | `npx vitest run tests/daily.record.test.ts -t "abandoned leaves open"` | ✅ | ✅ green |
| 12-03-T3 | 12-03 | 3 | N-DAILY-02 | — | bounded at write AND at read | unit | `npx vitest run tests/daily.record.test.ts -t "bounded"` | ✅ | ✅ green |
| 12-03-T2 | 12-03 | 3 | N-DAILY-02 | — | N/A | unit | `npx vitest run tests/daily.streak.test.ts` | ✅ | ✅ green |
| 12-03-T2 | 12-03 | 3 | N-DAILY-02 | — | never substitutes `longestStreak` | unit | `npx vitest run tests/daily.streak.test.ts -t "window floor"` | ✅ | ✅ green |
| 12-04-T2 | 12-04 | 4 | N-DAILY-03 | — | N/A | unit (TZ + injected clock) | `npx vitest run tests/daily.clock-policy.test.ts -t "backwards"` | ✅ | ✅ green |
| 12-04-T2 | 12-04 | 4 | N-DAILY-03 | — | no anti-cheat branch exists | unit | `npx vitest run tests/daily.clock-policy.test.ts -t "forwards"` | ✅ | ✅ green |
| 12-02-T3 | 12-02 | 2 | N-DAILY-03 | — | **SC-5 firewall** — campaign/endless byte-identical | integration | `npx vitest run tests/storage.daily-firewall.test.ts` | ✅ | ✅ green |
| 12-04-T1 | 12-04 | 4 | N-DAILY-03 | — | tampered key degrades to "no result" | unit | `npx vitest run tests/daily.record.test.ts -t "invalid key"` | ✅ | ✅ green |
| 12-01-T1 | 12-01 | 1 | UI-SPEC | — | N/A | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx` | ✅ | ✅ green |
| 12-05-T3 | 12-05 | 4 | UI-SPEC | — | date stays open on abandon | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx -t "abandoned"` | ✅ | ✅ green |
| 12-05-T1 | 12-05 | 4 | UI-SPEC | — | N/A | unit (jsdom, injected `now`) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx` | ✅ | ✅ green |
| 12-05-T1 | 12-05 | 4 | UI-SPEC | — | no `Retry`, no star row, no `Best ·` | unit (jsdom) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx -t "closed date"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**How the Status column was filled.** All 21 commands were executed by 12-06's executor on the
closed tree. Each was read for the presence of `passed` in its `Tests` summary line — **not** for
its exit code and **not** for the absence of `skipped`; see the measurement in the next section
for why neither of those can discriminate. Measured, in row order: `2 passed`, `1 passed`,
`1 passed`, `1 passed`, `1 passed`, `1 passed`, `7 passed (7)`, `1 passed`, `18 passed (18)`,
`1 passed`, `1 passed`, `24 passed (24)`, `2 passed`, `2 passed`, `1 passed`, `12 passed (12)`,
`1 passed`, `11 passed (11)`, `4 passed`, `23 passed (23)`, `1 passed`. No row printed `failed`
and no row printed a summary without `passed`.

---

## Two load-bearing commands and one measurement that changes how to read this file

**`npm run typecheck` is not optional.** The `daily` arm of `RecordRunEndArgs` carries `date` and
carries **no** `levelId`, which is what makes `bestByLevel`, `unlocked` and `bestScore`
unreachable from a daily run — a *compile-time* property, enforced in **both** hand-mirrored
stores at once. A fully green vitest suite says nothing about whether either store still narrows
correctly. The regression alarm is a live `@ts-expect-error` in `tests/storage.daily-firewall.test.ts`,
red-proved by stripping it (which yields `error TS2353 … 'levelId' does not exist in type
'{ mode: "daily"; … }'`), so `npm run typecheck` exiting 0 is positive evidence rather than the
absence of one. Bind this gate on the exit code **and** on the absence of an `error TS` line.

**`npm run lint` is not optional.** The `boundaries/dependencies` rule in `eslint.config.js` is
the only mechanism in the repository that observes the layer matrix — specifically, that
`src/runtime/overlays/DailyResultOverlay.tsx` does not import `src/services/storage`. No unit
test can see it. Bind this gate on the **exit code only**: eslint prints `0 errors` on every
clean run, so binding on the substring `error` reds on green. **Measured base at phase close:
exit 0 with `✖ 3 problems (0 errors, 3 warnings)`** — three pre-existing `array-type` warnings,
none introduced by this phase. (The 2-warning figure several phase-12 plans cite is stale; it
predates 12-02 landing. Nothing moves, because the gate binds on the exit code.)

**The measurement that changes how every name-filtered row above must be read.** A vitest name
filter that matches **nothing** exits **0** and reports its cases as *skipped*. Measured at phase
close against `tests/daily.record.test.ts` with `-t "zzz-no-such-case"`: `Tests 18 skipped (18)`,
`Test Files 1 skipped (1)`, **exit 0**. So a green exit code is **not** evidence that a filtered
row ran at all. Nor can the word `skipped` be used as a failure signal in the other direction: a
**matching** filter on a multi-case file always prints one, e.g. `Tests 2 passed | 22 skipped (24)`.
**The only discriminator is the presence of `passed`.** Every `-t` row above was read that way.
Four of this phase's five executing plans independently found their own plans' gates bound on
`skipped` and corrected them; this paragraph is here so the next reader does not make it a fifth.

---

## Wave 0 Requirements

Every file below was new at phase start. **No framework install was needed** — vitest is already
the project's runner and TZ pinning was verified working. **This phase added no package.**
Each row names the plan and task that created the file, so a missing file traces to the work that
owed it; existence was re-confirmed on disk at phase close and each creating commit is recorded.

- [x] `tests/daily.date-key.test.ts` — N-DAILY-01 date derivation, DST, locale invariance, rollover — created by **12-02 Task 1** (`d3f8f8a`)
- [x] `tests/daily.board.test.ts` — determinism, distinctness over 731 keys, no-network source contract — created by **12-02 Task 2** (`9a59516`)
- [x] `tests/daily.record.test.ts` — N-DAILY-02 once-per-date, `abandoned` leaves open, bounded history, invalid key — created by **12-03 Task 3** (`5b7d5d0`); the `invalid key` case added by **12-04 Task 1**
- [x] `tests/daily.streak.test.ts` — `streakFrom`, gap reset, D-16 values surviving the trim — created by **12-03 Task 2** (`c42e921`)
- [x] `tests/daily.clock-policy.test.ts` — N-DAILY-03 backwards / forwards, TZ + injected clock — created by **12-04 Task 2** (`b8bd017`)
- [x] `tests/storage.daily-firewall.test.ts` — SC-5; modelled on the shipped `tests/storage.endless-firewall.test.ts` — created by **12-02 Task 3** (`e225830`)
- [x] `tests/ui/PlayingHost.daily-run.test.tsx` — modelled on the shipped `tests/ui/PlayingHost.endless-run.test.tsx` — created by **12-01 Task 1** (`f880fd0`), expanded 2 → 11 cases by **12-05 Task 3**
- [x] `tests/ui/DailyResultOverlay.test.tsx` — panel, countdown forms, closed-date absences — created by **12-05 Task 1** (`679b639`)

**TZ-pinning rules for any spec that reassigns the zone** (`process.env.TZ` is process-global and
vitest reuses a worker across files):

```ts
const ORIG_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIG_TZ; });
```

Never rely on the ambient zone — a test that passes only in `Asia/Manila` fails in CI.

**One Wave 0 line changed in kind and is recorded rather than quietly rewritten.** The seeded row
for `tests/daily.streak.test.ts` read *"D-16 **scalars** surviving the trim"*. D-16 was amended
mid-phase at 12-03's blocking checkpoint, with the project owner's approval, and what survives the
trim is **three values, one of which is a date key** (`currentStreakStart`), not two counters. The
row above says "values" for that reason. See `docs/ops/DAILY-CHALLENGE.md` § The streak.

---

## Measured feedback latency

Measured by 12-06's executor at phase close, on the tree this phase hands over:

| Command | Result | Wall time |
|---------|--------|-----------|
| `npx vitest run tests/daily` (quick run) | 5 files / 64 tests, exit 0 | **0.35 s** reported, ~1 s wall |
| `npm test` (full suite + four `assert-*.mjs`) | **107 files / 787 tests**, exit 0; `assert-worklet-closures` 126 files OK, `assert-level-solvability` OK, `assert-eas-profiles` OK, `assert-brand-name` OK | **9.74 s** reported, ~10 s wall |
| `npm run typecheck` | exit 0, `0` lines matching `error TS` | — |
| `npm run lint` | exit 0, `✖ 3 problems (0 errors, 3 warnings)` | — |

**The seeded ~70 s estimate at 99 files / 663 tests is stale in both directions** and is left
above as the seeded value rather than silently overwritten: the suite grew to 107 files / 787
tests over this phase, and the measured wall time *fell* to under 10 s on this machine. The
sign-off line "feedback latency < 70 s" is satisfied by the measurement, not by the estimate.

---

## Manual-Only Verifications

Eight items: the five the research labelled device-verification, plus the three `12-UI-SPEC.md`
layout backstops. They are routed here so the honest-verifier path can reach them instead of a
`render()` assertion being mistaken for evidence.

**jsdom performs no layout.** It cannot report wrapping, clipping, truncation, overlap or
safe-area behaviour. **No passing test in this repository is evidence for any of the last three
rows**, and none may be recorded as covering one. The three layout rows are also carried in
`.planning/WINDOWS.md` (entries 16, 17, 18) so they survive past this file.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hermes caches the device timezone per runtime | N-DAILY-03 | A C `localtime_r` control saw a zone change immediately; Hermes's `Date` did not until a fresh runtime. Cannot be reproduced in Node | With the app foregrounded, change the device timezone across a date boundary (two zones roughly a day apart, e.g. `Pacific/Kiritimati` ↔ `Pacific/Niue`) and observe whether the rendered `Daily · {date}` changes **without an app relaunch**. **If it does change, narrow the Limits paragraph in `docs/ops/DAILY-CHALLENGE.md` — do not delete it**; the desktop measurement stands whatever the device does |
| Android `Intl`/ICU4J parity with the iOS measurement | N-DAILY-01 | The JSI harness ran the iOS Hermes slice. Android is `-DHERMES_ENABLE_INTL=True` + ICU4J per `ReactAndroid/hermes-engine/build.gradle.kts:358` — read, not executed | On a physical Android device, set a non-Gregorian locale (e.g. `th-TH` or `fa-IR`) and confirm the rendered daily date is **unchanged**. Separately, set the system zone to `America/Santiago` and the date to 2026-09-05 23:58 local; confirm the daily date advances to `2026-09-06` at 01:00 local and the countdown reads ~2 minutes beforehand |
| A real local-midnight rollover, app foregrounded | N-DAILY-01 / UI-SPEC | No test can advance a device wall clock across midnight while the runtime lives | Leave the Daily Result panel open across local midnight on a physical device. Confirm the countdown **never renders a negative value** and that the line is **omitted** at or below zero. **Do NOT check that the date re-derives** — that half of clock-policy rule 5 is UNIMPLEMENTED by decision (`WINDOWS.md` #23, `docs/ops/DAILY-CHALLENGE.md` Limit 8): the stale panel is expected until the player presses Menu, and filing it as a defect burns a reading on a known, deferred omission |
| One real daily board, played to a win and to a loss | N-DAILY-02 | No human has played a daily board at the point this phase completes; the ops doc says so in its own front matter | Play a full daily board to a **win** and to a **loss** on consecutive days. Confirm `Streak ·`, `Best streak ·` and `Days played ·` move as `docs/ops/DAILY-CHALLENGE.md` says they do, and that a loss keeps the streak (D-13) |
| Daily Result panel horizontal fit at extreme values | UI-SPEC E1 | jsdom performs no layout; the 27-char budget is computed from the measured 0.612 em advance, never observed on a rendered panel | With a **7-digit score, a 4-digit streak and a 5-digit days-played** on the shipped **320px** panel, confirm **no wrap and no clipping** on every row. The 27-character budget is arithmetic over a font metric, not an observation — measure against the rendered panel, not against the budget |
| Daily Result panel vertical fit | UI-SPEC (authored beyond the probe set) | jsdom performs no layout; safe-area insets are device-supplied and jsdom supplies none | On a **320 × 568 pt** viewport with the **fully-populated 11-row** panel, confirm the `Menu` control is **visible without scrolling** and the panel sits **inside the safe area**. The 456px computed content height leaves headroom on paper only |
| `Daily` control reachable in the non-wrapping dev row | UI-SPEC E5 | Row width is computed from font metrics and style values, never observed | On a **375 pt**-wide viewport, confirm the `Daily` control is **fully on-screen and tappable**. **Record the row's pre-existing computed width first (≈397–404px in its two default `Auto …` tier states, already past 375 pt before this phase added anything; ≈431–475px with `Daily`)** — a check that does not know the row already clips will misattribute the clipping to this phase |
| The stretched glow halo on a generated board | *(inherited, Phase 11)* | Visual, device-only; recorded so it is not filed as a fresh daily defect | Expect a non-uniformly stretched brick halo on any generated board, daily included — `docs/ops/ENDLESS-MODE.md` § Limits item 7, accepted debt with the fix scheduled for Phase 14. **Do not write it up as a new defect and do not discard a reading over it** |

---

## Validation Sign-Off

Every line below was checked by 12-06's executor by running it, not by reading a plan's report.

- [x] **All tasks have `<automated>` verify or Wave 0 dependencies.** Measured across all six
  plans: **13 of 14 tasks carry at least one `<automated>` block** (counts 7 / 4,3,5 / 0,4,4 /
  6,7 / 7,6,8 / 5,5). The one that does not is **12-03 Task 1**, which is
  `<task type="checkpoint:decision" gate="blocking">` — it ships no code and has nothing to
  sample. The exception is named rather than papered over as 14/14.
- [x] **Sampling continuity: no 3 consecutive tasks without automated verify.** Measured: the
  longest run without one is **1** (12-03 Task 1, above).
- [x] **Wave 0 covers all MISSING references.** All eight files exist on disk at phase close and
  each is traced above to the plan, task and commit that created it.
- [x] **No watch-mode or interactive-UI flags.** Measured: the flag scan over this file prints
  `0`. Every command here is a terminating single run.
- [x] **Feedback latency < 70 s.** Measured `9.74 s` for the full suite plus the four
  `assert-*.mjs` scripts, and `0.35 s` for the quick daily run. See § Measured feedback latency.
- [x] **`nyquist_compliant: true` set in frontmatter.** Set only because every line above is
  actually satisfied by a run recorded in this file. Had any one failed, the flag would have
  stayed `false` with the failing line named — a sign-off that overstates its evidence is worse
  than an honest `false`.

**What this sign-off does NOT claim.** The eight rows in § Manual-Only Verifications are
**open**, routed to a human, and not covered by anything in the suite. Nyquist compliance here
means *the automated sampling rate is adequate for what automation can observe in this
repository* — it is not a claim that the phase is fully verified. The three layout rows in
particular are carried in `.planning/WINDOWS.md` so they remain visible after this file scrolls
out of view.

**Approval:** closed by plan `12-06`, 2026-09-28. Automated coverage: complete and green
(107 files / 787 tests, typecheck and lint exit 0). Human coverage: **8 items outstanding**.
