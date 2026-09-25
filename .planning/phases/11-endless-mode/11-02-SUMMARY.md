---
phase: 11-endless-mode
plan: 02
subsystem: storage
tags: [endless, progress-blob-v4, discriminated-union, fail-soft-parse, telemetry, vitest, tdd]

# Dependency graph
requires:
  - phase: 09-run-telemetry-storage-v4
    provides: "ProgressBlob v4, TelemetryBlob, both stores' recordRunEnd funnel, sanitizeTelemetry's independent-validation firewall"
  - phase: 11-endless-mode
    provides: "plan 11-01's endless wave policy — the producer of the `wave` number this plan records"
provides:
  - "`EndlessRecord` on `TelemetryBlob` + `defaultEndlessRecord()` + `ENDLESS_TELEMETRY_KEY` — the N-END-02 record, inside the fail-soft telemetry sub-object"
  - "`mergeEndlessRecord(telemetry, { wave, score })` — per-field running max, clone-then-mutate"
  - "`sanitizeEndlessRecord` wired into `sanitizeTelemetry` — a corrupt record degrades itself and nothing else"
  - "`RecordRunEndArgs` — the exported discriminated union that makes campaign fields unreachable from an endless run at compile time (D-11)"
  - "the `args.mode === 'campaign'` gate in BOTH stores, closing the live campaign-write defect"
  - "tests/storage.endless-firewall.test.ts — SC-3 proven per store"
affects: [11-03 useGameLoop wave plumbing, 11-05 PlayingHost endless host and its recordRunEnd call, 11-06 ENDLESS-MODE ops doc, 12 daily challenge (adds the daily arm), 13 achievements (reads byMode.endless), 14 Title entry]

# Actuals (#2632)
actuals:
  tokens: 9771
  tasks: 3
  commits: 6
plan_head_before: 9335d194a2d2543546a7dd608c2eb989822cb630

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union on a store-interface argument as a structural security control — narrowing forces the runtime gate to exist, so the gate cannot be dropped without a compile error"
    - "One parameterized suite body invoked once per store implementation, so a fix landing in only one of two hand-mirrored stores fails loudly"
    - "Nested-vitest-TAP → flat node:test-TAP transcription so `check tdd-red-evidence` can classify a vitest RED run"

key-files:
  created:
    - tests/storage.endless-firewall.test.ts
  modified:
    - src/services/storage/types.ts
    - src/services/storage/telemetry.ts
    - src/services/storage/parseBlob.ts
    - src/services/storage/memoryStore.ts
    - src/services/storage/asyncStorageStore.ts
    - src/services/storage/index.ts
    - tests/storage.progress-v4.test.ts

key-decisions:
  - "D-11 implemented: `RecordRunEndArgs` is a two-arm discriminated union (campaign | endless). The endless arm has no `levelId`, so TypeScript narrowing forces the runtime `args.mode === 'campaign'` gate — SC-3 is a property of the type, not of a caller convention."
  - "D-12 implemented: `ENDLESS_TELEMETRY_KEY = 'endless'` is a plain string constant; `LevelId` was not widened, because widening it would open `bestByLevel` and `unlocked` to endless values — the exact failure SC-3 forbids."
  - "The telemetry key is derived with `args.mode === 'endless' ? KEY : args.levelId` rather than the plan's `=== 'campaign' ? levelId : KEY`. Semantically identical; it keeps exactly ONE `args.mode === 'campaign'` occurrence per store, which is both the plan's own acceptance criterion and a stronger property (one place to audit)."
  - "The campaign gate's win-branch moved ABOVE `mergeRunIntoTelemetry` (it is now inside the single gate block). No behavioural change — `unlockAfterClearPure` and `updatedAt` do not interact with telemetry — and it keeps the gate a single contiguous block."
  - "`mergeEndlessRecord` is a separate entry point rather than a branch inside `mergeRunIntoTelemetry`: keeping it out of the shared mode-keyed path is what makes 'a campaign run cannot write the endless best' structural."
  - "`safeCounter` stays two separate implementations (`telemetry.ts` and `parseBlob.ts`) across the parse/merge boundary, as the pattern map requires. Not DRYed."

patterns-established:
  - "A new field on `TelemetryBlob` must be added to `cloneTelemetryBlob`, `mergeTelemetryBlobs` and `sanitizeTelemetry` in the same change, or a mutation leaks across the memory/disk boundary or the field silently defaults on every read"
  - "Mode-specific personal records live inside `telemetry`, never on `ProgressBlob` — the parser's per-sub-object independence IS the firewall"

