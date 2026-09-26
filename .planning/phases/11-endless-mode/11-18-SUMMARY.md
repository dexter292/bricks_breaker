---
phase: 11-endless-mode
plan: 18
subsystem: infra
tags: [documentation, ops, requirements, traceability, gap-closure]

# Dependency graph
requires:
  - phase: 11-17
    provides: the guarded `Cert WC` level half, its measured `injectCertWorstCase` count of 1 on the ended-run tier-already-Mid branch, the three named round-5 instruments, and the derived eight-member re-arm enumeration this plan's correction cites
  - phase: 11-15
    provides: the five-row run-reset table and the overstated safety claim standing over it, which this plan corrects beside rather than erases
  - phase: 11-14
    provides: the superseded-claim-beside-its-correction treatment (`CORRECTION 2026-09-26` in `11-11-SUMMARY.md`) this plan's Task 2 matches
provides:
  - "`docs/ops/ENDLESS-MODE.md` contains no false statement about which level ships as the default — `level-03` is named as the `CERT_HARNESS` mount level and the LAST entry in `PLAYABLE_LEVEL_ORDER`, four `Lv` presses from the shipped `level-01`"
  - "Both operator-facing statements of the `Cert WC` level half (§ Limits item 2's bullet and the run-boundary table row at :261) carry ALL THREE terms of the shipped condition, each backed by the round-5 measurement and the verbatim case that took it"
  - "`11-15-SUMMARY.md` distinguishes the chrome-writer set it checked from the loop-re-arm set it claimed, states the two-grep derivation of the eight-member set, names the member it missed and why the instrument could not see it, and points at 11-17 for closure"
  - "N-END-01 and N-END-02 re-ticked in `.planning/REQUIREMENTS.md` with dated round-5 closure notes naming their instruments and the strength of the claim; N-END-03 untouched and still unchecked"
affects: [11-verification round 6, phase-12 daily challenge, phase-14 dev-row removal]

# Actuals (#2632)
actuals:
  tokens: 5334
  tasks: 3
  commits: 3
  plan_head_before: c1ea8c442dddb932f6f6acfd63e4e210b88fb24c

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A documentation gate must be MEASURED against the live tree at planning time and re-measured at execution; a gate that passes on the unmodified base is a false report of coverage, not a weaker gate"
    - "Pin a regression by its OWN literal, not by a bare-word count, when the same task adds prose that legitimately contains the word"
    - "Prove a scope prohibition by partitioning a commit range by SCOPE (`(11-17)` vs `(11-18)`), not by diffing a file list against a base that predates the sibling plan"
    - "A requirement re-tick states how strong the claim is — whose judgement, which instruments, and explicitly whether a fresh first-principles audit was performed"

key-files:
  created:
    - .planning/phases/11-endless-mode/11-18-SUMMARY.md
  modified:
    - docs/ops/ENDLESS-MODE.md
    - .planning/phases/11-endless-mode/11-15-SUMMARY.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The A1 correction is a REPLACEMENT clause, not a deletion: the passage keeps its stated purpose (explaining why that sub-branch had to be measured) by naming what `level-03` actually is in the shipped code"
  - "The false literal `shipped default level` is NOT quoted in its own correction — the gate pins that string at 0, so quoting it would have failed the gate the correction exists to pass. The superseded claim is described, not reproduced"
  - "The level half's condition is stated with THREE terms, not two. 11-17 added the run-ended term to an existing two-term condition (`modeRef.current !== 'endless' && levelId !== 'level-03'`); stating only 'both terms' would have re-committed this phase's signature failure at one term's granularity"
  - "The measured `injectCertWorstCase` count of 1 was read from 11-17-SUMMARY's own measurement section, not derived — per the plan's flagged assumption that the measurement is the authority"
  - "`requirements.mark-complete` was deliberately NOT run in the state-update step; Task 3 owns the checkbox edit and its gate pins `requirements-commits` at exactly 1"
  - "The final metadata commit deliberately EXCLUDES `.planning/REQUIREMENTS.md` for the same reason"

patterns-established:
  - "Pattern: when correcting a false claim under a gate that pins the false literal at 0, describe the superseded wording rather than quoting it"
  - "Pattern: an AGREEMENT PASS between two operator-facing statements of one mechanism is a required, recorded step — not an assumption — once they have drifted apart"