requirements-completed: [N-END-02]

coverage:
  - id: D1
    description: "`EndlessRecord` exists inside `TelemetryBlob` with an all-zero default, a deep clone, a per-field running-max merge, garbage hardening, and a blob-level merge — and `mergeRunIntoTelemetry` never writes it"
    requirement: "N-END-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#defaultTelemetryBlob seeds an all-zero endless record, and the byMode key is a constant not a LevelId (N-END-02 / D-12)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#cloneTelemetryBlob deep-copies the endless record so a mutation cannot leak across the memory/disk boundary"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeEndlessRecord takes each field running max INDEPENDENTLY, so a short high-scoring run keeps the deeper wave"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeEndlessRecord hardens garbage into non-negative integers"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeTelemetryBlobs takes the per-field max of the two endless records, in either argument order"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#mergeRunIntoTelemetry never writes the endless record — an endless run bumps byMode.endless aggregates only"
        status: pass
    human_judgment: false
  - id: D2
    description: "A corrupt or partial `telemetry.endless` degrades itself alone — per field, with the enclosing blob still 'ok' and every campaign field byte-identical; an old v4 blob with no `endless` key defaults cleanly with no version bump and no migration"
    requirement: "N-END-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#a partial endless record keeps the fields it does have and coerces the invalid ones to non-negative integers (N-END-02)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#every non-numeric endless field shape degrades to 0 without touching its sibling field or the enclosing blob"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#an existing v4 blob written before the endless record existed parses with the field defaulted and every campaign field intact — no version bump, no migration"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#corrupt telemetry sub-object alone degrades ONLY telemetry to defaultTelemetryBlob(); unlocked/bestByLevel/bestScore survive untouched"
        status: pass
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/services/storage/migrateProgress.ts (empty) and PROGRESS_VERSION unchanged at 4"
        status: pass
    human_judgment: false
  - id: D3
    description: "An endless run cannot write campaign state in EITHER store — the runtime gate, proven per store, with the campaign path still intact"
    requirement: "N-END-02"
    verification:
      - kind: unit
        ref: "tests/storage.endless-firewall.test.ts#endless firewall — memory store (SC-3 / N-END-02) > an endless win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values"
        status: pass
      - kind: unit
        ref: "tests/storage.endless-firewall.test.ts#endless firewall — AsyncStorage-backed store (SC-3 / N-END-02) > an endless win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values"
        status: pass
      - kind: unit
        ref: "tests/storage.endless-firewall.test.ts#the same endless win DOES raise the endless record and DOES bump the byMode.endless aggregate"
        status: pass
      - kind: unit
        ref: "tests/storage.endless-firewall.test.ts#a campaign win against the same store still unlocks, still writes bestByLevel and still raises bestScore — the gate did not break the existing path"
        status: pass
      - kind: unit
        ref: "tests/storage.endless-firewall.test.ts#an endless run worse on both axes leaves the record at its previous maxima"
        status: pass
    human_judgment: false
  - id: D4
    description: "The compile-time half of SC-3: a campaign-shaped argument cannot be supplied on the endless arm"
    requirement: "N-END-02"
    verification:
      - kind: other
        ref: "npm run typecheck — the `@ts-expect-error` at tests/storage.endless-firewall.test.ts:176 is CONSUMED; if the union collapses to a flat type it becomes TS2578 'Unused @ts-expect-error directive' and typecheck fails"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 02: Endless Record and the SC-3 Firewall Summary

**`EndlessRecord` lands inside `TelemetryBlob` with a running-max merge and a fail-soft sanitizer, and `recordRunEnd`'s argument becomes the `RecordRunEndArgs` discriminated union — so the live defect where an endless win wrote `bestByLevel["undefined"] = { score: 8400, stars: 3 }` and raised the campaign Title PB is closed at the type level in both stores, proven per store.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-25T14:12:57Z
- **Completed:** 2026-09-25T14:24:43Z
- **Tasks:** 3
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- **The defect research predicted was real, and the RED commit caught it red-handed.** Before the fix, `store.recordRunEnd({ mode: 'endless', wave: 14, score: 8400, outcome: 'win', livesRemaining: 3 })` produced `bestByLevel: { "undefined": { score: 8400, stars: 3 } }` and `bestScore: 8400` — a campaign best, a 3-star award and a stringified-`undefined` map key, in **both** stores. That exact output is recorded in commit `8fb0749`'s RED evidence.
- **SC-3 is now structural, not conventional.** `RecordRunEndArgs` is a discriminated union whose endless arm has no `levelId`. TypeScript's narrowing makes `args.levelId` reachable only inside `if (args.mode === 'campaign')`, so the runtime gate cannot be deleted without a compile error. The compile-time half is pinned by a `@ts-expect-error` that turns into a `tsc` failure the moment the union collapses.
- **The record lives where a corrupt value is already contained.** `EndlessRecord` sits inside `TelemetryBlob`, whose parser `sanitizeTelemetry` validates independently of `unlocked` / `bestByLevel` / `bestScore`. `sanitizeEndlessRecord` degrades per field, so a broken `bestWave` does not discard a good `bestScore`.
- **No version bump and no migration, verified rather than asserted.** `PROGRESS_VERSION` is still `4`, `migrateProgress.ts` has a zero-line diff, and a test parses a real old-shape v4 blob with no `endless` key and checks both the defaulted record and full campaign progress.
- **The existing campaign path is untouched behaviourally.** The whole 520-test suite passes, including the 25 pre-existing `storage.progress-v4` cases and the campaign win/lose/abandoned matrix.

## Task Commits

1. **Task 1 RED** — `e031670` `test(11-02)`: six failing merge/clone/default cases + compile-only scaffolding
2. **Task 1 GREEN** — `6eb4dea` `feat(11-02)`: `mergeEndlessRecord`, deep clone, blob-level merge, header contract
3. **Task 2 RED** — `8a54022` `test(11-02)`: three new parse cases + two degradation-case extensions
4. **Task 2 GREEN** — `ef3bbe9` `feat(11-02)`: `sanitizeEndlessRecord` wired into `sanitizeTelemetry`
5. **Task 3 RED** — `8fb0749` `test(11-02)`: `tests/storage.endless-firewall.test.ts`, reproducing the defect in both stores
6. **Task 3 GREEN** — `57d4f6c` `feat(11-02)`: `RecordRunEndArgs` union + the mode gate in both stores

No REFACTOR commit on any task. Each GREEN landed in its final shape, and the one visible duplication — the gate block appearing word-for-word in both stores — is **required** by the plan (`"word-for-word comments included, so a reader diffing the two stores sees one pattern"`), not a cleanup opportunity.

## TDD Gate Compliance

| Task | Gate | Commit | Evidence |
|---|---|---|---|
| 1 | RED | `e031670` | exit 1, 31 tests / 27 pass / 4 fail. Target: *"mergeEndlessRecord takes each field running max INDEPENDENTLY…"* — `{ bestWave: 20, bestScore: 100 }` vs expected `{ bestWave: 20, bestScore: 500 }`. Verdict **RED_EVIDENCE_OK** (`target_test_failed`). |
| 1 | GREEN | `6eb4dea` | 31 passed / 0 failed. |
| 2 | RED | `8a54022` | exit 1, 34 tests / 32 pass / 2 fail. Target: *"a partial endless record keeps the fields it does have…"* — `{ bestWave: 0, bestScore: 0 }` vs expected `{ bestWave: 0, bestScore: 4200 }`. Verdict **RED_EVIDENCE_OK**. |
| 2 | GREEN | `ef3bbe9` | 34 passed / 0 failed. |
| 3 | RED | `8fb0749` | exit 1, 10 tests / 2 pass / 8 fail. Target: *"an endless win leaves unlocked, bestByLevel and bestScore byte-identical…"* — actual `bestByLevel: { "undefined": { score: 8400, stars: 3 } }`. Verdict **RED_EVIDENCE_OK**. *Also* compile-time RED at that commit: `tsc` reported `TS2578 Unused '@ts-expect-error' directive`, i.e. the flat type accepted a campaign-shaped endless run. |
| 3 | GREEN | `57d4f6c` | 520 passed / 0 failed across 91 files; `tsc --noEmit` exit 0, which consumes the `@ts-expect-error`. |
| all | REFACTOR | — | Not needed (optional gate). |