requirements-completed: [N-END-01, N-END-02]
# N-END-03 is in this plan's `requirements` frontmatter but is deliberately NOT completed:
# its frame-budget half is device-gated and UNMEASURED, and no task here claims it.

coverage:
  - id: D1
    description: "`docs/ops/ENDLESS-MODE.md` contains no false statement about which level ships as the default; the replacing clause names `level-03` as the `CERT_HARNESS` mount level and the last entry in `PLAYABLE_LEVEL_ORDER`, with the operator consequence (four `Lv` presses from `level-01`) stated"
    requirement: "N-END-03"
    verification:
      - kind: other
        ref: "gate: a1-false-clause=0 (base 1), cert-harness-mentions=3 (base 0), playable-order-cited=1 (base 0), round-5-markers=4 (base 0)"
        status: pass
      - kind: other
        ref: "source read at `app/_components/GameHost.tsx:68` and `:196`, `src/services/storage/catalog.ts:14-19`"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both operator-facing statements of the `Cert WC` level half carry all three terms of the shipped condition and both name the verbatim 11-17 case that measured it; the agreement pass is recorded sentence by sentence"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "gate: boundary-row=1, round-4-markers=2; agreement pass recorded in `## The agreement pass` below"
        status: pass
    human_judgment: false
  - id: D3
    description: "The SC-5 OPEN block, the do-not-press warning, the restart instruction, the glow-atlas withdrawal and the A-04 halo acceptance all survive verbatim; round 4's dated markers are neither re-dated nor erased"
    verification:
      - kind: other
        ref: "gate: open-marker-phase-status=1, open-marker-device-digest=1, open-marker-no-device-clause=1, restart-instruction=1, do-not-press=1, round-4-markers=2"
        status: pass
    human_judgment: false
  - id: D4
    description: "`11-15-SUMMARY.md`'s overstated safety claim carries a dated round-5 correction beside the table that is right: what the table proves, what the sentence overstated (the verifier quoted and attributed), the two re-runnable greps with their literals and the comment-stripping caveat, the eight-member set with each member classified, the missed member and why a chrome-writer enumeration could not find it, and where 11-17 closes it"
    requirement: "N-END-02"
    verification:
      - kind: other
        ref: "gate A: round-5-correction=1 (base 0), table-row-5-intact=2 (base 1), original-claim-standing=1 (base 1)"
        status: pass
      - kind: other
        ref: "gate B (four discriminating anchors, each base 0): set-distinction-stated=3, rearm-literal-quoted=2, levelid-literal-quoted=1, eight-member-set-named=2"
        status: pass
    human_judgment: false
  - id: D5
    description: "N-END-01 and N-END-02 are re-ticked only after the round's own evidence gate was green, each with a dated closure note naming its instruments and stating the strength of the claim; N-END-03 stays unchecked with its caveat intact; the edit is one revertible commit"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "gate: n-end-01-ticked=1, n-end-02-ticked=1, n-end-03-unticked=1, n-end-still-unticked=1, round-5-closure-notes=2, round-3-note-intact=1"
        status: pass
      - kind: other
        ref: "gate: requirements-touched-this-round=1, requirements-commits=1, frozen-tree-diff=0"
        status: pass
      - kind: integration
        ref: "npm test — exit 0, 97 files / 648 tests passed, 4 assert scripts OK, zero lines beginning FAIL"
        status: pass
    human_judgment: false
  - id: D6
    description: "`app/`, `src/` and `tests/` are untouched by this plan's commits, proven by commit-scope partition rather than by prose"
    verification:
      - kind: other
        ref: "gate: code-git-status=0, code-commits-since-round-4-base=4 (all `(11-17)`), code-commits-not-owned-by-11-17=0"
        status: pass
    human_judgment: false
  - id: D7
    description: "SC-5 / the frame-timing half of N-END-03 — an endless wave transition produces no frame spike outside the Mid budget on real hardware"
    requirement: "N-END-03"
    verification: []
    human_judgment: true
    rationale: "Device-gated and deliberately NOT discharged by this plan. This plan repaired the INSTRUMENT an operator uses to take that reading; it did not take the reading. No automated step in this repo can produce a frame on hardware. § Limits item 2 stays OPEN and N-END-03's unchecked box is correct."