**RED evidence note (tooling, extends 11-01's finding).** 11-01 recorded that `check tdd-red-evidence` wants node:test's `# tests / # pass / # fail` summary lines. The deeper cause surfaced here: its `tapFailedTestNames` matches `/^not ok \d+ - (.+)$/m` — **unindented only** — while vitest's TAP reporter nests describes and indents every leaf, so the only line it can see is the file-level `not ok 1 - tests/….test.ts`, which classifies as `fixture_or_load_failure`. Resolved by transcribing the same run's nested TAP into the flat node:test shape with a small mechanical script (`flatten-tap.py`, kept in the session scratchpad, not the repo): drop container nodes (`… {`), de-indent and renumber leaves, and compute the three summary counts from those same leaves. The counts were cross-checked against vitest's default reporter on every run and matched exactly (31/27/4, 34/32/2, 10/2/8). **Nothing was hand-typed.** Any future vitest TDD plan in this repo needs the same transcription.

## Files Created/Modified

- **`src/services/storage/types.ts`** — added `EndlessRecord` (both fields carrying the house "deliberately NOT the same metric as" doc idiom; `bestScore` explicitly disclaims `ProgressBlob.bestScore`), `ENDLESS_TELEMETRY_KEY`, `defaultEndlessRecord()`, `endless: EndlessRecord` on `TelemetryBlob` and in `defaultTelemetryBlob()`, and the `RecordRunEndArgs` union replacing `recordRunEnd`'s inline argument on `ProgressStore`. `ProgressBlob` untouched; `v` still `4`; `GameMode` unedited.
- **`src/services/storage/telemetry.ts`** — `mergeEndlessRecord` (clone-then-mutate, `Math.max(prev, safeCounter(incoming))` per field, reusing the module's existing `safeCounter`), `cloneTelemetryBlob` now deep-copies the record, `mergeTelemetryBlobs` folds it through a new `mergeEndlessRecords` per-field max, and the module header's sum-vs-max paragraph names the new max-fields and states that `mergeRunIntoTelemetry` never touches them.
- **`src/services/storage/parseBlob.ts`** — `sanitizeEndlessRecord` (an exact structural copy of `sanitizeAggregate`, using **this file's** `safeCounter`), wired into `sanitizeTelemetry` immediately after `out.lifetime`, with `endless?: unknown` added to the inline type; the firewall doc comment extended to name the record, its per-field degradation, and the no-migration consequence.
- **`src/services/storage/memoryStore.ts`** — `recordRunEnd(args: RecordRunEndArgs)`; all three campaign writes inside one `if (args.mode === 'campaign')`; `mergeRunIntoTelemetry` outside it with a mode-derived key; a separate `if (args.mode === 'endless')` branch folding the record. `applyLevelBest` itself unchanged.
- **`src/services/storage/asyncStorageStore.ts`** — the identical change, word-for-word comments included, in this store's spread-rebuild style. The pre-hydration chaining branch below `recordRunEnd` is untouched.
- **`src/services/storage/index.ts`** — added `type EndlessRecord`, `defaultEndlessRecord`, `ENDLESS_TELEMETRY_KEY`, `type RecordRunEndArgs` to the `./types` block and `mergeEndlessRecord` to the `./telemetry` block.
- **`tests/storage.progress-v4.test.ts`** — 25 → 34 cases: six merge-semantics cases, three parse/degradation cases, plus endless assertions folded into the two existing telemetry-degradation cases.
- **`tests/storage.endless-firewall.test.ts`** (new) — one suite body invoked twice, five behaviours per store.

## Requested Record (plan `<output>`)

- **Union type name and arms:** `RecordRunEndArgs`, exported from `src/services/storage/types.ts` and from the barrel. Arm 1: `{ mode: 'campaign'; levelId: LevelId; score; outcome; livesRemaining; stats }`. Arm 2: `{ mode: 'endless'; wave: number; score; outcome; livesRemaining; stats }` — **no `levelId`**. The `daily` arm is deliberately absent until Phase 12.
- **`mergeRunIntoTelemetry` is OUTSIDE the campaign gate in both stores — confirmed by reading the diff.** Measured as offsets within `recordRunEnd`: in `memoryStore.ts` the gate block spans relative lines 6–20 and `mergeRunIntoTelemetry` is at relative line 26; in `asyncStorageStore.ts` the gate spans 14–31 and `mergeRunIntoTelemetry` is at 39. Both are strictly after the gate's closing brace, at the function's own indentation level.
- **The `@ts-expect-error` line** is `tests/storage.endless-firewall.test.ts:176`, inside *"a campaign-shaped argument cannot be supplied on the endless arm — the compile-time half of SC-3 (D-11)"*. It sits on a `levelId: PLAYABLE_LEVEL_ORDER[0]` property passed alongside `mode: 'endless'`. It was **unused (TS2578) at the RED commit** and is **consumed at GREEN**, so `npm run typecheck` fails in both directions of regression: if the union collapses back to a flat type, the directive goes unused again.

## Decisions Made

Beyond the frontmatter `key-decisions`:

- **`NaN` / `Infinity` are tested via their JSON wire form.** The plan's Task 2 behaviour names `NaN` as an input, but `JSON.stringify(NaN)` emits `null`, so a raw `NaN` cannot reach `parseProgressResult` through a stored string. The test covers `null` (the reachable form), a string counter, a fractional counter and a JS-level `NaN` passed through the object fixture, and says so in a comment — the hardening is proven, on the input shapes that actually exist.
- **The firewall suite is one parameterized body, not two copy-pasted describes.** The plan asked for "two describes, one per store"; `firewallSuite(label, makeStore)` is invoked twice and produces exactly two describes, with assertions identical *by construction* — which is the point, since a gate landing in only one of two hand-mirrored stores is precisely the failure mode.
- **Task 1's RED commit carries compile-only scaffolding.** A test importing a non-existent export fails with a `TypeError`, not an assertion, which classifies as INVALID_RED. The RED commit therefore adds the type/default/constant (needed to compile) plus deliberately wrong behaviour stubs — identity `mergeEndlessRecord`, aliased clone, left-wins merge — so all four target failures are assertions about behaviour. Same pattern 11-01 used.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 acceptance criterion AC7 counts `0`, not the `1` it specifies**

- **Found during:** Task 1 verification gate
- **Issue:** The criterion is `sed -n '/export function mergeRunIntoTelemetry/,/^}/p' src/services/storage/telemetry.ts | grep -vE '^\s*(//|\*|/\*)' | grep -c 'endless'` → expected `1`, described as "the `byMode.endless` map access only". But `mergeRunIntoTelemetry` has never contained a literal `byMode.endless` — it indexes dynamically: `const byLevel = next.byMode[args.mode];` (one line, verified). The expected count was wrong about pre-existing source.
- **Fix:** None applied to source. `0` satisfies the criterion's stated intent ("no record write") strictly more strongly than `1` would, and writing a literal `endless` into that function purely to move a grep counter would be code written to satisfy a miscount. The behaviour the criterion is protecting is pinned directly by the test *"mergeRunIntoTelemetry never writes the endless record"*, which also asserts the non-vacuous side (`byMode.endless[KEY].runsPlayed === 1`).
- **Files modified:** none
- **Verification:** `sed -n '/export function mergeRunIntoTelemetry/,/^}/p' src/services/storage/telemetry.ts | grep -n "byMode"` → exactly one line, `const byLevel = next.byMode[args.mode];`
- **Commit:** n/a (documentation-only resolution)

---

**2. [Rule 3 - Blocking] Task 3's action text and its acceptance criterion contradict each other**

- **Found during:** Task 3 implementation
- **Issue:** The action says the telemetry key "becomes `args.mode === 'campaign' ? args.levelId : ENDLESS_TELEMETRY_KEY`", while AC5/AC6 require `grep -c "args.mode === 'campaign'"` inside `recordRunEnd` to output exactly `1`. Following the action literally yields `2` (the gate plus the ternary) and fails the criterion.
- **Fix:** Wrote the ternary with the other discriminant — `args.mode === 'endless' ? ENDLESS_TELEMETRY_KEY : args.levelId`. Semantically identical (the union has exactly two arms, and TypeScript narrows `args.levelId` correctly in the false branch), and it leaves exactly one `args.mode === 'campaign'` per store, which is also the better property: a single audit point for the gate.
- **Files modified:** `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts`
- **Verification:** both AC5 and AC6 output `1`; `npm run typecheck` exit 0; 520 tests pass.
- **Commit:** `57d4f6c`

---

**Total deviations:** 2 auto-fixed (2 blocking, both plan-internal inconsistencies rather than code defects).
**Impact on plan:** No scope change. Every artifact, behaviour and success criterion the plan names is delivered; two grep-shaped criteria were satisfied by the expression that actually matches their intent.

## Threat Flags

None. The files changed introduce no new network endpoint, auth path, file-access pattern or trust-boundary schema change beyond the two already registered (`T-11-04` Tampering and `T-11-05` DoS), both of which are now **mitigated** rather than merely planned:

| Threat | Disposition | Where discharged |
|---|---|---|
| T-11-04 (Tampering, `recordRunEnd`) | mitigated | Union (`57d4f6c`) + runtime gate in both stores + `tests/storage.endless-firewall.test.ts` |
| T-11-05 (DoS, `sanitizeTelemetry` → `EndlessRecord`) | mitigated | `sanitizeEndlessRecord` (`ef3bbe9`) + the three parse-degradation cases |
| T-11-06 / T-11-07 / T-11-SC | accept (unchanged) | Two scalars added, no new collection; no package installed by any task. |

## Issues Encountered

- **`check tdd-red-evidence` cannot read vitest's nested TAP at all** — see the TDD Gate Compliance note above. 11-01 hit the missing-summary-lines half; this plan hit the deeper half (indented `not ok` lines are invisible to the classifier's regex). Both are worked around by transcription, not by weakening the gate. Worth a tooling issue upstream.
- **Pre-existing working-tree churn, carried from before this plan started.** `.planning/config.json` was already modified and `.planning/milestone.lock` / `.planning/state.json` already untracked at plan start (orchestrator-owned files — the identical state 11-01 recorded). Task 3's `git status --porcelain` criterion is satisfied for everything this plan touched: no source or test file is left uncommitted, and no throwaway file was written into the repo (the RED evidence records and the TAP transcription script live in the session scratchpad under `/private/tmp`).

## Known Stubs

None. Every stub introduced in a RED commit was replaced in the matching GREEN commit; no `TODO`, `FIXME` or placeholder text exists in any file this plan touched (scanned across the full plan diff).

## Verification

| Check | Result |
|---|---|
| `npm test` (vitest + 4 assert scripts) | **exit 0** |
| `npx vitest run` | **91 files / 520 tests passed, 0 failed, 0 todo** (baseline after 11-01 was 90 / 501) |
| `npm run lint` | exit 0, no `warning` and no `error` lines |
| `npm run typecheck` | exit 0 |
| `node scripts/assert-worklet-closures.mjs` | `Worklet closure guard OK (121 files)` |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | empty (phase freeze holds) |
| `git diff --name-only dcfdd37..HEAD -- src/services/storage/migrateProgress.ts` | empty (no migration written, none needed) |
| `grep -n 'PROGRESS_VERSION' src/services/storage/types.ts` | `= 4 as const`, unchanged from `main` |
| `git diff --name-only -- app/_components/PlayingHost.tsx` | empty (the host belongs to 11-05) |
| `git status --porcelain` | only the pre-existing `.planning/` churn described above |

All per-task acceptance criteria were re-run after the final commit: 13 `endless` occurrences in `types.ts`, `0` `EndlessRecord` references inside `ProgressBlob`, `2` in `cloneTelemetryBlob`, `1` `safeCounter` in each of `telemetry.ts` and `parseBlob.ts`, `1` `sanitizeEndlessRecord` call inside `sanitizeTelemetry`, and `1` `args.mode === 'campaign'` inside `recordRunEnd` in each store.

## User Setup Required

None — no external service configuration and no packages installed. (RESEARCH's package-legitimacy audit records that this phase installs nothing; T-11-SC holds. No Expo API is reachable from any file this plan touched, so the `AGENTS.md` v57.0.0 doc precondition did not fire — confirmed by inspection: every changed file is pure TypeScript under `src/services/storage` or `tests/`, and `react-native` is imported only by `asyncStorageStore.ts`'s pre-existing native probe, which this plan did not modify.)

## Next Phase Readiness

**Ready for the rest of Phase 11.** Two consumers must know these contracts:

- **11-05 (PlayingHost endless host)** calls `recordRunEnd` with the endless arm: `{ mode: 'endless', wave, score, outcome, livesRemaining, stats }`. There is **no `levelId`** on that arm — passing one is a compile error, by design. Its existing campaign call at `PlayingHost.tsx:531-556` needs no change; only the stale comment claiming campaign is the only mode written is 11-05's to correct.
- **11-06 (ops doc)** should record that the endless best lives at `telemetry.endless`, not on `ProgressBlob`, and that `telemetry.byMode.endless` is keyed on `ENDLESS_TELEMETRY_KEY`.
- **Phase 12 (daily)** adds a third arm to `RecordRunEndArgs`. Adding it will surface a compile error at both stores' `telemetryKey` ternary and the endless branch — which is the intended behaviour: the union forces daily to declare what it writes rather than inheriting campaign's writes silently.
- **Phase 13 (achievements)** reads `byMode.endless[ENDLESS_TELEMETRY_KEY]`. Research assumption **A4** (that a single constant key is the right granularity) is still unmeasured; changing it later is an aggregate merge, not a migration.

No blockers.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-25*