# Metrics
duration: 7 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 18: The Instrument, the Record and the Two Checkboxes Summary

**The ops document stops calling `level-03` the default and starts stating all three terms of `Cert WC`'s level half in both places that describe it; `11-15-SUMMARY.md` learns the difference between the five chrome writers it read and the eight re-arm sites it claimed; and N-END-01 / N-END-02 move back to `[x]` on a gate that ran first.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-26T13:19:00Z
- **Completed:** 2026-09-26T13:25:41Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **Advisory A1 is closed at its cause, and the fourth occurrence of this phase's pattern does not ship.** The round-4 re-scope note called `level-03` the level that ships by default and therefore the common case. Read at source: `app/_components/GameHost.tsx:68` is `const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01')`; `:196` is `levelId={CERT_HARNESS ? 'level-03' : activeLevelId}`; and `src/services/storage/catalog.ts:14-19` holds five entries with `level-03` **last**. The replacement clause names all three and states the operator consequence — a dev build starts on `level-01` and is four `Lv` presses away — so the passage keeps its purpose while telling the truth.
- **The neighbour half is not left silent.** 11-17 added a run-ended term to a condition the document described with one term. Both operator-facing locations now carry all three — `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'` — with the round-5 measurement attached and the verbatim case that took it named in each.
- **The fifth artifact issue is corrected beside its evidence.** `11-15-SUMMARY.md` asserts a safety property over *every path that begins or resumes a run* and reports five checked sites. The correction states the derivation the original lacked as two re-runnable greps (five direct arm sites, three `levelId` writers — **eight** members), names the member the original missed (`runCertWorstCase`'s level half) and why a chrome-writer enumeration structurally could not find it (that path writes no chrome at all), and leaves the original sentence and its table standing.
- **Two checkboxes moved on a gate, not on an intention.** The full ordered gate ran and was recorded before `.planning/REQUIREMENTS.md` was opened; each note names its instruments and says in as many words that the claim rests on the round-4 verifier's judgement plus round-5 evidence, **not** a fresh first-principles audit.

## Task Commits

1. **Task 1 (tracer): the operator's instrument is true on both terms and about the level it names** — `754336f` (docs)
2. **Task 2: `11-15-SUMMARY.md`'s safety claim corrected beside the table that is right** — `5771d25` (docs)
3. **Task 3: N-END-01 and N-END-02 re-ticked on the round-5 evidence gate** — `b3f1397` (docs)

**Plan metadata:** this commit (docs: complete plan) — deliberately EXCLUDING `.planning/REQUIREMENTS.md`, because Task 3's gate pins `requirements-commits` at exactly 1.

`git rev-list --count c1ea8c4..HEAD` = **3**, measured, matching `actuals.commits`.

## Files Created/Modified

- `docs/ops/ENDLESS-MODE.md` — the A1 replacement clause inside the round-4 re-scope note (dated round 5, placed inside the note that stays, with the `Re-scoped 2026-09-26 (round 4)` heading unchanged); a dated round-5 sub-bullet under § Limits item 2's `Cert WC` bullet; and a dated round-5 extension appended to the `Cert WC` run-boundary table row at `:261`. 30 insertions, 3 deletions.
- `.planning/phases/11-endless-mode/11-15-SUMMARY.md` — a dated `CORRECTION 2026-09-26 (round 5)` blockquote placed immediately below the five-row table and its pre-hoist caveat, and above the three-latch-without-reset paragraph. 74 insertions, **0 deletions**.
- `.planning/REQUIREMENTS.md` — two checkbox characters and two additive dated closure sub-notes. 4 insertions, 2 deletions.

## The Task 1 source reads — confirmed at source, not taken from the plan

| Claim | Source | Read |
|---|---|---|
| The shipped default `LevelId` | `app/_components/GameHost.tsx:68` | `const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01');` |
| `level-03` is the `CERT_HARNESS` mount level | `app/_components/GameHost.tsx:196` | `levelId={CERT_HARNESS ? 'level-03' : activeLevelId}` |
| `level-03` is LAST in `PLAYABLE_LEVEL_ORDER` | `src/services/storage/catalog.ts:14-19` | five entries — `level-01`, `level-04`, `level-05`, `level-06`, `level-03` — so **four** `Lv` presses from the default |
| The shipped level-half condition | `app/_components/PlayingHost.tsx`, `runCertWorstCase` (~`:1771`) | `if (\n  !runEndedRef.current &&\n  modeRef.current !== 'endless' &&\n  levelId !== 'level-03'\n)` — **three** terms |

**One departure from the plan's own wording, and it matters.** The plan and the objective both speak of "BOTH terms" of the level half's condition. The shipped condition has **three**: 11-17 added `!runEndedRef.current` to an *existing* two-term condition (`modeRef.current !== 'endless' && levelId !== 'level-03'`). Writing "both terms" into the document would have re-committed this phase's signature failure at one term's granularity. Both locations state all three, and the `not already level-03` term is the one the plan's shorthand would have dropped.

## The agreement pass — sentence by sentence

Required by Task 1 because these two locations have drifted apart once already this phase. Read side by side after the edit:

| § Limits item 2 `Cert WC` bullet (round-5 sub-bullet) | Run-boundary table row `:261` (round-5 extension) | Agree? |
|---|---|---|
| "The mode term above is only ONE of the level half's terms; `11-17` added a second." | "the mode term is one of THREE" | ✓ same fact, both name the mode term as insufficient |
| "the level half fires **only when all three of these hold: the run has NOT ended, the mode is campaign, and the level is not already `level-03`**" | "the level half fires only when the run has **not ended**, the mode is **campaign**, and the level is **not already `level-03`**" | ✓ identical three terms, identical order |
| "`runCertWorstCase` … opens that branch on `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`" | "(`!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'` in `runCertWorstCase`)" | ✓ byte-identical source expression |
| "a `Cert WC` press from a MOUNTED Results overlay moves no level and starts no loop — in campaign as well as in endless" | "a press from a **mounted Results overlay** moves no level and starts no loop in campaign either" | ✓ same operator consequence |
| "from a mounted campaign **lose** panel at `{score: 2400, lives: 0}` with the tier already Mid" | "from a mounted campaign lose panel at `{score: 2400, lives: 0}` with the tier already Mid" | ✓ identical conditions |
| "level-switch control still named `level-01`; `retry()` **not** called; **zero** `setActive(true)` calls (and no trailing `setActive(false)`); panel still reading `2400`; `injectCertWorstCase` called **once**" | "the level-switch control still named `level-01`, `retry()` was not called, there were zero `setActive(true)` calls (and no trailing `setActive(false)`), the panel stayed up still reading its own `2400`, and `injectCertWorstCase` was called once" | ✓ identical five measurements, identical numbers |
| Case named: `an ENDED campaign run is not re-armed: …`, in `tests/ui/PlayingHost.endless-retry.test.tsx` | Case named: same verbatim title, same file | ✓ identical attribution |
| "The round-4 sentence above stands as written: it is NARROWER than the shipped condition, not wrong about it." | (no counterpart — the table row's round-4 text is not a level-half claim, so there is nothing to qualify) | ✓ by absence, checked |

**The A1 clause has no counterpart in the table row.** The row's round-4 text describes the already-on-`level-03` sub-branch as "when the run was already on `level-03`" with no frequency characterisation, so there was no second copy of the false claim to correct. Confirmed by `grep -c 'shipped default level'` = **1** on the base tree (a single occurrence, in § Limits item 2) and **0** after the edit.

## Which 11-17 measurement backs each new mechanism sentence

| New sentence | Measurement | Where it was taken |
|---|---|---|
| "the level half fires only when all three of these hold…" | the shipped condition read at source | `app/_components/PlayingHost.tsx`, `runCertWorstCase` |
| "the dev row's level-switch control still named `level-01`" | assertion 1 of the 11-17 Task 1 case (pre-fix `level-03`) | `tests/ui/PlayingHost.endless-retry.test.tsx:1806` |
| "`retry()` was **not** called" | assertion 3 of the same case (pre-fix: called once) | same case |
| "**zero** `setActive(true)` calls" | assertion 2 of the same case (pre-fix: one) | same case |
| "no trailing `setActive(false)` either, because nothing was re-armed to stop" | the case's own comment plus its final straggler assertion (`still no re-arm across either straggler`) | same case |
| "the Results panel stayed up still reading the run's own `2400`" | assertion 4 (`result` still `'lose'`) plus the straggler assertions pinning `score` at 2400 | same case |
| "`injectCertWorstCase` was called **once**" | **read from `11-17-SUMMARY.md` § "The measured `injectCertWorstCase` count"**, which states *"Measured: 1. It matched the derivation."* and explicitly instructs 11-18 Task 1 to read `1` from that section | 11-17-SUMMARY, per this plan's flagged assumption that the measurement is the authority |

No sentence in this plan's additions was derived and written down as though observed.

## Gate measurements — every counter, base and after

Re-measured at execution time, not trusted from the plan. **Every one matched the plan's stated base**, including the dropped `grep` anchor at `11-15-SUMMARY.md:293` measuring 1.

### Task 1, gate 1 — the A1 correction (discriminating)

| Counter | Base (measured) | After | Required |
|---|---|---|---|
| `a1-false-clause` | **1** | **0** | `= 0` |
| `cert-harness-mentions` | **0** | **3** | `>= 1` |
| `playable-order-cited` | **0** | **1** | `>= 1` |
| `round-5-markers` | **0** | **4** | `>= 2` |

Exit 0. All four discriminate: the gate fails on the unmodified base.

### Task 1, gate 2 — regression pins (all at base, unchanged)

| Counter | Base = After | Required |
|---|---|---|
| `open-marker-phase-status` (`:381`) | 1 | 1 |
| `open-marker-device-digest` (`:414`) | 1 | 1 |
| `open-marker-no-device-clause` (`:525`) | 1 | 1 |
| `restart-instruction` | 1 | 1 |
| `do-not-press` | 1 | 1 |
| `boundary-row` | 1 | 1 |
| `round-4-markers` | 2 | 2 |

Exit 0. The SC-5 block is still OPEN in all three places that say so, both surviving operator instructions are verbatim, the second operator-facing location was neither deleted nor duplicated, and round 4's dated markers were neither re-dated nor erased.

### Task 1, gate 3 — the code prohibition, PROVEN by commit scope

```
code-git-status=0
code-commits-since-round-4-base=4
code-commits-not-owned-by-11-17=0
```

**The four printed commit subjects, all `(11-17)`:**

```
2b4d080 test(11-17): derive the re-arm enumeration, and de-vacuum the latch contract (A2)
70d736d test(11-17): close WR-02 and repair the mock that hid it
62e94cb feat(11-17): gate Cert WC's level half on the run-ended latch
8f75330 test(11-17): drive the ENDED campaign run that Cert WC re-arms
```

**The three printed paths from `git diff --name-only 86c031b..HEAD -- app src tests`:**

```
app/_components/PlayingHost.tsx
tests/ui/PlayingHost.endless-host.test.ts
tests/ui/PlayingHost.endless-retry.test.tsx
```

Re-measured after all three of this plan's commits landed: still `code-commits-not-owned-by-11-17=0`. Every file above belongs to 11-17; this plan wrote no code. `git diff --name-only 86c031b..HEAD -- src/runtime` is empty.

### Task 2 — both gates, base and after

| Counter | Base (measured) | After | Required |
|---|---|---|---|
| `round-5-correction` | **0** | **1** | `>= 1` |
| `table-row-5-intact` (`remountDevSession`) | **1** | **2** | `>= 1` |
| `original-claim-standing` | **1** | **1** | `= 1` |
| `set-distinction-stated` (`chrome writer`) | **0** | **3** | `>= 1` |
| `rearm-literal-quoted` (`setActive(true);`) | **0** | **2** | `>= 1` |
| `levelid-literal-quoted` (`setLevelId(`) | **0** | **1** | `>= 1` |
| `eight-member-set-named` (`eight`) | **0** | **2** | `>= 1` |

Both gates exit 0. **All four of the replacement anchors measure 0 on the unmodified file**, so the whole gate fails before the correction is written and passes only after — the property the previous revision lacked. The dropped anchor was re-measured for the record: `grep -c 'grep'` on the unmodified `11-15-SUMMARY.md` reads **1**, at `:293`, in a section about eslint output — it would have passed before the correction existed. No bare-word anchor was reintroduced.

`git status --short .planning/phases/11-endless-mode/` showed exactly one modified file. No other SUMMARY was touched.

### Task 3 — the ordered evidence gate, run BEFORE `.planning/REQUIREMENTS.md` was opened

| # | Gate step | Result |
|---|---|---|
| 1 | `npm test` | **exit 0 — 97 test files passed (97), 648 tests passed (648)**. All four assert scripts OK (`assert-level-solvability: OK`, `assert-eas-profiles`, `assert-brand-name: OK`, level-solvability self-check). `grep -c '^FAIL'` = **0**. |
| 2a | `npm run typecheck` | **exit 0**, `grep -c 'error TS'` = **0** |
| 2b | `npm run lint` | **exit 0** — `0 errors, 2 warnings`, the two carried `ReadonlyArray<T>` warnings at `tests/ui/PlayingHost.endless-host.test.ts:367` and `:372`, unchanged |
| 3 | The three round-5 instruments, by name, from TAP | all three `ok`; see transcript below |
| 4 | The round-5 structural counts | all at target; see table below |
| 5 | Tasks 1 and 2 committed, gates green | `754336f` and `5771d25`, both gate sets exit 0 |

**Step 3 — the TAP lines, verbatim** (`npx vitest run --reporter=tap-flat` over the two round-5 files: 57 `ok`, **0 `not ok`**):

```
ok 23 - tests/ui/PlayingHost.endless-host.test.ts > PlayingHost endless host (source contract) > every path that re-arms the frame loop is enumerated — five direct sites and three levelId writers (round-5) # time=0.52ms
ok 54 - tests/ui/PlayingHost.endless-retry.test.tsx > PlayingHost — Cert WC carries a mode term (gap 1 / gap 2) > an ENDED campaign run is not re-armed: a press from the mounted lose panel with the tier already Mid moves no level and starts no loop # time=47.82ms
ok 55 - tests/ui/PlayingHost.endless-retry.test.tsx > PlayingHost — Cert WC carries a mode term (gap 1 / gap 2) > and the same press leaves the mounted campaign panel reading the level it was played on (WR-02) # time=75.25ms
```

**Step 4 — the round-5 structural counts, re-measured with the test's own strippers:**

| Count | Measured | Required |
|---|---|---|
| `setActive(true);` (comments stripped) | 5 | 5 |
| `setActive(true);` **unfiltered** | 6 | — (the reason the gate strips first) |
| `setLevelId(` | 3 | 3 |
| `!runEndedRef.current &&` | 1 | 1 |
| `setTierOverride('mid')` | 1 | 1 |
| `runEndedRef.current = false;` at four-space indent | 5 | 5 |
| `if (!runEndedRef.current) {` | 4 | 4 |
| `bakeGlowSprites(brickW, brickH)` | 1 | 1 |
| `uiPhase === 'paused' && result == null` in `GameScreen.tsx` | 1 | 1 |
| `showPauseOverlay ?` | 1 | 1 |

*Measurement note worth carrying.* The strippers must be applied in the test's own form — `codeOnly()` removes `//…` **in line** (`src.replace(/\/\/.*$/gm, '')`), then `noBlocks()` removes `/* … */`. A naive whole-line comment strip applied first gives `setActive(true);` = **3**, not 5, because the subsequent block-comment regex then spans code. Anyone re-running these counts by hand should replicate `codeOnly` exactly; the authoritative instrument is the passing contract case, not a hand-rolled grep.

**Step 4 continued — the frozen tree and the read-only tree:** `git diff --name-only a20ad36..HEAD -- src/core src/levelgen` = **0 files**; `git diff --name-only 86c031b..HEAD -- src/runtime` = **0 files**.

### Task 3 — the post-edit gates

| Counter | Measured | Required |
|---|---|---|
| `n-end-01-ticked` | 1 | 1 |
| `n-end-02-ticked` | 1 | 1 |
| `n-end-03-unticked` | 1 | 1 |
| `n-end-still-unticked` | 1 | 1 |
| `round-5-closure-notes` | 2 | 2 |
| `round-3-note-intact` | 1 | 1 |
| `requirements-touched-this-round` | **1** | **1** (the deliberate inversion of round 4's fence) |
| `requirements-commits` | **1** | 1 |
| `frozen-tree-diff` | 0 | 0 |

All exit 0. `git log --oneline 86c031b..HEAD -- .planning/REQUIREMENTS.md` prints exactly one line: `b3f1397 docs(11-18): re-tick N-END-01 and N-END-02 on the round-5 evidence gate`.

**Byte-identity of the two requirement lines**, from `git diff -U0`: the only character that changed on either line is the checkbox. The identifiers, the `(FC-R04)` tag and all requirement prose are unchanged. N-END-03's line and its dated caveat have a zero-line diff.

## Decisions Made

- **The false literal is described, never quoted.** The Task 1 gate pins `grep -c 'shipped default level'` at 0. Quoting the superseded wording inside its own correction — the obvious way to write a beside-not-erase note — would have failed the gate the correction exists to pass. The correction therefore says *"the round-4 revision of this clause claimed the opposite, and reading the shipped source contradicts it"* and lets the diff carry the old words. This is a genuine tension between two of this plan's own rules (pin the falsehood at 0 / never erase a superseded claim) and it is resolved in favour of the gate, with the record preserved in git rather than in the file.
- **Three terms, not two.** Recorded above under the source-read table. The plan's "both terms" shorthand is a two-term description of a three-term condition; the document states three.
- **The `injectCertWorstCase` count was READ, not derived.** 11-17-SUMMARY measured **1** on the ended-run tier-already-Mid branch and explicitly instructs 11-18 Task 1 to read that number from it. Taken from there; the plan's derivation was not carried into the document.
- **`requirements.mark-complete` and the final metadata commit.** The standard executor flow marks the plan's `requirements:` complete and stages `.planning/REQUIREMENTS.md` in the metadata commit. Both would produce a **second** commit touching that file and fail Task 3's `requirements-commits=1` gate. The plan directive wins: `mark-complete` was not run (Task 3 performed the edit by hand, and `N-END-03` must NOT be marked in any case), and the metadata commit excludes the file. Recorded as a plan-directed departure below. `.planning/REQUIREMENTS.md` has no `N-END-*` traceability rows, so nothing else in the file needed updating.

## Deviations from Plan

### Auto-fixed Issues

None. No bug, missing-critical item or blocking issue arose; nothing needed auto-fixing under Rules 1–3, and no Rule 4 architectural decision was reached.

### Plan-directed departures from the standard executor flow

**1. `requirements.mark-complete` was NOT run, and the metadata commit excludes `.planning/REQUIREMENTS.md`**
- **Found during:** the state-update and final-commit steps
- **Issue:** both would create a second commit touching `.planning/REQUIREMENTS.md`, and Task 3's gate pins `requirements-commits` at exactly **1** (threat T-11-22: the record of what was believed when must stay recoverable from git as a single revertible commit). `mark-complete` would also have to be fed `N-END-03`, which this plan forbids ticking outright.
- **Resolution:** the plan directive wins. Task 3 performed the checkbox edit by hand in its own commit `b3f1397`; `mark-complete` was skipped; the metadata commit stages only the SUMMARY, `STATE.md` and `ROADMAP.md`. The gate reads 1.

**2. The plan says "BOTH terms"; the shipped condition has three**
- **Found during:** Task 1, reading `runCertWorstCase` at source as `read_first` requires
- **Issue:** the plan's objective and Task 1 `<action>` describe the level half's condition as having two terms (the mode term plus 11-17's new run-ended term). The shipped condition is three: `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`. Writing "both terms" would have dropped `levelId !== 'level-03'` — this phase's signature failure at one term's granularity, in the very edit correcting it.
- **Resolution:** the source wins, as `read_first` instructs. Both operator-facing locations state all three terms. The acceptance criterion "BOTH terms — not ended AND campaign AND not already `level-03`" already enumerates three, so this is a wording correction, not a scope change.

---

**Total deviations:** 0 auto-fixed. 2 plan-directed departures, both recorded above.
**Impact on plan:** none. Every `<acceptance_criteria>` item and every `<verify>` block passes as written or better.

## Issues Encountered

- **A hand-rolled comment stripper disagrees with the contract's own.** Re-measuring 11-17's structural counts for gate step 4, a whole-line `//` strip followed by a block-comment strip gave `setActive(true);` = 3 and the four-space `runEndedRef.current = false;` count = 3, against targets of 5 and 5. Replicating the test's `codeOnly()` (an **in-line** `//…$` removal) before `noBlocks()` gives 5 and 5. The discrepancy is in the measuring instrument, not the tree: the contract case `every path that re-arms the frame loop is enumerated …` was already `ok` in the TAP run. Recorded because the same mistake is easy to repeat and would look like a regression in the source.

## Known Stubs

None. No placeholder value, empty-collection default, `TODO`, `FIXME` or "coming soon" string was introduced across the three changed files; no test was skipped or added; every `<verify>` block in the plan was run and its output recorded above. No entry was appended to `.planning/WINDOWS.md` because there is no defect to record.

## Threat Flags

None. This plan changed three markdown files. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary.

Every `mitigate` row in the plan's threat register is discharged: **T-11-53** (the false `level-03` characterisation) by the replacement clause plus `a1-false-clause=0`; **T-11-54** (a condition stated with one of its terms) by the three-term statement in both locations plus the recorded agreement pass; **T-11-55** (a documentation sentence with no measurement behind it) by the per-sentence measurement table above, with `injectCertWorstCase` read from 11-17-SUMMARY rather than derived; **T-11-56** (closing the OPEN block, weakening an instruction, re-dating round 4) by the seven regression pins all at base; **T-11-57** (a SUMMARY asserting a verification that did not happen) by the Task 2 correction with its derivation and its structurally-invisible missed member; **T-11-58** (erasing a superseded claim) by `original-claim-standing=1`, `round-4-markers=2` and 0 deletions in `11-15-SUMMARY.md`; **T-11-59** (a checkbox ticked on intention) by the ordered gate run and recorded before the edit; **T-11-60** (N-END-03 by proximity) by `n-end-03-unticked=1` and `n-end-still-unticked=1`; **T-11-61** (copying the wrong fence) by the deliberate inversion pinned at 1. **T-11-SC** stays accepted — this plan installed no package.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Round 5's documentation and record work is complete.** The two advisories the round-4 verifier recorded are closed, the fifth artifact issue is corrected, and the two checkboxes moved with their evidence written beside them.

**Still open, and NOT claimed here:**

- **SC-5 / the frame-timing half of N-END-03.** This plan repaired the **instrument** an operator uses to take that reading; it did not take the reading. `docs/ops/ENDLESS-MODE.md` § Limits item 2 stays **OPEN** (all three markers pinned), `behavior_unverified` stays at 1, and N-END-03's unchecked box with its dated caveat is **correct**. "No device available" remains a valid outcome.
- **The re-tick's strength is bounded, deliberately.** N-END-01 and N-END-02 rest on the round-4 verifier's explicit judgement plus round-5's own green instruments — **not** on a fresh first-principles audit. Both closure notes say so in as many words so a future round can revert them with the reasoning intact, as happened to N-END-02 once already this phase.
- **The five spec-less-probe edge rows** for N-END-01 / N-END-02 / N-END-03 recorded in `11-17-PLAN.md` `must_haves.assumptions` are unchanged by this plan: re-ticking a requirement resolves no unstated boundary or precision contract, and the closure notes do not imply otherwise.
- **11-UI-SPEC E5 `error` stays UNRESOLVED.** The contract still does not state what the other `__DEV__` row controls should do once an endless run is entered; the tier button remains defined by consequence rather than by contract. Surfaced, not resolved.
- **Six advisories recorded rather than fixed**, as the plan directs: the `certPendingRef` ASSIGN-vs-OR side effect (IN-01), the deferred-cert effect consuming its flag before its own 50 ms timer (WR-05, fails safe), the five duplicated reset blocks (WR-06), `codeOnly()` stripping line but not block comments (IN-02/IN-04), `toggleDevLevel` republishing the outgoing level's campaign best (round-3 advisory 1's structural half), and the two `ReadonlyArray<T>` lint warnings at `tests/ui/PlayingHost.endless-host.test.ts:367` and `:372`.

**Suggested next:** `/gsd-verify-work 11` (round 6) — or, if the SC-5 device reading can be harvested, the discharge procedure in `docs/ops/ENDLESS-MODE.md` § Limits item 2 is now correct on every claim it makes about the shipped code.

## Self-Check: PASSED

- `docs/ops/ENDLESS-MODE.md` — FOUND
- `.planning/phases/11-endless-mode/11-15-SUMMARY.md` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND
- `.planning/phases/11-endless-mode/11-18-SUMMARY.md` — FOUND
- commit `754336f` — FOUND
- commit `5771d25` — FOUND
- commit `b3f1397` — FOUND
- `git rev-list --count c1ea8c4..HEAD` — **3**, measured, matching `actuals.commits`

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*
